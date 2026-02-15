/**
 * LiveContactMap — an in-memory adapter that implements the HicFile interface
 * for synthetic contact maps derived from 3D chromosome vertex data.
 *
 * Computes a pairwise distance matrix from 3D vertex positions (single trace
 * or ensemble-averaged), then derives contact records by applying a distance
 * threshold. Fully compatible with Straw and Juicebox.js — downstream consumers
 * cannot distinguish this from a real .hic file.
 *
 * Usage:
 *   const lcm = new LiveContactMap({ swtText, distanceThreshold: 200 })
 *   await lcm.init()
 *   const records = await lcm.getContactRecords('NONE', region1, region2, 'BP', 30000)
 */

import ContactRecord from './contactRecord.js'
import { parseSWT } from './swtParser.js'
import { computeEnsembleDistances, DISTANCE_UNDEFINED } from './distanceMatrix.js'
import { deriveContactRecords, deriveEnsembleContactFrequencies } from './contactDerivation.js'


/**
 * Lightweight Matrix-like object returned by getMatrix().
 * Implements the minimal interface that Juicebox's contactMatrixView expects.
 */
class LiveMatrix {

    constructor(chr1, chr2, zoomData) {
        this.chr1 = chr1
        this.chr2 = chr2
        this._zoomData = zoomData
    }

    getZoomData(binSize, unit) {
        return this._zoomData
    }

    getZoomDataByIndex(index, unit) {
        return this._zoomData
    }

    findZoomForResolution(binSize, unit) {
        return 0
    }
}


class LiveContactMap {

    /**
     * @param {object} config
     * @param {string} [config.swtText] - Raw SWT text to parse (option A)
     * @param {object} [config.parsedData] - Pre-parsed SWT data (option B)
     * @param {Array} [config.traces] - Raw trace vertex arrays (option C)
     * @param {Array} [config.chromosomes] - Chromosome array [{index, name, size}]
     * @param {string} [config.genomeId] - Genome identifier (e.g. "hg38")
     * @param {string} [config.chr] - Chromosome name (e.g. "chr21")
     * @param {number} [config.genomicStart] - Start position in bp
     * @param {number} [config.genomicEnd] - End position in bp
     * @param {number} [config.binSize] - Bin size in bp
     * @param {number} [config.traceLength] - Number of bins per trace
     * @param {number} [config.distanceThreshold=200] - Initial distance threshold
     * @param {number} [config.neighborExclusion=0] - Neighbor bins to exclude
     * @param {string} [config.contactMode='frequency'] - 'contact' or 'frequency'
     * @param {string} [config.name] - Dataset name
     */
    constructor(config) {
        this.config = config
        this.initialized = false
    }

    // =========================================================================
    // HicFile interface — methods that Straw and Juicebox call
    // =========================================================================

