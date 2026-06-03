import { assert } from 'chai';
import { describe, it } from 'vitest';
import RemoteFile from '../src/io/remoteFile.js';
import ThrottledFile from '../src/io/throttledFile.js';
import RateLimiter from '../src/io/rateLimiter.js';


describe('ThrottledFile', function () {

    it('test read range', async function () {

        // Was https://s3.amazonaws.com/igv.org.test/data/BufferedReaderTest.bin (retired).
        // Same fixture, now vendored in the igv.js repo (pinned to a release tag).
        const url = "https://raw.githubusercontent.com/igvteam/igv.js/v3.7.0/test/data/misc/BufferedReaderTest.bin"

        const limiter = new RateLimiter(100)
        const file = new ThrottledFile(new RemoteFile({url: url}), limiter)


        for (let start = 25; start < 125; start += 10) {
            const range = {start: start, size: 10};
            const arrayBuffer = await file.read(range.start, range.size)
            assert.ok(arrayBuffer);
            const dataView = new DataView(arrayBuffer);
            for (let i = 0; i < range.size; i++) {
                const expectedValue = -128 + range.start + i;
                const value = dataView.getInt8(i);
                assert.equal(expectedValue, value);
            }
        }
    }, 600000)

})
