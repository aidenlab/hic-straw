import {assert} from 'chai'
import {describe, it, afterEach, vi} from 'vitest'
import RemoteFile, {defaultMapUrl} from '../src/io/remoteFile.js'

// Synthetic responses only.  The motivating failure -- an AWS WAF captcha challenge -- cannot be
// reproduced here: it keys on the Origin header, which node never sends.  It is verified by hand
// in a browser instead.

function stubFetch(response, capture) {
    vi.stubGlobal('fetch', async (url, init) => {
        if (capture) {
            capture.url = url
            capture.init = init
        }
        return response
    })
}

describe('defaultMapUrl', function () {

    it('rewrites a dropbox share link to the direct-download host', function () {
        assert.equal(
            defaultMapUrl('https://www.dropbox.com/s/abc123/matrix.hic?dl=0'),
            'https://dl.dropboxusercontent.com/s/abc123/matrix.hic?dl=0')
    })

    it('rewrites an ncbi ftp url to https', function () {
        assert.equal(
            defaultMapUrl('ftp://ftp.ncbi.nlm.nih.gov/pub/matrix.hic'),
            'https://ftp.ncbi.nlm.nih.gov/pub/matrix.hic')
    })

    it('passes an unrelated url through untouched', function () {
        const url = 'https://hicfiles.s3.amazonaws.com/hiseq/gm12878/in-situ/primary.hic'
        assert.equal(defaultMapUrl(url), url)
    })
})

describe('RemoteFile url mapping', function () {

    it('applies the default rules when no mapUrl is supplied', function () {
        const file = new RemoteFile({url: 'https://www.dropbox.com/s/abc123/matrix.hic'})
        assert.equal(file.url, 'https://dl.dropboxusercontent.com/s/abc123/matrix.hic')
    })

    it('composes a supplied mapUrl on top of the default rules', function () {
        const file = new RemoteFile({
            url: 'https://www.encodeproject.org/files/ENCFF464WXY/@@download/ENCFF464WXY.hic',
            mapUrl: url => url.replace('https://www.encodeproject.org', 'http://localhost:9000/encode')
        })
        assert.equal(file.url, 'http://localhost:9000/encode/files/ENCFF464WXY/@@download/ENCFF464WXY.hic')
    })

    it('still applies the default rules when a mapUrl is supplied', function () {
        // A consumer supplying mapUrl for one host must not lose the dropbox rewrite for another.
        const seen = []
        const file = new RemoteFile({
            url: 'https://www.dropbox.com/s/abc123/matrix.hic',
            mapUrl: url => {
                seen.push(url)
                return url
            }
        })
        assert.equal(seen[0], 'https://dl.dropboxusercontent.com/s/abc123/matrix.hic')
        assert.equal(file.url, 'https://dl.dropboxusercontent.com/s/abc123/matrix.hic')
    })

    it('maps a path argument as well as a url argument', function () {
        const file = new RemoteFile({path: 'ftp://ftp.ncbi.nlm.nih.gov/pub/matrix.hic'})
        assert.equal(file.url, 'https://ftp.ncbi.nlm.nih.gov/pub/matrix.hic')
    })
})

describe('RemoteFile read', function () {

    afterEach(function () {
        vi.unstubAllGlobals()
    })

    it('requests the byte range it was asked for, from the mapped url', async function () {
        const capture = {}
        stubFetch({status: 200, arrayBuffer: async () => new ArrayBuffer(128)}, capture)

        const file = new RemoteFile({
            url: 'https://example.org/matrix.hic',
            mapUrl: url => url.replace('https://example.org', 'http://localhost:9000')
        })
        await file.read(0, 128)

        assert.equal(capture.url, 'http://localhost:9000/matrix.hic')
        assert.equal(capture.init.headers['Range'], 'bytes=0-127')
    })

    it('does not mutate the headers object it was configured with', async function () {
        const headers = {'Authorization': 'Bearer xyz'}
        stubFetch({status: 200, arrayBuffer: async () => new ArrayBuffer(16)})

        const file = new RemoteFile({url: 'https://example.org/matrix.hic', headers})
        await file.read(0, 16)

        assert.deepEqual(headers, {'Authorization': 'Bearer xyz'})
    })

    it('carries response detail on the thrown error', async function () {
        stubFetch({
            status: 405,
            statusText: '',                                        // empty over HTTP/2
            headers: new Headers({'X-Amzn-Waf-Action': 'captcha'})
        })

        const file = new RemoteFile({
            url: 'https://www.encodeproject.org/files/ENCFF464WXY/@@download/ENCFF464WXY.hic',
            mapUrl: url => url.replace('https://www.encodeproject.org', 'http://localhost:9000/encode')
        })

        let error
        try {
            await file.read(0, 16)
        } catch (e) {
            error = e
        }

        assert.ok(error, 'read should reject on a 405')
        assert.equal(error.code, 405)
        assert.equal(error.headers.get('x-amzn-waf-action'), 'captcha')
        assert.equal(error.url, 'http://localhost:9000/encode/files/ENCFF464WXY/@@download/ENCFF464WXY.hic')
        assert.isNotEmpty(error.message)
    })
})
