module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { imageBase64, mimeType } = req.body

  const mapCat = {
    'Frutta e Verdura': '🥦 Frutta & Verdura',
    'Frutta Secca e Semi': '🥜 Frutta Secca & Semi',
    'Latte e Alternative Veg': '🌱 Latte & Alternative Veg',
    'Pane e Pasta e Cereali': '🥖 Pane & Pasta & Cereali',
    'Legumi e Proteine Veg': '🫘 Legumi & Proteine Veg',
    'Igiene e Casa': '🧴 Igiene & Casa',
    'Snack e Dolci': '🍫 Snack & Dolci',
    'Conserve e Varie': '🥫 Conserve & Varie',
    'Altro': '🌿 Altro',
  }

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
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
            { type: 'text', text: 'Analizza questo scontrino di una famiglia vegana italiana. Rispondi SOLO con un oggetto JSON valido, niente markdown, niente testo aggiuntivo. Formato esatto: {"negozio":"nome negozio","data":"YYYY-MM-DD","totale":0.00,"articoli":[{"nome":"nome prodotto","prezzo":0.00,"categoria":"categoria"}]}. Categorie disponibili (scegli quella più adatta): Frutta e Verdura, Frutta Secca e Semi (noci anacardi mandorle semi chia lino), Latte e Alternative Veg (latte soia avena riso yogurt veg), Pane e Pasta e Cereali (pane pasta riso farro cereali), Legumi e Proteine Veg (tofu tempeh seitan fagioli lenticchie ceci), Igiene e Casa (sapone shampoo detersivo), Snack e Dolci (biscotti cioccolato patatine dolci), Conserve e Varie (conserve olio aceto spezie), Altro.' }
          ]
        }]
      })
    })

    const data = await response.json()
    const text = data.content?.find(b => b.type === 'text')?.text || '{}'
    const clean = text.replace(/```json|```/g, '').trim()

    try {
      const parsed = JSON.parse(clean)
      if (parsed.articoli) {
        parsed.articoli = parsed.articoli.map(a => ({
          ...a,
          categoria: mapCat[a.categoria] || '🌿 Altro'
        }))
      }
      return res.status(200).json(parsed)
    } catch {
      return res.status(200).json({ negozio: 'Supermercato', data: null, totale: 0, articoli: [] })
    }

  } catch (err) {
    console.error('Errore:', err)
    return res.status(500).json({ error: err.message })
  }
}
