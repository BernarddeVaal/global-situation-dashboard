import { Router } from 'express'
import { normalize, deterministic, probabilistic, compare, snapshotHash } from './models.js'
const router = Router()
router.post('/run', (req, res) => {
  try {
    const events = normalize(req.body.events)
    if (!['A', 'B'].includes(req.body.model)) throw new Error('Select model A or B.')
    const output = req.body.model === 'A' ? deterministic(events) : probabilistic(events)
    res.json({ snapshotHash: snapshotHash(events), output })
  } catch (error) { res.status(400).json({ error: error.message }) }
})
router.post('/compare', (req, res) => {
  try { res.json(compare(normalize(req.body.events))) }
  catch (error) { res.status(400).json({ error: error.message }) }
})
router.post('/r3', async (req, res) => {
  try {
    const events = normalize(req.body.events)
    const question = typeof req.body.question === 'string' ? req.body.question.trim().slice(0, 600) : ''
    if (!events.length || !question) return res.status(400).json({ error: 'Freeze events and enter a question first.' })
    const response = await fetch('http://127.0.0.1:5051/retrieve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, events }), signal: AbortSignal.timeout(180000),
    })
    const data = await response.json()
    res.status(response.status).json({ snapshotHash: snapshotHash(events), ...data })
  } catch {
    res.status(503).json({ error: 'Tencent R3-Skill unavailable. Install its weights and start the local Python service (see ASSESSMENT.md). No substitute model was used.' })
  }
})
export default router
