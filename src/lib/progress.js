// Progressi salvati sul dispositivo (localStorage). Se lo storage non è disponibile
// l'app funziona lo stesso, semplicemente non ricorda i progressi.
import { useEffect, useState } from 'react'

const KEY = 'moto-academy-progress-v1'

function load() {
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function save(data) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* storage non disponibile */
  }
}

const listeners = new Set()
let state = typeof window !== 'undefined' ? load() : {}

export function getProgress() {
  return state
}

export function updateProgress(patch) {
  state = { ...state, ...patch }
  save(state)
  listeners.forEach((l) => l(state))
}

export function recordQuiz(chapterId, score, total) {
  const prev = state.quiz?.[chapterId]
  const best = Math.max(prev?.best ?? 0, score)
  updateProgress({ quiz: { ...(state.quiz || {}), [chapterId]: { best, total, passed: best / total >= 0.8 || !!prev?.passed } } })
}

export function markVisited(chapterId) {
  if (state.visited?.[chapterId]) return
  updateProgress({ visited: { ...(state.visited || {}), [chapterId]: true } })
}

export function markDeep(key) {
  if (state.deep?.[key]) return
  updateProgress({ deep: { ...(state.deep || {}), [key]: true } })
}

export function resetProgress() {
  state = {}
  save(state)
  listeners.forEach((l) => l(state))
}

export function useProgress() {
  const [s, setS] = useState(state)
  useEffect(() => {
    listeners.add(setS)
    return () => listeners.delete(setS)
  }, [])
  return s
}
