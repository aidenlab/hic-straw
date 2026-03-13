import {assert} from 'chai'
import { describe, it } from 'vitest';
import {computeTraceDistances, computeEnsembleDistances, DISTANCE_UNDEFINED} from '../src/distanceMatrix.js'

describe('Distance Matrix', function () {

    describe('computeTraceDistances', function () {

        it('3-vertex trace with known distances', function () {
            // Triangle: (0,0,0), (3,0,0), (0,4,0)
            // d(0,1) = 3, d(0,2) = 4, d(1,2) = 5
            const vertices = [
                {x: 0, y: 0, z: 0},
                {x: 3, y: 0, z: 0},
                {x: 0, y: 4, z: 0}
            ]

            const {distances, maxDistance} = computeTraceDistances(vertices, 3)

            // Diagonal = 0
            assert.equal(distances[0 * 3 + 0], 0)
            assert.equal(distances[1 * 3 + 1], 0)
            assert.equal(distances[2 * 3 + 2], 0)

            // Known distances
            assert.closeTo(distances[0 * 3 + 1], 3, 0.001)
            assert.closeTo(distances[0 * 3 + 2], 4, 0.001)
            assert.closeTo(distances[1 * 3 + 2], 5, 0.001)

            // Symmetric
            assert.equal(distances[0 * 3 + 1], distances[1 * 3 + 0])
            assert.equal(distances[0 * 3 + 2], distances[2 * 3 + 0])
            assert.equal(distances[1 * 3 + 2], distances[2 * 3 + 1])

            // Max distance
            assert.closeTo(maxDistance, 5, 0.001)
        })

        it('3D distance calculation', function () {
            // d((0,0,0), (1,1,1)) = sqrt(3)
            const vertices = [
                {x: 0, y: 0, z: 0},
                {x: 1, y: 1, z: 1}
            ]

            const {distances} = computeTraceDistances(vertices, 2)
            assert.closeTo(distances[0 * 2 + 1], Math.sqrt(3), 0.001)
        })

        it('missing data produces DISTANCE_UNDEFINED', function () {
            const vertices = [
                {x: 0, y: 0, z: 0},
                {x: 1, y: 0, z: 0, isMissingData: true},
                {x: 2, y: 0, z: 0}
            ]

            const {distances} = computeTraceDistances(vertices, 3)

            // Pairs involving vertex 1 are undefined
            assert.equal(distances[0 * 3 + 1], DISTANCE_UNDEFINED)
            assert.equal(distances[1 * 3 + 0], DISTANCE_UNDEFINED)
            assert.equal(distances[1 * 3 + 2], DISTANCE_UNDEFINED)
            assert.equal(distances[2 * 3 + 1], DISTANCE_UNDEFINED)

            // Diagonal of missing vertex is also undefined
            assert.equal(distances[1 * 3 + 1], DISTANCE_UNDEFINED)

            // Non-missing pair still works
            assert.closeTo(distances[0 * 3 + 2], 2, 0.001)
        })

        it('single vertex trace', function () {
            const vertices = [{x: 5, y: 10, z: 15}]
            const {distances, maxDistance} = computeTraceDistances(vertices, 1)
            assert.equal(distances[0], 0)
            assert.equal(maxDistance, 0)
        })
    })

    describe('computeEnsembleDistances', function () {

        it('average of two traces', function () {
            // Trace 0: d(0,1) = 3
            // Trace 1: d(0,1) = 5
            // Average: 4
            const traces = [
                [{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}],
                [{x: 0, y: 0, z: 0}, {x: 5, y: 0, z: 0}]
            ]

            const {distances} = computeEnsembleDistances(traces, 2)
            assert.closeTo(distances[0 * 2 + 1], 4, 0.001)
            assert.closeTo(distances[1 * 2 + 0], 4, 0.001)
        })

        it('missing data in one trace - averages only valid traces', function () {
            // Trace 0: vertex 1 missing, d(0,1) undefined
            // Trace 1: d(0,1) = 5
            // Average should be 5 (only one valid trace)
            const traces = [
                [{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0, isMissingData: true}],
                [{x: 0, y: 0, z: 0}, {x: 5, y: 0, z: 0}]
            ]

            const {distances} = computeEnsembleDistances(traces, 2)
            assert.closeTo(distances[0 * 2 + 1], 5, 0.001)
        })

        it('all traces missing for a pair gives DISTANCE_UNDEFINED', function () {
            const traces = [
                [{x: 0, y: 0, z: 0, isMissingData: true}, {x: 3, y: 0, z: 0}],
                [{x: 0, y: 0, z: 0, isMissingData: true}, {x: 5, y: 0, z: 0}]
            ]

            const {distances} = computeEnsembleDistances(traces, 2)
            assert.equal(distances[0 * 2 + 1], DISTANCE_UNDEFINED)
        })

        it('diagonal is always 0', function () {
            const traces = [
                [{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}],
                [{x: 1, y: 1, z: 1}, {x: 4, y: 1, z: 1}]
            ]

            const {distances} = computeEnsembleDistances(traces, 2)
            assert.equal(distances[0], 0)
            assert.equal(distances[3], 0)
        })

        it('symmetric', function () {
            const traces = [
                [{x: 0, y: 0, z: 0}, {x: 3, y: 0, z: 0}, {x: 0, y: 4, z: 0}],
                [{x: 1, y: 1, z: 1}, {x: 4, y: 1, z: 1}, {x: 1, y: 5, z: 1}]
            ]

            const {distances} = computeEnsembleDistances(traces, 3)
            for (let i = 0; i < 3; i++) {
                for (let j = i + 1; j < 3; j++) {
                    assert.equal(distances[i * 3 + j], distances[j * 3 + i])
                }
            }
        })

        it('single trace ensemble equals single trace distances', function () {
            const vertices = [
                {x: 0, y: 0, z: 0},
                {x: 3, y: 0, z: 0},
                {x: 0, y: 4, z: 0}
            ]

            const single = computeTraceDistances(vertices, 3)
            const ensemble = computeEnsembleDistances([vertices], 3)

            for (let i = 0; i < 9; i++) {
                assert.closeTo(ensemble.distances[i], single.distances[i], 0.001)
            }
            assert.closeTo(ensemble.maxDistance, single.maxDistance, 0.001)
        })
    })
})
