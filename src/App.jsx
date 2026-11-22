import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Home from './chapters/Home'
import Engine from './chapters/Engine'
import Gearbox from './chapters/Gearbox'
import { Glossary, Progress } from './chapters/Pages'
import { Cooling, Fuel, Ignition, Valves } from './chapters/Group1'
import { Chain, Checks, Frame } from './chapters/Group2'
import { CHAPTERS } from './data/content'
import { useProgress } from './lib/progress'
import { drawLogo } from './lib/logo'
import { isSoundOn, muteEngine, onSoundChange, setSound } from './lib/sound'
import { getChosenVoice, setChosenVoice, speak, stop as stopVoice, useVoice, voiceSupported } from './lib/voice'

const ROUTES = { mappa: Home, motore: Engine, distribuzione: Valves, alimentazione: Fuel, accensione: Ignition, raffreddamento: Cooling, cambio: Gearbox, trasmissione: Chain, ciclistica: Frame, manutenzione: Checks, glossario: Glossary, progressi: Progress }

function readHash() {
  const h = window.location.hash.replace('#/', '').replace('#', '')
  return ROUTES[h] ? h : 'mappa'
}

function VoicePicker() {
  const { voices } = useVoice()
  if (!voiceSupported) return null
  const cur = getChosenVoice()
  return (
    <div style={{ padding: '6px 8px 4px' }}>
      <div className="t" style={{ fontWeight: 650, fontSize: 15 }}>🎙️ Voce del narratore</div>
      {voices.length ? (
        <>
          <select
            className="voice-select"
            value={cur?.name || ''}
            onChange={(e) => {
              setChosenVoice(e.target.value)
              speak('Ciao! Sono la voce che ti accompagnerà alla scoperta della moto.')
            }}
          >
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
          <div className="s" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            Le voci dipendono dal telefono. Se la voce è robotica, nelle impostazioni di accessibilità del telefono (sezione Voci) puoi scaricare voci italiane più naturali, poi sceglierle qui.
          </div>
        </>
      ) : (
        <div className="s" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Nessuna voce italiana trovata su questo dispositivo.</div>
      )}
    </div>
  )
}

// Logo disegnato al volo (funziona anche nella versione in un unico file)
let logoUrl = null
function LogoMark({ size = 30 }) {
  if (!logoUrl) {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    drawLogo(c.getContext('2d'), 64, 64, 62)
    logoUrl = c.toDataURL()
  }
  return <img src={logoUrl} width={size} height={size} alt="" style={{ display: 'block' }} />
}

function Menu({ open, onClose, route, go }) {
  const p = useProgress()
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="menu-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.nav
            className="menu"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <LogoMark size={34} /> Moto <span style={{ color: 'var(--accent)' }}>Academy</span>
            </h2>
            <motion.div initial="h" animate="v" variants={{ v: { transition: { staggerChildren: 0.035, delayChildren: 0.08 } } }}>
              {CHAPTERS.map((c) => {
                const passed = p.quiz?.[c.id]?.passed
                return (
                  <motion.button
                    key={c.id}
                    variants={{ h: { opacity: 0, x: -24 }, v: { opacity: 1, x: 0 } }}
                    className={'menu-item' + (route === c.id ? ' active' : '') + (c.ready ? '' : ' locked')}
                    onClick={() => c.ready && go(c.id)}
                  >
                    <div className="num">{c.n}</div>
                    <div>
                      <div className="t">{c.title}</div>
                      <div className="s">{c.subtitle}</div>
                    </div>
                    <div className={'tag' + (passed ? ' done' : '')}>{passed ? '✓ fatto' : c.ready ? '' : 'presto'}</div>
                  </motion.button>
                )
              })}
              <div className="menu-sep" />
              <motion.button variants={{ h: { opacity: 0, x: -24 }, v: { opacity: 1, x: 0 } }} className={'menu-item' + (route === 'progressi' ? ' active' : '')} onClick={() => go('progressi')}>
                <div className="num">🏆</div>
                <div className="t">Progressi e patentino</div>
              </motion.button>
              <motion.button variants={{ h: { opacity: 0, x: -24 }, v: { opacity: 1, x: 0 } }} className={'menu-item' + (route === 'glossario' ? ' active' : '')} onClick={() => go('glossario')}>
                <div className="num">📖</div>
                <div className="t">Glossario</div>
              </motion.button>
              <div className="menu-sep" />
              <VoicePicker />
            </motion.div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  )
}

export default function App() {
  const [route, setRoute] = useState(readHash)
  const [menu, setMenu] = useState(false)
  const [sound, setSoundState] = useState(isSoundOn())
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('moto-academy-theme') || 'dark'
    } catch {
      return 'dark'
    }
  })

  useEffect(() => {
    const f = () => setRoute(readHash())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  useEffect(() => onSoundChange(setSoundState), [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('moto-academy-theme', theme)
    } catch {
      /* ignora */
    }
  }, [theme])

  const go = (r) => {
    stopVoice()
    muteEngine()
    setMenu(false)
    if (window.location.hash !== '#' + r) window.location.hash = r
    else setRoute(r)
  }

  const Page = ROUTES[route]
  const title = CHAPTERS.find((c) => c.id === route)

  return (
    <div className="app">
      <header className="topbar">
        <motion.button className="iconbtn" whileTap={{ scale: 0.9 }} onClick={() => setMenu(true)} aria-label="Apri menu">
          ☰
        </motion.button>
        <div className="brand" onClick={() => go('mappa')}>
          {route === 'mappa' || !title ? (
            <>
              <LogoMark size={30} /> Moto <b>Academy</b>
            </>
          ) : (
            <span style={{ fontSize: 15 }}>
              {title.icon} {title.title}
            </span>
          )}
        </div>
        <motion.button className="iconbtn" whileTap={{ scale: 0.9 }} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Cambia tema">
          {theme === 'dark' ? '🌙' : '☀️'}
        </motion.button>
        <motion.button className={'iconbtn' + (sound ? ' on' : '')} whileTap={{ scale: 0.9 }} onClick={() => setSound(!sound)} aria-label="Suono motore" title="Suono del motore (nei capitoli Motore e Cambio)">
          {sound ? '🔊' : '🔇'}
        </motion.button>
      </header>

      <Menu open={menu} onClose={() => setMenu(false)} route={route} go={go} />

      <AnimatePresence mode="wait">
        <motion.main
          key={route}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.02, y: -8 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <Page go={go} />
        </motion.main>
      </AnimatePresence>
    </div>
  )
}
