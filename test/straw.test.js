import {assert} from 'chai';
import { describe, it } from 'vitest';
import Straw from '../src/straw.js';
import NodeLocalFile from '../src/io/nodeLocalFile.mjs';

describe('Straw', function () {

    it('local file meta data', async function () {

        const file = new NodeLocalFile({
            "path": "test/data/test_chr22.hic"
        })
        const straw = new Straw({file: file})

        const meta = await straw.getMetaData()
        assert.ok(meta)
        assert.equal(meta.version, 8)
        assert.equal(meta.genome, "hg19")
        assert.equal(meta.chromosomes.length, 26)
        assert.equal(meta.resolutions.length, 9)

    })

    it('local file norm vector options', async function () {

        const file = new NodeLocalFile({
            "path": "test/data/test_chr22.hic"
        })
        const straw = new Straw({file: file})

        const normalizationOptions = await straw.getNormalizationOptions()
        assert.ok(normalizationOptions)
        assert.equal(normalizationOptions.length, 4)
    })

    it('local file nvi', async function () {

        const file = new NodeLocalFile({
            "path": "test/data/test_chr22.hic"
        })
        const straw = new Straw({file: file})

        const nvi = await straw.getNVI()
        assert.equal(nvi, "1720269,751")
    })

    it('local file contact records', async function () {

        const file = new NodeLocalFile({
            "path": "test/data/test_chr22.hic"
        })
        const straw = new Straw({file: file})

        const contactRecords = await straw.getContactRecords(
            "KR",
            {chr: "chr22", start: 50000000, end: 100000000},
            {chr: "22", start: 50000000, end: 100000000},
            "BP",
            100000
        )

        assert.ok(contactRecords)
        assert.equal(contactRecords.length, 70)
    })

    it('local file contact records - with NVI', async function () {

        const file = new NodeLocalFile({
            "path": "test/data/test_chr22.hic"
        })
        const straw = new Straw({file: file})

        const contactRecords = await straw.getContactRecords(
            "KR",
            {chr: "22", start: 50000000, end: 100000000},
            {chr: "22", start: 50000000, end: 100000000},
            "BP",
            100000
        )

        assert.ok(contactRecords)
        assert.equal(contactRecords.length, 70)
    })

    // Remote test data: test_chr22.hic (v8, hg19) served from the igv-data repo.
    // The former intra_nofrag_30.hic fixtures (igv.org.test / igv.broadinstitute.org)
    // were retired upstream and are no longer reachable.
    it('remote file contact records', async function () {

        const straw = new Straw({
            "url": "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/data/test/hic/test_chr22.hic",
            "nvi": "1720269,751"
        })

        const contactRecords = await straw.getContactRecords(
            "KR",
            {chr: "22", start: 50000000, end: 100000000},
            {chr: "22", start: 50000000, end: 100000000},
            "BP",
            100000
        )

        assert.equal(contactRecords.length, 70)

    }, 100000)

    it('Version 8 file', async function () {

        const straw = new Straw({
            "url": "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/data/test/hic/test_chr22.hic"
        })
        const contactRecords = await straw.getContactRecords(
            "NONE",
            {chr: "22", start: 50000000, end: 100000000},
            {chr: "22", start: 50000000, end: 100000000},
            "BP",
            100000
        )

        assert.ok(contactRecords.length > 0)

    }, 100000)

    it('norm vectors', async function () {

        const straw = new Straw({
            "url": "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/data/test/hic/test_chr22.hic"
        })
        const normOptions = await straw.getNormalizationOptions();
        assert.equal(normOptions.length, 4)
    }, 100000)

    it('norm vectors - with NVI', async function () {

        const straw = new Straw({
            "url": "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/data/test/hic/test_chr22.hic",
            "nvi": "1720269,751"
        })
        const normOptions = await straw.getNormalizationOptions();
        assert.equal(normOptions.length, 4)

    }, 100000)

    // Normalized query with no NVI supplied, forcing the norm vector index to be
    // located over the wire.  Must agree with the NVI-supplied case above.
    //
    // This replaces a former test against a GEO-hosted fixture
    // (ftp.ncbi.nlm.nih.gov/geo/samples/GSM2583nnn/GSM2583729) that was withdrawn
    // upstream and now returns 403.
    it('remote file contact records - without NVI', async function () {

        const straw = new Straw({
            "url": "https://raw.githubusercontent.com/igvteam/igv-data/refs/heads/main/data/test/hic/test_chr22.hic"
        })
        const contactRecords = await straw.getContactRecords(
            "KR",
            {chr: "22", start: 50000000, end: 100000000},
            {chr: "22", start: 50000000, end: 100000000},
            "BP",
            100000
        )

        assert.equal(contactRecords.length, 70)

    }, 100000)


    it('remote file transpose', async function () {
        const straw = new Straw({
            "url": "https://hicfiles.s3.amazonaws.com/hiseq/gm12878/in-situ/primary.hic",
            "nvi": "33860030033,37504"
        })

        const blockBinCount = 685;
        const binSize = 25000;

        // cell [1,1]
        const start = 2 * blockBinCount * binSize;
        const contactRecords = await straw.getContactRecords(
            "KR",
            {chr: "22", start: start, end: start + 3 * binSize},
            {chr: "22", start: start, end: start + 3 * binSize},
            "BP",
            binSize
        )
        assert.equal(contactRecords.length, 6);

        // convention is bin2 > bin1,  other diagonal can be inferred by transposition
        for(let record of contactRecords) {
            assert.ok(record.bin2 >= record.bin1)
        }
    }, 100000)

    it('remote file transpose 2', async function () {
        const straw = new Straw({
            "url": "https://hicfiles.s3.amazonaws.com/hiseq/gm12878/in-situ/primary.hic",
            "nvi": "33860030033,37504"
        })

        const blockBinCount = 685;
        const binSize = 25000;

        // cell [1,2]
        const region1 = {chr: "8", start: 2 * blockBinCount * binSize, end: (2 * blockBinCount + 5) * binSize};
        const region2 = {chr: "8", start: 3 * blockBinCount * binSize, end: (3 * blockBinCount + 5)  * binSize};
        const contactRecords = await straw.getContactRecords(
            "NONE",
            region1,
            region2,
            "BP",
            binSize
        )

        const contactRecordsTranposed = await straw.getContactRecords(
            "NONE",
            region2,
            region1,
            "BP",
            binSize
        )
        assert.equal(contactRecordsTranposed.length, contactRecords.length);
    }, 100000)

    it('contact records - inter chr', async function () {

        const straw = new Straw({
            "url": "https://hicfiles.s3.amazonaws.com/hiseq/gm12878/in-situ/primary.hic"
        })

        let region1 = {chr: "22", start: 0, end: 342500000}
        let region2 = {chr: "X", start: 0, end: 342500000}

        const contactRecords = await straw.getContactRecords(
            "NONE",
            region1,
            region2,
            "BP",
            500000
        )
        assert.equal(21720, contactRecords.length)

        const contactRecordsTransposed = await straw.getContactRecords(
            "NONE",
            region2,
            region1,
            "BP",
            500000
        )
        assert.equal(contactRecords.length, contactRecordsTransposed.length)


    }, 100000)


})
