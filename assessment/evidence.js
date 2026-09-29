import fs from 'node:fs'
import { compare, normalize } from '../server/edge/models.js'
const fixture = JSON.parse(fs.readFileSync(new URL('./fixture.json', import.meta.url)))
const result = compare(normalize(fixture))
fs.writeFileSync(new URL('./local-evidence.json', import.meta.url), JSON.stringify({
  testedAt: new Date().toISOString(), source: 'SYNTHETIC fixture; not evidence of live feeds or the student PC', fixture, result,
}, null, 2))
console.log(`20 runs: A=${result.uniqueA} unique output(s), B=${result.uniqueB}. Saved assessment/local-evidence.json`)
