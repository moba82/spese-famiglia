const KEY = 'spese_famiglia'
const BASE = process.env.KV_REST_API_URL
const TOKEN = process.env.KV_REST_API_TOKEN

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    try {
      const r = await fetch(`${BASE}/get/${KEY}`, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      })
      const data = await r.json()
      const spese = data.result ? JSON.parse(data.result) : []
      return res.status(200).json(Array.isArray(spese) ? spese : [])
    } catch (err) {
      console.error('GET error:', err)
      return res.status(200).json([])
    }
  }

  if (req.method === 'POST') {
    try {
      const { spese } = req.body
      await fetch(`${BASE}/set/${KEY}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(spese)
      })
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('POST error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).end()
}
