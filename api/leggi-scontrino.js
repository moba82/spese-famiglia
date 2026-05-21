// api/leggi-scontrino.js
// Vercel Serverless Function — fa da proxy verso Anthropic
// La chiave API rimane sul server, mai esposta nel browser

const CAT_KEYS = [
  "🥦 Frutta & Verdura", "🥛 Latticini & Uova", "🥖 Pane & Pasta",
  "🥩 Carne & Pesce", "🧴 Igiene & Casa", "🍫 Snack & Dolci",
  "🥫 Conserve & Varie", "🌿 Altro"
]

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST' })
  }

  const { imageBase64, mimeType } = req.body

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageBase64 }
            },
            {
              type: 'text',
              text: `Analizza questo scontrino. Rispondi SOLO JSON puro, niente markdown.
{"negozio":"...","data":"YYYY-MM-DD","totale":0,"articoli":[{"nome":"...","prezzo":0,"categoria":"una di: ${CAT_KEYS.join(' | ')}"}]}`
            }
          ]
        }]
      })
    })

    const data = await response.json()
    const text = data.content?.find(b => b.type === 'text')?.text || '{}'
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return res.status(200).json(parsed)

  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Errore lettura scontrino' })
  }
}
