/**
 * Load per-trace vertex lists for a .sw (HDF5, ball-and-stick) file.
 *
 * Priority:
 *   1. <ensembleGroupKey>/live_contact_map_vertices — baked fast path.
 *      Shape [traceCount, traceLength, 3], float32, NaN for missing.
 *      One dataset read collapses what would otherwise be N-traces
 *      worth of range requests — critical for remote hosts that
 *      rate-limit (e.g. Dropbox 429).
 *   2. <ensembleGroupKey>/spatial_position/t_<n> — fallback.
 *      Read sequentially to avoid saturating remote hosts.
 *
 * Bake format is versioned via Header attr `live_contact_map_vertices_version`.
 * Unknown versions fall through to the t_* fallback.
 */

const BAKE_VERSION = 1

async function loadLiveVertices({ hdf5, ensembleGroupKey }) {

    if (!hdf5) throw new Error('loadLiveVertices requires an open hdf5 handle')
    if (!ensembleGroupKey) throw new Error('loadLiveVertices requires ensembleGroupKey')

    const baked = await tryReadBaked(hdf5, ensembleGroupKey)
    if (baked) return baked

    return readTracesFromSpatialGroup(hdf5, ensembleGroupKey)
}

async function tryReadBaked(hdf5, ensembleGroupKey) {

    const ensembleGroup = await hdf5.get(ensembleGroupKey)
    if (!ensembleGroup) return null

    const keys = await ensembleGroup.keys
    if (!keys.includes('live_contact_map_vertices')) return null

    const headerGroup = await hdf5.get('/Header')
    const headerAttrs = headerGroup ? await headerGroup.attrs : {}
    const bakeVersion = headerAttrs.live_contact_map_vertices_version
    if (bakeVersion !== undefined && Number(bakeVersion) !== BAKE_VERSION) {
        return null
    }

    const ds = await ensembleGroup.get('live_contact_map_vertices')
    const shape = await ds.shape
    if (!shape) return null

    // v1 canonical: [traceCount, traceLength, 3].
    // Legacy: [traceCount * traceLength, 3] — infer traceLength from regions.
    let traceCount, traceLength
    if (shape.length === 3 && shape[2] === 3) {
        traceCount = shape[0]
        traceLength = shape[1]
    } else if (shape.length === 2 && shape[1] === 3) {
        traceLength = await readTraceLengthFromRegions(ensembleGroup)
        if (!traceLength || shape[0] % traceLength !== 0) return null
        traceCount = shape[0] / traceLength
    } else {
        return null
    }

    const flat = await ds.value
    return unpackBakedVertices(flat, traceCount, traceLength)
}

async function readTraceLengthFromRegions(ensembleGroup) {
    const regionsDataset = await ensembleGroup.get('genomic_position/regions')
    if (!regionsDataset) return null
    const regionsShape = await regionsDataset.shape
    if (!regionsShape) return null
    // regions is a flat [chr, start, end, ...] triple per bin.
    const total = regionsShape.reduce((a, b) => a * b, 1)
    if (total % 3 !== 0) return null
    return total / 3
}

function unpackBakedVertices(flat, traceCount, traceLength) {
    const traces = new Array(traceCount)
    let cursor = 0
    for (let t = 0; t < traceCount; t++) {
        const trace = new Array(traceLength)
        for (let i = 0; i < traceLength; i++) {
            const x = flat[cursor++]
            const y = flat[cursor++]
            const z = flat[cursor++]
            const vertex = { x, y, z }
            if (isNaN(x) || isNaN(y) || isNaN(z)) vertex.isMissingData = true
            trace[i] = vertex
        }
        traces[t] = trace
    }
    return traces
}

async function readTracesFromSpatialGroup(hdf5, ensembleGroupKey) {

    const spatialGroup = await hdf5.get(`${ensembleGroupKey}/spatial_position`)
    if (!spatialGroup) {
        throw new Error(`SW file missing ${ensembleGroupKey}/spatial_position`)
    }

    const traceKeys = (await spatialGroup.keys)
        .filter(k => /^t_\d+$/.test(k))
        .sort((a, b) => parseInt(a.slice(2), 10) - parseInt(b.slice(2), 10))

    if (traceKeys.length === 0) {
        throw new Error(`SW file contains no trace datasets at ${ensembleGroupKey}/spatial_position`)
    }

    const traces = []
    for (const key of traceKeys) {
        const ds = await spatialGroup.get(key)
        const values = await ds.value
        traces.push(flatToVertexList(values))
    }
    return traces
}

function flatToVertexList(numbers) {
    if (numbers.length % 3 !== 0) {
        // Pointcloud .sw files store spatial_position/t_* as flat
        // [region_id, x, y, z] quadruples, not xyz triples. loadLiveVertices
        // is ball-and-stick-only (V1); the caller must collapse pointcloud
        // traces to per-region centroids before handing them to LiveContactMap.
        throw new Error(
            `loadLiveVertices: spatial_position/t_* length ${numbers.length} is not a multiple of 3 — ` +
            `looks like a pointcloud file, which is not yet supported by this path`
        )
    }
    const list = new Array(numbers.length / 3)
    for (let i = 0, j = 0; i < numbers.length; i += 3, j++) {
        const x = numbers[i]
        const y = numbers[i + 1]
        const z = numbers[i + 2]
        const vertex = { x, y, z }
        if (isNaN(x) || isNaN(y) || isNaN(z)) vertex.isMissingData = true
        list[j] = vertex
    }
    return list
}

export { loadLiveVertices, BAKE_VERSION }
