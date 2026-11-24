import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Stage from '../components/Stage'
import GearboxScene, { GEARS } from '../scenes/GearboxScene'
import { DeepDive, ListenBar, Md, PanelHandle, Quiz, StepCard, StepProgress, Tacho } from '../components/ui'
import { DEEP } from '../data/deep'
import { GEARBOX_STEPS, QUIZ } from '../data/content'
import { markVisited } from '../lib/progress'
import { muteEngine, setEngineRpm } from '../lib/sound'

// Dati di una 125 cc tipica (valori indicativi)
const PRIMARY = 3.2 // riduzione primaria motore → cambio
const FINAL = 43 / 14 // corona / pignone
const WHEEL_R = 0.3 // raggio ruota posteriore (m)
const MASS = 220 // moto + pilota (kg)
const IDLE = 1500
const LIMIT = 10500
const SLOW = 25 // rallentamento dell'animazione 3D

const torque = (rpm) => {
  const x = Math.min(Math.max((rpm - 1000) / 10000, 0), 1)
  return 11 * (0.55 + 0.45 * Math.sin(Math.PI * x)) // Nm
}
const ratioOf = (g) => (g ? GEARS[g - 1].ratio : 0)
const toW = (rpm) => (rpm * 2 * Math.PI) / 60 / SLOW

const SEQ = [1, 0, 2, 3, 4, 5, 4, 3, 2, 0, 1]

