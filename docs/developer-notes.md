# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

hic-straw is a zero-dependency JavaScript library and CLI tool for reading `.hic` contact matrix files (Hi-C genomic data from the Juicebox ecosystem). It also includes a `LiveContactMap` adapter that generates synthetic contact maps from 3D chromatin structure data (Spacewalk integration). Runs in both browser and Node.js (>=18).

## Build & Development Commands

```bash
npm run build          # Build library (ESM + CJS) via vite
npm run dev            # Start Vite dev server for examples at localhost:5173
npm test               # Run all tests once with vitest
npm run test:watch     # Run tests in watch mode
npx vitest test/straw.test.js  # Run a single test file
```

Build outputs go to `dist/` as `hic-straw.esm.js` and `hic-straw.cjs.js`. Build config is in `vite.config.lib.js`; dev server config is in `vite.config.js`.

No linter or formatter is configured.

## Testing

- **Runner:** Vitest 3.0.0 with Chai assertions
- **Config:** `vitest.config.js` — includes `test/**/*.test.js` plus `testBufferedFile.js` and `throttleTest.js`; excludes `test/old/**`
- **Timeouts:** 10s per test, 30s for hooks
- **Test data:** `.hic` files in `test/data/`, SWT file in `resources/ball-and-stick.swt`
- **CI:** GitHub Actions runs tests on Node 18.x and 20.x (`.github/workflows/ci.yml`)

## Architecture

### Core Pattern: Facade + Adapter

`Straw` is the public facade class. It wraps either a `HicFile` (binary .hic parser) or a `LiveContactMap` (3D structure adapter) — both implement the same interface. Consumers call Straw and don't need to know which backend is in use.

```
Straw (facade)
  ├── HicFile        — parses binary .hic files
  └── LiveContactMap — generates contact maps from 3D vertex data
```

### Key Source Files

- **`src/index.js`** — Entry point. Exports `Straw` (default) and `LiveContactMap` (named).
- **`src/straw.js`** — Facade: `getContactRecords()`, `getMetaData()`, `getNormalizationOptions()`
- **`src/hicFile.js`** — Binary .hic format parser (header, footer, matrices, normalization vectors). Uses LRU caching and lazy loading.
- **`src/liveContactMap.js`** — Adapter that accepts 3 input modes: SWT text file, pre-parsed SWT data, or raw trace vertex arrays. Computes distance matrices and derives contact records.
- **`src/swtParser.js`** — Parses Spacewalk Text (.swt) format into structured trace data.
- **`src/distanceMatrix.js`** — Pairwise Euclidean distance computation (single trace and ensemble-averaged).
- **`src/contactDerivation.js`** — Derives ContactRecord arrays from distance matrices via threshold (binary or frequency mode).
- **`src/io/`** — I/O abstraction layer: `RemoteFile` (HTTP range requests), `NodeLocalFile` (Node fs), `BrowserLocalFile` (Blob API), `BufferedFile` (buffering wrapper), `ThrottledFile`/`RateLimiter` (rate limiting for Google Drive etc.).
- **`cli.js`** — CLI entry point (`straw` command) for metadata, normalization, and contact record extraction.

### Data Flow

For .hic files: binary data → HicFile parser → Matrix/MatrixZoomData → ContactRecord[]

For Spacewalk/3D data: SWT text or raw traces → swtParser → distanceMatrix → contactDerivation → ContactRecord[]

### Key Genomic Concepts

- **Contact records:** Interaction counts between binned genomic regions (`{bin1, bin2, counts}`)
- **Normalization:** KR (Knight-Ruiz), VC (Vanilla Coverage), VC_SQRT, NONE
- **Units:** BP (base pairs) or FRAG (restriction fragments)
- **Resolutions:** Bin sizes like 1000, 5000, 10000, 25000, 50000, 100000, 250000, etc.

## Module Format

ES module project (`"type": "module"` in package.json). Library builds to both ESM and CJS. The vendored zlib is in `src/vendor/zlib_and_gzip.js`.

## Branch Info

- `master` — main/release branch (target for PRs)
- `spacewalk-extensions` — active development branch for LiveContactMap features
