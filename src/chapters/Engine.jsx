import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Stage from '../components/Stage'
import EngineScene from '../scenes/EngineScene'
import { DeepDive, ListenBar, Md, Quiz, StepCard, StepProgress, Tacho } from '../components/ui'
import { DEEP } from '../data/deep'
import { ENGINE_STEPS, PHASES, QUIZ } from '../data/content'
import { markVisited } from '../lib/progress'
import { muteEngine } from '../lib/sound'

export default function Engine({ go }) {
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const [phase, setPhase] = useState(0)
  const [rpm, setRpm] = useState(3000)
  const total = ENGINE_STEPS.length + 1
  const isQuiz = i === ENGINE_STEPS.length
  const step = ENGINE_STEPS[Math.min(i, ENGINE_STEPS.length - 1)]
  const mode = isQuiz ? { type: 'run', rpm: 1500 } : step.mode

  useEffect(() => {
    markVisited('motore')
    return () => muteEngine()
  }, [])

  const move = (d) => {
    setDir(d)
    setI((v) => Math.max(0, Math.min(total - 1, v + d)))
  }
  const ph = PHASES[phase]
  const showPhase = !isQuiz && (mode.type !== 'run' || i === 0)

  return (
    <div className="chapter-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ position: 'relative' }} className="stage">
        <Stage camera={[3.6, 1.9, 7.8]} target={[0, 0.25, 0]} minD={3} maxD={13} shadowY={-2.3} className="stage-inner">
          <EngineScene mode={mode} rpm={rpm} highlight={isQuiz ? [] : step.highlight} onPhase={setPhase} />
        </Stage>
        {showPhase && (
          <>
            <motion.div
              key={ph.name}
              className="phase-badge"
              style={{ background: ph.color }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {phase + 1}° tempo · {ph.name}
            </motion.div>
            <div className="phase-dots">
              {PHASES.map((p) => (
                <span key={p.id} style={{ background: p.id === phase ? p.color : undefined }} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <StepProgress total={total} current={i} />
        <div className="panel-scroll">
          {isQuiz ? (
            <Quiz chapterId="motore" questions={QUIZ.motore} onDone={() => go('progressi')} />
          ) : (
            <StepCard k={i} dir={dir}>
              <div className="step-kicker">
                Passaggio {i + 1} di {ENGINE_STEPS.length}
              </div>
              <div className="step-title">{step.title}</div>
              <ListenBar k={i} text={step.title + '.\n\n' + step.body} />
              {mode.type === 'free' && (
                <div className="controls">
                  <div className="row">
                    <Tacho rpm={rpm} size={104} />
                    <div className="slider-wrap">
                      <label>
                        Giri motore <b>{rpm.toLocaleString('it-IT')} giri/min</b>
                      </label>
                      <input type="range" min={1200} max={11000} step={100} value={rpm} onChange={(e) => setRpm(+e.target.value)} />
                      <label style={{ marginTop: 4 }}>
                        Scoppi al secondo <b>{Math.round(rpm / 120)}</b>
                      </label>
                    </div>
                  </div>
                </div>
              )}
              <Md text={step.body} />
              {mode.type === 'phase' && <div className="toast-inline info">{PHASES[mode.phase].short}</div>}
              <DeepDive k={'motore-' + i} text={DEEP.motore[i]} />
            </StepCard>
          )}
        </div>
        {!isQuiz && (
          <div className="nav">
            <button className="btn" disabled={i === 0} onClick={() => move(-1)}>
              ‹ Indietro
            </button>
            <button className="btn primary" onClick={() => move(1)}>
              {i === ENGINE_STEPS.length - 1 ? 'Fai il quiz 🏁' : 'Avanti ›'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
