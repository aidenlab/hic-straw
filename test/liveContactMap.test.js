import {assert} from 'chai'
import LiveContactMap from '../src/liveContactMap.js'
import fs from 'fs'

suite('LiveContactMap', function () {

    // Increase timeout for tests that parse the full SWT file
    this.timeout(10000)

    suite('construction from SWT text', function () {

        let lcm

        suiteSetup(async function () {
            const swtText = fs.readFileSync('resources/ball-and-stick.swt', 'utf-8')
            lcm = new LiveContactMap({
                swtText,
                distanceThreshold: 500,
                neighborExclusion: 3
            })
            await lcm.init()
        })

        test('genomeId', function () {
            assert.equal(lcm.genomeId, 'hg38')
        })

        test('chromosomes array', function () {
            assert.isArray(lcm.chromosomes)
            assert.isAtLeast(lcm.chromosomes.length, 2)
            const chr21 = lcm.chromosomes.find(c => c.name === 'chr21')
            assert.ok(chr21)
            assert.isNumber(chr21.size)
            assert.isNumber(chr21.index)
        })

        test('bpResolutions', function () {
            assert.deepEqual(lcm.bpResolutions, [30000])
        })

        test('normalizationTypes', function () {
            assert.deepEqual(lcm.normalizationTypes, ['NONE'])
        })

        test('chrAliasTable resolves aliases', function () {
            assert.equal(lcm.getFileChrName('chr21'), 'chr21')
            assert.equal(lcm.getFileChrName('21'), 'chr21')
        })

        test('meta object', function () {
            assert.equal(lcm.meta.genome, 'hg38')
            assert.isArray(lcm.meta.chromosomes)
            assert.deepEqual(lcm.meta.resolutions, [30000])
        })

        test('distance matrix computed', function () {
            assert.ok(lcm.distanceMatrix)
            assert.instanceOf(lcm.distanceMatrix, Float32Array)
            assert.equal(lcm.distanceMatrix.length, 65 * 65)
            assert.isAbove(lcm.maxDistance, 0)
        })

        test('contact records generated', function () {
            assert.isArray(lcm.contactRecords)
            assert.isAbove(lcm.contactRecords.length, 0)
        })

        test('init is idempotent', async function () {
            const countBefore = lcm.contactRecords.length
            await lcm.init()
            assert.equal(lcm.contactRecords.length, countBefore)
        })
    })

    suite('construction from raw traces', function () {

        test('construct with traces and config', async function () {
            const traces = [
                [{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}, {x: 0, y: 4, z: 0}, {x: 100, y: 0, z: 0}],
                [{x: 1, y: 1, z: 1}, {x: 4, y: 1, z: 1}, {x: 1, y: 5, z: 1}, {x: 101, y: 1, z: 1}]
            ]

            const lcm = new LiveContactMap({
                traces,
                genomeId: 'hg38',
                chr: 'chr1',
                genomicStart: 0,
                genomicEnd: 120000,
                binSize: 30000,
                traceLength: 4,
                distanceThreshold: 10
            })
            await lcm.init()

            assert.equal(lcm.genomeId, 'hg38')
            assert.equal(lcm.traceLength, 4)
            assert.isAbove(lcm.contactRecords.length, 0)
        })
    })

    suite('getMetaData', function () {

        test('returns correct structure', async function () {
            const lcm = new LiveContactMap({
                traces: [[{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}]],
                genomeId: 'hg38',
                chr: 'chr1',
                genomicStart: 0,
                genomicEnd: 60000,
                binSize: 30000,
                distanceThreshold: 10
            })

            const meta = await lcm.getMetaData()
            assert.equal(meta.genome, 'hg38')
            assert.isArray(meta.chromosomes)
            assert.deepEqual(meta.resolutions, [30000])
            assert.isNumber(meta.version)
        })
    })

    suite('getContactRecords', function () {

        let lcm

        suiteSetup(async function () {
            // 4 bins, 30kb each: [0-30000, 30000-60000, 60000-90000, 90000-120000]
            // Vertices: (0,0,0), (3,0,0), (0,4,0), (100,0,0)
            // d(0,1)=3, d(0,2)=4, d(1,2)=5, d(0,3)=100, d(1,3)=97, d(2,3)≈100
            const traces = [
                [{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}, {x: 0, y: 4, z: 0}, {x: 100, y: 0, z: 0}]
            ]

            lcm = new LiveContactMap({
                traces,
                genomeId: 'hg38',
                chr: 'chr1',
                genomicStart: 0,
                genomicEnd: 120000,
                binSize: 30000,
                distanceThreshold: 6,
                contactMode: 'contact'
            })
            await lcm.init()
        })

        test('full range query returns all contacts', async function () {
            const records = await lcm.getContactRecords(
                'NONE',
                {chr: 'chr1', start: 0, end: 120000},
                {chr: 'chr1', start: 0, end: 120000},
                'BP',
                30000
            )
            // d < 6: (0,1)=3, (0,2)=4, (1,2)=5 → 3 upper-triangle records
            // Plus symmetric: total 6 (each pair appears twice, minus diagonal overlap)
            // Actually: for each record (i,j) with i<j, we get the original plus (j,i)
            // So: 3 originals + 3 symmetric = 6
            assert.equal(records.length, 6)
        })

        test('partial region query filters correctly', async function () {
            // Query only bin 0 × bin 0..1 → should find (0,1) contact
            const records = await lcm.getContactRecords(
                'NONE',
                {chr: 'chr1', start: 0, end: 30000},
                {chr: 'chr1', start: 0, end: 60000},
                'BP',
                30000
            )
            // bin1=0 in [0,1), bin2=0 or 1 in [0,2)
            // Upper triangle record (0,1): bin1=0 in [0,1), bin2=1 in [0,2) ✓
            // Symmetric (1,0): bin2=1 NOT in [0,1) for region1, bin1=0 in [0,2) for region2 - need bin2 in x range and bin1 in y range
            // Actually: symmetric check: rec.bin2=1 in [x1=0, x2=1)? No, 1 >= 1 fails.
            // So only 1 record
            assert.equal(records.length, 1)
            assert.equal(records[0].bin1, 0)
            assert.equal(records[0].bin2, 1)
        })

        test('out-of-range query returns empty', async function () {
            const records = await lcm.getContactRecords(
                'NONE',
                {chr: 'chr1', start: 500000, end: 600000},
                {chr: 'chr1', start: 500000, end: 600000},
                'BP',
                30000
            )
            assert.equal(records.length, 0)
        })

        test('contact records have correct structure', async function () {
            const records = await lcm.getContactRecords(
                'NONE',
                {chr: 'chr1', start: 0, end: 120000},
                {chr: 'chr1', start: 0, end: 120000},
                'BP',
                30000
            )
            for (const rec of records) {
                assert.isNumber(rec.bin1)
                assert.isNumber(rec.bin2)
                assert.isNumber(rec.counts)
                assert.isFunction(rec.getKey)
            }
        })
    })

    suite('getMatrix', function () {

        test('returns matrix-like object', async function () {
            const lcm = new LiveContactMap({
                traces: [[{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}]],
                genomeId: 'hg38',
                chr: 'chr1',
                genomicStart: 0,
                genomicEnd: 60000,
                binSize: 30000,
                distanceThreshold: 10
            })
            await lcm.init()

            const matrix = await lcm.getMatrix(1, 1)
            assert.ok(matrix)

            const zd = matrix.getZoomDataByIndex(0, 'BP')
            assert.ok(zd)
            assert.equal(zd.zoom.binSize, 30000)
            assert.equal(zd.zoom.unit, 'BP')
            assert.isNumber(zd.averageCount)
            assert.ok(zd.chr1)
            assert.ok(zd.chr2)
        })

        test('returns undefined for invalid chromosome', async function () {
            const lcm = new LiveContactMap({
                traces: [[{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}]],
                genomeId: 'hg38',
                chr: 'chr1',
                genomicStart: 0,
                genomicEnd: 60000,
                binSize: 30000,
                distanceThreshold: 10
            })
            await lcm.init()

            const matrix = await lcm.getMatrix(99, 99)
            assert.isUndefined(matrix)
        })
    })

    suite('hasNormalizationVector', function () {

        test('always returns false', async function () {
            const lcm = new LiveContactMap({
                traces: [[{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}]],
                genomeId: 'hg38', chr: 'chr1',
                genomicStart: 0, genomicEnd: 60000, binSize: 30000,
                distanceThreshold: 10
            })
            await lcm.init()

            const result = await lcm.hasNormalizationVector('VC', 'chr1', 'BP', 30000)
            assert.isFalse(result)
        })
    })

    suite('getNormalizationOptions', function () {

        test('returns NONE only', async function () {
            const lcm = new LiveContactMap({
                traces: [[{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}]],
                genomeId: 'hg38', chr: 'chr1',
                genomicStart: 0, genomicEnd: 60000, binSize: 30000,
                distanceThreshold: 10
            })
            await lcm.init()

            const options = await lcm.getNormalizationOptions()
            assert.deepEqual(options, ['NONE'])
        })
    })

    suite('setDistanceThreshold', function () {

        test('changing threshold changes contact count', async function () {
            const traces = [
                [{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}, {x: 0, y: 4, z: 0}, {x: 100, y: 0, z: 0}]
            ]

            const lcm = new LiveContactMap({
                traces,
                genomeId: 'hg38', chr: 'chr1',
                genomicStart: 0, genomicEnd: 120000, binSize: 30000,
                distanceThreshold: 6,
                contactMode: 'contact'
            })
            await lcm.init()

            const countAt6 = lcm.contactRecords.length

            // Increase threshold — should get more contacts
            lcm.setDistanceThreshold(200)
            const countAt200 = lcm.contactRecords.length

            assert.isAbove(countAt200, countAt6)

            // Decrease to 0 — should get no contacts
            lcm.setDistanceThreshold(0)
            assert.equal(lcm.contactRecords.length, 0)
        })

        test('does not recompute distance matrix', async function () {
            const traces = [
                [{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}]
            ]

            const lcm = new LiveContactMap({
                traces,
                genomeId: 'hg38', chr: 'chr1',
                genomicStart: 0, genomicEnd: 60000, binSize: 30000,
                distanceThreshold: 10
            })
            await lcm.init()

            const distBefore = lcm.distanceMatrix
            lcm.setDistanceThreshold(1)
            // Same Float32Array reference — distances were not recomputed
            assert.strictEqual(lcm.distanceMatrix, distBefore)
        })
    })

    suite('setNeighborExclusion', function () {

        test('increasing K reduces contacts', async function () {
            const traces = [
                [{x: 0, y: 0, z: 0}, {x: 1, y: 0, z: 0}, {x: 2, y: 0, z: 0}, {x: 3, y: 0, z: 0}]
            ]

            const lcm = new LiveContactMap({
                traces,
                genomeId: 'hg38', chr: 'chr1',
                genomicStart: 0, genomicEnd: 120000, binSize: 30000,
                distanceThreshold: 100,
                contactMode: 'contact'
            })
            await lcm.init()

            const countK0 = lcm.contactRecords.length

            lcm.setNeighborExclusion(2)
            const countK2 = lcm.contactRecords.length

            assert.isBelow(countK2, countK0)
        })
    })

    suite('getDistanceMatrix', function () {

        test('returns distance data', async function () {
            const lcm = new LiveContactMap({
                traces: [[{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}]],
                genomeId: 'hg38', chr: 'chr1',
                genomicStart: 0, genomicEnd: 60000, binSize: 30000,
                distanceThreshold: 10
            })
            await lcm.init()

            const dm = lcm.getDistanceMatrix()
            assert.ok(dm.distances)
            assert.instanceOf(dm.distances, Float32Array)
            assert.isNumber(dm.maxDistance)
            assert.equal(dm.traceLength, 2)
        })
    })

    suite('frequency mode', function () {

        test('contact frequencies between 0 and 1', async function () {
            const traces = [
                [{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}],
                [{x: 0, y: 0, z: 0}, {x: 5, y: 0, z: 0}]
            ]

            const lcm = new LiveContactMap({
                traces,
                genomeId: 'hg38', chr: 'chr1',
                genomicStart: 0, genomicEnd: 60000, binSize: 30000,
                distanceThreshold: 4,
                contactMode: 'frequency'
            })
            await lcm.init()

            // Trace 0: d=3 < 4, in contact. Trace 1: d=5 >= 4, not in contact.
            // Frequency = 0.5
            assert.equal(lcm.contactRecords.length, 1)
            assert.closeTo(lcm.contactRecords[0].counts, 0.5, 0.001)
        })

        test('getContactFrequencies returns matrix', async function () {
            const traces = [
                [{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}]
            ]

            const lcm = new LiveContactMap({
                traces,
                genomeId: 'hg38', chr: 'chr1',
                genomicStart: 0, genomicEnd: 60000, binSize: 30000,
                distanceThreshold: 10,
                contactMode: 'frequency'
            })
            await lcm.init()

            const freq = lcm.getContactFrequencies()
            assert.ok(freq)
            assert.instanceOf(freq, Float32Array)
        })
    })

    suite('updateVertexData', function () {

        test('replaces data and recomputes', async function () {
            const lcm = new LiveContactMap({
                traces: [[{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}]],
                genomeId: 'hg38', chr: 'chr1',
                genomicStart: 0, genomicEnd: 60000, binSize: 30000,
                distanceThreshold: 10
            })
            await lcm.init()

            const oldDistance = lcm.distanceMatrix[1] // d(0,1) = 3

            // Update with farther apart vertices
            lcm.updateVertexData([
                [{x: 0, y: 0, z: 0}, {x: 50, y: 0, z: 0}]
            ])

            const newDistance = lcm.distanceMatrix[1] // d(0,1) = 50
            assert.notEqual(oldDistance, newDistance)
            assert.closeTo(newDistance, 50, 0.001)
        })
    })
})
