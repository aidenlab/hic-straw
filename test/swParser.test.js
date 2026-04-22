import { assert } from 'chai'
import { describe, it } from 'vitest'
import fs from 'fs'
import { parseSW } from '../src/swParser.js'

// Parser test for the binary Spacewalk (.sw / .swb) HDF5 format.
//
// Requires a fixture at test/data/ball-and-stick.sw. If absent, the suite is
// skipped so CI continues to pass before the fixture is added. Generate one
// per Spacewalk's docs/file-format/creating-data-files.md (h5py).
const FIXTURE = 'test/data/ball-and-stick.sw'

const describeIfFixture = fs.existsSync(FIXTURE) ? describe : describe.skip

describeIfFixture('SW Parser', function () {

    it('parses a binary SW file into the same shape as parseSWT', async function () {

        const parsed = await parseSW({ path: FIXTURE })

        assert.isString(parsed.chr)
        assert.isNumber(parsed.genomicStart)
        assert.isNumber(parsed.genomicEnd)
        assert.isAbove(parsed.genomicEnd, parsed.genomicStart)
        assert.isNumber(parsed.binSize)
        assert.isAbove(parsed.binSize, 0)

        assert.isArray(parsed.traces)
        assert.isAbove(parsed.traces.length, 0)
        assert.equal(parsed.traces.length, parsed.traceCount)

        const first = parsed.traces[0]
        assert.equal(first.length, parsed.traceLength)

        for (const v of first) {
            assert.property(v, 'x')
            assert.property(v, 'y')
            assert.property(v, 'z')
        }
    })
})
