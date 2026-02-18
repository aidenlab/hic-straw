# hic-straw

[![CI](https://github.com/igvteam/hic-straw/actions/workflows/ci.yml/badge.svg)](https://github.com/igvteam/hic-straw/actions/workflows/ci.yml)

Command line and web utilities for reading .hic contact matrix files

## Installation

Requires Node 18+ (https://nodejs.org)

```
npm install hic-straw
```

## API

#### getContactRecords

Return a collection of binned contact counts.

Arguments
* normalization - string indicating normalization scheme
* region 1  {chr, start, end} - genomic region in base pair or fragment units.  Interval convention is zero based 1/2 open
* region 2  {chr, start, end}
* units -- "BP" for base pairs.  Currently this is the only unit supported
* binSize -- size of each bin in base pair or fragment units.  Bins are square


## Examples

### Development

Run the examples dashboard with hot reload:

```bash
npm run dev
```

Then open http://localhost:5173 in your browser. The dashboard links to each example.

### Browser usage

ES module — see examples/straw.html

```javascript
import Straw from 'hic-straw'

const straw = new Straw({
    url: "https://s3.amazonaws.com/igv.broadinstitute.org/data/hic/intra_nofrag_30.hic"
})

straw.getContactRecords(
    "KR",
    { chr: "8", start: 50000000, end: 60000000 },
    { chr: "8", start: 50000000, end: 60000000 },
    "BP",
    1000000
)
    .then(function (contactRecords) { ... })
```

### Node

**local file**

To use hic-straw with a local file, use the NodeLocalFile class:

```javascript
import Straw from 'hic-straw'
import NodeLocalFile from 'hic-straw/node'

const nodeLocalFile = new NodeLocalFile({ path: "test/data/test_chr22.hic" })
const straw = new Straw({ file: nodeLocalFile })
```

**remote file**

Node 18+ includes native `fetch`. For remote files:

```javascript
import Straw from 'hic-straw'

const straw = new Straw({ url: "https://foo.bar/test.hic" })
```


### Command line

Note: "straw" is installed in node_modules/.bin/straw.  This should be added to the path automatically upon installing
hic-straw, however if you get the error ```straw: command not found``` try running straw explicitly as

```node_modules/.bin/straw...```

#### Extract file metadata (genome identifier, sequences,  resolutions)

```bash
straw --meta test/data/test_chr22.hic
```

#### Extract normalization options.

```
straw --norms test/data/test_chr22.hic

```

#### Extract contact records from a local hic file


```bash

straw KR test/data/test_chr22.hic 22:40,000,000-50,000,000 22:40,000,000-50,000,000 BP 100,000

```
#### Extract contact records from a remote hic file

```bash
straw KR https://s3.amazonaws.com/igv.broadinstitute.org/data/hic/intra_nofrag_30.hic 8:48,700,000-48,900,000 8:48700000-48900000 BP 10,000
```

---

## LiveContactMap — Synthetic Contact Maps from 3D Structure Data

LiveContactMap is an adapter that accepts 3D chromosome vertex data and produces contact maps
fully compatible with the hic-straw / Juicebox.js pipeline. It implements the same interface as
HicFile, so downstream consumers (Straw, Juicebox) cannot distinguish it from a real `.hic` file.

This is designed for [Spacewalk](https://github.com/aidenlab/spacewalk), which visualizes
3D chromatin tracing data and needs to display live contact and distance maps alongside the
3D structure.

### How it works

1. **Parse** 3D vertex data from a Spacewalk Text (SWT) file or provide traces directly
2. **Compute** a pairwise Euclidean distance matrix, averaged across all traces in an ensemble
3. **Derive** contact records by applying a distance threshold — pairs closer than the threshold
   are "in contact". In frequency mode, the count reflects the fraction of traces where the
   pair is in contact (0.0 to 1.0)
4. **Serve** contact records through the standard HicFile interface

### Input: SWT file format

Spacewalk Text files (`.swt`) describe ball-and-stick models of chromatin fiber. Each file
contains multiple traces (independent 3D conformations) of the same genomic region.

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

See `resources/spacewalk-swt-text-file-format.md` for the full format specification.

### API

#### Construction

There are three ways to create a LiveContactMap:

**From SWT text** (simplest — parses the file for you):

```javascript
import LiveContactMap from 'hic-straw/src/liveContactMap.js'

const swtText = fs.readFileSync('data/ball-and-stick.swt', 'utf-8')
const lcm = new LiveContactMap({
    swtText: swtText,
    distanceThreshold: 500,   // 3D distance cutoff for "in contact"
    neighborExclusion: 3,     // skip pairs within 3 bins of each other
    contactMode: 'frequency'  // 'frequency' (0-1) or 'contact' (binary 0/1)
})
await lcm.init()
```

**From raw trace data** (when Spacewalk already has parsed vertex arrays):

```javascript
const lcm = new LiveContactMap({
    traces: ensembleManager.getTraces(),   // Array<Array<{x, y, z}>>
    genomeId: 'hg38',
    chr: 'chr21',
    genomicStart: 18000000,
    genomicEnd: 19950000,
    binSize: 30000,
    distanceThreshold: 500
})
await lcm.init()
```

**From pre-parsed SWT data** (if you've already called `parseSWT()`):

```javascript
import { parseSWT } from 'hic-straw/src/swtParser.js'

const parsed = parseSWT(swtText)
const lcm = new LiveContactMap({
    parsedData: parsed,
    distanceThreshold: 500
})
await lcm.init()
```

#### Querying contact records

After initialization, use the standard hic-straw interface:

```javascript
const records = await lcm.getContactRecords(
    'NONE',
    { chr: 'chr21', start: 18000000, end: 19950000 },
    { chr: 'chr21', start: 18000000, end: 19950000 },
    'BP',
    30000
)

for (const rec of records) {
    console.log(`bin ${rec.bin1} x ${rec.bin2}: ${rec.counts}`)
}
```

#### Using with Straw (for Juicebox compatibility)

To plug a LiveContactMap into the Straw/Juicebox pipeline:

```javascript
import Straw from 'hic-straw'

const straw = new Straw({ liveContactMap: lcm })

// Now use straw exactly like a normal .hic file:
const meta = await straw.getMetaData()
const records = await straw.getContactRecords('NONE', region1, region2, 'BP', 30000)
```

Juicebox's `HiCDataset` can wrap this Straw instance and all controls
(resolution selector, normalization widget, color scale) work natively.

#### Dynamic threshold adjustment

Changing the distance threshold re-derives contacts without recomputing the
expensive distance matrix:

```javascript
lcm.setDistanceThreshold(300)    // fewer contacts
lcm.setDistanceThreshold(800)    // more contacts
lcm.setNeighborExclusion(5)      // exclude pairs within 5 bins (150kb at 30kb resolution)
```

#### Accessing the distance matrix

For distance map visualization:

```javascript
const { distances, maxDistance, traceLength } = lcm.getDistanceMatrix()
// distances: Float32Array (N x N, row-major, symmetric)
// maxDistance: largest distance in the matrix
// traceLength: N (number of bins)
```

### Node.js example

```javascript
import fs from 'fs'
import Straw from 'hic-straw'
import LiveContactMap from 'hic-straw/src/liveContactMap.js'

const swtText = fs.readFileSync('resources/ball-and-stick.swt', 'utf-8')

const lcm = new LiveContactMap({
    swtText,
    distanceThreshold: 500,
    neighborExclusion: 3,
    contactMode: 'frequency'
})
await lcm.init()

const meta = await lcm.getMetaData()
console.log(`Genome: ${meta.genome}`)
console.log(`Chromosomes: ${meta.chromosomes.map(c => c.name).join(', ')}`)
console.log(`Resolution: ${meta.resolutions[0]} bp`)

const records = await lcm.getContactRecords(
    'NONE',
    { chr: 'chr21', start: 18000000, end: 19950000 },
    { chr: 'chr21', start: 18000000, end: 19950000 },
    'BP',
    30000
)
console.log(`Contact records: ${records.length}`)
```

### Visual test page

A browser-based test page is provided at `examples/live-contact-map.html`. It renders
both a contact map and a distance map side by side from any `.swt` file, with interactive
controls for threshold and neighbor exclusion.

Run `npm run dev` and open the examples dashboard, then click "LiveContactMap" — or navigate
directly to http://localhost:5173/examples/live-contact-map.html. Load an SWT file using the file picker.
