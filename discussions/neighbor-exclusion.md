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

**Open — awaiting decision.** This is a design choice that affects the core computation. It should be resolved before prototyping the LiveContactMap class.

## Related

- [3D to Contact Map Strategy](./3d-to-contact-map-strategy.md) — overall project strategy
