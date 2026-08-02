const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null

class RemoteFile {

    constructor(args) {
        this.config = args
        const mapped = defaultMapUrl(args.path || args.url)
        this.url = this.config.mapUrl ? this.config.mapUrl(mapped) : mapped
    }


    async read(position, length) {

        length = Math.ceil(length)
        const headers = {...this.config.headers}
        const rangeString = "bytes=" + position + "-" + (position + length - 1)
        headers['Range'] = rangeString

        let url = this.url.slice()    // slice => copy
        headers['User-Agent'] = 'IGV'
        if (this.config.oauthToken) {
            const token = resolveToken(this.config.oauthToken)
            headers['Authorization'] = `Bearer ${token}`
        }
        if (this.config.apiKey) {
            url = addParameter(url, "key", this.config.apiKey)
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            redirect: 'follow',
            mode: 'cors',

        })

        const status = response.status

        if (status >= 400) {
            // statusText is empty over HTTP/2, so build a message that is never blank
            const err = Error(`${status} ${response.statusText || 'error'} — ${url}`)
            err.code = status
            err.headers = response.headers   // Headers instance, filtered by CORS in the browser
            err.url = url                    // the url actually fetched, after mapping
            throw err
        } else {
            return response.arrayBuffer()
        }

        /**
         * token can be a string, a function that returns a string, or a function that returns a Promise for a string
         * @param token
         * @returns {Promise<*>}
         */
        async function resolveToken(token) {
            if (typeof token === 'function') {
                return await Promise.resolve(token())    // Normalize the result to a promise, since we don't know what the function returns
            } else {
                return token
            }
        }

    }
}


function defaultMapUrl(url) {

    if (url.includes("//www.dropbox.com")) {
        return url.replace("//www.dropbox.com", "//dl.dropboxusercontent.com")
    } else if (url.startsWith("ftp://ftp.ncbi.nlm.nih.gov")) {
        return url.replace("ftp://", "https://")
    } else {
        return url
    }
}


function addParameter(url, name, value) {
    const paramSeparator = url.includes("?") ? "&" : "?"
    return url + paramSeparator + name + "=" + value
}


export default RemoteFile
export {defaultMapUrl}
