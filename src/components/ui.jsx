import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { getAutoRead, setAutoRead, speak, stop as stopVoice, useVoice, voiceSupported } from '../lib/voice'
import { markDeep, recordQuiz } from '../lib/progress'

// Testo con **grassetto** e paragrafi separati da una riga vuota
export function Md({ text }) {
  return (
    <div className="step-body">
      {text.split('\n\n').map((p, i) => (
        <p key={i}>
          {p.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) =>
            chunk.startsWith('**') ? <strong key={j}>{chunk.slice(2, -2)}</strong> : <span key={j}>{chunk}</span>
          )}
        </p>
      ))}
    </div>
  )
}

export function StepProgress({ total, current }) {
  return (
    <div className="progress-bar">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={i <= current ? 'on' : ''} />
      ))}
    </div>
  )
}

// Animazione di ingresso/uscita delle schede dei passaggi
export function StepCard({ k, dir, children }) {
  return (
    <AnimatePresence mode="wait" custom={dir}>
      <motion.div
        key={k}
        custom={dir}
        initial={{ opacity: 0, x: dir * 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: dir * -40 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export function Quiz({ chapterId, questions, onDone }) {
  const [i, setI] = useState(0)
  const [pick, setPick] = useState(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  if (finished) {
    const passed = score / questions.length >= 0.8
    return (
      <motion.div className="result" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div className="big">{passed ? '🏆' : '🔧'}</div>
        <h3>
          {score} / {questions.length}
        </h3>
        <p className="why">
          {passed
            ? 'Grande! Hai conquistato il badge di questo capitolo.'
            : 'Quasi! Ripassa i passaggi e riprova: servono almeno 5 risposte giuste.'}
        </p>
        <div className="nav">
          <button
            className="btn"
            onClick={() => {
              setI(0)
              setPick(null)
              setScore(0)
              setFinished(false)
            }}
          >
            Riprova
          </button>
          <button className="btn primary" onClick={onDone}>
            Fatto
          </button>
        </div>
      </motion.div>
    )
  }

  const q = questions[i]
  const answered = pick !== null
  return (
    <div>
      <div className="step-kicker">
        Quiz · domanda {i + 1} di {questions.length}
      </div>
      <StepCard k={i} dir={1}>
        <div className="step-title" style={{ fontSize: 19 }}>
          {q.q}
        </div>
        <ListenBar k={'q' + i + (answered ? 'a' : '')} text={answered ? (pick === q.ok ? 'Esatto! ' : 'Non proprio. ') + q.why : q.q + '\n\n' + q.a.map((a, j) => ['A', 'B', 'C', 'D'][j] + ': ' + a + '.').join('\n\n')} />
        {q.a.map((a, j) => {
          let cls = 'quiz-opt'
          if (answered && j === q.ok) cls += ' ok'
          else if (answered && j === pick) cls += ' bad'
          return (
            <motion.button
              key={j}
              className={cls}
              whileTap={{ scale: 0.98 }}
              disabled={answered}
              onClick={() => {
                setPick(j)
                if (j === q.ok) setScore((s) => s + 1)
              }}
            >
              {a}
            </motion.button>
          )
        })}
        {answered && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <div className="why">
              {pick === q.ok ? '✅ Esatto! ' : '❌ Non proprio. '}
              {q.why}
            </div>
            <button
              className="btn primary"
              style={{ width: '100%' }}
              onClick={() => {
                if (i + 1 < questions.length) {
                  setI(i + 1)
                  setPick(null)
                } else {
                  recordQuiz(chapterId, score, questions.length)
                  setFinished(true)
                }
              }}
            >
              {i + 1 < questions.length ? 'Avanti' : 'Vedi il risultato'}
            </button>
          </motion.div>
        )}
      </StepCard>
    </div>
  )
}

// Contagiri in SVG
export function Tacho({ rpm, max = 12000, red = 10500, size = 120 }) {
  const a0 = -220
  const a1 = 40
  const ang = (v) => a0 + (Math.min(v, max) / max) * (a1 - a0)
  const R = size / 2 - 8
  const c = size / 2
  const pt = (deg, r) => {
    const rad = (deg * Math.PI) / 180
    return [c + r * Math.cos(rad), c + r * Math.sin(rad)]
  }
  const arc = (from, to, r) => {
    const [x1, y1] = pt(ang(from), r)
    const [x2, y2] = pt(ang(to), r)
    const large = ang(to) - ang(from) > 180 ? 1 : 0
    return `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }
  const [nx, ny] = pt(ang(rpm), R - 10)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${Math.round(rpm)} giri al minuto`}>
      <circle cx={c} cy={c} r={R + 4} fill="#0a0c10" stroke="rgba(255,255,255,.08)" />
      <path d={arc(0, red, R - 2)} stroke="rgba(255,255,255,.18)" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d={arc(red, max, R - 2)} stroke="#ff4d5e" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d={arc(0, Math.max(rpm, 1), R - 2)} stroke="#ff6a1a" strokeWidth="5" fill="none" strokeLinecap="round" />
      {Array.from({ length: max / 1000 + 1 }).map((_, k) => {
        const [x, y] = pt(ang(k * 1000), R - 16)
        return (
          <text key={k} x={x} y={y + 3} fontSize="8" fill={k * 1000 >= red ? '#ff4d5e' : '#9aa3b2'} textAnchor="middle">
            {k}
          </text>
        )
      })}
      <line x1={c} y1={c} x2={nx} y2={ny} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={c} cy={c} r="5" fill="#ff6a1a" />
      <text x={c} y={c + 24} fontSize="10" fill="#f4f6fb" textAnchor="middle" fontWeight="700">
        {Math.round(rpm / 100) * 100}
      </text>
      <text x={c} y={c + 35} fontSize="7" fill="#9aa3b2" textAnchor="middle">
        giri/min ×1000
      </text>
    </svg>
  )
}

// Barra "Ascolta": legge il testo con il narratore. In modalità automatica parte da sola a ogni passaggio.
export function ListenBar({ text, k }) {
  const { speaking } = useVoice()
  const [auto, setAuto] = useState(getAutoRead())
  useEffect(() => {
    if (getAutoRead() && text) {
      const t = setTimeout(() => speak(text), 350)
      return () => {
        clearTimeout(t)
        stopVoice()
      }
    }
    return () => stopVoice()
  }, [k, text])
  if (!voiceSupported) return null
  return (
    <div className="listen">
      <motion.button
        whileTap={{ scale: 0.95 }}
        className={'listen-btn' + (speaking ? ' on' : '')}
        onClick={() => (speaking ? stopVoice() : speak(text))}
      >
        {speaking ? (
          <>
            <span className="eq">
              <i />
              <i />
              <i />
            </span>
            Ferma
          </>
        ) : (
          <>🔊 Ascolta</>
        )}
      </motion.button>
      <button
        className={'chip' + (auto ? ' on' : '')}
        onClick={() => {
          setAuto(!auto)
          setAutoRead(!auto)
          if (!auto) speak(text)
          else stopVoice()
        }}
      >
        {auto ? '✓ Lettura automatica' : 'Lettura automatica'}
      </button>
    </div>
  )
}


// "Voglio approfondire": apre informazioni extra nella stessa schermata, con la loro lettura vocale
export function DeepDive({ text, k }) {
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [k])
  if (!text) return null
  return (
    <div className="deep">
      <motion.button
        whileTap={{ scale: 0.97 }}
        className={'deep-btn' + (open ? ' on' : '')}
        onClick={() => {
          const next = !open
          setOpen(next)
          if (next) markDeep(String(k))
          else stopVoice()
        }}
      >
        <span>{open ? '▲ Chiudi approfondimento' : '🔍 Voglio approfondire'}</span>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="deep-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="deep-inner">
              <div className="deep-kicker">Approfondimento</div>
              <ListenBar k={'deep-' + k} text={text} />
              <Md text={text} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
