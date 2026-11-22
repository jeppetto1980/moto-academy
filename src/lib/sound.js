// Suono del motore monocilindrico 4 tempi, generato in tempo reale con la Web Audio API.
// Nessun file audio: due oscillatori filtrati + una modulazione che riproduce gli "scoppi".
// In un 4 tempi c'è uno scoppio ogni 2 giri dell'albero motore → frequenza scoppi = giri/120.

let ctx = null
let nodes = null
let enabled = false
const listeners = new Set()

function build() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  const master = ctx.createGain()
  master.gain.value = 0
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 600
  filter.Q.value = 4

  const osc1 = ctx.createOscillator()
  osc1.type = 'sawtooth'
  const osc2 = ctx.createOscillator()
  osc2.type = 'square'
  const g1 = ctx.createGain()
  g1.gain.value = 0.5
  const g2 = ctx.createGain()
  g2.gain.value = 0.18

  // Modulazione d'ampiezza = i colpi del motore
  const pulse = ctx.createGain()
  pulse.gain.value = 0.6
  const lfo = ctx.createOscillator()
  lfo.type = 'square'
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.4
  lfo.connect(lfoGain).connect(pulse.gain)

  osc1.connect(g1).connect(pulse)
  osc2.connect(g2).connect(pulse)
  pulse.connect(filter).connect(master).connect(ctx.destination)
  osc1.start()
  osc2.start()
  lfo.start()
  return { master, filter, osc1, osc2, lfo }
}

export function isSoundOn() {
  return enabled
}

export function setSound(on) {
  enabled = on
  try {
    if (on) {
      if (!ctx) nodes = build()
      if (ctx && ctx.state === 'suspended') ctx.resume()
    }
    // il volume si alza solo quando una scena fa davvero girare il motore (setEngineRpm)
    if (nodes) nodes.master.gain.setTargetAtTime(0, ctx.currentTime, 0.05)
  } catch {
    enabled = false
  }
  listeners.forEach((l) => l(enabled))
}

export function onSoundChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Da chiamare ad ogni frame con i giri motore attuali (0 = motore spento)
let lastRpmCall = 0
let watchdog = null

export function setEngineRpm(rpm, load = 0.5) {
  if (!enabled || !nodes || !ctx) return
  lastRpmCall = performance.now()
  // se nessuna scena aggiorna il motore per un attimo (cambio pagina, passaggio senza motore), silenzio
  if (!watchdog)
    watchdog = setInterval(() => {
      if (nodes && performance.now() - lastRpmCall > 250) nodes.master.gain.setTargetAtTime(0, ctx.currentTime, 0.05)
    }, 150)
  const t = ctx.currentTime
  const r = Math.max(rpm, 0)
  const base = 18 + r / 60 // giri al secondo
  nodes.osc1.frequency.setTargetAtTime(base, t, 0.05)
  nodes.osc2.frequency.setTargetAtTime(base * 2.01, t, 0.05)
  nodes.lfo.frequency.setTargetAtTime(Math.max(r / 120, 1), t, 0.05)
  nodes.filter.frequency.setTargetAtTime(300 + r * 0.12 + load * 900, t, 0.08)
  nodes.master.gain.setTargetAtTime(r < 100 ? 0 : 0.1 + load * 0.1, t, 0.1)
}

export function muteEngine() {
  if (!nodes || !ctx) return
  nodes.master.gain.setTargetAtTime(0, ctx.currentTime, 0.1)
}
