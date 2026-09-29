import { useState } from 'react'
import fixture from '../../assessment/fixture.json'
import './EdgeAssessment.css'

export default function EdgeAssessment({ events }) {
  const [snapshot, setSnapshot] = useState(null)
  const [source, setSource] = useState('')
  const [question, setQuestion] = useState('Which skill can review earthquake magnitudes in these events?')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  function freeze(data, label) {
    setSnapshot(JSON.parse(JSON.stringify(data)))
    setSource(`${label} — captured ${new Date().toISOString()}`)
    setResult(null)
    setError('')
  }
  async function run(path, model) {
    setBusy(true); setError(''); setResult(null)
    try {
      const response = await fetch(`/api/edge/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: snapshot, model, question }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Local model request failed.')
      setResult(data)
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  function download() {
    const blob = new Blob([JSON.stringify({ source, question, snapshot, result }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = 'edge-assessment-evidence.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const output = result?.output
  return <section className="edgeAssessment" aria-label="Edge AI assessment">
    <h2>EDGE AI ASSESSMENT</h2>
    <p>Local A / B comparison and Tencent R3-Skill routing.</p>
    <p className="edgeMuted">Freeze fetched events before testing. All model inference runs on this machine.</p>
    <div className="edgeButtons">
      <button disabled={busy || !events.length} onClick={() => freeze(events, 'Fetched dashboard data')}>Freeze dashboard ({events.length})</button>
      <button disabled={busy} onClick={() => freeze(fixture, 'SYNTHETIC DEMO — not live data')}>Load labelled demo</button>
    </div>
    <p className="edgeSource">{source || 'No snapshot selected.'}</p>
    {snapshot && <p>{snapshot.length} events frozen. Unknown attributes remain unknown.</p>}
    <div className="edgeButtons">
      <button disabled={busy || !snapshot?.length} onClick={() => run('run', 'A')}>Run A: fixed rules</button>
      <button disabled={busy || !snapshot?.length} onClick={() => run('run', 'B')}>Run B: sampling</button>
      <button disabled={busy || !snapshot?.length} onClick={() => run('compare')}>Compare 20 runs</button>
    </div>
    <label htmlFor="r3question">C — Tencent skill-retrieval request</label>
    <textarea id="r3question" maxLength={600} value={question} onChange={e => setQuestion(e.target.value)} />
    <button disabled={busy || !snapshot?.length || !question.trim()} onClick={() => run('r3')}>Run C: Tencent R3-Skill</button>
    <p className="edgeMuted">A uses classroom rules. B samples from hand-specified probabilities; neither predicts actual disaster or exploit likelihood. C ranks routines; scores are not probabilities.</p>
    {busy && <p role="status">Running locally… C may take several minutes on CPU.</p>}
    {error && <p role="alert" className="edgeError">{error}</p>}
    {result && <div aria-live="polite">
      {result.runsPerModel && <p><strong>{result.runsPerModel} identical-input runs:</strong> A produced {result.uniqueA} unique output(s); B produced {result.uniqueB}. {result.interpretation}</p>}
      {output?.events && <ul>{output.events.slice(0, 12).map((event, index) => <li key={`${event.id}-${index}`}>
        <strong>{event.priority}</strong> — {event.title}
        {event.reason && <small>{event.reason}</small>}
        {event.probabilities && <small>{Object.entries(event.probabilities).map(([level, p]) => `${level} ${(100 * p).toFixed(1)}%`).join(' · ')}</small>}
      </li>)}</ul>}
      {result.topSkills && <><ol>{result.topSkills.map(skill => <li key={skill.id}>{skill.id}: {skill.score.toFixed(4)}</li>)}</ol><p>{result.handlerResult}</p></>}
      <small className="edgeHash">Snapshot SHA-256: {result.snapshotHash}</small>
      <button onClick={download}>Download full evidence JSON</button>
      <details><summary>Full model output</summary><pre>{JSON.stringify(result, null, 2)}</pre></details>
    </div>}
  </section>
}
