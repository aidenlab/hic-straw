import { assert } from 'chai';

import HicFile from '../src/hicFile.js'
import NodeLocalFile from '../src/io/nodeLocalFile.mjs'

suite('HicFile', function () {

    test('local file read header', async function () {

        const file = new NodeLocalFile({
            "path": "test/data/test_chr22.hic",
        })
        const hicFile = new HicFile({file: file})

        await hicFile.readHeaderAndFooter()
        assert.equal(hicFile.magic, "HIC")
    })

    test('local file read matrix', async function () {

        const file = new NodeLocalFile({
            "path": "test/data/test_chr22.hic",
        })
        const hicFile = new HicFile({file: file})
        const matrix = await hicFile.getMatrix(22, 22)
        assert.ok(matrix)
    })


    test('local file read norm vector index', async function () {

        const file = new NodeLocalFile({
            "path": "test/data/test_chr22.hic"
        })
        const hicFile = new HicFile({file: file})

        const normVectorIndex = await hicFile.getNormVectorIndex()
        assert.ok(normVectorIndex)

    })

    test('local file read norm vector', async function () {

        const file = new NodeLocalFile({
            "path": "test/data/test_chr22.hic",
        })
        const hicFile = new HicFile({file: file})

        const type = "KR"
        const chr = "22"
        const unit = "BP"
        const binSize = 100000
        const normVector = await hicFile.getNormalizationVector(type, chr, unit, binSize)
        assert.equal(normVector.nValues, 515)
    })

    test('v9 file', async function () {

        this.timeout(200000);

        const hicFile = new HicFile({url: "https://www.encodeproject.org/files/ENCFF053VBX/@@download/ENCFF053VBX.hic"})

        await hicFile.readHeaderAndFooter()
        assert.equal(hicFile.magic, "HIC")

        assert.equal(hicFile.normVectorIndexPosition, 54305946375);

        const normVectorIndex = await hicFile.getNormVectorIndex()
        assert.ok(normVectorIndex)
    })

})
