import { assert } from 'chai';
import { describe, it } from 'vitest';

import NodeLocalFile from '../src/io/nodeLocalFile.mjs'

const range = {start: 25, size: 100};

describe('NodeLocalFile', function () {

    it('test read range', async function () {

        const path = "test/data/BufferedReaderTest.bin"

        const file = new NodeLocalFile({path: path})
        const arrayBuffer = await file.read(range.start, range.size)
        assert.ok(arrayBuffer);

        const dataView = new DataView(arrayBuffer);

        for (let i = 0; i < range.size; i++) {
            const expectedValue = -128 + range.start + i;
            const value = dataView.getInt8(i);
            assert.equal(expectedValue, value);

        }

    })

})
