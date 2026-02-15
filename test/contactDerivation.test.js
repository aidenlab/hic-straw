import {assert} from 'chai'
import {deriveContactRecords, deriveEnsembleContactFrequencies} from '../src/contactDerivation.js'
import {computeTraceDistances, DISTANCE_UNDEFINED} from '../src/distanceMatrix.js'

suite('Contact Derivation', function () {

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

    suiteSetup(function () {
        const result = computeTraceDistances(vertices, 4)
        distances = result.distances
    })

    suite('deriveContactRecords', function () {

        test('threshold captures close pairs only', function () {
            // threshold = 6: should capture d(0,1)=3, d(0,2)=4, d(1,2)=5
            const records = deriveContactRecords(distances, 4, 6)
            assert.equal(records.length, 3)

            const keys = records.map(r => r.getKey())
            assert.include(keys, '0_1')
            assert.include(keys, '0_2')
            assert.include(keys, '1_2')
        })

        test('all contacts with large threshold', function () {
            // threshold = 200: should capture all 6 pairs (4 choose 2)
            const records = deriveContactRecords(distances, 4, 200)
            assert.equal(records.length, 6)
        })

        test('no contacts with zero threshold', function () {
            const records = deriveContactRecords(distances, 4, 0)
            assert.equal(records.length, 0)
        })

        test('binary counts (always 1)', function () {
            const records = deriveContactRecords(distances, 4, 200)
            for (const rec of records) {
                assert.equal(rec.counts, 1)
            }
        })

        test('neighbor exclusion K=1 removes adjacent pairs', function () {
            // K=1: skip (0,1), (1,2), (2,3)
            // Remaining: (0,2), (0,3), (1,3)
            // With threshold=6: only (0,2) has d=4 < 6
            const records = deriveContactRecords(distances, 4, 6, {neighborExclusion: 1})
            assert.equal(records.length, 1)
            assert.equal(records[0].getKey(), '0_2')
        })

        test('neighbor exclusion K=2 removes pairs within 2 bins', function () {
            // K=2: skip |i-j| <= 2
            // (0,1) j-i=1 skip, (0,2) j-i=2 skip, (0,3) j-i=3 ok
            // (1,2) j-i=1 skip, (1,3) j-i=2 skip
            // (2,3) j-i=1 skip
            // Only (0,3) remains as candidate. d(0,3)=100 < 200, so 1 record
            const records = deriveContactRecords(distances, 4, 200, {neighborExclusion: 2})
            assert.equal(records.length, 1)
            assert.equal(records[0].getKey(), '0_3')
        })

        test('skips DISTANCE_UNDEFINED cells', function () {
            // Create a distance matrix with a missing cell
            const d = new Float32Array(4)
            d[0] = 0
            d[1] = DISTANCE_UNDEFINED
            d[2] = DISTANCE_UNDEFINED
            d[3] = 0

            const records = deriveContactRecords(d, 2, 100)
            assert.equal(records.length, 0)
        })

        test('ContactRecord objects have correct interface', function () {
            const records = deriveContactRecords(distances, 4, 6)
            const rec = records[0]
            assert.isNumber(rec.bin1)
            assert.isNumber(rec.bin2)
            assert.isNumber(rec.counts)
            assert.isString(rec.getKey())
        })
    })

    suite('deriveEnsembleContactFrequencies', function () {

        test('single trace frequency equals binary contact', function () {
            // With one trace, frequency is either 0 or 1
            const {contactRecords} = deriveEnsembleContactFrequencies([vertices], 4, 6)
            assert.equal(contactRecords.length, 3)
            for (const rec of contactRecords) {
                assert.equal(rec.counts, 1)
            }
        })

        test('two traces - one in contact, one not', function () {
            // Trace 0: d(0,1) = 3 (in contact at threshold 4)
            // Trace 1: d(0,1) = 5 (NOT in contact at threshold 4)
            // Frequency = 0.5
            const traces = [
                [{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}],
                [{x: 0, y: 0, z: 0}, {x: 5, y: 0, z: 0}]
            ]

            const {contactRecords, contactFrequencies} = deriveEnsembleContactFrequencies(traces, 2, 4)

            assert.equal(contactRecords.length, 1)
            assert.closeTo(contactRecords[0].counts, 0.5, 0.001)
            assert.closeTo(contactFrequencies[0 * 2 + 1], 0.5, 0.001)
            assert.closeTo(contactFrequencies[1 * 2 + 0], 0.5, 0.001)
        })

        test('frequency values are between 0 and 1', function () {
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

        test('neighbor exclusion works in frequency mode', function () {
            const traces = [
                [{x: 0, y: 0, z: 0}, {x: 1, y: 0, z: 0}, {x: 2, y: 0, z: 0}]
            ]

            // K=1: only (0,2) is a candidate
            const {contactRecords} = deriveEnsembleContactFrequencies(traces, 3, 100, {neighborExclusion: 1})

            assert.equal(contactRecords.length, 1)
            assert.equal(contactRecords[0].bin1, 0)
            assert.equal(contactRecords[0].bin2, 2)
        })

        test('missing data in some traces - frequency based on valid traces only', function () {
            // Trace 0: vertex 0 missing → pair (0,1) invalid for this trace
            // Trace 1: d(0,1) = 3 → in contact at threshold 5
            // Frequency should be 1.0 (1 out of 1 valid trace)
            const traces = [
                [{x: 0, y: 0, z: 0, isMissingData: true}, {x: 3, y: 0, z: 0}],
                [{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}]
            ]

            const {contactRecords} = deriveEnsembleContactFrequencies(traces, 2, 5)
            assert.equal(contactRecords.length, 1)
            assert.closeTo(contactRecords[0].counts, 1.0, 0.001)
        })

        test('contactFrequencies matrix is symmetric', function () {
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
