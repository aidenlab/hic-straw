import { assert } from 'chai';
import { describe, it } from 'vitest';

import HicFile from '../src/hicFile.js'
import NodeLocalFile from '../src/io/nodeLocalFile.mjs'
import Straw from "../src/index.js"

describe('HicFile-2', function () {

    const file = new NodeLocalFile({
        "path": "test/data/testFiles/testBp.hic",
    })

    it('read header and footer', async function () {

        const hicFile = new HicFile({file: file})
        await hicFile.readHeaderAndFooter()
        assert.equal(hicFile.magic, "HIC")
        await hicFile.readFooter();

    })

    it('local file contact records', async function () {

        const straw = new Straw({file: file})
        const contactRecords = await straw.getContactRecords(
            undefined,
            {chr: "0", start: 0, end: 100000000},
            {chr: "0", start: 0, end: 100000000},
            "BP",
            10000
        )

        assert.ok(contactRecords)
        assert.equal(contactRecords.length, 2500)
    })

    it('local file nvi', async function () {

        const hicFile = new HicFile({file: file})
        const matrix = await hicFile.getMatrix(0, 0)
        assert.ok(matrix)

        await hicFile.readNormExpectedValuesAndNormVectorIndex();
        const nvi = hicFile.config.nvi;
        assert.equal(nvi, "1904,4");
    })



})
