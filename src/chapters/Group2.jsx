// Capitoli 8–10
import ChapterShell, { Chips } from '../components/ChapterShell'
import ChainScene from '../scenes/ChainScene'
import FrameScene from '../scenes/FrameScene'
import { CHAIN_STEPS, CHECK_STEPS, FRAME_STEPS, QUIZ3 } from '../data/chapters3'
import { updateProgress, useProgress } from '../lib/progress'

export function Chain({ go }) {
  return (
    <ChapterShell
      id="trasmissione"
      steps={CHAIN_STEPS}
      quiz={QUIZ3.trasmissione}
      go={go}
      Scene={ChainScene}
      camera={[0.6, 0.8, 7.6]}
      target={[0, -0.1, 0]}
      shadowY={-2.3}
      renderControls={(step, ctrl, set) =>
        step.view === 'teeth' && (
          <>
            <div className="ctl-label">Pignone</div>
            <Chips options={[12, 13, 14, 15, 16].map((n) => [n, n + ' denti'])} value={ctrl.front} onChange={(v) => set({ front: v })} />
            <div className="ctl-label">Corona</div>
            <Chips options={[38, 40, 43, 46, 50].map((n) => [n, n + ' denti'])} value={ctrl.rear} onChange={(v) => set({ rear: v })} />
          </>
        )
      }
    />
  )
}

export function Frame({ go }) {
  return <ChapterShell id="ciclistica" steps={FRAME_STEPS} quiz={QUIZ3.ciclistica} go={go} Scene={FrameScene} camera={[2.4, 1.9, 6.2]} target={[0, 0.95, 0]} minD={1.5} maxD={12} shadowY={-2.4} />
}

function CheckToggle({ id }) {
  const p = useProgress()
  const done = !!p.checks?.[id]
  const total = CHECK_STEPS.filter((s) => s.check).length
  const count = CHECK_STEPS.filter((s) => s.check && p.checks?.[s.check]).length
  return (
    <div className="row" style={{ margin: '2px 0 10px', gap: 10 }}>
      <button className={'chip' + (done ? ' on' : '')} onClick={() => updateProgress({ checks: { ...(p.checks || {}), [id]: !done } })}>
        {done ? '✓ Controllato' : 'Segna come controllato'}
      </button>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>
        {count} di {total}
      </span>
    </div>
  )
}

export function Checks({ go }) {
  return (
    <ChapterShell
      id="manutenzione"
      steps={CHECK_STEPS}
      quiz={QUIZ3.manutenzione}
      go={go}
      Scene={FrameScene}
      camera={[2.4, 1.9, 6.2]}
      target={[0, 0.95, 0]}
      minD={1.5}
      maxD={12}
      shadowY={-2.4}
      renderControls={(step) => step.check && <CheckToggle id={step.check} />}
    />
  )
}
