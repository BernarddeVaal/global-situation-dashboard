import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalize, deterministic, probabilistic, probabilities, sampleCategorical, compare,
  STANDARD_QUESTIONS, answerStandardQuestions, standardQuestionComparison,
} from '../server/edge/models.js'

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

test('Task 2 uses the exact six standard questions and A repeats its answers', () => {
  const events = normalize([
    { id: 'q1', type: 'Earthquake', title: 'M5.4 Earthquake', magnitude: 5.4, location: 'north of Svalbard', source: 'USGS' },
    { id: 'q2', type: 'Earthquake', title: 'M5.3 Earthquake', magnitude: 5.3, location: 'Tadine, New Caledonia', source: 'USGS' },
    { id: 'v1', type: 'Volcano', title: 'Open volcano', location: 'Japan', source: 'NASA EONET' },
    { id: 'c1', type: 'CVE', title: 'CVE-demo', cvss: 8.8, location: 'Cyber Intelligence', source: 'NVD' },
  ])
  assert.equal(STANDARD_QUESTIONS.length, 6)
  const result = standardQuestionComparison(events, 2)
  assert.deepEqual(result.standardQuestions, STANDARD_QUESTIONS)
  assert.equal(result.modelA.length, 2)
  assert.equal(result.modelB.length, 2)
  assert.equal(result.uniqueA, 1)
  assert.deepEqual(result.modelA[0].questions, result.modelA[1].questions)
})

test('Task 2 Model B answers reflect sampled priorities but remain grounded in the same questions', () => {
  const events = normalize([
    { id: 'q1', type: 'Earthquake', title: 'M5 Earthquake', magnitude: 5, location: 'New Caledonia', source: 'USGS' },
    { id: 'c1', type: 'CVE', title: 'CVE-demo', cvss: 8.8, location: 'Cyber Intelligence', source: 'NVD' },
    { id: 'v1', type: 'Volcano', title: 'Open volcano', location: 'Japan', source: 'NASA EONET' },
  ])
  const lowDraw = answerStandardQuestions(events, 'B', () => 0)
  const highDraw = answerStandardQuestions(events, 'B', () => .999999)
  assert.deepEqual(lowDraw.questions.map(q => q.question), STANDARD_QUESTIONS)
  assert.deepEqual(highDraw.questions.map(q => q.question), STANDARD_QUESTIONS)
  assert.notDeepEqual(lowDraw.questions.map(q => q.answer), highDraw.questions.map(q => q.answer))
  assert.match(lowDraw.questions[3].answer, /cannot be determined/i)
  assert.match(highDraw.questions[3].answer, /cannot be determined/i)
})
