import express from 'express'
import cors from 'cors'
import edgeRoutes from './edge/routes.js'

const app = express()

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))
app.use(express.json({ limit: '5mb' }))

app.use('/api/edge', edgeRoutes)

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Local AI server is running'
  })
})

app.post('/api/assistant', async (req, res) => {
  try {
    const { question, dashboard } = req.body

    if (!question || !dashboard) {
      return res.status(400).json({
        error: 'Missing question or dashboard data'
      })
    }

    const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3.1',
        stream: false,
        messages: [
          {
            role: 'system',
            content: `
You are an intelligence dashboard assistant.

You answer only from the dashboard data provided.
Do not invent information.
If something is not visible in the dashboard data, say that it is not currently shown.

Keep answers clear, useful, and analyst-style.

When asked for a summary, include:
- Global risk level
- Top threat
- Correlated threats
- Major cyber activity
- Major disaster activity
- Air and maritime activity
`
          },
          {
            role: 'user',
            content: `
Question:
${question}

Dashboard Data:
${JSON.stringify(dashboard, null, 2)}
`
          }
        ]
      })
    })

    const data = await ollamaResponse.json()

    res.json({
      answer: data.message?.content || 'No response from local AI.'
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      error: 'Local AI assistant failed to respond'
    })
  }
})

app.listen(5050, '127.0.0.1', () => {
  console.log('Local AI assistant running on http://localhost:5050')
})