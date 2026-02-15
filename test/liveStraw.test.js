import {assert} from 'chai'
import Straw from '../src/straw.js'
import LiveContactMap from '../src/liveContactMap.js'
import fs from 'fs'

suite('Straw with LiveContactMap', function () {

    this.timeout(10000)

    let straw

    suiteSetup(async function () {
        const swtText = fs.readFileSync('resources/ball-and-stick.swt', 'utf-8')
        const lcm = new LiveContactMap({
            swtText,
            distanceThreshold: 500,
            neighborExclusion: 3
        })
        await lcm.init()

        straw = new Straw({ liveContactMap: lcm })
    })

    test('straw.hicFile is the LiveContactMap', function () {
        assert.ok(straw.hicFile)
        assert.instanceOf(straw.hicFile, LiveContactMap)
    })

    test('getMetaData', async function () {
        const meta = await straw.getMetaData()
        assert.ok(meta)
        assert.equal(meta.genome, 'hg38')
        assert.isArray(meta.chromosomes)
        assert.isArray(meta.resolutions)
        assert.deepEqual(meta.resolutions, [30000])
    })

    test('getContactRecords', async function () {
        const records = await straw.getContactRecords(
            'NONE',
            {chr: 'chr21', start: 18000000, end: 19950000},
            {chr: 'chr21', start: 18000000, end: 19950000},
            'BP',
            30000
        )
        assert.isArray(records)
        assert.isAbove(records.length, 0)

        // Verify record structure
        const rec = records[0]
        assert.isNumber(rec.bin1)
        assert.isNumber(rec.bin2)
        assert.isNumber(rec.counts)
        assert.isFunction(rec.getKey)
    })

    test('getNormalizationOptions', async function () {
        const options = await straw.getNormalizationOptions()
        assert.deepEqual(options, ['NONE'])
    })

    test('getFileChrName resolves aliases', function () {
        assert.equal(straw.getFileChrName('chr21'), 'chr21')
        assert.equal(straw.getFileChrName('21'), 'chr21')
    })

    test('getFileChrName passes through unknown aliases', function () {
        assert.equal(straw.getFileChrName('chrX'), 'chrX')
    })

    test('contact records respond to threshold change', async function () {
        const lcm = straw.hicFile
        const region = {chr: 'chr21', start: 18000000, end: 19950000}

        const recordsBefore = await straw.getContactRecords('NONE', region, region, 'BP', 30000)
        const countBefore = recordsBefore.length
        assert.isAbove(countBefore, 0, 'should have contacts at threshold=500')

        // Use a very small threshold to ensure we get fewer contacts.
        // With 1277 traces averaged, most bin pairs will have mean distances
        // well above 1, so threshold=1 should yield far fewer contacts.
        lcm.setDistanceThreshold(1)
        const recordsAfter = await straw.getContactRecords('NONE', region, region, 'BP', 30000)
        const countAfter = recordsAfter.length

        assert.isBelow(countAfter, countBefore)

        // Restore for other tests
        lcm.setDistanceThreshold(500)
    })

    test('end-to-end: simulates Juicebox HiCDataset usage pattern', async function () {
        // This mirrors what HiCDataset.init() does:
        //   this.hicFile = this.straw.hicFile
        //   await this.hicFile.init()
        //   this.genomeId = this.hicFile.genomeId
        //   this.chromosomes = this.hicFile.chromosomes
        //   this.bpResolutions = this.hicFile.bpResolutions
        //   this.wholeGenomeChromosome = this.hicFile.wholeGenomeChromosome

        const hicFile = straw.hicFile
        await hicFile.init()

        assert.equal(hicFile.genomeId, 'hg38')
        assert.isArray(hicFile.chromosomes)
        assert.isArray(hicFile.bpResolutions)
        assert.deepEqual(hicFile.bpResolutions, [30000])

        // Normalization types
        assert.deepEqual(hicFile.normalizationTypes, ['NONE'])

        // getMatrix (simulates contactMatrixView.js usage)
        const chrIndex = hicFile.chromosomes.findIndex(c => c.name === 'chr21')
        assert.isAbove(chrIndex, -1)

        const matrix = await hicFile.getMatrix(chrIndex, chrIndex)
        assert.ok(matrix)

        const zd = matrix.getZoomDataByIndex(0, 'BP')
        assert.ok(zd)
        assert.equal(zd.zoom.binSize, 30000)
        assert.equal(zd.zoom.unit, 'BP')
        assert.isNumber(zd.averageCount)
        assert.ok(zd.chr1)
        assert.ok(zd.chr2)

        // getContactRecords (simulates contactMatrixView.getImageTile)
        const records = await hicFile.getContactRecords(
            'NONE',
            {chr: 'chr21', start: 18000000, end: 18300000},
            {chr: 'chr21', start: 18000000, end: 18300000},
            'BP',
            30000
        )
        assert.isArray(records)

        // hasNormalizationVector
        const hasNorm = await hicFile.hasNormalizationVector('VC', 'chr21', 'BP', 30000)
        assert.isFalse(hasNorm)
    })
})