export default function Gearbox({ go }) {
  const [i, setI] = useState(0)
  const layoutRef = useRef()
  const [dir, setDir] = useState(1)
  const total = GEARBOX_STEPS.length + 1
  const isQuiz = i === GEARBOX_STEPS.length
  const step = GEARBOX_STEPS[Math.min(i, GEARBOX_STEPS.length - 1)]
  const demo = isQuiz ? { gear: 3, throttle: 0.3, clutch: false } : step.demo
  const interactive = !isQuiz && !demo

  const sim = useRef({ gear: 0, clutch: false, throttle: 0, v: 0, rpm: IDLE, thetaE: 0, thetaP: 0, thetaS: 0, wE: 0, wP: 0, wS: 0, msg: '', msgT: 0, t: 0, stalled: false, autoT: 0 })
  const [ui, setUi] = useState({ gear: 0, rpm: IDLE, kmh: 0, clutch: false, msg: '' })
  const [throttle, setThrottle] = useState(0)

  useEffect(() => {
    markVisited('cambio')
    return () => muteEngine()
  }, [])

  const say = (msg) => {
    sim.current.msg = msg
    sim.current.msgT = 3
  }

  const stepFn = useCallback(
    (dt) => {
      const s = sim.current
      // Ogni volta che cambia passaggio riparte da una situazione pulita
      if (s.key !== i) {
        s.key = i
        s.t = 0
        s.msg = ''
        s.msgT = 0
        s.stalled = false
        if (!demo) {
          s.gear = 0
          s.v = 0
          s.clutch = false
          s.rpm = IDLE
        }
      }
      s.t += dt
      if (demo) {
        // Modalità dimostrazione: movimento "da manuale", senza fisica
        let gear = demo.gear
        if (demo.gear === 'cycle') gear = 1 + (Math.floor(s.t / 2.5) % 5)
        if (demo.gear === 'sequence') gear = SEQ[Math.floor(s.t / 1.6) % SEQ.length]
        const clutch = demo.clutch === 'pulse' ? Math.floor(s.t / 2) % 2 === 1 : demo.clutch
        s.gear = gear
        s.clutch = clutch
        s.rpm = 2500 + demo.throttle * 6000
        s.wE = toW(s.rpm)
        const R = ratioOf(gear)
        const wheelW = gear ? s.wE / PRIMARY / R : s.wS * 0.98
        if (!clutch) s.wP = s.wE / PRIMARY
        else s.wP = gear ? s.wP * 0.985 : s.wP * 0.97
        s.wS = clutch ? (gear ? s.wP / R : s.wS * 0.99) : wheelW
        s.v = ((s.wS * SLOW) / FINAL) * WHEEL_R
        setEngineRpm(s.rpm, demo.throttle)
        return
      }

      // Simulatore
      s.throttle = throttleRef.current
      if (s.autoT > 0) s.autoT -= dt
      const cl = s.clutch || s.autoT > 0 // frizione tirata (a mano o in automatico durante il cambio)
      const R = ratioOf(s.gear)
      const total = PRIMARY * R * FINAL
      let force = 0
      if (s.stalled) {
        s.rpm = Math.max(0, s.rpm - dt * 6000)
        if (cl) {
          s.stalled = false
          s.rpm = IDLE
          say('Motore riavviato. Ora puoi ripartire.')
        }
      } else if (!s.gear || cl) {
        const target = IDLE + s.throttle * (LIMIT + 300 - IDLE)
        s.rpm += (target - s.rpm) * Math.min(1, dt * 5)
        if (s.rpm > LIMIT) {
          s.rpm = LIMIT - 400
          say('🔴 Limitatore! Il motore non può superare i ' + LIMIT.toLocaleString('it-IT') + ' giri.')
        }
      } else {
        const vehRpm = (s.v / (2 * Math.PI * WHEEL_R)) * 60 * total
        if (vehRpm < IDLE) {
          if (s.gear >= 3 && s.v < 3) {
            s.stalled = true
            say(`Motore spento! In ${s.gear}ª da fermo non si parte: tira la frizione e scala in prima.`)
          } else {
            // in partenza la frizione slitta: i giri restano alti e la moto prende velocità
            const target = IDLE + s.throttle * (LIMIT - IDLE) * 0.75
            s.rpm += (target - s.rpm) * Math.min(1, dt * 4)
            force = (s.throttle * torque(s.rpm) * total * 0.85) / WHEEL_R
          }
        } else {
          s.rpm = vehRpm
          if (s.rpm > LIMIT) {
            if (s.rpm > LIMIT + 1500) say('⚠️ Fuori giri! Hai scalato una marcia troppo bassa per questa velocità.')
            else say('🔴 Limitatore! È ora di passare alla marcia successiva.')
            force = -((0.05 * s.rpm) / 100) * total
          } else {
            force = (s.throttle * torque(s.rpm) * total * 0.9) / WHEEL_R
            if (s.throttle < 0.05) force -= ((0.012 * s.rpm) / 100) * total // freno motore
          }
        }
      }
      const drag = 0.5 * 1.2 * 0.55 * s.v * s.v + MASS * 9.81 * 0.015 * (s.v > 0.05 ? 1 : 0)
      s.v = Math.max(0, s.v + ((force - drag) / MASS) * dt)

      // Velocità angolari per l'animazione
      s.wE = toW(s.rpm)
      const wheelShaft = toW((s.v / (2 * Math.PI * WHEEL_R)) * 60 * FINAL)
      s.wS = wheelShaft
      if (!cl && s.gear && !s.stalled) s.wP = s.wE / PRIMARY
      else if (s.gear) s.wP = s.wS * R
      else if (!cl) s.wP = s.wE / PRIMARY
      else s.wP *= 0.97
      setEngineRpm(s.rpm, s.throttle)
      if (s.msgT > 0) {
        s.msgT -= dt
        if (s.msgT <= 0) s.msg = ''
      }
    },
    [demo, i]
  )

  const throttleRef = useRef(0)
  useEffect(() => {
    throttleRef.current = throttle
  }, [throttle])

  // Aggiorna i display circa 12 volte al secondo
  useEffect(() => {
    const id = setInterval(() => {
      const s = sim.current
      setUi({ gear: s.gear, rpm: s.rpm, kmh: s.v * 3.6, clutch: s.clutch || s.autoT > 0, msg: s.msg })
    }, 80)
    return () => clearInterval(id)
  }, [])

  // Cambio marcia: se la frizione non è tirata, il simulatore la tira per un attimo da solo
  const engage = (n) => {
    const s = sim.current
    if (n === s.gear) return
    if (!s.clutch) {
      s.autoT = 0.45
      if (!s.autoHint) {
        s.autoHint = true
        say('💡 Hai cambiato senza frizione: il simulatore l’ha tirata per te. Sulla moto vera si usa la leva!')
      }
    }
    s.gear = n
    if (navigator.vibrate) navigator.vibrate(15)
  }
  const shift = (d) => {
    const g = sim.current.gear
    if (d > 0) engage(g === 0 ? 2 : Math.min(5, g === 1 ? 2 : g + 1))
    else engage(g === 0 ? 1 : g === 2 ? 1 : Math.max(1, g - 1))
  }
  const neutral = () => {
    const s = sim.current
    if (s.gear > 2) say('Sulla moto vera la folle si trova tra 1ª e 2ª: prima si scala, poi si cerca la N.')
    engage(0)
  }
  const pickGear = (n) => {
    const s = sim.current
    if (Math.abs(n - s.gear) > 1 && s.gear !== 0 && n !== 0) say('Il cambio della moto è sequenziale: le marce si passano una alla volta. Qui puoi saltare per provare.')
    engage(n)
  }
  const clutchLock = useRef(false)
  const clutchPress = useRef({ t: 0, wasLocked: false })
  const [locked, setLocked] = useState(false)
  const setClutch = (v) => {
    sim.current.clutch = v
    setUi((u) => ({ ...u, clutch: v }))
  }

  const move = (d) => {
    setThrottle(0)
    clutchLock.current = false
    setLocked(false)
    setDir(d)
    setI((v) => Math.max(0, Math.min(total - 1, v + d)))
  }

  const gearLabel = ui.gear === 0 ? 'N' : ui.gear

  return (
    <div ref={layoutRef} className="chapter-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ position: 'relative' }} className={'stage' + (interactive ? ' compact' : '')}>
        <Stage camera={[5.6, 2.7, 5.4]} target={[0, 0.1, 0]} minD={3} maxD={14} shadowY={-2.2} className="stage-inner">
          <GearboxScene sim={sim} step={stepFn} onPickGear={interactive ? pickGear : null} />
        </Stage>
        {!interactive && (
          <div className="phase-badge" style={{ background: ui.clutch ? '#3aa0ff' : '#1c2130', border: '1px solid rgba(255,255,255,.12)' }}>
            {ui.clutch ? 'Frizione tirata' : `Marcia: ${gearLabel === 'N' ? 'Folle (N)' : gearLabel + 'ª'}`}
          </div>
        )}
      </div>

      <div className="panel">
        <PanelHandle layoutRef={layoutRef} />
        <StepProgress total={total} current={i} />
        <div className="panel-scroll">
          {isQuiz ? (
            <Quiz chapterId="cambio" questions={QUIZ.cambio} onDone={() => go('progressi')} />
          ) : (
            <StepCard k={i} dir={dir}>
              <div className="step-kicker">
                Passaggio {i + 1} di {GEARBOX_STEPS.length}
              </div>
              <div className="step-title">{step.title}</div>
              <ListenBar k={i} text={step.title + '.\n\n' + step.body} />
              {interactive && (
                <div className="controls">
                  <div className="sim">
                    <div className="dash">
                      <Tacho rpm={ui.rpm} size={108} />
                      <div>
                        <div className={'gear-display' + (ui.gear === 0 ? ' n' : '')}>{gearLabel}</div>
                        <div className="speed" style={{ marginTop: 6 }}>
                          <b>{Math.round(ui.kmh)}</b>
                          <span>km/h</span>
                        </div>
                      </div>
                    </div>
                    <div className="shift">
                      <button onClick={() => shift(1)} aria-label="Marcia su">▲</button>
                      <button onClick={neutral} style={{ fontSize: 15 }}>
                        N
                      </button>
                      <button onClick={() => shift(-1)} aria-label="Marcia giù">▼</button>
                    </div>
                  </div>
                  <div className="gear-pick">
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <button key={n} className={'chip' + (ui.gear === n ? ' on' : '')} onClick={() => (n === 0 ? neutral() : pickGear(n))}>
                        {n === 0 ? 'N' : n + 'ª'}
                      </button>
                    ))}
                  </div>
                  <div className="big-controls">
                    <button
                      className={'hold' + (ui.clutch ? ' on' : '')}
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture?.(e.pointerId)
                        clutchPress.current = { t: performance.now(), wasLocked: clutchLock.current }
                        clutchLock.current = false
                        setClutch(true)
                      }}
                      onPointerUp={() => {
                        const { t, wasLocked } = clutchPress.current
                        // tocco breve = blocca/sblocca, pressione lunga = tieni premuto
                        if (performance.now() - t < 280 && !wasLocked) {
                          clutchLock.current = true
                          setLocked(true)
                        } else {
                          setLocked(false)
                          setClutch(false)
                        }
                      }}
                      onPointerCancel={() => {
                        clutchLock.current = false
                        setLocked(false)
                        setClutch(false)
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      {locked ? 'Frizione bloccata\n(tocca per rilasciare)' : ui.clutch ? 'Frizione tirata' : 'FRIZIONE\ntieni premuto o tocca'}
                    </button>
                    <div className="slider-wrap" style={{ alignSelf: 'center' }}>
                      <label>
                        Gas <b>{Math.round(throttle * 100)}%</b>
                      </label>
                      <input type="range" min={0} max={1} step={0.01} value={throttle} onChange={(e) => setThrottle(+e.target.value)} />
                    </div>
                  </div>
                  <AnimatePresence>
                    {ui.msg && (
                      <motion.div className="toast-inline" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {ui.msg}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <Md text={step.body} />
              {interactive && (
                <div className="toast-inline info">
                  Rapporti di questo cambio: {GEARS.map((g) => `${g.n}ª ${g.ratio.toFixed(2).replace('.', ',')}`).join(' · ')}
                </div>
              )}
              <DeepDive k={'cambio-' + i} text={DEEP.cambio[i]} />
            </StepCard>
          )}
        </div>
        {!isQuiz && (
          <div className="nav">
            <button className="btn" disabled={i === 0} onClick={() => move(-1)}>
              ‹ Indietro
            </button>
            <button className="btn primary" onClick={() => move(1)}>
              {i === GEARBOX_STEPS.length - 1 ? 'Fai il quiz 🏁' : 'Avanti ›'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
