# 3D Structure to Contact Map: Strategy Discussion

## Date: 2026-02-14 | Last updated: 2026-02-18

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

### Implemented approach

The implementation uses a **distance threshold** with two configurable modes:

- **Contact mode** (`contactMode: 'contact'`): Binary contacts from the ensemble-averaged distance matrix. `counts = 1` if average distance < threshold, else 0.
- **Frequency mode** (`contactMode: 'frequency'`, default): For each pair, the fraction of traces where distance < threshold. `counts` ranges from 0.0 to 1.0, reflecting ensemble contact probability.

The threshold is configurable via `distanceThreshold` (default 200) and can be updated dynamically with `setDistanceThreshold()` without recomputing the expensive distance matrix.

**Neighbor exclusion** is supported to suppress the trivially bright diagonal (sequential bins are always spatially close). Pairs where `|i - j| <= neighborExclusion` are skipped. See [neighbor-exclusion.md](./neighbor-exclusion.md).

*Other candidates considered but not implemented:* inverse power law, Gaussian, empirically calibrated decay curves.

## Proposed Strategy

### Option 1: Generate a real `.hic` file
Compute the distance-based contact matrix from 3D coordinates and write it out as a `.hic` file. Straw reads it as usual.
- **Pro:** No changes to straw needed
- **Con:** Requires implementing a `.hic` file writer; not "live"

### Option 2: In-memory adapter (recommended) ✓ Implemented
Create a data source that conforms to the same interface straw expects (the shape of `HicFile`) but computes contact records on the fly from 3D coordinates. No file I/O needed.
- **Pro:** Live computation; no intermediate file; can update dynamically as the 3D model changes
- **Con:** Requires understanding which parts of the HicFile interface downstream consumers depend on

### Option 3: Hybrid
Implement a lightweight in-memory structure that mimics only the parts of the `.hic` format that straw actually consumes, without writing to disk.

### Chosen approach: Option 2, Option A

The in-memory adapter approach was implemented. **Option A (Replace HicFile)** was chosen: `LiveContactMap` implements the same public methods as `HicFile`. Straw accepts either via `config.liveContactMap` or `config.url`/`config.file`.

## Implementation Status

The following components have been implemented and tested:

| Component | Status | Location |
|-----------|--------|----------|
| **LiveContactMap** | ✓ | `src/liveContactMap.js` |
| **SWT parser** | ✓ | `src/swtParser.js` |
| **Distance matrix** | ✓ | `src/distanceMatrix.js` (single trace + ensemble) |
| **Contact derivation** | ✓ | `src/contactDerivation.js` |
| **Straw integration** | ✓ | `src/straw.js` — `config.liveContactMap` |
| **Juicebox compatibility** | ✓ | Tested in `test/liveStraw.test.js` |
| **Visual test page** | ✓ | `examples/live-contact-map.html` |

### Resolved design decisions

1. **Distance-to-contact:** Distance threshold with configurable cutoff. Two modes: binary (contact) or ensemble frequency (0–1).
2. **Resolution:** Single resolution derived from SWT bin size (typically 30 kb).
3. **Normalization:** NONE only — sufficient for synthetic maps.
4. **Downstream consumers:** Juicebox.js via `HiCDataset` → `Straw` → `LiveContactMap`. Same interface as HicFile.
5. **Dynamic updates:** Yes. `setDistanceThreshold()` and `setNeighborExclusion()` update contacts without recomputing distances. `updateVertexData()` replaces entire data.
6. **Scale:** O(N²) pairwise computation. Tested with `ball-and-stick.swt` (65 bins × 1277 traces). No spatial indexing yet.

### Additional features beyond original scope

- **Known chromosome sizes** — hg38/hg19 lookup for correct Juicebox scrollbar/widget positioning (SWT data covers sub-regions).
- **Bin offset** — Converts trace-relative indices (0..N-1) to absolute genomic bin indices for Juicebox compatibility.
- **getDistanceMatrix()** — Exposes raw distance matrix for distance map visualization.
- **getContactFrequencies()** — Float32Array for optional RGBA rendering in frequency mode.
- **Missing data handling** — SWT parser marks `isMissingData` for vertices with NaN coordinates; excluded from distance/contact computation.

## Open Questions

1. **Alternative distance-to-contact functions:** Inverse power law, Gaussian, or O/E-style normalization could be added as optional modes if needed.
2. **Multi-resolution:** Downsampling to coarser resolutions (e.g., 2×, 4× bin size) is not implemented; single resolution only.
3. **Scale optimization:** For very large traces (e.g., full chromosome), spatial indexing or caching could reduce computation cost.

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
- Each trace is an independent 3D structure — we compute an **ensemble-averaged** distance matrix and derive contacts from it (contact mode) or compute contact frequency per pair across traces (frequency mode)
- The chromosome and genomic coordinates map directly to what straw expects for chromosome definitions and bin indexing
- The sample file (`ball-and-stick.swt`) contains data for **chr21**, genome **hg38**, from the **IMR90** cell line

### Resource files
- `resources/ball-and-stick.swt` — sample ball & stick SWT file (3.4MB, multiple traces)
- `resources/spacewalk-swt-text-file-format.md` — SWT format specification

## Related Documents

- [hic-straw Usage Scenarios](./hic-straw-usage-scenarios.md) — detailed integration guide, Juicebox scenarios, architecture
- [Neighbor Exclusion](./neighbor-exclusion.md) — diagonal suppression design (implemented as approach 1)
- [README](../README.md) — LiveContactMap API and usage examples
