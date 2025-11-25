// Script to find .hic files at 4dn and Encode that are version 9 or higher from a list of URLs in text files.
// Used to find files for testing.


import fs from 'fs'
import nviTable from '../../src/nvi.js'
import RemoteFile from "../../src/io/remoteFile.js"
import Straw from "../../src/index.js"
import HicFile from "../../src/hicFile.js"

const files = ['4dn.txt', 'encode.txt']

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
            const hicFile = new HicFile({url: hicURL})
            hicFile.getVersion().then( version => {
              if(version > 8) console.log(`${hicURL} is version ${version}`)
            })
        }
    })
}

if (urlsToUpdate.length > 0) {
    for(const url of urlsToUpdate) {
        console.log(url)
    }
}
