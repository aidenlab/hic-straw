# Live Contact Record Calculation

## Date: 2026-05-14

## Scope

This document walks through one specific step: **given a distance threshold, how do we
turn 3D vertex data into an array of `ContactRecord` objects?**

It assumes you already understand how the trace ensemble and the distance data are
produced. It does *not* cover SWT parsing, the distance matrix math, or the Juicebox
interface — see [3d-to-contact-map-strategy.md](./3d-to-contact-map-strategy.md) for
the wider picture.

The code lives in two files:
- `src/contactDerivation.js` — the two derivation functions
- `src/liveContactMap.js` — `_deriveContacts()`, which picks a function and applies the bin offset

## The inputs

Contact derivation starts with three things already in hand:

| Input | Where it comes from | Shape |
|-------|--------------------|-------|
| `traces` | the parsed SWT ensemble | array of traces; each trace is an array of `{x, y, z, isMissingData?}` vertices |
| `distanceMatrix` | `computeEnsembleDistances()` | `Float32Array`, N×N, ensemble-*averaged* distance per bin pair |
| `distanceThreshold` | config or `setDistanceThreshold()` | a single number (default 200) |

Note that we keep **both** the raw traces and the averaged distance matrix. The two
contact modes use different ones — that is the first fork in the road.

## The pipeline

```
                        ┌─ frequency mode ─→ deriveEnsembleContactFrequencies(traces, ...)
_deriveContacts() ──────┤
                        └─ contact mode ───→ deriveContactRecords(distanceMatrix, ...)
                                                        │
                                              raw records (bin1, bin2, counts)
                                              with trace-relative indices 0..N-1
                                                        │
                                              apply binOffset
                                                        │
                                              this.contactRecords  ← absolute bin indices
```

## Step 1 — Pick the mode

`_deriveContacts()` (`liveContactMap.js:466`) branches on `this.contactMode`:

- `'frequency'` (default) — threshold **each trace independently**, then average the verdicts.
- `'contact'` — threshold the **already-averaged** distance matrix once.

They produce records with different `counts` semantics. The rest of the pipeline (offset,
storage, query) is identical.

## Step 2a — Frequency mode

Function: `deriveEnsembleContactFrequencies(traces, traceLength, distanceThreshold, options)`

For every upper-triangle bin pair `(i, j)`, we ask each trace one yes/no question:
*in this conformation, is the distance below the threshold?*

Two parallel counters track the answers:
- `contactCount[i,j]` — how many traces said yes
- `validCount[i,j]` — how many traces had usable (non-missing) data at both bins

The loop order is **trace-first**: for each trace, compute the pair distance directly
from that trace's own vertices (not from the averaged matrix), compare to the threshold,
and bump the counters.

Then the frequency for each pair is simply:

```
freq = contactCount[i,j] / validCount[i,j]
```

A `ContactRecord(i, j, freq)` is emitted whenever `freq > 0`. The same `freq` values are
also written into a symmetric `contactFrequencies` array, which the visual test page can
render directly.

### Worked example

3 traces, and we are looking at one bin pair `(2, 7)`. Threshold = 200.

| Trace | distance(2,7) | below 200? |
|-------|--------------|-----------|
| 0 | 150 | yes |
| 1 | 305 | no |
| 2 | 90 | yes |

`contactCount = 2`, `validCount = 3` → `freq = 0.667`. We emit `ContactRecord(2, 7, 0.667)`.

If trace 1 had missing data at bin 7, it would be skipped entirely: `contactCount = 2`,
`validCount = 2`, `freq = 1.0`.

## Step 2b — Contact mode

Function: `deriveContactRecords(distances, traceLength, distanceThreshold, options)`

This one never looks at individual traces. It walks the upper triangle of the
ensemble-averaged `distanceMatrix` and applies the threshold once:

```
if (dist < distanceThreshold)  →  ContactRecord(i, j, 1)
```

`counts` is always exactly `1` — a binary indicator. There is no frequency array.

Using the same pair `(2, 7)`: the averaged distance is `(150 + 305 + 90) / 3 = 181.67`,
which is below 200, so we emit `ContactRecord(2, 7, 1)`. Notice this *agrees* with
frequency mode here, but it would not always — averaging first and thresholding once
throws away the per-trace spread. (This is why `frequency` is the default; see the
"subtlety" note in the strategy doc.)

## Step 3 — Rules shared by both modes

Two rules apply identically in both derivation functions:

1. **Upper triangle only.** The inner loop is `for j = i + 1`. The matrix is symmetric,
   so we store each pair once and mirror at query time (Step 5). The **main diagonal**
   (`j === i`) is the exception: each diagonal bin gets a `counts = 1` self-contact
   record emitted unconditionally — see [main-diagonal-rendering.md](./main-diagonal-rendering.md).
2. **Missing data.** Vertices flagged `isMissingData` are excluded. In frequency mode the
   trace simply does not contribute to that pair's counters; in contact mode the averaged
   distance is already `DISTANCE_UNDEFINED` and the pair is skipped.

Also note: pairs that are valid but never in contact produce **no record at all** (a
sparse representation). Frequency mode additionally drops `freq === 0` pairs. This matches
how a real `.hic` file only stores observed contacts.

## Step 4 — Apply the bin offset

The records from Step 2 use **trace-relative** indices: bin `0` is the first bin of the
SWT region, regardless of where that region sits on the chromosome.

Juicebox, however, queries by genomic position and expects `binIndex = genomicPosition / binSize`.
So `_deriveContacts()` shifts every index by `binOffset = floor(genomicStart / binSize)`:

```js
new ContactRecord(rec.bin1 + offset, rec.bin2 + offset, rec.counts)
```

For the SWT sample (`genomicStart` = 18,000,000, `binSize` = 30,000) the offset is 600,
so trace-relative bin `0` becomes absolute bin `600`. (When the offset is 0 the records
are passed through untouched.) The result is stored as `this.contactRecords`.

## Step 5 — Storage and query-time mirroring

`this.contactRecords` is the finished, cached array. It holds **upper-triangle records
only**, in absolute bin indices.

When Juicebox calls `getContactRecords(norm, region1, region2, units, binsize)`
(`liveContactMap.js:278`), we:
1. Convert the requested regions to bin ranges.
2. Filter `contactRecords` to those that fall in range.
3. **Mirror** — if a stored record's `(bin1, bin2)` lands in the *lower* triangle of the
   requested window, emit a swapped copy `ContactRecord(bin2, bin1, counts)`.

So the symmetry of the matrix is reconstructed on demand rather than stored twice.

## When does this run?

`_deriveContacts()` is called:
- Once during `init()`, after distances are computed.
- On every `setDistanceThreshold()` — this reuses the cached distance data and only
  re-derives records, which is the cheap half of the work.
- On `updateVertexData()`, after distances are recomputed — the full, expensive path.

This split is the whole point of keeping the distance matrix around: changing the
threshold is meant to feel instant.

## Related Documents

- [3d-to-contact-map-strategy.md](./3d-to-contact-map-strategy.md) — the overall approach
- [neighbor-exclusion.md](./neighbor-exclusion.md) — near-diagonal suppression: implemented, then removed
- [main-diagonal-rendering.md](./main-diagonal-rendering.md) — why the main diagonal is emitted unconditionally
</content>
</invoke>
