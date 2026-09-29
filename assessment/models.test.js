import test from 'node:test'
import assert from 'node:assert/strict'
import { normalize, deterministic, probabilistic, probabilities, sampleCategorical, compare } from '../server/edge/models.js'

test('A honours boundary values and does not turn missing CVSS into low risk', () => {
  const events = normalize([
    ...[2.9, 3, 5, 7].map(magnitude => ({ type: 'Earthquake', magnitude })),
    ...[3.9, 4, 7, 9, null].map(cvss => ({ type: 'CVE', cvss })),
    { type: 'CVE', cvss: 2, knownExploited: true },
  ])
  assert.deepEqual(deterministic(events).events.map(e => e.priority),
    ['LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'UNKNOWN', 'CRITICAL'])
  assert.equal(compare(events).uniqueA, 1)
})
test('B uses a valid categorical distribution and genuinely samples outcomes', () => {
  for (let i = 0; i < 4; i++) {
    const p = probabilities(i)
    assert.ok(Math.abs(p.reduce((a, b) => a + b) - 1) < 1e-12)
    assert.ok(p.every(x => x > 0 && x < 1))
    assert.equal(sampleCategorical(p, 0), 0)
    assert.equal(sampleCategorical(p, 1 - Number.EPSILON), 3)
  }
  const events = normalize([{ type: 'Earthquake', magnitude: 5 }])
  assert.notDeepEqual(probabilistic(events, () => 0), probabilistic(events, () => .999999))
  // Fixed grid checks the sampler without a flaky statistical pass/fail threshold.
  const p = probabilities(2), counts = [0, 0, 0, 0]
  for (let i = 0; i < 10000; i++) counts[sampleCategorical(p, (i + .5) / 10000)]++
  counts.forEach((count, i) => assert.ok(Math.abs(count / 10000 - p[i]) < .0002))
})
test('unknown values stay unknown and invalid payloads are rejected', () => {
  assert.equal(probabilistic(normalize([{ type: 'CVE' }])).events[0].priority, 'UNKNOWN')
  assert.throws(() => normalize(null))
  assert.throws(() => normalize([null]))
  assert.throws(() => normalize(Array(1001).fill({})))
})
