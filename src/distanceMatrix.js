/**
 * Pairwise Euclidean distance computation for 3D vertex data.
 *
 * Produces NxN distance matrices (Float32Array, row-major) from arrays of
 * {x, y, z} vertices. Supports single-trace and ensemble-averaged computation.
 */

const DISTANCE_UNDEFINED = -1

/**
 * Compute pairwise distance matrix for a single trace.
 *
 * @param {Array<{x: number, y: number, z: number, isMissingData?: boolean}>} vertices
 * @param {number} traceLength - N (number of bins)
 * @returns {{ distances: Float32Array, maxDistance: number }}
 *   distances is NxN in row-major order. Symmetric, diagonal = 0.
 *   Missing data positions contain DISTANCE_UNDEFINED (-1).
 */
function computeTraceDistances(vertices, traceLength) {

    const distances = new Float32Array(traceLength * traceLength)
    distances.fill(DISTANCE_UNDEFINED)

    let maxDistance = 0

    for (let i = 0; i < traceLength; i++) {

        const vi = vertices[i]
        if (vi.isMissingData) continue

        // Diagonal is always 0
        distances[i * traceLength + i] = 0

        for (let j = i + 1; j < traceLength; j++) {

            const vj = vertices[j]
            if (vj.isMissingData) continue

            const dx = vi.x - vj.x
            const dy = vi.y - vj.y
            const dz = vi.z - vj.z
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

            distances[i * traceLength + j] = dist
            distances[j * traceLength + i] = dist

            if (dist > maxDistance) {
                maxDistance = dist
            }
        }
    }

    return { distances, maxDistance }
}

/**
 * Compute ensemble-averaged distance matrix across multiple traces.
 *
 * For each cell (i, j), computes the mean Euclidean distance across all traces
 * that have valid (non-missing) data at both positions i and j.
 *
 * @param {Array<Array<{x: number, y: number, z: number, isMissingData?: boolean}>>} traces
 * @param {number} traceLength - N (number of bins, same for all traces)
 * @returns {{ distances: Float32Array, maxDistance: number }}
 */
function computeEnsembleDistances(traces, traceLength) {

    const N = traceLength
    const distanceSum = new Float64Array(N * N)
    const countMatrix = new Uint32Array(N * N)

    for (const vertices of traces) {

        for (let i = 0; i < N; i++) {

            const vi = vertices[i]
            if (vi.isMissingData) continue

            for (let j = i + 1; j < N; j++) {

                const vj = vertices[j]
                if (vj.isMissingData) continue

                const dx = vi.x - vj.x
                const dy = vi.y - vj.y
                const dz = vi.z - vj.z
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

                const ij = i * N + j
                const ji = j * N + i

                distanceSum[ij] += dist
                distanceSum[ji] += dist
                countMatrix[ij] += 1
                countMatrix[ji] += 1
            }
        }
    }

    // Compute averages
    const distances = new Float32Array(N * N)
    distances.fill(DISTANCE_UNDEFINED)

    let maxDistance = 0

    for (let i = 0; i < N; i++) {
        distances[i * N + i] = 0  // Diagonal
        for (let j = i + 1; j < N; j++) {
            const idx = i * N + j
            if (countMatrix[idx] > 0) {
                const avg = distanceSum[idx] / countMatrix[idx]
                distances[idx] = avg
                distances[j * N + i] = avg
                if (avg > maxDistance) {
                    maxDistance = avg
                }
            }
        }
    }

    return { distances, maxDistance }
}

export { computeTraceDistances, computeEnsembleDistances, DISTANCE_UNDEFINED }
