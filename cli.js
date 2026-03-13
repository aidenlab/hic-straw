#!/usr/bin/env node
import NodeLocalFile from "./src/io/nodeLocalFile.mjs"
import Straw from "./src/index.js"

const [, , ...args] = process.argv
const usageString = "Usage: $straw normalization hicfile region1 region2 units resolution"
const a = prepArgs(args)

if (a.options.has("--meta") && a.positional.length === 1) {
    printMetaData(a.positional[0])

} else if (a.options.has("--norms") && a.positional.length === 1) {
    printNormalization(a.positional[0])

} else if (a.options.has("--nvi") && a.positional.length === 1) {
    printNVI(a.positional[0])
}
else if (a.positional.length >= 6) {

    printContacts(a.positional)

} else {
    console.log(usageString)
    process.exit(1)
}

function prepArgs(args) {
    const a = {
        options: new Set(),
        positional: []
    }
    for (let arg of args) {
        if (arg.startsWith("-")) {
            a.options.add(arg)
        } else {
            a.positional.push(arg)
        }
    }
    return a
}

async function printNVI(filepath) {
    const straw = getStraw(filepath);
    const nvi = await straw.getNVI()
    console.log('nvi=' + nvi)
}

async function printNormalization(filepath) {
    const straw = getStraw(filepath);
    const norms = await straw.getNormalizationOptions()
    console.log(norms)
}

async function printMetaData(filepath) {
    const straw = getStraw(filepath);
    const meta = await straw.getMetaData()
    console.log(JSON.stringify(meta, null, 2))
}

async function printContacts(args) {

    const normalization = args[0]
    const filepath = args[1]
    const region1 = args[2]
    const region2 = args[3]
    const units = args[4]
    const resolution = parseInt(args[5].replace(/(,)/g, ""))
    try {
        const contactRecords = await fetchContacts(normalization, filepath, region1, region2, units, resolution)

        for (record of contactRecords) {
            console.log(record.bin1.toString() + "\t" + record.bin2.toString() + "\t" + record.counts.toString())
        }
    } catch (e) {
        console.error(e)
    }
}

async function fetchContacts(normalization, filepath, region1, region2, units, resolution) {

    const r1 = parseRegion(region1)
    const r2 = parseRegion(region2)
    const straw = getStraw(filepath);
    return straw.getContactRecords(normalization, r1, r2, units, resolution)

}

function parseRegion(region) {

    const t1 = region.split(":")

    const chr = t1[0]
    let start
    let end
    if (t1.length === 0) {
        start = 0
        end = Number.MAX_VALUE
    } else if (t1.length === 2) {
        const t2 = t1[1].split("-")
        if (t2.length == 2) {
            start = parseInt(t2[0].replace(/(,)/g, ""))
            end = parseInt(t2[1].replace(/(,)/g, ""))
        } else {
            console.error("Unrecognized region: " + region)
            process.exit(1)
        }
    } else if (t1.length === 3) {
        // todo validate
        start = parseInt(t1[1].replace(/(,)/g, ""))
        end = parseInt(t1[2].replace(/(,)/g, ""))
    } else {
        console.error("Unrecognized region: " + region)
        process.exit(1)
    }
    return {
        chr: chr,
        start: start,
        end: end
    }
}

function getStraw(filepath) {
    if(filepath.startsWith("http://") || filepath.startsWith("https://")) {
        return new Straw({url: filepath});
    } else {
        const nodeLocalFile = new NodeLocalFile({path: filepath})
        return new Straw({file: nodeLocalFile})
    }
}


// args:  region1, region2, resolution, normalization, units


// "KR",
//     {chr: "8",start: 50000000, end: 100000000},
//     {chr: "8",start: 50000000, end: 100000000},
//     "BP",
//     100000
// )