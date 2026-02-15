import {assert} from 'chai'
import {parseSWT} from '../src/swtParser.js'
import fs from 'fs'

suite('SWT Parser', function () {

    let swtText
    let parsed

    suiteSetup(function () {
        swtText = fs.readFileSync('resources/ball-and-stick.swt', 'utf-8')
        parsed = parseSWT(swtText)
    })

    test('header - sample name', function () {
        assert.equal(parsed.sample, 'IMR90')
    })

    test('header - genome ID', function () {
        assert.equal(parsed.genomeId, 'hg38')
    })

    test('chromosome', function () {
        assert.equal(parsed.chr, 'chr21')
    })

    test('genomic start', function () {
        assert.equal(parsed.genomicStart, 18000000)
    })

    test('genomic end', function () {
        assert.equal(parsed.genomicEnd, 19950000)
    })

    test('bin size', function () {
        assert.equal(parsed.binSize, 30000)
    })

    test('trace count', function () {
        assert.equal(parsed.traceCount, 1277)
    })

    test('trace length (bins per trace)', function () {
        assert.equal(parsed.traceLength, 65)
    })

    test('first vertex of first trace', function () {
        const v = parsed.traces[0][0]
        assert.equal(v.x, 117803)
        assert.equal(v.y, 58446)
        assert.equal(v.z, 1733)
        assert.isUndefined(v.isMissingData)
    })

    test('second vertex of first trace', function () {
        const v = parsed.traces[0][1]
        assert.equal(v.x, 117726)
        assert.equal(v.y, 58747)
        assert.equal(v.z, 1680)
    })

    test('all traces have same length', function () {
        for (let i = 0; i < parsed.traces.length; i++) {
            assert.equal(parsed.traces[i].length, parsed.traceLength,
                `trace ${i} has ${parsed.traces[i].length} bins, expected ${parsed.traceLength}`)
        }
    })

    test('parse minimal SWT text', function () {
        const text = [
            '##format=sw1 name=Test genome=hg19',
            'chromosome\tstart\tend\tx\ty\tz',
            'trace 0',
            'chr1 100000 130000 10 20 30',
            'chr1 130000 160000 40 50 60',
            'trace 1',
            'chr1 100000 130000 11 21 31',
            'chr1 130000 160000 41 51 61'
        ].join('\n')

        const result = parseSWT(text)
        assert.equal(result.sample, 'Test')
        assert.equal(result.genomeId, 'hg19')
        assert.equal(result.chr, 'chr1')
        assert.equal(result.genomicStart, 100000)
        assert.equal(result.genomicEnd, 160000)
        assert.equal(result.binSize, 30000)
        assert.equal(result.traceCount, 2)
        assert.equal(result.traceLength, 2)
        assert.deepEqual(result.traces[0][0], {x: 10, y: 20, z: 30})
        assert.deepEqual(result.traces[1][1], {x: 41, y: 51, z: 61})
    })

    test('missing data vertex', function () {
        const text = [
            '##format=sw1 name=Test genome=hg19',
            'chromosome\tstart\tend\tx\ty\tz',
            'trace 0',
            'chr1 100000 130000 NaN NaN NaN',
            'chr1 130000 160000 40 50 60'
        ].join('\n')

        const result = parseSWT(text)
        assert.isTrue(result.traces[0][0].isMissingData)
        assert.isUndefined(result.traces[0][1].isMissingData)
    })

    test('invalid header throws', function () {
        assert.throws(() => parseSWT('not a valid file'), /Invalid SWT format/)
    })
})
