/**
 * Parser for Spacewalk Binary (.sw / .swb) HDF5 format — ball & stick style.
 *
 * HDF5 layout consumed (SINGLE_POINT only in V1):
 *   /Header                           group with attrs { genome, format, point_type }
 *   /<ensembleGroup>/genomic_position/regions   flat [chr, start, end, ...]
 *   /<ensembleGroup>/spatial_position/t_<n>     flat [x, y, z, ...]
 *
 * Assumptions:
 *   - Exactly one ensemble group (the first non-Header/_index root key is used).
 *   - Exactly one genomic region shared by all traces.
 *   - point_type is SINGLE_POINT (pointcloud / multi_point is not yet supported).
 *
 * Output shape matches parseSWT() so LiveContactMap consumes it unchanged.
 */

import { loadLiveVertices } from './liveVertexLoader.js'
import { openH5File } from 'hdf5-indexed-reader'

/**
 * @param {object} source - Exactly one of file, url, or path must be provided.
 * @param {File|Blob} [source.file]
 * @param {string}    [source.url]
 * @param {string}    [source.path]   Node only
 * @returns {Promise<{
 *   sample: string,
 *   genomeId: string,
 *   chr: string,
 *   genomicStart: number,
 *   genomicEnd: number,
 *   binSize: number,
 *   traceCount: number,
 *   traceLength: number,
 *   traces: Array<Array<{x: number, y: number, z: number, isMissingData?: boolean}>>
 * }>}
 */
async function parseSW({ file, url, path } = {}) {

    if (!file && !url && !path) {
        throw new Error('parseSW requires one of: file, url, path')
    }

    // Override hdf5-indexed-reader's default fetchSize=2000/maxSize=200000. Those
    // defaults generate ~100 sequential 2KB range requests to load the embedded
    // JSON index on a ~12MB file, which on high-latency hosts (Dropbox ~500ms
    // RTT) turns a 0.6MB open into a ~60s wait. 64KB pages + 4MB LRU fetch the
    // index in a handful of requests and avoid cache thrash.
    const source = file ? { file } : url ? { url } : { path }
    const hdf5 = await openH5File({ ...source, fetchSize: 65536, maxSize: 4_000_000 })

    // --- Header ---
    const headerGroup = await hdf5.get('/Header')
    if (!headerGroup) throw new Error('SW file missing /Header group')
    const headerAttrs = await headerGroup.attrs
    const genomeId = headerAttrs.genome
    const pointType = (headerAttrs.point_type || '').toString().toLowerCase()

    if (pointType && pointType !== 'single_point') {
        throw new Error(`SW point_type "${headerAttrs.point_type}" is not supported (V1: SINGLE_POINT only)`)
    }

    // --- Ensemble group (assume single; pick first) ---
    const rootKeys = (await hdf5.keys).filter(k => k !== 'Header' && k !== '_index')
    if (rootKeys.length === 0) {
        throw new Error('SW file contains no ensemble group')
    }
    const ensembleGroupKey = rootKeys[0]

    // --- Genomic regions ---
    // `regions` is a flat [chr, start, end, chr, start, end, ...] array, one
    // entry per *bin* within a single locus. Derive the locus extent from the
    // first/last bins; verify all bins share one chromosome.
    const regionsDataset = await hdf5.get(`${ensembleGroupKey}/genomic_position/regions`)
    if (!regionsDataset) throw new Error(`SW file missing ${ensembleGroupKey}/genomic_position/regions`)
    const regionValues = await regionsDataset.value

    if (regionValues.length < 3 || regionValues.length % 3 !== 0) {
        throw new Error(`SW regions dataset has invalid length ${regionValues.length}`)
    }

    const chr = String(regionValues[0])
    for (let i = 3; i < regionValues.length; i += 3) {
        if (String(regionValues[i]) !== chr) {
            throw new Error(`SW file spans multiple chromosomes (${chr}, ${regionValues[i]}); V1 supports a single-locus file`)
        }
    }
    const regionCount = regionValues.length / 3
    const genomicStart = parseInt(regionValues[1], 10)
    const genomicEnd = parseInt(regionValues[regionValues.length - 1], 10)

    // --- Trace vertex data ---
    // Delegates to loadLiveVertices: tries the baked `live_contact_map_vertices`
    // fast path, else reads spatial_position/t_* sequentially. Sequential
    // fallback avoids remote-host rate limits (e.g. Dropbox 429).
    const traces = await loadLiveVertices({ hdf5, ensembleGroupKey })

    const traceLength = traces[0].length
    if (traceLength !== regionCount) {
        throw new Error(`SW trace length (${traceLength}) does not match region count (${regionCount})`)
    }
    const binSize = Math.round((genomicEnd - genomicStart) / traceLength)

    return {
        sample: headerAttrs.name || ensembleGroupKey,
        genomeId,
        chr,
        genomicStart,
        genomicEnd,
        binSize,
        traceCount: traces.length,
        traceLength,
        traces
    }
}

export { parseSW }
