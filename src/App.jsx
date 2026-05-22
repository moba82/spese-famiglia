import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const T = {
  bg: "#f0f4ff", card: "#ffffff", primary: "#7c6ff7", primaryLight: "#ede9fe",
  teal: "#14b8a6", tealLight: "#ccfbf1", rose: "#f43f5e", roseLight: "#ffe4e6",
  amber: "#f59e0b", amberLight: "#fef3c7", green: "#22c55e", greenLight: "#dcfce7",
  text: "#1e1b4b", sub: "#64748b", muted: "#94a3b8", border: "#e8e4ff",
  shadow: "0 4px 24px rgba(124,111,247,0.08)",
};

const CATEGORIE = {
  "🥦 Frutta & Verdura": "#10b981",
  "🥜 Frutta Secca & Semi": "#84cc16",
  "🌱 Latte & Alternative Veg": "#f59e0b",
  "🥖 Pane & Pasta & Cereali": "#f97316",
  "🫘 Legumi & Proteine Veg": "#ef4444",
  "🧴 Igiene & Casa": "#38bdf8",
  "🍫 Snack & Dolci": "#a855f7",
  "🥫 Conserve & Varie": "#64748b",
  "🌿 Altro": "#94a3b8",
};
const CAT_KEYS = Object.keys(CATEGORIE);
const CAT_COLORS = Object.values(CATEGORIE);

const fmt = (n) => `€ ${Number(n).toFixed(2).replace(".", ",")}`;
const monthKey = (d) => d.slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);
const mesePretty = (k) => new Date(k + "-01").toLocaleDateString("it-IT", { month: "long", year: "numeric" });

// taralli e frutta secca esclusi da junk
const JUNK_KEYWORDS = [
  "patatine","chips","nachos","cheetos","popcorn","pringles","doritos","fonzies",
  "nutella","pan di stelle","mulino bianco","ringo","oreo","kit kat","kinder","mars",
  "snickers","bounty","twix","ferrero","ovetto","wafer","merendina","merendine",
  "crostatina","plumcake","muffin","pandoro","panettone","gelato","ghiacciolo","cornetto","magnum",
  "coca cola","pepsi","fanta","sprite","aranciata","limonata","energy drink","red bull","monster",
  "succo","succhi","the freddo","thè freddo","ice tea","gatorade","bibita","bevanda",
  "würstel","wurstel","hot dog","hamburger","bacon","pizza surgelata","sofficini","nuggets","crocchette",
  "birra","vino","prosecco","spritz","aperitivo","liquore","amaro","gin","vodka","rum",
];
const isJunk = (nome) => JUNK_KEYWORDS.some(k => nome.toLowerCase().includes(k));

function analizzaJunk(articoli) {
  const junk = articoli.filter(a => isJunk(a.nome) || a.categoria === "🍫 Snack & Dolci");
  const totJunk = junk.reduce((s, a) => s + a.prezzo, 0);
  const gruppi = {};
  junk.forEach(a => {
    const k = a.nome.toLowerCase().slice(0, 20);
    if (!gruppi[k]) gruppi[k] = { nome: a.nome, tot: 0, n: 0 };
    gruppi[k].tot += a.prezzo; gruppi[k].n++;
  });
  return { totJunk, lista: Object.values(gruppi).sort((a, b) => b.tot - a.tot) };
}

async function fetchSpese() {
  const r = await fetch('/api/spese');
  return r.json();
}
async function saveSpese(spese) {
  await fetch('/api/spese', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spese })
  });
}
async function leggiScontrino(imageBase64, mimeType) {
  const r = await fetch('/api/leggi-scontrino', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType })
  });
  return r.json();
}

