import { useState } from 'react'
import { motion } from 'framer-motion'
import { CHAPTERS, GLOSSARY } from '../data/content'

const QUIZ_CHAPTERS = ['motore', 'distribuzione', 'alimentazione', 'accensione', 'raffreddamento', 'cambio', 'trasmissione', 'ciclistica', 'manutenzione']
import { resetProgress, updateProgress, useProgress } from '../lib/progress'

export function Glossary() {
  const [q, setQ] = useState('')
  const list = GLOSSARY.filter(([t, d]) => (t + d).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="page">
      <h1>📖 Glossario</h1>
      <input className="search" placeholder="Cerca una parola…" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.map(([t, d], i) => (
        <motion.div key={t} className="gloss" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
          <b>{t}</b>
          <span>{d}</span>
        </motion.div>
      ))}
      {!list.length && <p className="why">Nessun risultato.</p>}
    </div>
  )
}

const BADGES = [
  { id: 'esploratore', e: '🧭', n: 'Esploratore', d: 'Hai esplorato la moto in 3D', test: (p) => p.visited?.mappa },
  { id: 'motorista', e: '⚙️', n: 'Motorista', d: 'Quiz del motore superato', test: (p) => p.quiz?.motore?.passed },
  { id: 'distribuzione', e: '🔩', n: 'Maestro delle valvole', d: 'Quiz della distribuzione superato', test: (p) => p.quiz?.distribuzione?.passed },
  { id: 'alimentazione', e: '⛽', n: 'Chef della miscela', d: 'Quiz dell’alimentazione superato', test: (p) => p.quiz?.alimentazione?.passed },
  { id: 'accensione', e: '⚡', n: 'Scintilla', d: 'Quiz dell’accensione superato', test: (p) => p.quiz?.accensione?.passed },
  { id: 'raffreddamento', e: '💧', n: 'Sangue freddo', d: 'Quiz del raffreddamento superato', test: (p) => p.quiz?.raffreddamento?.passed },
  { id: 'cambio', e: '🕹️', n: 'Re del cambio', d: 'Quiz del cambio superato', test: (p) => p.quiz?.cambio?.passed },
  { id: 'trasmissione', e: '⛓️', n: 'Catena d’oro', d: 'Quiz della trasmissione superato', test: (p) => p.quiz?.trasmissione?.passed },
  { id: 'ciclistica', e: '🛞', n: 'Telaio d’acciaio', d: 'Quiz di telaio, freni e sospensioni superato', test: (p) => p.quiz?.ciclistica?.passed },
  { id: 'manutenzione', e: '✅', n: 'Pronto a partire', d: 'Quiz dei controlli superato', test: (p) => p.quiz?.manutenzione?.passed },
  { id: 'checklist', e: '📋', n: 'Checklist completa', d: 'Tutti i 7 controlli segnati', test: (p) => ['gomme', 'freni', 'luci', 'catena', 'liquidi', 'comandi', 'pilota'].every((k) => p.checks?.[k]) },
  { id: 'approfondimenti', e: '🔬', n: 'Tecnico esperto', d: 'Hai aperto 20 approfondimenti', test: (p) => Object.keys(p.deep || {}).length >= 20 },
  { id: 'curioso', e: '🔍', n: 'Curioso', d: 'Hai aperto tutti i capitoli disponibili', test: (p) => CHAPTERS.filter((c) => c.ready).every((c) => p.visited?.[c.id]) },
]

export function Progress() {
  const p = useProgress()
  const [confirmReset, setConfirmReset] = useState(false)
  const got = BADGES.filter((b) => b.test(p)).length
  const passedCount = QUIZ_CHAPTERS.filter((c) => p.quiz?.[c]?.passed).length
  const licensed = passedCount === QUIZ_CHAPTERS.length
  return (
    <div className="page">
      <h1>🏆 I tuoi progressi</h1>
      <motion.div className="license" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div className="stamp">{licensed ? '🏅' : '🔒'}</div>
        <div className="step-kicker">Moto Academy</div>
        <h2>Patentino da meccanico</h2>
        <input
          className="search"
          style={{ margin: '8px 0', background: 'transparent' }}
          placeholder="Scrivi il tuo nome"
          value={p.name || ''}
          onChange={(e) => updateProgress({ name: e.target.value })}
        />
        <div className="why" style={{ margin: 0 }}>
          {licensed
            ? `Rilasciato a ${p.name || 'un futuro meccanico'}: conosce come funziona una moto, dal motore alle gomme.`
            : `Supera tutti i quiz per ottenerlo: ${passedCount} di ${QUIZ_CHAPTERS.length} superati.`}
        </div>
      </motion.div>
      <div className="step-kicker" style={{ marginBottom: 8 }}>
        Badge · {got} di {BADGES.length}
      </div>
      <div className="badges">
        {BADGES.map((b) => (
          <div key={b.id} className={'badge' + (b.test(p) ? ' got' : '')}>
            <div className="e">{b.e}</div>
            <div className="n">{b.n}</div>
            <div className="d">{b.d}</div>
          </div>
        ))}
      </div>
      <button
        className="btn"
        style={{ width: '100%', marginTop: 18 }}
        onClick={() => {
          if (confirmReset) {
            resetProgress()
            setConfirmReset(false)
          } else setConfirmReset(true)
        }}
      >
        {confirmReset ? 'Tocca di nuovo per confermare' : 'Azzera progressi'}
      </button>
    </div>
  )
}
