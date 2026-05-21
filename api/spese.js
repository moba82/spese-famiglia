// api/spese.js
const KEY = 'spese_famiglia'

async function upstash(path, method = 'GET', body) {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    const data = await upstash(`/get/${KEY}`)
    const spese = data.result ? JSON.parse(data.result) : []
    return res.status(200).json(spese)
  }

  if (req.method === 'POST') {
    const { spese } = req.body
    await upstash(`/set/${KEY}`, 'POST', JSON.stringify(spese))
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
