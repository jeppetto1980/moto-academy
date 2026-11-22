// Narratore: usa le voci di sintesi già presenti sul dispositivo (Web Speech API).
// Sceglie in automatico la voce italiana maschile più naturale disponibile; l'utente può cambiarla dal menu.
import { useEffect, useState } from 'react'

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
const KEY_VOICE = 'moto-academy-voice'
const KEY_AUTO = 'moto-academy-autoread'

const MALE = /luca|diego|cosimo|riccardo|giorgio|benigno|roberto|matteo|giuseppe|marco|andrea|paolo|lorenzo|francesco|giovanni|\bmale\b|uomo|maschil/i
const FEMALE = /alice|elsa|isabella|federica|paola|carla|chiara|emma|silvia|giulia|bianca|female|donna|femmin|google italiano/i
const NOVELTY = /rocko|grandpa|grandma|eddy|reed|sandy|shelley|flo|bahh|bells|boing|bubbles|cellos|wobble|zarvox|trinoids|whisper|jester|organ|superstar|ralph|fred|junior|kathy|albert|bad news|good news/i
const QUALITY = /natural|neural|online|premium|enhanced|siri|wavenet|studio/i

let voices = []
const listeners = new Set()
let speaking = false

function setSpeaking(v) {
  speaking = v
  listeners.forEach((l) => l({ speaking, voices }))
}

function score(v) {
  let s = 0
  if (/^it/i.test(v.lang)) s += 100
  if (MALE.test(v.name)) s += 40
  if (FEMALE.test(v.name)) s -= 30
  if (NOVELTY.test(v.name)) s -= 80
  if (QUALITY.test(v.name)) s += 25
  if (v.localService) s += 3
  return s
}

function loadVoices() {
  if (!synth) return
  voices = synth
    .getVoices()
    .filter((v) => /^it/i.test(v.lang))
    .sort((a, b) => score(b) - score(a))
  listeners.forEach((l) => l({ speaking, voices }))
}
if (synth) {
  loadVoices()
  synth.addEventListener?.('voiceschanged', loadVoices)
}

export const voiceSupported = !!synth

function store(k, v) {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* ignora */
  }
}
function read(k) {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}

export function getChosenVoice() {
  const name = read(KEY_VOICE)
  return voices.find((v) => v.name === name) || voices[0] || null
}
export function setChosenVoice(name) {
  store(KEY_VOICE, name)
  listeners.forEach((l) => l({ speaking, voices }))
}
export function getAutoRead() {
  return read(KEY_AUTO) === '1'
}
export function setAutoRead(on) {
  store(KEY_AUTO, on ? '1' : '0')
  listeners.forEach((l) => l({ speaking, voices }))
}

// Trasforma il testo scritto in testo "da dire": sigle, simboli, numeri ordinali
export function toSpeech(text) {
  return text
    .replace(/\*\*/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/\bPMS\b/g, 'pi emme esse')
    .replace(/\bPMI\b/g, 'pi emme i')
    .replace(/\bDOHC\b/g, 'di o acca ci')
    .replace(/\bSOHC\b/g, 'esse o acca ci')
    .replace(/\brpm\b/gi, 'giri al minuto')
    .replace(/giri\/min/g, 'giri al minuto')
    .replace(/1-N-2-3-4-5/g, 'uno, folle, due, tre, quattro, cinque')
    .replace(/\(N\)/g, '')
    .replace(/1° tempo/g, 'Primo tempo')
    .replace(/2° tempo/g, 'Secondo tempo')
    .replace(/3° tempo/g, 'Terzo tempo')
    .replace(/4° tempo/g, 'Quarto tempo')
    .replace(/\b1ª/g, 'prima')
    .replace(/\b2ª/g, 'seconda')
    .replace(/\b3ª/g, 'terza')
    .replace(/\b4ª/g, 'quarta')
    .replace(/\b5ª/g, 'quinta')
    .replace(/(\d+)°/g, '$1 gradi')
    .replace(/cm³/g, 'centimetri cubi')
    .replace(/\bcc\b/g, 'centimetri cubi')
    .replace(/\bNm\b/g, 'newton metro')
    .replace(/→/g, ', ')
    .replace(/ – /g, ', ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Divide in frasi brevi: suona più naturale e aggira il blocco delle frasi lunghe su Chrome
function chunks(text) {
  return text
    .split(/\n\n+/)
    .flatMap((p) => toSpeech(p).match(/[^.!?]+[.!?]*/g) || [])
    .map((s) => s.trim())
    .filter(Boolean)
}

let session = 0

export function stop() {
  session++
  if (synth) synth.cancel()
  setSpeaking(false)
}

export function speak(text, { onEnd } = {}) {
  if (!synth) return
  stop()
  const my = ++session
  const parts = chunks(text)
  const voice = getChosenVoice()
  let i = 0
  setSpeaking(true)
  const next = () => {
    if (my !== session) return
    if (i >= parts.length) {
      setSpeaking(false)
      onEnd && onEnd()
      return
    }
    const u = new SpeechSynthesisUtterance(parts[i])
    if (voice) u.voice = voice
    u.lang = voice?.lang || 'it-IT'
    // tono caldo e ritmo calmo; leggera variazione tra le frasi per un effetto meno robotico
    u.rate = 0.96 + (i % 3 === 1 ? 0.03 : 0)
    u.pitch = 0.95 + (i % 2 ? 0.03 : 0)
    u.volume = 1
    u.onend = () => {
      i++
      setTimeout(next, /[.!?]$/.test(parts[i - 1]) ? 180 : 60)
    }
    u.onerror = () => {
      if (my === session) setSpeaking(false)
    }
    synth.speak(u)
  }
  next()
}

export function useVoice() {
  const [st, setSt] = useState({ speaking, voices })
  useEffect(() => {
    listeners.add(setSt)
    return () => listeners.delete(setSt)
  }, [])
  return st
}
