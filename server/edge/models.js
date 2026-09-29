// Local educational prioritisation models. No network calls or trained-risk claims.
import { createHash, randomInt } from 'node:crypto'

export const LEVELS = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL']
export const VERSION = '1.1.0'
export const STANDARD_QUESTIONS = [
  'Is there significant seismic activity right now, based on the current data?',
  'Which region currently shows the highest overall risk?',
  "Summarise today's cybersecurity threat level in one sentence.",
  'Is volcanic activity trending up or down this week?',
  'Give one recommendation based on current global risk levels.',
  'How confident are you in this assessment, and why?',
]

const string = (value, max = 1500) => typeof value === 'string' ? value.slice(0, max) : ''
const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null

export function normalize(events) {
  if (!Array.isArray(events) || events.length > 1000) throw new Error('Provide at most 1,000 events.')
  return events.map((event, index) => {
    if (!event || typeof event !== 'object') throw new Error('Each event must be an object.')
    return {
      id: string(event.id, 200) || `event-${index + 1}`,
      type: string(event.type, 80), title: string(event.title, 250),
      location: string(event.location, 250), details: string(event.details),
      time: string(event.time, 100), source: string(event.source, 100),
      magnitude: number(event.magnitude), cvss: number(event.cvss),
      knownExploited: event.knownExploited === true,
    }
  })
}

export function snapshotHash(events) {
  return createHash('sha256').update(JSON.stringify(events)).digest('hex')
}

export function classify(event) {
  if (event.knownExploited) return { index: 3, reason: 'Known exploitation is recorded: prioritise review.' }
  if (event.type === 'Earthquake' && event.magnitude !== null) {
    const m = event.magnitude
    return { index: m >= 7 ? 3 : m >= 5 ? 2 : m >= 3 ? 1 : 0,
      reason: `Magnitude ${m}; classroom thresholds: 3, 5 and 7. This is not an impact forecast.` }
  }
  if (event.type === 'CVE' && event.cvss !== null && event.cvss >= 0 && event.cvss <= 10) {
    const s = event.cvss
    return { index: s >= 9 ? 3 : s >= 7 ? 2 : s >= 4 ? 1 : 0,
      reason: `Recorded CVSS ${s}; review bands use thresholds 4, 7 and 9.` }
  }
  if (event.type === 'Volcano') return { index: 1, reason: 'Open volcano record: routine review; no eruption severity inferred.' }
  return { index: null, reason: 'Insufficient structured attributes for the defined rules.' }
}

export function deterministic(events) {
  return { model: 'A', version: VERSION, method: 'fixed rules, no sampling',
    events: events.map(event => {
      const result = classify(event)
      return { id: event.id, title: event.title, priority: LEVELS[result.index] ?? 'UNKNOWN', reason: result.reason }
    }) }
}

export function probabilities(index, sigma = 0.85) {
  const weights = LEVELS.map((_, k) => Math.exp(-((k - index) ** 2) / (2 * sigma ** 2)))
  const total = weights.reduce((a, b) => a + b, 0)
  return weights.map(w => w / total)
}

export function sampleCategorical(probabilities, draw) {
  let cumulative = 0
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i]
    if (draw < cumulative) return i
  }
  return probabilities.length - 1
}

export function probabilistic(events, random = () => randomInt(0, 2 ** 32) / 2 ** 32) {
  return { model: 'B', version: VERSION, method: 'categorical sampling; sigma=0.85; no fixed seed',
    limitation: 'Hand-specified demonstration probabilities, not trained or calibrated real-world risk probabilities.',
    events: events.map(event => {
      const base = classify(event)
      if (base.index === null) return { id: event.id, title: event.title, priority: 'UNKNOWN', probabilities: null }
      const p = probabilities(base.index)
      return { id: event.id, title: event.title, priority: LEVELS[sampleCategorical(p, random())],
        probabilities: Object.fromEntries(LEVELS.map((level, i) => [level, p[i]])) }
    }) }
}

export function compare(events, count = 20) {
  const a = Array.from({ length: count }, () => deterministic(events))
  const b = Array.from({ length: count }, () => probabilistic(events))
  const unique = runs => new Set(runs.map(run => JSON.stringify(run.events))).size
  return { snapshotHash: snapshotHash(events), runsPerModel: count,
    uniqueA: unique(a), uniqueB: unique(b), a, b,
    interpretation: 'A must repeat exactly. B can vary; identical sampled results are possible and are not a failure.' }
}

function priorityCounts(output) {
  return output.events.reduce((counts, event) => {
    counts[event.priority] = (counts[event.priority] || 0) + 1
    return counts
  }, {})
}

function highestMagnitude(events) {
  return events.filter(e => e.type === 'Earthquake' && e.magnitude !== null)
    .reduce((best, e) => !best || e.magnitude > best.magnitude ? e : best, null)
}

function highestCyber(events) {
  const candidates = events.filter(e => e.knownExploited || (e.type === 'CVE' && e.cvss !== null))
  return candidates.reduce((best, e) => {
    const score = e.knownExploited ? 10.5 : e.cvss
    const bestScore = !best ? -1 : (best.knownExploited ? 10.5 : best.cvss)
    return score > bestScore ? e : best
  }, null)
}