function generaConsigli(spese, meseKey) {
  const art = spese.filter(s => monthKey(s.data) === meseKey).flatMap(s => s.articoli);
  const consigli = [];
  const perCat = {};
  CAT_KEYS.forEach(c => { perCat[c] = art.filter(a => a.categoria === c).reduce((s, a) => s + a.prezzo, 0); });
  const topCat = Object.entries(perCat).sort((a, b) => b[1] - a[1])[0];
  if (topCat?.[1] > 0) consigli.push({ icon: "🎯", color: T.primary, testo: `${topCat[0]} è la categoria più costosa (${fmt(topCat[1])}). Confronta i prezzi tra supermercati.` });
  const map = {};
  art.forEach(a => { const k = a.nome.toLowerCase().slice(0, 15); if (!map[k]) map[k] = { nome: a.nome, tot: 0, n: 0 }; map[k].tot += a.prezzo; map[k].n++; });
  Object.values(map).filter(p => p.n >= 2).sort((a, b) => b.tot - a.tot).slice(0, 2)
    .forEach(p => consigli.push({ icon: "🔁", color: T.teal, testo: `"${p.nome}" acquistato ${p.n} volte (${fmt(p.tot)}) — valuta il formato famiglia.` }));
  const igiene = perCat["🧴 Igiene & Casa"] || 0;
  if (igiene > 15) consigli.push({ icon: "💡", color: T.amber, testo: `Igiene/casa: ${fmt(igiene)}. I prodotti del supermercato costano ~40% meno.` });
  if (!consigli.length) consigli.push({ icon: "✨", color: T.green, testo: "Aggiungi più scontrini per ricevere consigli personalizzati!" });
  return consigli;
}

