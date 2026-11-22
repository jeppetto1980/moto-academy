import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Stage from '../components/Stage'
import MotoScene, { PAINTS } from '../scenes/MotoScene'
import { CHAPTERS, PARTS } from '../data/content'
import { markVisited, useProgress } from '../lib/progress'
import { ListenBar } from '../components/ui'

export default function Home({ go }) {
  const [sel, setSel] = useState(null)
  const [paint, setPaint] = useState(() => {
    try {
      return localStorage.getItem('moto-academy-paint') || PAINTS[0].color
    } catch {
      return PAINTS[0].color
    }
  })
  const choosePaint = (c) => {
    setPaint(c)
    try {
      localStorage.setItem('moto-academy-paint', c)
    } catch {
      /* ignora */
    }
  }
  const controls = useRef()
  const progress = useProgress()
  const part = sel ? PARTS[sel] : null
  const chapter = part ? CHAPTERS.find((c) => c.id === part.chapter) : null

  useEffect(() => {
    if (sel) markVisited('mappa')
  }, [sel])

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <motion.div className="home-hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1>
          Come funziona <span>una moto</span>
        </h1>
        <p>Tocca i punti arancioni per esplorare le parti, oppure scegli un capitolo.</p>
      </motion.div>

      <div style={{ position: 'relative' }}>
        <Stage
          camera={[2.4, 1.9, 6.2]}
          target={[0, 0.95, 0]}
          controlsRef={controls}
          autoRotate={!sel}
          minD={1.5}
          maxD={7.2}
          shadowY={0.005}
          dim
          className="stage tall"
        >
          <MotoScene selected={sel} onSelect={setSel} controlsRef={controls} color={paint} />
        </Stage>
        {!sel && (
          <div className="paint-bar">
            <span>Colore</span>
            {PAINTS.map((p) => (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.85 }}
                className={'swatch' + (paint === p.color ? ' on' : '')}
                style={{ background: p.color }}
                aria-label={p.name}
                onClick={() => choosePaint(p.color)}
              />
            ))}
          </div>
        )}
        <AnimatePresence>
          {part && (
            <motion.div
              className="part-card"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            >
              <h3>{part.name}</h3>
              <p>{part.text}</p>
              <ListenBar k={sel} text={part.name + '.\n\n' + part.text} />
              <div className="nav" style={{ marginTop: 0 }}>
                <button className="btn" onClick={() => setSel(null)}>
                  Chiudi
                </button>
                <button className="btn primary" disabled={!chapter?.ready} onClick={() => go(part.chapter)}>
                  {chapter?.ready ? 'Apri capitolo →' : 'Capitolo in arrivo'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ padding: '14px 14px 30px' }}>
        <div className="step-kicker" style={{ margin: '0 4px 8px' }}>
          Capitoli
        </div>
        <motion.div
          className="cards"
          initial="h"
          animate="v"
          variants={{ v: { transition: { staggerChildren: 0.05 } } }}
        >
          {CHAPTERS.filter((c) => c.id !== 'mappa').map((c) => {
            const q = progress.quiz?.[c.id]
            return (
              <motion.button
                key={c.id}
                className={'card' + (c.ready ? '' : ' locked')}
                variants={{ h: { opacity: 0, y: 16 }, v: { opacity: 1, y: 0 } }}
                whileTap={{ scale: 0.97 }}
                onClick={() => c.ready && go(c.id)}
              >
                <div className="ic">{c.icon}</div>
                <div>
                  <div className="t">
                    {c.n}. {c.title}
                  </div>
                  <div className="s">{c.ready ? c.subtitle : 'In arrivo'}</div>
                </div>
                <div className="go">{q?.passed ? '🏆' : c.ready ? '›' : '🔒'}</div>
              </motion.button>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
