// api/spese.js
// Vercel Serverless Function — legge e scrive le spese su Vercel KV
import { kv } from '@vercel/kv'

const KV_KEY = 'spese_famiglia'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method === 'GET') {
    const spese = await kv.get(KV_KEY) || []
    return res.status(200).json(spese)
  }

  if (req.method === 'POST') {
    const { spese } = req.body
    await kv.set(KV_KEY, spese)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Metodo non permesso' })
}
