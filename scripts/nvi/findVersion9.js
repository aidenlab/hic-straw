// Script to find .hic files at 4dn and Encode that are version 9 or higher from a list of URLs in text files.
// Used to find files for testing.


import fs from 'fs'
import HicFile from "../../src/hicFile.js"

const files = ['4dn.txt', 'encode.txt']

const urlsToUpdate = []

(async () => {
  const versionPromises = [];
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
        const p = hicFile.getVersion().then(version => {
          if (version > 8) console.log(`${hicURL} is version ${version}`)
        }).catch(err => {
          console.error(`Error getting version for ${hicURL}:`, err)
        });
        versionPromises.push(p);
      }
    })
  }
  await Promise.all(versionPromises);

  if (urlsToUpdate.length > 0) {
    for(const url of urlsToUpdate) {
      console.log(url)
    }
  }
})();
if (urlsToUpdate.length > 0) {
    for(const url of urlsToUpdate) {
        console.log(url)
    }
}