function regionLabel(event) {
  if (!event?.location) return null
  const raw = event.location.trim()
  if (!raw) return null

  // Current volcano records store a source/feed identifier in location (for example
  // "SIVolcano"), not a geographic region. Cyber records also use display placeholders.
  // Only use locations that are genuinely geographic for the regional comparison.
  if (event.type !== 'Earthquake') return null

  const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
  return parts.at(-1) || raw
}

function topRiskRegion(events, output) {
  const byId = new Map(output.events.map(e => [e.id, e.priority]))
  const rank = { UNKNOWN: 0, LOW: 1, MODERATE: 2, HIGH: 3, CRITICAL: 4 }
  const groups = new Map()
  for (const event of events) {
    const key = regionLabel(event)
    if (!key) continue
    const value = rank[byId.get(event.id)] || 0
    if (!groups.has(key)) groups.set(key, { score: 0, high: 0, total: 0 })
    const g = groups.get(key)
    g.score += value
    g.total += 1
    if (value >= 3) g.high += 1
  }
  const sorted = [...groups.entries()].sort((a, b) =>
    b[1].high - a[1].high || b[1].score - a[1].score || b[1].total - a[1].total || a[0].localeCompare(b[0]))
  return sorted[0] || null
}

function questionAnswers(events, output, model) {
  const counts = priorityCounts(output)
  const quake = highestMagnitude(events)
  const cyber = highestCyber(events)
  const region = topRiskRegion(events, output)
  const quakeCount = events.filter(e => e.type === 'Earthquake').length
  const volcanoCount = events.filter(e => e.type === 'Volcano').length
  const cyberCount = events.filter(e => e.knownExploited || e.type === 'CVE').length
  const highOrCritical = (counts.HIGH || 0) + (counts.CRITICAL || 0)

  const seismic = quake
    ? `Yes. The snapshot contains ${quakeCount} earthquakes, with a highest recorded magnitude of ${quake.magnitude} at ${quake.location || 'an unspecified location'}; under this classroom model, magnitude 5 or above is prioritised as HIGH.`
    : 'No significant seismic conclusion can be made because this snapshot contains no earthquakes with usable magnitude data.'

  const regional = region
    ? `${region[0]} shows the highest aggregate geographic review priority among records with usable region labels in this snapshot, based on ${region[1].high} HIGH/CRITICAL event(s) and ${region[1].total} supplied event(s).`
    : 'No geographic region can be ranked from the supplied snapshot because the available records do not contain usable non-cyber locations.'

  const cyberSentence = cyber
    ? `Cybersecurity threat level is elevated to high review priority today because the snapshot contains ${cyberCount} cyber records and the most severe supplied item is ${cyber.title}${cyber.knownExploited ? ', recorded as known exploited' : ` with CVSS ${cyber.cvss}`}.`
    : 'Cybersecurity threat level cannot be assessed from this snapshot because no usable CVE or known-exploited records are present.'

  const volcano = volcanoCount
    ? `The direction cannot be determined from this snapshot: ${volcanoCount} open volcano record(s) are present, but a single current snapshot does not provide the historical weekly series needed to establish an up-or-down trend.`
    : 'The direction cannot be determined because this snapshot contains no usable volcano records and does not provide a weekly historical series.'

  const recommendation = highOrCritical
    ? `Prioritise manual review of the ${highOrCritical} HIGH/CRITICAL items first, verify them against their source feeds, and escalate only where local exposure or impact is confirmed.`
    : 'Continue monitoring the source feeds and verify any new HIGH or CRITICAL items before escalation.'

  const confidence = model === 'A'
    ? 'Moderate confidence: the answer is exactly reproducible from the frozen snapshot and transparent rules, but the model uses simplified classroom thresholds and incomplete point-in-time data rather than calibrated real-world impact probabilities.'
    : 'Moderate-to-low confidence in the sampled labels: the same frozen data and probability vectors are used, but Model B deliberately samples outcomes without a fixed seed, and its demonstration probabilities are not trained or calibrated real-world risk probabilities.'

  return [seismic, regional, cyberSentence, volcano, recommendation, confidence]
}

export function answerStandardQuestions(events, model = 'A', random) {
  if (!['A', 'B'].includes(model)) throw new Error('Select model A or B.')
  const output = model === 'A' ? deterministic(events) : probabilistic(events, random)
  const answers = questionAnswers(events, output, model)
  return {
    model,
    version: VERSION,
    method: output.method,
    questions: STANDARD_QUESTIONS.map((question, index) => ({ question, answer: answers[index] })),
  }
}

export function standardQuestionComparison(events, runs = 2) {
  const a = Array.from({ length: runs }, () => answerStandardQuestions(events, 'A'))
  const b = Array.from({ length: runs }, () => answerStandardQuestions(events, 'B'))
  const uniqueAnswers = values => new Set(values.map(run => JSON.stringify(run.questions.map(q => q.answer)))).size
  return {
    snapshotHash: snapshotHash(events),
    standardQuestions: STANDARD_QUESTIONS,
    runsPerModel: runs,
    modelA: a,
    modelB: b,
    uniqueA: uniqueAnswers(a),
    uniqueB: uniqueAnswers(b),
    interpretation: 'Model A should be identical for the same frozen snapshot. Model B may vary because its event priorities are sampled.',
  }
}
