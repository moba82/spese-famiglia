module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { domanda, spese } = req.body

  const riepilogo = JSON.stringify(spese.map(s => ({
    negozio: s.negozio,
    data: s.data,
    totale: s.totale,
    articoli: s.articoli.map(a => ({ nome: a.nome, prezzo: a.prezzo, categoria: a.categoria }))
  })))

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
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Sei un assistente finanziario per una famiglia vegana italiana. Analizza questi dati di spesa e rispondi alla domanda in italiano, in modo chiaro e conciso. Usa emoji dove utile. Se hai dati insufficienti dillo chiaramente.

DATI SPESE:
${riepilogo}

DOMANDA: ${domanda}`
        }]
      })
    })

    const data = await response.json()
    const testo = data.content?.find(b => b.type === 'text')?.text || 'Nessuna risposta.'
    return res.status(200).json({ risposta: testo })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