    /**
     * Initialize the adapter. Parses input data, computes distance matrix,
     * derives contact records. Safe to call multiple times (idempotent).
     */
    async init() {

        if (this.initialized) return

        const config = this.config

        // --- Resolve input data ---
        let traces, genomeId, chr, genomicStart, genomicEnd, binSize, traceLength, sample

        if (config.swtText) {
            const parsed = parseSWT(config.swtText)
            traces = parsed.traces
            genomeId = config.genomeId || parsed.genomeId
            chr = config.chr || parsed.chr
            genomicStart = config.genomicStart !== undefined ? config.genomicStart : parsed.genomicStart
            genomicEnd = config.genomicEnd !== undefined ? config.genomicEnd : parsed.genomicEnd
            binSize = config.binSize || parsed.binSize
            traceLength = parsed.traceLength
            sample = parsed.sample
        } else if (config.parsedData) {
            const pd = config.parsedData
            traces = pd.traces
            genomeId = config.genomeId || pd.genomeId
            chr = config.chr || pd.chr
            genomicStart = config.genomicStart !== undefined ? config.genomicStart : pd.genomicStart
            genomicEnd = config.genomicEnd !== undefined ? config.genomicEnd : pd.genomicEnd
            binSize = config.binSize || pd.binSize
            traceLength = pd.traceLength
            sample = pd.sample
        } else if (config.traces) {
            traces = config.traces
            genomeId = config.genomeId
            chr = config.chr
            genomicStart = config.genomicStart
            genomicEnd = config.genomicEnd
            binSize = config.binSize
            traceLength = config.traceLength || traces[0].length
            sample = config.name
        } else {
            throw new Error('LiveContactMap requires swtText, parsedData, or traces in config')
        }

        // --- Store core data ---
        this.traces = traces
        this.traceLength = traceLength
        this.binSize = binSize
        this.genomicStart = genomicStart
        this.genomicEnd = genomicEnd
        this.distanceThreshold = config.distanceThreshold !== undefined ? config.distanceThreshold : 200
        this.neighborExclusion = config.neighborExclusion || 0
        this.contactMode = config.contactMode || 'frequency'

        // Bin offset: converts trace-relative indices (0..N-1) to absolute
        // bin indices that match genomic coordinates (genomicStart/binSize).
        // In a real .hic file, bin index = genomicPosition / binSize.
        this.binOffset = Math.floor(genomicStart / binSize)

        // --- Build HicFile-compatible metadata ---
        this.genomeId = genomeId
        this.version = 0  // Synthetic — not a real .hic file version

        // Chromosomes: use provided array or build from SWT data
        if (config.chromosomes) {
            this.chromosomes = config.chromosomes
        } else {
            // Minimal chromosome array: just the chromosome from the SWT data
            const chrSize = genomicEnd  // Use genomic end as minimum chromosome size
            this.chromosomes = [
                { index: 0, name: 'All', size: chrSize },
                { index: 1, name: chr, size: chrSize }
            ]
        }

        // Resolution: single resolution matching the bin size
        this.bpResolutions = [binSize]
        this.fragResolutions = []

        // Whole genome support (not needed for single-region live maps)
        this.wholeGenomeChromosome = this.chromosomes.find(c => c.name === 'All') || null
        this.wholeGenomeResolution = this.wholeGenomeChromosome
            ? Math.round(this.wholeGenomeChromosome.size * (1000 / 500))
            : null

        // Normalization: only NONE for live maps
        this.normalizationTypes = ['NONE']
        this.normVectorIndex = {}

        // Chromosome index map and alias table
        this.chromosomeIndexMap = {}
        this.chrAliasTable = {}
        for (const c of this.chromosomes) {
            this.chromosomeIndexMap[c.name] = c.index
            this.chrAliasTable[c.name] = c.name

            // Add common aliases: "chr21" <-> "21"
            if (c.name.startsWith('chr')) {
                const bare = c.name.substring(3)
                this.chrAliasTable[bare] = c.name
            } else if (c.name !== 'All') {
                this.chrAliasTable['chr' + c.name] = c.name
            }
        }

        // Meta object (returned by getMetaData)
        this.meta = {
            version: this.version,
            genome: this.genomeId,
            chromosomes: this.chromosomes,
            resolutions: this.bpResolutions
        }

        // --- Compute distance matrix ---
        this._computeDistances()

        // --- Derive contact records ---
        this._deriveContacts()

        this.initialized = true
    }

    /**
     * @returns {Promise<{version: number, genome: string, chromosomes: Array, resolutions: Array}>}
     */
    async getMetaData() {
        await this.init()
        return this.meta
    }

    /**
     * Get contact records for a region pair.
     *
     * @param {string} normalization - Normalization type (only "NONE" supported)
     * @param {{chr: string, start: number, end: number}} region1
     * @param {{chr: string, start: number, end: number}} region2
     * @param {string} units - "BP" (only BP supported)
     * @param {number} binsize - Bin size in base pairs
     * @returns {Promise<ContactRecord[]>}
     */
    async getContactRecords(normalization, region1, region2, units, binsize) {

        await this.init()

        const x1 = Math.floor(region1.start / binsize)
        const x2 = Math.ceil(region1.end / binsize)
        const y1 = Math.floor(region2.start / binsize)
        const y2 = Math.ceil(region2.end / binsize)

        const result = []

        for (const rec of this.contactRecords) {

            // Upper triangle: rec.bin1 < rec.bin2
            if (rec.bin1 >= x1 && rec.bin1 < x2 && rec.bin2 >= y1 && rec.bin2 < y2) {
                result.push(rec)
            }
            // Lower triangle (symmetric): swap bin1 and bin2
            if (rec.bin1 !== rec.bin2 &&
                rec.bin2 >= x1 && rec.bin2 < x2 && rec.bin1 >= y1 && rec.bin1 < y2) {
                result.push(new ContactRecord(rec.bin2, rec.bin1, rec.counts))
            }
        }

        return result
    }

    /**
     * Get matrix for a chromosome pair.
     * Returns a lightweight Matrix-like object with a single zoom level.
     *
     * @param {number} chrIdx1 - Chromosome index
     * @param {number} chrIdx2 - Chromosome index
     * @returns {Promise<LiveMatrix|undefined>}
     */
    async getMatrix(chrIdx1, chrIdx2) {

        await this.init()

        const chr1 = this.chromosomes[chrIdx1]
        const chr2 = this.chromosomes[chrIdx2]
        if (!chr1 || !chr2) return undefined

        // Compute statistics from current contact records
        let sumCounts = 0
        for (const rec of this.contactRecords) {
            sumCounts += rec.counts
        }
        const nBins = this.traceLength
        const averageCount = nBins > 0 ? sumCounts / (nBins * nBins) : 0

        const zoomData = {
            chr1,
            chr2,
            zoom: { index: 0, binSize: this.binSize, unit: 'BP' },
            averageCount,
            sumCounts,
            blockBinCount: this.traceLength,
            blockColumnCount: 1,
            stdDev: 0,
            occupiedCellCount: this.contactRecords.length,
            percent95: 0
        }

        return new LiveMatrix(chr1, chr2, zoomData)
    }

