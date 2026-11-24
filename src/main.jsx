import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')).render(<App />)

// Pagine senza scena 3D (glossario, progressi): chiudi subito la schermata di caricamento
setTimeout(() => { if (!document.querySelector('.stage')) window.__bootDone?.() }, 400)

// Installabile e utilizzabile offline (solo quando l'app è servita da un sito, es. GitHub Pages)
if ('serviceWorker' in navigator && location.protocol === 'https:' && import.meta.env.MODE !== 'single') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
