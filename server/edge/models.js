// Local educational prioritisation models. No network calls or trained-risk claims.
import { createHash, randomInt } from 'node:crypto'

export const LEVELS = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL']
export const VERSION = '1.0.0'
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
