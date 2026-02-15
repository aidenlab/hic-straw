# 3D Structure to Contact Map: Strategy Discussion

## Date: 2026-02-14

## Background

hic-straw is a JavaScript library that parses `.hic` files — binary files containing Hi-C contact matrices. These matrices store contact records representing interaction frequencies between pairs of genomic bins. Each contact record is a triple: (bin1, bin2, counts).

The library is organized around a few key components:
- **Straw** — thin public API wrapper
- **HicFile** — the core parser that reads headers, footers, indexes, and contact record blocks from `.hic` files
- **ContactRecord** — a simple data object holding (bin1, bin2, counts)
- **Matrix / MatrixZoomData** — structures representing contact matrices at various resolutions

The `.hic` file format has three main sections:
1. **Header** — magic string, version, genome ID, chromosome definitions, resolutions
2. **Body** — compressed blocks of contact records organized by chromosome pair and resolution
3. **Footer** — master index (mapping chromosome pairs to file positions), normalization vector index

## Goal

Extend or adapt hic-straw to accept a **3D molecular model** as input instead of (or in addition to) a static `.hic` file. The focus is on **intra-chromosomal contacts** — self-contacts within a single chromosome region.

### Input
A list of vertices with XYZ coordinates representing positions along a single chromosome region in 3D space.

### Output
A data structure that is indistinguishable from a `.hic` contact matrix from straw's perspective, enabling the same downstream analysis and visualization (e.g., in Juicebox) that is currently done with Hi-C experimental data.

## Core Computation

For every pair of vertices (i, j), compute the Euclidean distance. Convert distance into a contact-like score — spatially close regions receive high counts, distant regions receive low counts. This mirrors the inverse relationship observed in real Hi-C data where contact frequency falls off with spatial distance.

The distance-to-contact conversion function is TBD. Candidates include:
- Inverse power law: `counts = 1 / distance^alpha`
- Gaussian: `counts = exp(-distance^2 / (2 * sigma^2))`
- Simple distance threshold: `counts = 1 if distance < cutoff, else 0`
- Empirically calibrated function matching known Hi-C distance decay curves

## Proposed Strategy

### Option 1: Generate a real `.hic` file
Compute the distance-based contact matrix from 3D coordinates and write it out as a `.hic` file. Straw reads it as usual.
- **Pro:** No changes to straw needed
- **Con:** Requires implementing a `.hic` file writer; not "live"

### Option 2: In-memory adapter (recommended)
Create a data source that conforms to the same interface straw expects (the shape of `HicFile`) but computes contact records on the fly from 3D coordinates. No file I/O needed.
- **Pro:** Live computation; no intermediate file; can update dynamically as the 3D model changes
- **Con:** Requires understanding which parts of the HicFile interface downstream consumers depend on

### Option 3: Hybrid
Implement a lightweight in-memory structure that mimics only the parts of the `.hic` format that straw actually consumes, without writing to disk.

### Recommended approach: Option 2

The in-memory adapter approach best fits the "live" requirement. The key design question is at what level to intercept:

**A. Replace HicFile** — Create an alternative class (e.g., `LiveContactMap`) that implements the same public methods as `HicFile` but generates contact records from 3D vertex positions instead of reading from a file. Straw would accept either a `HicFile` or a `LiveContactMap`.

**B. Replace the I/O layer** — Keep `HicFile` but substitute the file reader with a synthetic data provider that generates binary data matching the `.hic` format from 3D coordinates. This is more complex and less clean.

Option A is simpler and more maintainable.

## Open Questions

1. **Distance-to-contact function:** What conversion function should map 3D distance to contact frequency? Should it be configurable?
2. **Resolution:** The 3D model has a fixed vertex spacing. How does this map to Hi-C bin resolutions? Is there a single natural resolution, or do we need multi-resolution support?
3. **Normalization:** Should the synthetic contact map support normalization types (VC, KR, etc.), or is NONE sufficient?
4. **Downstream consumers:** What code consumes straw's output? This determines which parts of the HicFile interface must be implemented.
5. **Dynamic updates:** If the 3D model changes (e.g., during a simulation or interactive manipulation), should the contact map update in real time?
6. **Scale:** How many vertices are typical? This affects whether pairwise distance computation is feasible on the fly or needs optimization (spatial indexing, caching, etc.).

## Input Data: SWT File Format (Ball & Stick)

The 3D model input is in Spacewalk Text (SWT) format. We are focusing on **Example 1** — the ball & stick style.

### Format
```
##format=sw1 name=IMR90 genome=hg38
chromosome	start	end	x	y	z
trace 0
chr21 18000000 18030000 117803 58446 1733
chr21 18030000 18060000 117726 58747 1680
chr21 18060000 18090000 117747 58607 1872
...
trace 1
chr21 18000000 18030000 ...
...
```

### Key characteristics
- **Format line:** `##format=sw1` with `name` and `genome` properties
- **Columns:** chromosome, start, end, x, y, z
- **Traces:** The file contains multiple traces (trace 0, trace 1, ...), each representing one measured 3D conformation of a chromosome region
- **Genomic bins:** Contiguous 30kb bins along chr21 (18000000–18030000, 18030000–18060000, etc.)
- **Coordinates:** Integer XYZ positions in 3D space
- **Ball & stick model:** Each vertex is a "ball" at an XYZ location, connected sequentially to form a "stick" model of the chromosome fiber

### Implications for the adapter
- The natural resolution is **30kb** (the bin size in the SWT file)
- Each trace is an independent 3D structure — we can compute a contact map per trace, or aggregate across traces
- The chromosome and genomic coordinates map directly to what straw expects for chromosome definitions and bin indexing
- The sample file (`ball-and-stick.swt`) contains data for **chr21**, genome **hg38**, from the **IMR90** cell line

### Resource files
- `resources/ball-and-stick.swt` — sample ball & stick SWT file (3.4MB, multiple traces)
- `resources/spacewalk-swt-text-file-format.md` — SWT format specification

## Next Steps

- Decide on the distance-to-contact conversion function
- Identify the minimal HicFile interface needed by downstream consumers
- Prototype a `LiveContactMap` class that reads SWT data and produces contact records
- Test with Juicebox or other visualization tools
