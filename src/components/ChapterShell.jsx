// Struttura comune dei capitoli: scena 3D in alto, passaggi animati con voce in basso, quiz finale.
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Stage from './Stage'
import { DeepDive, ListenBar, Md, Quiz, StepCard, StepProgress } from './ui'
import { DEEP } from '../data/deep'
import { markVisited } from '../lib/progress'
import { muteEngine } from '../lib/sound'

export default function ChapterShell({ id, steps, quiz, go, Scene, camera, target = [0, 0, 0], minD = 3, maxD = 12, shadowY = -2, renderControls, badge }) {
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const total = steps.length + 1
  const isQuiz = i === steps.length
  const step = steps[Math.min(i, steps.length - 1)]
  const [ctrl, setCtrl] = useState(step.ctrl || {})
  const controls = useRef()

  useEffect(() => {
    markVisited(id)
    return () => muteEngine()
  }, [id])
  useEffect(() => {
    setCtrl(steps[Math.min(i, steps.length - 1)].ctrl || {})
  }, [i, steps])

  const move = (d) => {
    setDir(d)
    setI((v) => Math.max(0, Math.min(total - 1, v + d)))
  }
  const view = isQuiz ? steps[0] : step

  return (
    <div className="chapter-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ position: 'relative' }} className="stage">
        <Stage camera={camera} target={target} minD={minD} maxD={maxD} shadowY={shadowY} className="stage-inner" controlsRef={controls}>
          <Scene step={view} ctrl={isQuiz ? view.ctrl || {} : ctrl} controlsRef={controls} />
        </Stage>
        {view.badge && !isQuiz && (
          <motion.div key={view.badge} className="phase-badge" style={{ background: view.badgeColor || '#1c2130', border: '1px solid rgba(255,255,255,.12)' }} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            {view.badge}
          </motion.div>
        )}
      </div>

      <div className="panel">
        <StepProgress total={total} current={i} />
        <div className="panel-scroll">
          {isQuiz ? (
            <Quiz chapterId={id} questions={quiz} onDone={() => go('progressi')} />
          ) : (
            <StepCard k={i} dir={dir}>
              <div className="step-kicker">
                Passaggio {i + 1} di {steps.length}
              </div>
              <div className="step-title">{step.title}</div>
              <ListenBar k={id + i} text={step.title + '.\n\n' + step.body} />
              {renderControls && renderControls(step, ctrl, (patch) => setCtrl((c) => ({ ...c, ...patch })))}
              <Md text={step.body} />
              {step.tip && <div className="toast-inline info">💡 {step.tip}</div>}
              <DeepDive k={id + '-' + i} text={DEEP[id]?.[i]} />
            </StepCard>
          )}
        </div>
        {!isQuiz && (
          <div className="nav">
            <button className="btn" disabled={i === 0} onClick={() => move(-1)}>
              ‹ Indietro
            </button>
            <button className="btn primary" onClick={() => move(1)}>
              {i === steps.length - 1 ? 'Fai il quiz 🏁' : 'Avanti ›'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Gruppo di pulsanti a scelta (es. "2 valvole / 4 valvole")
export function Chips({ options, value, onChange }) {
  return (
    <div className="row" style={{ flexWrap: 'wrap', gap: 8, margin: '2px 0 10px' }}>
      {options.map(([v, label]) => (
        <button key={String(v)} className={'chip' + (value === v ? ' on' : '')} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function Slider({ label, value, min, max, step = 0.01, onChange, format = (v) => v }) {
  return (
    <div className="slider-wrap" style={{ margin: '2px 0 10px' }}>
      <label>
        {label} <b>{format(value)}</b>
      </label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </div>
  )
}