function Card({ children, style = {} }) {
  return <div style={{ background: T.card, borderRadius: 20, padding: "18px 20px", boxShadow: T.shadow, border: `1px solid ${T.border}`, ...style }}>{children}</div>;
}
function SectionLabel({ children, color = T.muted }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>{children}</div>;
}
function Pill({ children, bg, color }) {
  return <span style={{ background: bg, color, borderRadius: 30, padding: "3px 11px", fontSize: 12, fontWeight: 600 }}>{children}</span>;
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [spese, setSpese] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [msg, setMsg] = useState(null);
  const [mese, setMese] = useState(monthKey(today()));
  const [formOpen, setFormOpen] = useState(false);
  const [negozio, setNegozio] = useState("");
  const [dataSp, setDataSp] = useState(today());
  const [items, setItems] = useState([{ nome: "", prezzo: "", categoria: CAT_KEYS[0] }]);
  const fileRef = useRef();
  const chatBottomRef = useRef();

  // chat multi-turno
  const [domanda, setDomanda] = useState("");
  const [chiedendo, setChiedendo] = useState(false);
  const [cronologia, setCronologia] = useState([]); // [{tipo:"domanda"|"risposta", testo}]

  const chiedi = async () => {
    if (!domanda.trim() || chiedendo) return;
    const d = domanda.trim();
    setDomanda("");
    setChiedendo(true);

    const nuovaCronologia = [...cronologia, { tipo: "domanda", testo: d }];
    setCronologia(nuovaCronologia);

    // costruisce la storia completa per l'API
    const messaggi = nuovaCronologia.map(m => ({
      role: m.tipo === "domanda" ? "user" : "assistant",
      content: m.testo
    }));

    try {
      const r = await fetch('/api/chiedi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaggi, spese })
      });
      const data = await r.json();
      const risposta = data.risposta || "Nessuna risposta.";
      setCronologia(c => [...c, { tipo: "risposta", testo: risposta }]);
    } catch {
      setCronologia(c => [...c, { tipo: "risposta", testo: "Errore di connessione, riprova." }]);
    }
    setChiedendo(false);
  };

  useEffect(() => {
    if (chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [cronologia]);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSpese();
        setSpese(Array.isArray(data) ? data : []);
      } catch { setMsg({ ok: false, txt: "Errore di connessione. Ricarica la pagina." }); }
      setSyncing(false);
    })();
  }, []);

  const salva = async (nuove) => {
    setSpese(nuove);
    try { await saveSpese(nuove); } catch { setMsg({ ok: false, txt: "Errore salvataggio. Riprova." }); }
  };

  const onFoto = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setLoading(true); setMsg(null);
    try {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
      const result = await leggiScontrino(b64, file.type);
      setNegozio(result.negozio || "");
      setDataSp(today()); // sempre oggi, modificabile
      setItems(result.articoli?.length
        ? result.articoli.map(a => ({ nome: a.nome, prezzo: String(a.prezzo), categoria: CAT_KEYS.includes(a.categoria) ? a.categoria : CAT_KEYS[0] }))
        : [{ nome: "", prezzo: "", categoria: CAT_KEYS[0] }]);
      setFormOpen(true);
    } catch { setMsg({ ok: false, txt: "Foto non leggibile. Riprova con più luce." }); }
    setLoading(false); e.target.value = "";
  };

  const salvaForm = async () => {
    const validi = items.filter(i => i.nome.trim() && parseFloat(i.prezzo) > 0);
    if (!validi.length) { setMsg({ ok: false, txt: "Inserisci almeno un articolo valido." }); return; }
    const s = { id: Date.now(), negozio: negozio || "Supermercato", data: dataSp, articoli: validi.map(i => ({ ...i, prezzo: parseFloat(i.prezzo) })), totale: validi.reduce((s, i) => s + parseFloat(i.prezzo), 0) };
    await salva([s, ...spese]);
    setMsg({ ok: true, txt: `Scontrino salvato! ${fmt(s.totale)} 🎉` });
    setFormOpen(false); setNegozio(""); setDataSp(today()); setItems([{ nome: "", prezzo: "", categoria: CAT_KEYS[0] }]);
    setTimeout(() => { setMsg(null); setTab("dashboard"); }, 1400);
  };

  const speseMese = spese.filter(s => monthKey(s.data) === mese);
  const totMese = speseMese.reduce((s, sp) => s + sp.totale, 0);
  const articoliMese = speseMese.flatMap(s => s.articoli);
  const perCat = CAT_KEYS.map((cat, i) => ({ cat, short: cat.slice(3), val: +articoliMese.filter(a => a.categoria === cat).reduce((s, a) => s + a.prezzo, 0).toFixed(2), color: CAT_COLORS[i] })).filter(c => c.val > 0).sort((a, b) => b.val - a.val);
  const topProdotti = (() => { const m = {}; articoliMese.forEach(a => { const k = a.nome.toLowerCase(); if (!m[k]) m[k] = { nome: a.nome, tot: 0, n: 0, cat: a.categoria }; m[k].tot += a.prezzo; m[k].n++; }); return Object.values(m).sort((a, b) => b.tot - a.tot).slice(0, 8); })();
  const perMese = (() => { const m = {}; spese.forEach(s => { const k = monthKey(s.data); m[k] = (m[k] || 0) + s.totale; }); return Object.entries(m).sort().slice(-6).map(([k, v]) => ({ mese: new Date(k + "-01").toLocaleDateString("it-IT", { month: "short" }), totale: +v.toFixed(2), key: k })); })();
  const mesiDisp = [...new Set(spese.map(s => monthKey(s.data)))].sort().reverse();
  const consigli = generaConsigli(spese, mese);
  const { totJunk, lista: listaJunk } = analizzaJunk(articoliMese);
  const pctJunk = totMese > 0 ? Math.round(totJunk / totMese * 100) : 0;
  const junkCol = pctJunk > 25 ? T.rose : pctJunk > 12 ? T.amber : T.green;
  const junkLightCol = pctJunk > 25 ? T.roseLight : pctJunk > 12 ? T.amberLight : T.greenLight;
  const inp = { width: "100%", border: `1.5px solid ${T.border}`, borderRadius: 12, padding: "11px 14px", fontSize: 15, boxSizing: "border-box", background: "#fafbff", outline: "none", fontFamily: "inherit", color: T.text };
  const nav = [
    { id: "dashboard", icon: "📊", label: "Spese" },
    { id: "analisi", icon: "🔍", label: "Analisi" },
    { id: "aggiungi", icon: "➕", label: "Aggiungi" },
    { id: "chiedi", icon: "💬", label: "Chiedi" },
    { id: "storico", icon: "📋", label: "Storico" },
  ];

  if (syncing) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🧺</div>
        <div style={{ color: T.primary, fontWeight: 700, fontSize: 16 }}>Caricamento dati…</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: 90 }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } input, select, textarea { font-family: 'Plus Jakarta Sans', sans-serif; }`}</style>

      {/* HEADER */}
      <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${T.border}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🧺</div>
        <div>
          <div style={{ fontWeight: 800, color: T.text, fontSize: 17, lineHeight: 1 }}>Spese Supermercato</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Tracciamento familiare 🌱</div>
        </div>
        {mesiDisp.length > 0 && (
          <select value={mese} onChange={e => setMese(e.target.value)} style={{ marginLeft: "auto", background: T.primaryLight, color: T.primary, border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {mesiDisp.map(m => <option key={m} value={m} style={{ color: T.text, background: "#fff" }}>{mesePretty(m)}</option>)}
          </select>
        )}
      </div>

      {msg && <div style={{ margin: "12px 16px 0", padding: "12px 16px", borderRadius: 14, background: msg.ok ? T.greenLight : T.roseLight, color: msg.ok ? "#166534" : "#9f1239", fontWeight: 600, fontSize: 14 }}>{msg.ok ? "✅" : "⚠️"} {msg.txt}</div>}

      <div style={{ padding: "16px" }}>

        {/* ══ DASHBOARD ══ */}
        {tab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: `linear-gradient(135deg, ${T.primary} 0%, #a78bfa 100%)`, borderRadius: 24, padding: "24px 22px", color: "#fff", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
              <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}>{mesePretty(mese)}</div>
              <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.1, margin: "6px 0 4px" }}>{fmt(totMese)}</div>
              <div style={{ fontSize: 13, opacity: 0.75 }}>{speseMese.length} scontrini · {articoliMese.length} articoli</div>
              {speseMese.length > 0 && <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>Media scontrino: <b>{fmt(totMese / speseMese.length)}</b></div>}
            </div>

            {articoliMese.length > 0 && (() => { const top = [...articoliMese].sort((a, b) => b.prezzo - a.prezzo)[0]; return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Card style={{ padding: "14px 16px" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: T.roseLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginBottom: 8 }}>💸</div>
                  <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Articolo più caro</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: T.rose, marginTop: 2 }}>{fmt(top.prezzo)}</div>
                  <div style={{ fontSize: 11, color: T.sub, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{top.nome}</div>
                </Card>
                <Card style={{ padding: "14px 16px" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: junkLightCol, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginBottom: 8 }}>🍟</div>
                  <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Junk food</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: junkCol, marginTop: 2 }}>{fmt(totJunk)}</div>
                  <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{pctJunk}% del totale</div>
                </Card>
              </div>
            ); })()}

            {perCat.length > 0 && (
              <Card>
                <SectionLabel>Dove spendete di più</SectionLabel>
                {perCat.map((c, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: c.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{c.cat.split(" ")[0]}</div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.cat.slice(c.cat.indexOf(" ") + 1)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{Math.round(c.val / totMese * 100)}%</span>
                        <span style={{ fontWeight: 800, color: c.color, fontSize: 14 }}>{fmt(c.val)}</span>
                      </div>
                    </div>
                    <div style={{ background: "#f1f5f9", borderRadius: 100, height: 6 }}>
                      <div style={{ width: `${Math.round(c.val / totMese * 100)}%`, minWidth: 4, background: `linear-gradient(90deg, ${c.color}, ${c.color}99)`, borderRadius: 100, height: 6 }} />
                    </div>
                  </div>
                ))}
              </Card>
            )}

            {perMese.length > 1 && (
              <Card>
                <SectionLabel>Andamento mensile</SectionLabel>
                <ResponsiveContainer width="100%" height={148}>
                  <BarChart data={perMese} barSize={28} onClick={d => { const found = perMese.find(m => m.mese === d?.activePayload?.[0]?.payload?.mese); if (found) setMese(found.key); }}>
                    <XAxis dataKey="mese" tick={{ fontSize: 11, fill: T.muted }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip formatter={v => [fmt(v), "Speso"]} contentStyle={{ borderRadius: 12, border: "none", boxShadow: T.shadow, fontSize: 13 }} cursor={{ fill: T.primaryLight }} />
                    <Bar dataKey="totale" radius={[8, 8, 4, 4]}>
                      {perMese.map((m, i) => <Cell key={i} fill={m.key === mese ? T.primary : "#e2e8f0"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ fontSize: 11, color: T.muted, textAlign: "center" }}>Tocca una barra per cambiare mese</div>
              </Card>
            )}

            {spese.length === 0 && (
              <Card style={{ textAlign: "center", padding: "44px 24px" }}>
                <div style={{ fontSize: 52, marginBottom: 14 }}>🛒</div>
                <div style={{ fontWeight: 800, color: T.text, fontSize: 18, marginBottom: 8 }}>Nessuna spesa ancora</div>
                <p style={{ color: T.muted, marginBottom: 20, fontSize: 14 }}>Aggiungi il primo scontrino fotografandolo!</p>
                <button onClick={() => setTab("aggiungi")} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 14, padding: "13px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>➕ Aggiungi spesa</button>
              </Card>
            )}
          </div>
        )}

        {/* ══ ANALISI ══ */}
        {tab === "analisi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontWeight: 800, color: T.text, fontSize: 22 }}>Analisi & Risparmio</div>

            <Card style={{ border: `2px solid ${junkCol}44`, background: `linear-gradient(135deg, ${junkLightCol}, #fff)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: junkCol + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🍟</div>
                <div style={{ fontWeight: 700, color: T.text, fontSize: 15 }}>Cibo non sano & Junk food</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: junkCol, lineHeight: 1 }}>{fmt(totJunk)}</div>
                  <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>su {fmt(totMese)} totali</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: junkCol }}>{pctJunk}%</div>
                  <div style={{ fontSize: 11, color: T.muted }}>del budget</div>
                </div>
              </div>
              <div style={{ background: "#e2e8f0", borderRadius: 100, height: 8, marginBottom: 12 }}>
                <div style={{ width: `${Math.min(pctJunk, 100)}%`, minWidth: pctJunk > 0 ? 8 : 0, background: `linear-gradient(90deg, ${junkCol}, ${junkCol}88)`, borderRadius: 100, height: 8 }} />
              </div>
              <div style={{ fontSize: 13, color: junkCol, fontWeight: 600, lineHeight: 1.5, marginBottom: listaJunk.length ? 12 : 0 }}>
                {pctJunk > 25 ? `⚠️ Quasi 1€ su 4 va in cibo non sano. Tagliando del 50% risparmiereste ${fmt(totJunk * 0.5)}/mese.` : pctJunk > 12 ? `⚡ Discreta quota di junk. Sostituirne metà risparmierebbe ${fmt(totJunk * 0.5)}.` : totJunk > 0 ? "✅ Quota junk contenuta, ottimo!" : "✅ Nessun prodotto junk rilevato questo mese."}
              </div>
              {listaJunk.length > 0 && (
                <div style={{ borderTop: `1px solid ${junkCol}22`, paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Prodotti rilevati</div>
                  {listaJunk.map((p, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < listaJunk.length - 1 ? `1px solid ${T.border}` : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, color: T.text, fontWeight: 500 }}>{p.nome}</span>
                        {p.n > 1 && <Pill bg={junkLightCol} color={junkCol}>×{p.n}</Pill>}
                      </div>
                      <span style={{ fontWeight: 700, color: junkCol }}>{fmt(p.tot)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <SectionLabel color={T.teal}>💡 Consigli personalizzati</SectionLabel>
              {consigli.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start", padding: "12px", background: c.color + "0d", borderRadius: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: c.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{c.icon}</div>
                  <span style={{ fontSize: 13, color: T.text, lineHeight: 1.6, fontWeight: 500 }}>{c.testo}</span>
                </div>
              ))}
            </Card>

            {topProdotti.length > 0 && (
              <Card>
                <SectionLabel>🏆 Prodotti più costosi</SectionLabel>
                {topProdotti.map((p, i) => {
                  const catColor = CAT_COLORS[CAT_KEYS.indexOf(p.cat)] || T.muted;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: i < topProdotti.length - 1 ? `1px solid ${T.border}` : "none" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: catColor + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{p.cat?.split(" ")[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{p.nome}</div>
                        <div style={{ fontSize: 11, color: catColor, fontWeight: 500 }}>{p.cat?.slice(p.cat?.indexOf(" ") + 1)}{p.n > 1 ? ` · ${p.n}×` : ""}</div>
                      </div>
                      <span style={{ fontWeight: 800, color: T.text, fontSize: 15 }}>{fmt(p.tot)}</span>
                    </div>
                  );
                })}
              </Card>
            )}

            {perCat.length > 0 && (
              <Card>
                <SectionLabel>🎨 Distribuzione categorie</SectionLabel>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <PieChart width={120} height={120}>
                    <Pie data={perCat} dataKey="val" cx={58} cy={58} innerRadius={32} outerRadius={56}>
                      {perCat.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                  </PieChart>
                  <div style={{ flex: 1 }}>
                    {perCat.map((c, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: T.sub, flex: 1, fontWeight: 500 }}>{c.short}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{Math.round(c.val / totMese * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {articoliMese.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: T.muted }}><div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div><p>Aggiungi scontrini per vedere l'analisi.</p></div>}
          </div>
        )}

        {/* ══ AGGIUNGI ══ */}
        {tab === "aggiungi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontWeight: 800, color: T.text, fontSize: 22 }}>Aggiungi scontrino</div>
            {!formOpen ? (
              <>
                <Card style={{ textAlign: "center", padding: "32px 24px", background: `linear-gradient(135deg, ${T.primaryLight}, #fff)`, border: `2px dashed ${T.primary}44` }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 14px" }}>📸</div>
                  <div style={{ fontWeight: 700, color: T.text, fontSize: 16, marginBottom: 6 }}>Fotografa lo scontrino</div>
                  <p style={{ color: T.sub, marginBottom: 20, fontSize: 13, lineHeight: 1.6 }}>L'AI legge negozio e prodotti automaticamente.</p>
                  <input type="file" accept="image/*" capture="environment" ref={fileRef} onChange={onFoto} style={{ display: "none" }} />
                  <button onClick={() => fileRef.current.click()} disabled={loading} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 15, cursor: "pointer", fontWeight: 700, width: "100%", fontFamily: "inherit", opacity: loading ? 0.65 : 1 }}>
                    {loading ? "⏳ Lettura in corso…" : "📷 Carica o scatta foto"}
                  </button>
                </Card>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 1, background: T.border }} />
                  <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>oppure</span>
                  <div style={{ flex: 1, height: 1, background: T.border }} />
                </div>
                <button onClick={() => setFormOpen(true)} style={{ background: "#fff", color: T.primary, border: `2px solid ${T.primary}44`, borderRadius: 14, padding: "14px", fontSize: 15, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>✏️ Inserisci manualmente</button>
              </>
            ) : (
              <Card>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div><div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Negozio</div><input value={negozio} onChange={e => setNegozio(e.target.value)} placeholder="Es. Rossetto, Conad…" style={inp} /></div>

                  {/* DATA — evidenziata e modificabile */}
                  <div style={{ background: T.amberLight, borderRadius: 14, padding: "14px 16px", border: `2px solid ${T.amber}44` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.amber, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                      📅 Data scontrino — modificala se necessario
                    </div>
                    <input
                      type="date"
                      value={dataSp}
                      onChange={e => setDataSp(e.target.value)}
                      style={{ ...inp, background: "#fff", border: `1.5px solid ${T.amber}66`, fontWeight: 700, fontSize: 16 }}
                    />
                    <div style={{ fontSize: 11, color: T.amber, marginTop: 6 }}>
                      Impostata ad oggi. Cambiala se lo scontrino è di un altro giorno.
                    </div>
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 1 }}>Articoli</div>
                  {items.map((item, i) => (
                    <div key={i} style={{ background: T.bg, borderRadius: 14, padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <input value={item.nome} onChange={e => setItems(its => its.map((it, j) => j === i ? { ...it, nome: e.target.value } : it))} placeholder="Nome prodotto" style={{ ...inp, background: "#fff" }} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={item.prezzo} onChange={e => setItems(its => its.map((it, j) => j === i ? { ...it, prezzo: e.target.value } : it))} placeholder="€" type="number" step="0.01" style={{ ...inp, flex: "0 0 76px", background: "#fff" }} />
                        <select value={item.categoria} onChange={e => setItems(its => its.map((it, j) => j === i ? { ...it, categoria: e.target.value } : it))} style={{ ...inp, flex: 1, padding: "11px 8px", background: "#fff" }}>
                          {CAT_KEYS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {items.length > 1 && <button onClick={() => setItems(its => its.filter((_, j) => j !== i))} style={{ border: "none", background: T.roseLight, color: T.rose, borderRadius: 10, width: 38, flexShrink: 0, cursor: "pointer", fontSize: 18, fontWeight: 700 }}>×</button>}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setItems(its => [...its, { nome: "", prezzo: "", categoria: CAT_KEYS[0] }])} style={{ border: `2px dashed ${T.border}`, background: "transparent", borderRadius: 12, padding: "11px", color: T.primary, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>+ Aggiungi articolo</button>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: `1px solid ${T.border}` }}>
                    <span style={{ color: T.sub, fontWeight: 600 }}>Totale stimato</span>
                    <span style={{ fontWeight: 800, color: T.primary, fontSize: 22 }}>{fmt(items.reduce((s, i) => s + (parseFloat(i.prezzo) || 0), 0))}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { setFormOpen(false); setMsg(null); }} style={{ flex: 1, border: `1.5px solid ${T.border}`, background: "#fff", color: T.sub, borderRadius: 12, padding: "12px", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>← Indietro</button>
                    <button onClick={salvaForm} style={{ flex: 2, background: T.primary, color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>💾 Salva scontrino</button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ══ CHIEDI ══ */}
        {tab === "chiedi" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontWeight: 800, color: T.text, fontSize: 22 }}>💬 Chiedi alle tue spese</div>

            {cronologia.length === 0 && (
              <Card style={{ background: `linear-gradient(135deg, ${T.primaryLight}, #fff)` }}>
                <div style={{ fontSize: 13, color: T.sub, marginBottom: 10, fontWeight: 600 }}>Esempi di domande:</div>
                {[
                  "Quante volte abbiamo comprato il tofu?",
                  "Dove costa meno la pasta?",
                  "Quanto spendiamo in media per scontrino?",
                  "Quali prodotti compriamo più spesso?",
                  "Confronta le spese tra supermercati",
                  "Quali prodotti abbiamo comprato solo una volta?",
                ].map((e, i) => (
                  <button key={i} onClick={() => setDomanda(e)} style={{ display: "block", width: "100%", textAlign: "left", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 13px", marginBottom: 6, fontSize: 13, color: T.primary, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
                    {e}
                  </button>
                ))}
              </Card>
            )}

            {spese.length === 0 && (
              <div style={{ textAlign: "center", color: T.muted, padding: "20px 0" }}>
                <p>Aggiungi prima qualche scontrino!</p>
              </div>
            )}

            {/* messaggi */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cronologia.map((m, i) => (
                <div key={i} style={{
                  padding: "13px 16px", borderRadius: 16,
                  background: m.tipo === "domanda" ? T.primary : "#fff",
                  color: m.tipo === "domanda" ? "#fff" : T.text,
                  border: m.tipo === "risposta" ? `1px solid ${T.border}` : "none",
                  boxShadow: T.shadow,
                  marginLeft: m.tipo === "domanda" ? "8%" : "0",
                  marginRight: m.tipo === "risposta" ? "8%" : "0",
                  fontSize: 14, lineHeight: 1.6,
                  fontWeight: m.tipo === "domanda" ? 600 : 400,
                  whiteSpace: "pre-wrap"
                }}>
                  <div style={{ fontSize: 10, opacity: m.tipo === "domanda" ? 0.7 : 1, color: m.tipo === "risposta" ? T.primary : "inherit", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                    {m.tipo === "domanda" ? "Tu" : "🤖 Assistente"}
                  </div>
                  {m.testo}
                </div>
              ))}
              {chiedendo && (
                <div style={{ padding: "13px 16px", borderRadius: 16, background: "#fff", border: `1px solid ${T.border}`, boxShadow: T.shadow, marginRight: "8%", fontSize: 14, color: T.muted }}>
                  <div style={{ fontSize: 10, color: T.primary, marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>🤖 Assistente</div>
                  ⏳ Sto elaborando…
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* input */}
            <div style={{ display: "flex", gap: 8, position: "sticky", bottom: 90, zIndex: 10 }}>
              <input
                value={domanda}
                onChange={e => setDomanda(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && chiedi()}
                placeholder={cronologia.length > 0 ? "Continua la conversazione…" : "Scrivi la tua domanda…"}
                style={{ flex: 1, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "13px 16px", fontSize: 15, fontFamily: "inherit", outline: "none", background: "#fff", color: T.text, boxShadow: T.shadow }}
              />
              <button onClick={chiedi} disabled={chiedendo || !domanda.trim()} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 14, padding: "0 20px", fontSize: 20, cursor: "pointer", opacity: chiedendo ? 0.6 : 1, boxShadow: T.shadow }}>
                ➤
              </button>
            </div>
          </div>
        )}

        {/* ══ STORICO ══ */}
        {tab === "storico" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontWeight: 800, color: T.text, fontSize: 22 }}>Storico scontrini</div>
            {spese.length === 0 && <div style={{ textAlign: "center", padding: "44px 0", color: T.muted }}><div style={{ fontSize: 40, marginBottom: 10 }}>📋</div><p>Nessuno scontrino ancora.</p></div>}
            {spese.map(s => (
              <Card key={s.id} style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: T.text, fontSize: 15 }}>{s.negozio}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>{new Date(s.data).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontWeight: 800, color: T.primary, fontSize: 17 }}>{fmt(s.totale)}</span>
                    <button onClick={async () => { if (confirm("Eliminare questo scontrino?")) await salva(spese.filter(x => x.id !== s.id)); }} style={{ border: "none", background: T.roseLight, color: T.rose, borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14 }}>🗑</button>
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {s.articoli.slice(0, 5).map((a, i) => <Pill key={i} bg={T.primaryLight} color={T.primary}>{a.nome}</Pill>)}
                  {s.articoli.length > 5 && <Pill bg="#f1f5f9" color={T.muted}>+{s.articoli.length - 5} altri</Pill>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", borderTop: `1px solid ${T.border}`, display: "flex", boxShadow: "0 -8px 32px rgba(124,111,247,0.08)" }}>
        {nav.map(n => {
          const active = tab === n.id;
          return (
            <button key={n.id} onClick={() => { setTab(n.id); setMsg(null); setFormOpen(false); }} style={{ flex: 1, border: "none", background: "transparent", padding: "10px 0 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ width: 36, height: 28, borderRadius: 10, background: active ? T.primaryLight : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{n.icon}</div>
              <span style={{ fontSize: 9, fontWeight: 700, color: active ? T.primary : T.muted }}>{n.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
