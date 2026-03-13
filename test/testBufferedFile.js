import { assert } from 'chai';
import { describe, it } from 'vitest';
import BufferedFile from '../src/io/bufferedFile.js';
import LocalFile from '../src/io/nodeLocalFile.mjs';
import RemoteFile from '../src/io/remoteFile.js';


describe('BufferedFile', function () {

    it('test local file', async function () {

        const path = "test/data/BufferedReaderTest.bin"

        const file = new BufferedFile({file: new LocalFile({path: path}), size: 50})

        let nTests = 10000
        while (nTests-- > 0) {

            const start = Math.floor(Math.random() * 256)
            let length = Math.floor(Math.random() * 100)
            if (length === 0) continue

            const arrayBuffer = await file.read(start, length)
            assert.ok(arrayBuffer);

            const dataView = new DataView(arrayBuffer);

            // Only test to end of file
            const end = Math.min(length, 256 - start)
            for (let i = 0; i < end; i++) {
                const expectedValue = -128 + start + i;
                const value = dataView.getInt8(i);
                assert.equal(expectedValue, value);

            }
        }
    })

})
