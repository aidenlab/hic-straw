import {assert} from 'chai'
import { describe, it, beforeAll } from 'vitest';
import {deriveContactRecords, deriveEnsembleContactFrequencies} from '../src/contactDerivation.js'
import {computeTraceDistances, DISTANCE_UNDEFINED} from '../src/distanceMatrix.js'

describe('Contact Derivation', function () {

    // Shared test data: 4-vertex trace
    // (0,0,0), (3,0,0), (0,4,0), (100,0,0)
    // d(0,1) = 3, d(0,2) = 4, d(0,3) = 100
    // d(1,2) = 5, d(1,3) = 97
    // d(2,3) ≈ 100.08
    const vertices = [
        {x: 0, y: 0, z: 0},
        {x: 3, y: 0, z: 0},
        {x: 0, y: 4, z: 0},
        {x: 100, y: 0, z: 0}
    ]

    let distances

    beforeAll(function () {
        const result = computeTraceDistances(vertices, 4)
        distances = result.distances
    })

    describe('deriveContactRecords', function () {

        it('threshold captures close pairs only', function () {
            // threshold = 6: should capture d(0,1)=3, d(0,2)=4, d(1,2)=5
            const records = deriveContactRecords(distances, 4, 6)
            const offDiagonal = records.filter(r => r.bin1 !== r.bin2)
            assert.equal(offDiagonal.length, 3)

            const keys = offDiagonal.map(r => r.getKey())
            assert.include(keys, '0_1')
            assert.include(keys, '0_2')
            assert.include(keys, '1_2')
        })

        it('all contacts with large threshold', function () {
            // threshold = 200: should capture all 6 off-diagonal pairs (4 choose 2)
            const records = deriveContactRecords(distances, 4, 200)
            assert.equal(records.filter(r => r.bin1 !== r.bin2).length, 6)
        })

        it('no contacts with zero threshold', function () {
            // No off-diagonal contacts; the main-diagonal self-contacts remain.
            const records = deriveContactRecords(distances, 4, 0)
            assert.equal(records.filter(r => r.bin1 !== r.bin2).length, 0)
        })

        it('emits a self-contact record for every main-diagonal bin', function () {
            // The main diagonal is emitted unconditionally — even at threshold 0,
            // where no off-diagonal pair is in contact — so the map carries a
            // bright reference diagonal like a real Hi-C map.
            const records = deriveContactRecords(distances, 4, 0)
            const diagonal = records.filter(r => r.bin1 === r.bin2)
            assert.equal(diagonal.length, 4)
            for (const rec of diagonal) {
                assert.equal(rec.counts, 1)
            }
        })

        it('binary counts (always 1)', function () {
            const records = deriveContactRecords(distances, 4, 200)
            for (const rec of records) {
                assert.equal(rec.counts, 1)
            }
        })

        it('skips DISTANCE_UNDEFINED cells', function () {
            // Create a distance matrix with a missing cell
            const d = new Float32Array(4)
            d[0] = 0
            d[1] = DISTANCE_UNDEFINED
            d[2] = DISTANCE_UNDEFINED
            d[3] = 0

            const records = deriveContactRecords(d, 2, 100)
            assert.equal(records.filter(r => r.bin1 !== r.bin2).length, 0)
        })

        it('ContactRecord objects have correct interface', function () {
            const records = deriveContactRecords(distances, 4, 6)
            const rec = records[0]
            assert.isNumber(rec.bin1)
            assert.isNumber(rec.bin2)
            assert.isNumber(rec.counts)
            assert.typeOf(rec.getKey(), 'string')
        })
    })

    describe('deriveEnsembleContactFrequencies', function () {

        it('single trace frequency equals binary contact', function () {
            // With one trace, frequency is either 0 or 1
            const {contactRecords} = deriveEnsembleContactFrequencies([vertices], 4, 6)
            const offDiagonal = contactRecords.filter(r => r.bin1 !== r.bin2)
            assert.equal(offDiagonal.length, 3)
            for (const rec of offDiagonal) {
                assert.equal(rec.counts, 1)
            }
        })

        it('emits a self-contact record and sets diagonal frequency to 1', function () {
            // The main diagonal is emitted unconditionally — even at threshold 0.
            const {contactRecords, contactFrequencies} =
                deriveEnsembleContactFrequencies([vertices], 4, 0)
            const diagonal = contactRecords.filter(r => r.bin1 === r.bin2)
            assert.equal(diagonal.length, 4)
            for (let i = 0; i < 4; i++) {
                assert.equal(contactFrequencies[i * 4 + i], 1)
            }
        })

        it('two traces - one in contact, one not', function () {
            // Trace 0: d(0,1) = 3 (in contact at threshold 4)
            // Trace 1: d(0,1) = 5 (NOT in contact at threshold 4)
            // Frequency = 0.5
            const traces = [
                [{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}],
                [{x: 0, y: 0, z: 0}, {x: 5, y: 0, z: 0}]
            ]

            const {contactRecords, contactFrequencies} = deriveEnsembleContactFrequencies(traces, 2, 4)

            const offDiagonal = contactRecords.filter(r => r.bin1 !== r.bin2)
            assert.equal(offDiagonal.length, 1)
            assert.closeTo(offDiagonal[0].counts, 0.5, 0.001)
            assert.closeTo(contactFrequencies[0 * 2 + 1], 0.5, 0.001)
            assert.closeTo(contactFrequencies[1 * 2 + 0], 0.5, 0.001)
        })

        it('frequency values are between 0 and 1', function () {
            const traces = [
                [{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}, {x: 10, y: 0, z: 0}],
                [{x: 0, y: 0, z: 0}, {x: 5, y: 0, z: 0}, {x: 2, y: 0, z: 0}],
                [{x: 0, y: 0, z: 0}, {x: 1, y: 0, z: 0}, {x: 8, y: 0, z: 0}]
            ]

            const {contactRecords} = deriveEnsembleContactFrequencies(traces, 3, 6)

            for (const rec of contactRecords) {
                assert.isAtLeast(rec.counts, 0)
                assert.isAtMost(rec.counts, 1)
            }
        })

        it('missing data in some traces - frequency based on valid traces only', function () {
            // Trace 0: vertex 0 missing → pair (0,1) invalid for this trace
            // Trace 1: d(0,1) = 3 → in contact at threshold 5
            // Frequency should be 1.0 (1 out of 1 valid trace)
            const traces = [
                [{x: 0, y: 0, z: 0, isMissingData: true}, {x: 3, y: 0, z: 0}],
                [{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}]
            ]

            const {contactRecords} = deriveEnsembleContactFrequencies(traces, 2, 5)
            const offDiagonal = contactRecords.filter(r => r.bin1 !== r.bin2)
            assert.equal(offDiagonal.length, 1)
            assert.closeTo(offDiagonal[0].counts, 1.0, 0.001)
        })

        it('contactFrequencies matrix is symmetric', function () {
            const traces = [
                [{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}, {x: 0, y: 4, z: 0}],
                [{x: 1, y: 1, z: 1}, {x: 4, y: 1, z: 1}, {x: 1, y: 5, z: 1}]
            ]

            const {contactFrequencies} = deriveEnsembleContactFrequencies(traces, 3, 6)

            for (let i = 0; i < 3; i++) {
                for (let j = i + 1; j < 3; j++) {
                    const fij = contactFrequencies[i * 3 + j]
                    const fji = contactFrequencies[j * 3 + i]
                    if (fij !== DISTANCE_UNDEFINED) {
                        assert.closeTo(fij, fji, 0.001)
                    }
                }
            }
        })
    })
})