    /**
     * @returns {Promise<boolean>} Always false — live maps don't support normalization vectors
     */
    async hasNormalizationVector(type, chr, unit, binSize) {
        return false
    }

    /**
     * @returns {Promise<string[]>} Always ['NONE']
     */
    async getNormalizationOptions() {
        return this.normalizationTypes || ['NONE']
    }

    /**
     * Resolve a chromosome alias to the canonical name.
     * @param {string} chrAlias
     * @returns {string}
     */
    getFileChrName(chrAlias) {
        if (this.chrAliasTable && this.chrAliasTable.hasOwnProperty(chrAlias)) {
            return this.chrAliasTable[chrAlias]
        }
        return chrAlias
    }

    /**
     * No caches to clear for in-memory data.
     */
    clearCaches() {
        // no-op
    }

    // =========================================================================
    // Live-map-specific methods
    // =========================================================================

    /**
     * Update the distance threshold and recompute contact records.
     * Does NOT recompute the distance matrix (that is expensive).
     *
     * @param {number} threshold - New distance threshold
     */
    setDistanceThreshold(threshold) {
        this.distanceThreshold = threshold
        if (this.initialized) {
            this._deriveContacts()
        }
    }

    /**
     * Update the neighbor exclusion parameter and recompute contacts.
     *
     * @param {number} k - Number of neighbor bins to exclude
     */
    setNeighborExclusion(k) {
        this.neighborExclusion = k
        if (this.initialized) {
            this._deriveContacts()
        }
    }

    /**
     * Replace the vertex data entirely (e.g., new ensemble loaded).
     * Recomputes everything: distances and contacts.
     *
     * @param {Array<Array<{x, y, z, isMissingData?}>>} traces
     * @param {object} [config] - Optional overrides for genomicStart, genomicEnd, binSize, etc.
     */
    updateVertexData(traces, config = {}) {
        this.traces = traces
        if (config.traceLength !== undefined) this.traceLength = config.traceLength
        else this.traceLength = traces[0].length
        if (config.binSize !== undefined) this.binSize = config.binSize
        if (config.genomicStart !== undefined) this.genomicStart = config.genomicStart
        if (config.genomicEnd !== undefined) this.genomicEnd = config.genomicEnd

        this._computeDistances()
        this._deriveContacts()
    }

    /**
     * Get the raw distance matrix (for distance map visualization).
     * @returns {{ distances: Float32Array, maxDistance: number, traceLength: number }}
     */
    getDistanceMatrix() {
        return {
            distances: this.distanceMatrix,
            maxDistance: this.maxDistance,
            traceLength: this.traceLength
        }
    }

    /**
     * Get the contact frequencies array (for optional RGBA rendering).
     * Only available in 'frequency' mode.
     * @returns {Float32Array|undefined}
     */
    getContactFrequencies() {
        return this.contactFrequencies
    }

    // =========================================================================
    // Internal computation methods
    // =========================================================================

    /**
     * Compute the ensemble-averaged distance matrix from trace vertex data.
     * @private
     */
    _computeDistances() {
        const result = computeEnsembleDistances(this.traces, this.traceLength)
        this.distanceMatrix = result.distances
        this.maxDistance = result.maxDistance
    }

    /**
     * Derive contact records from the distance matrix using the current
     * threshold and neighbor exclusion settings.
     * @private
     */
    _deriveContacts() {

        const options = { neighborExclusion: this.neighborExclusion }
        let rawRecords

        if (this.contactMode === 'frequency') {
            const result = deriveEnsembleContactFrequencies(
                this.traces,
                this.traceLength,
                this.distanceThreshold,
                options
            )
            rawRecords = result.contactRecords
            this.contactFrequencies = result.contactFrequencies
        } else {
            // 'contact' mode: binary contacts from averaged distance matrix
            rawRecords = deriveContactRecords(
                this.distanceMatrix,
                this.traceLength,
                this.distanceThreshold,
                options
            )
            this.contactFrequencies = undefined
        }

        // Apply bin offset to convert trace-relative indices (0..N-1) to absolute
        // bin indices matching genomic coordinates (genomicStart / binSize + i).
        // This is critical for compatibility with Juicebox, which queries by
        // genomic position and computes bin indices as position / binSize.
        const offset = this.binOffset
        if (offset === 0) {
            this.contactRecords = rawRecords
        } else {
            this.contactRecords = rawRecords.map(rec =>
                new ContactRecord(rec.bin1 + offset, rec.bin2 + offset, rec.counts)
            )
        }
    }
}

export default LiveContactMap
