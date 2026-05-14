# Rendering the Main Diagonal in Live Contact Maps

## Date: 2026-05-14

## The problem

A live contact map showed a **black main diagonal** — an immediately obvious,
peculiar-looking difference from a static Hi-C map, where the diagonal is the
*brightest* feature (a locus contacts itself maximally). Scientists comparing the two
map types would find the black diagonal jarring and unexplained.

## What was actually causing it

The investigation turned up something neither obvious nor where we first looked.

- `deriveEnsembleContactFrequencies` (`src/contactDerivation.js`) set
  `contactFrequencies[i][i] = 0` and emitted **no `ContactRecord` for diagonal bins** —
  the derivation loops run `for j = i + 1`, upper triangle only.
- But the visible black diagonal was not even coming from that. The demo renderer
  `examples/live-contact-map.html` renders from `contactRecords` (not the frequency
  array) and then **explicitly overpainted the diagonal** dark gray:
  ```js
  for (let i = 0; i < N; i++) fillScaledPixel(data, size, i, i, scale, 40, 40, 40, 255)
  ```

So the diagonal was black because (1) the library never produced diagonal data and
(2) the example page hard-coded a gray line over it.

## Considered: O/E normalization

This issue was first approached as a reason to revisit observed/expected normalization
(see git history / the earlier `observed-over-expected.md` draft, since removed). That
was a dead end for *this* problem: O/E normalizes by genomic separation `s = j - i`, and
the diagonal is `s = 0` with an artificial observed value of `0` — `OE[i,i] = 0 / 0`,
undefined. O/E cannot conjure a diagonal that was never computed. It is a real candidate
for *near*-diagonal signal handling, but it is orthogonal to making the main diagonal
paintable. The two were deliberately separated; only the diagonal fix was pursued.

## The fix: special-case the main diagonal

The diagonal is genuinely the brightest cell of a real Hi-C matrix, and the data already
"knows" this — `distance(i, i) = 0`, so the true self-contact frequency is `1.0` for
every bin. The diagonal was being *suppressed*, not *computed away*; the fix is to stop
suppressing it.

### Library — `src/contactDerivation.js`

Both derivation functions now emit a self-contact record for every diagonal bin:

- `deriveContactRecords` — pushes `ContactRecord(i, i, 1)` for each `i`.
- `deriveEnsembleContactFrequencies` — pushes `ContactRecord(i, i, 1)` and sets
  `contactFrequencies[i][i] = 1`.

This carries through `_deriveContacts()` in `liveContactMap.js` unchanged: the bin
offset is applied to `(i, i)` like any other record, and `getContactRecords()` already
guards diagonal records against being mirrored (`rec.bin1 !== rec.bin2`). The diagonal is
now a real, queryable part of the map — so **Juicebox** (which renders from
`getContactRecords`) shows the bright reference diagonal too, not just the demo page.

### Demo page — `examples/live-contact-map.html`

The hard-coded gray overpaint loop was removed. The diagonal now renders from the
emitted records like any other max-value cell — bright red.

## Design decision: the diagonal is unconditional

The self-contact records are emitted **independent of `distanceThreshold`**. Rationale:
the main diagonal is a *reference feature* of a Hi-C map, always present regardless of
analysis parameters — an orientation landmark. Even at `distanceThreshold = 0`, where no
off-diagonal pair counts as a contact, the diagonal is still drawn.

(There is no longer a near-diagonal `neighborExclusion` parameter to reconcile with — it
was removed; see [neighbor-exclusion.md](./neighbor-exclusion.md). The main diagonal at
separation `0` was always a distinct concern from that band.)

### Known edge case

A bin that is `isMissingData` in *every* trace still gets a `counts = 1` diagonal record.
This matches the previous unconditional behavior (the old code unconditionally set the
diagonal too, just to `0`) and is harmless — a faint reference-line cell over a fully
missing bin. Not worth the per-bin validity bookkeeping to special-case.

## Test impact

Existing tests asserted record counts under the old diagonal-excluded behavior. They were
updated to filter on `bin1 !== bin2` where they test off-diagonal logic, and dedicated
tests were added asserting the diagonal is emitted. Full suite passes (98 tests).

## Related

- [Live Contact Record Calculation](./live-contact-record-calculation.md) — the derivation pipeline the diagonal records flow through
- [Neighbor Exclusion](./neighbor-exclusion.md) — near-diagonal suppression: implemented, then removed; deliberately distinct from the main-diagonal landmark
- [3D to Contact Map Strategy](./3d-to-contact-map-strategy.md) — overall project strategy
