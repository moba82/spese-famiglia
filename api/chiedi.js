module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { messaggi, spese } = req.body

  const riepilogo = JSON.stringify(spese.map(s => ({
    negozio: s.negozio,
    data: s.data,
    totale: s.totale,
    articoli: s.articoli.map(a => ({ nome: a.nome, prezzo: a.prezzo, categoria: a.categoria }))
  })))

  const systemPrompt = `Sei un assistente finanziario personale per una famiglia vegana italiana. 
Hai accesso ai loro dati di spesa al supermercato e rispondi alle loro domande in italiano, in modo chiaro e amichevole.
Usa emoji dove utile. Puoi fare domande di follow-up per approfondire. Se i dati sono insufficienti dillo chiaramente.
Ricorda il contesto della conversazione precedente e costruisci le risposte su di esso.

DATI SPESE FAMIGLIA:
${riepilogo}`

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
        system: systemPrompt,
        messages: messaggi
      })
    })

    const data = await response.json()
    const testo = data.content?.find(b => b.type === 'text')?.text || 'Nessuna risposta.'
    return res.status(200).json({ risposta: testo })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
