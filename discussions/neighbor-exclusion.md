# Neighbor Exclusion in Distance-to-Contact Calculation

## Date: 2026-02-15

## The Problem

In a ball & stick model, sequential balls along the chromosome fiber are connected and therefore always spatially close. This proximity is trivial — it's a consequence of connectivity, not of 3D folding.

In a real Hi-C contact map, this manifests as the bright diagonal — neighboring genomic bins always show high contact frequency simply because they are adjacent on the polymer. The biologically interesting signals (TADs, loops, compartments) are all **off-diagonal**, representing non-trivial spatial proximity between **genomically distant** loci that have been brought close together by the spaghetti-like folding of the chromosome.

When computing a synthetic contact map from 3D coordinates, we face the same issue: sequential neighbors will always produce high "contact" scores due to their connectivity, drowning out the meaningful signal from the folding structure.

## Key Insight

The value of this analysis lies in detecting **genomically distant regions that are spatially close** — regions that are far apart along the linear chromosome sequence but near each other in 3D because the fiber has folded back on itself. Sequential neighbors should be excluded or handled specially because their proximity is guaranteed and uninformative.

## Candidate Approaches

### 1. Skip a fixed number of neighbors
For a given ball at index i, ignore balls at indices i-k through i+k. The value of k depends on the persistence length of chromatin at this resolution.

- **Pro:** Simple to implement
- **Con:** Requires choosing k; may be too aggressive or too conservative

### 2. Genomic distance threshold
Only compute contacts for pairs where the genomic separation exceeds a minimum distance. For example, at 30kb resolution, require at least 90kb–150kb of separation (3–5 bins apart).

- **Pro:** Biologically motivated; easy to parameterize
- **Con:** Hard cutoff may miss some near-diagonal structure

### 3. Observed/Expected normalization
Compute all pairwise distances (including neighbors), then divide by the expected contact frequency as a function of genomic distance. This is analogous to O/E normalization in Hi-C analysis. The diagonal decay is modeled and removed, leaving only enrichments above background.

- **Pro:** Preserves the full matrix; highlights non-trivial contacts relative to expectation
- **Con:** More complex; requires computing the expected decay curve

## Status

**Implemented, then removed (2026-05-14).**

Approach 1 (skip a fixed number of neighbors) was originally chosen and implemented in
`LiveContactMap` and `contactDerivation.js`: a `neighborExclusion` parameter (default 0)
skipped pairs where `|i - j| <= k`, updatable via `setNeighborExclusion(k)`.

It was later removed entirely — parameter, `setNeighborExclusion()`, and the demo slider.

### Why it was removed

The reasoning above frames neighbor exclusion as solving a real problem. It does — but
for **quantitative/algorithmic analysis** (model fitting, programmatic loop calling,
matrix statistics), not for **visualization**, which is what `LiveContactMap` actually
drives. For a human looking at a contact map:

- A bright near-diagonal is not a distortion — it faithfully reports real proximity, and
  it is the single most universal feature of *every* static Hi-C map. It makes the live
  map look *more* like Hi-C, not less. Scientists read past it instinctively.
- Neighbor exclusion is the editorializing step: it hard-deletes data and leaves a
  carved-out wedge around the diagonal — an artifact with **no static-Hi-C analog at
  all**, more jarring than the band it removed.
- The one genuine visualization risk (a very bright near-diagonal compressing the color
  ramp) is properly addressed by color-scale handling — log scale, percentile clipping —
  not by deleting data. Juicebox already provides those controls.

So for this product the control solved a non-problem and introduced a worse one. The
problem analysis above is retained because it remains valid for a *pipeline* use case: if
quantitative analysis is ever layered on, O/E-style normalization (Approach 3) — which
preserves the full matrix instead of carving it — would be the place to start, in the
library, not as a UI control.

## Related

- [3D to Contact Map Strategy](./3d-to-contact-map-strategy.md) — overall project strategy
- [Main Diagonal Rendering](./main-diagonal-rendering.md) — the *main* diagonal (separation 0), a separate concern, is rendered as a bright reference line
