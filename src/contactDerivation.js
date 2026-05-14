/**
 * Contact record derivation from distance matrices.
 *
 * Applies a distance threshold to a pairwise distance matrix to produce
 * ContactRecord objects suitable for the hic-straw / Juicebox pipeline.
 */

import ContactRecord from './contactRecord.js'
import { DISTANCE_UNDEFINED } from './distanceMatrix.js'

/**
 * Derive contact records from an (ensemble-averaged) distance matrix.
 * Produces binary contacts: counts = 1 for each pair within threshold.
 *
 * @param {Float32Array} distances - N×N distance matrix (row-major)
 * @param {number} traceLength - N
 * @param {number} distanceThreshold - pairs with distance < threshold are contacts
 * @returns {ContactRecord[]} Upper-triangle contact records, plus one
 *   self-contact record (counts = 1) for every main-diagonal bin
 */
function deriveContactRecords(distances, traceLength, distanceThreshold) {

    const records = []

    for (let i = 0; i < traceLength; i++) {

        // Main diagonal: a locus is always in contact with itself. Emitted
        // unconditionally so the synthetic map carries the bright reference
        // diagonal that real Hi-C maps show. See discussions/main-diagonal-rendering.md.
        records.push(new ContactRecord(i, i, 1))

        for (let j = i + 1; j < traceLength; j++) {

            const dist = distances[i * traceLength + j]

            if (dist === DISTANCE_UNDEFINED) continue
            if (dist < distanceThreshold) {
                records.push(new ContactRecord(i, j, 1))
            }
        }
    }

    return records
}

/**
 * Derive contact records using ensemble contact frequency.
 *
 * For each bin pair (i, j), checks every trace independently: if the distance
 * in that trace is below the threshold, it counts as a contact for that trace.
 * The final counts value is the fraction of traces where the pair is in contact
 * (a value between 0.0 and 1.0).
 *
 * @param {Array<Array<{x: number, y: number, z: number, isMissingData?: boolean}>>} traces
 * @param {number} traceLength - N
 * @param {number} distanceThreshold - distance cutoff for contact
 * @returns {{ contactRecords: ContactRecord[], contactFrequencies: Float32Array }}
 *   contactRecords includes one self-contact (counts = 1) per main-diagonal
 *   bin; contactFrequencies has 1 on the main diagonal.
 */
function deriveEnsembleContactFrequencies(traces, traceLength, distanceThreshold) {

    const N = traceLength

    // For each pair, count contacts across traces and total valid traces
    const contactCount = new Uint32Array(N * N)
    const validCount = new Uint32Array(N * N)

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
                validCount[ij] += 1

                if (dist < distanceThreshold) {
                    contactCount[ij] += 1
                }
            }
        }
    }

    // Build contact records and frequency matrix
    const contactFrequencies = new Float32Array(N * N)
    contactFrequencies.fill(DISTANCE_UNDEFINED)

    const contactRecords = []

    for (let i = 0; i < N; i++) {

        // Main diagonal: self-contact frequency is 1 by definition. Emitted
        // unconditionally so the map carries the bright reference diagonal that
        // real Hi-C maps show. See discussions/main-diagonal-rendering.md.
        contactFrequencies[i * N + i] = 1
        contactRecords.push(new ContactRecord(i, i, 1))

        for (let j = i + 1; j < N; j++) {
            const ij = i * N + j
            if (validCount[ij] > 0) {
                const freq = contactCount[ij] / validCount[ij]
                contactFrequencies[ij] = freq
                contactFrequencies[j * N + i] = freq

                if (freq > 0) {
                    contactRecords.push(new ContactRecord(i, j, freq))
                }
            }
        }
    }

    return { contactRecords, contactFrequencies }
}

export { deriveContactRecords, deriveEnsembleContactFrequencies }
