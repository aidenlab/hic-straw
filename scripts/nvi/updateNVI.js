#!/usr/bin/env node


// Update the nviTable with missing entries from given text files containing hic URLs.
// For each URL not already in nviTable, fetch its NVI using Straw and print the key-value pair.

import fs from 'fs'
import nviTable from '../../src/nvi.js'
import RemoteFile from "../../src/io/remoteFile.js"
import Straw from "../../src/index.js"

const files = ['4dn.txt', 'encode.txt']

const createKey = (hicURL) => {
    const withoutScheme = hicURL.replace(/^https:\/\//i, '')
    return encodeURIComponent(withoutScheme)
}

const urlsToUpdate = []

for (const fname of files) {
    // Resolve file path relative to this script (works in ESM)
    const fileUrl = new URL(`./${fname}`, import.meta.url)
    const text = fs.readFileSync(fileUrl, 'utf8')
    const lines = text.split(/\r?\n/)

    lines.forEach((line) => {
        // Print even empty lines to preserve structure
        const hicURL = line.trim()

        if (hicURL) {
            const key = createKey(hicURL)
            const nvi = nviTable[key]
            if (nvi === undefined) {
                urlsToUpdate.push(hicURL)
            }
        }
    })
}

if (urlsToUpdate.length > 0) {
    for(const url of urlsToUpdate) {
        const file = new RemoteFile({url: url})
        const straw = new Straw({file: file})
        const nvi = await straw.getNVI()
        const key = createKey(url)
        console.log(`"${key}": "${nvi}",`)
    }
}
