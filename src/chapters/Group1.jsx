// Capitoli 3–6
import ChapterShell, { Chips, Slider } from '../components/ChapterShell'
import ValveScene from '../scenes/ValveScene'
import FuelScene, { fuelInput } from '../scenes/FuelScene'
import { useEffect, useState } from 'react'
import IgnitionScene from '../scenes/IgnitionScene'
import CoolingScene from '../scenes/CoolingScene'
import { COOLING_STEPS, FUEL_STEPS, IGNITION_STEPS, QUIZ2, VALVES_STEPS } from '../data/chapters2'

export function Valves({ go }) {
  return (
    <ChapterShell
      id="distribuzione"
      steps={VALVES_STEPS}
      quiz={QUIZ2.distribuzione}
      go={go}
      Scene={ValveScene}
      camera={[2.6, 1.4, 7]}
      target={[0, 0.1, 0]}
      shadowY={-2.3}
      renderControls={(step, ctrl, set) =>
        step.view === 'four' && (
          <Chips
            options={[
              [2, '2 valvole'],
              [4, '4 valvole'],
            ]}
            value={ctrl.valves}
            onChange={(v) => set({ valves: v })}
          />
        )
      }
    />
  )
}

export function Fuel({ go }) {
  return (
    <ChapterShell
      id="alimentazione"
      steps={FUEL_STEPS}
      quiz={QUIZ2.alimentazione}
      go={go}
      Scene={FuelScene}
      camera={[1.2, 1.2, 7.4]}
      target={[0, 0.1, 0]}
      shadowY={-2.3}
      renderControls={(step) => ['carb', 'injection', 'compare'].includes(step.view) && <GasButton />}
    />
  )
}

export function Ignition({ go }) {
  return <ChapterShell id="accensione" steps={IGNITION_STEPS} quiz={QUIZ2.accensione} go={go} Scene={IgnitionScene} camera={[1.0, 0.8, 7.4]} target={[0, -0.2, 0]} shadowY={-2.4} />
}

export function Cooling({ go }) {
  return (
    <ChapterShell
      id="raffreddamento"
      steps={COOLING_STEPS}
      quiz={QUIZ2.raffreddamento}
      go={go}
      Scene={CoolingScene}
      camera={[1.6, 1.2, 7.2]}
      target={[0, 0.1, 0]}
      shadowY={-2.3}
      renderControls={(step, ctrl, set) =>
        ctrl.slider && <Slider label="Temperatura del liquido" value={ctrl.temp} min={20} max={110} step={1} onChange={(v) => set({ temp: v })} format={(v) => v + ' °C'} />
      }
    />
  )
}

// Pulsante "tieni premuto per dare gas": apre la manopola, rilasciato torna al minimo
function GasButton() {
  const [v, setV] = useState(fuelInput.value)
  const [held, setHeld] = useState(false)
  useEffect(() => {
    let raf
    const loop = () => {
      setV(fuelInput.value)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      fuelInput.held = false
    }
  }, [])
  const press = (on) => {
    fuelInput.held = on
    setHeld(on)
    if (on && navigator.vibrate) navigator.vibrate(10)
  }
  return (
    <div className="gas-row">
      <button
        className={'hold gas' + (held ? ' on' : '')}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId)
          press(true)
        }}
        onPointerUp={() => press(false)}
        onPointerCancel={() => press(false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {held ? 'ACCELERO…' : 'TIENI PREMUTO\nPER DARE GAS'}
      </button>
      <div className="gas-meter">
        <div className="gas-fill" style={{ height: Math.round(v * 100) + '%' }} />
        <span>{Math.round(v * 100)}%</span>
      </div>
    </div>
  )
}
