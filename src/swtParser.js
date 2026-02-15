/**
 * Parser for Spacewalk Text (SWT) format files — ball & stick style.
 *
 * SWT format:
 *   Line 1: ##format=sw1 name=<sample> genome=<genomeId>
 *   Line 2: chromosome  start  end  x  y  z   (column headers)
 *   Remaining: blocks of trace data, each beginning with "trace <N>"
 *              followed by whitespace-delimited data lines:
 *              chromosome  startBP  endBP  x  y  z
 */

/**
 * Parse SWT text format into structured trace/vertex data.
 *
 * @param {string} swtText - Raw SWT file content
 * @returns {{
 *   sample: string,
 *   genomeId: string,
 *   chr: string,
 *   genomicStart: number,
 *   genomicEnd: number,
 *   binSize: number,
 *   traceCount: number,
 *   traceLength: number,
 *   traces: Array<Array<{x: number, y: number, z: number, isMissingData?: boolean}>>
 * }}
 */
function parseSWT(swtText) {

    const lines = swtText.split(/\r?\n/)

    // Parse header line: ##format=sw1 name=IMR90 genome=hg38
    const headerLine = lines[0]
    if (!headerLine || !headerLine.startsWith('##format=sw1')) {
        throw new Error('Invalid SWT format: expected ##format=sw1 header')
    }

    const headerTokens = headerLine.split(/\s+/)
    let sample = undefined
    let genomeId = undefined

    for (const token of headerTokens) {
        if (token.startsWith('name=')) {
            sample = token.substring(5)
        } else if (token.startsWith('genome=')) {
            genomeId = token.substring(7)
        }
    }

    if (!sample) throw new Error('SWT header missing name property')
    if (!genomeId) throw new Error('SWT header missing genome property')

    // Skip line 2 (column headers)
    // Parse remaining lines into traces
    const traces = []
    let currentTrace = null
    let chr = undefined
    let genomicStart = undefined
    let genomicEnd = undefined
    let binSize = undefined

    for (let i = 2; i < lines.length; i++) {

        const line = lines[i].trim()
        if (line.length === 0) continue

        const tokens = line.split(/\s+/)

        if (tokens[0] === 'trace') {
            // Start a new trace
            currentTrace = []
            traces.push(currentTrace)
            continue
        }

        if (currentTrace === null) {
            // Data line before any trace delimiter — skip or error
            continue
        }

        // Data line: chromosome  startBP  endBP  x  y  z
        if (tokens.length < 6) continue

        const lineChr = tokens[0]
        const startBP = parseInt(tokens[1], 10)
        const endBP = parseInt(tokens[2], 10)
        const x = parseFloat(tokens[3])
        const y = parseFloat(tokens[4])
        const z = parseFloat(tokens[5])

        // Set chromosome from first data line
        if (chr === undefined) {
            chr = lineChr
        }

        // Track genomic extent
        if (genomicStart === undefined || startBP < genomicStart) {
            genomicStart = startBP
        }
        if (genomicEnd === undefined || endBP > genomicEnd) {
            genomicEnd = endBP
        }

        // Derive bin size from first data line
        if (binSize === undefined) {
            binSize = endBP - startBP
        }

        // Create vertex
        const isMissingData = isNaN(x) || isNaN(y) || isNaN(z)
        const vertex = { x, y, z }
        if (isMissingData) {
            vertex.isMissingData = true
        }

        currentTrace.push(vertex)
    }

    if (traces.length === 0) {
        throw new Error('SWT file contains no traces')
    }

    const traceLength = traces[0].length

    return {
        sample,
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

export { parseSWT }
