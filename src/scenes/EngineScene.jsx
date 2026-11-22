// Motore monocilindrico 4 tempi bialbero, in sezione.
// Tutta la cinematica è calcolata: angolo albero motore θ da 0° a 720° (2 giri = 4 tempi).
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { setEngineRpm, muteEngine } from '../lib/sound'
import Callout from '../components/Callout'

const R_CRANK = 0.5 // raggio di manovella (metà corsa)
const L_ROD = 1.6 // lunghezza biella
const HEAD_Y = 2.55 // fondo della testata
const SLOW = 40 // fattore di rallentamento dell'animazione

const deg = Math.PI / 180

function pistonPinY(theta) {
  const s = Math.sin(theta)
  return R_CRANK * Math.cos(theta) + Math.sqrt(L_ROD * L_ROD - R_CRANK * R_CRANK * s * s)
}

// Alzata valvola (0..1) in una finestra angolare [start, start+len] (gradi, ciclo 720)
function lift(thetaDeg, start, len) {
  let d = (((thetaDeg - start) % 720) + 720) % 720
  if (d > len) return 0
  return Math.sin((Math.PI * d) / len)
}

export function phaseOf(thetaDeg) {
  return Math.floor((((thetaDeg % 720) + 720) % 720) / 180)
}

const PHASE_COLORS = ['#3aa0ff', '#a46bff', '#ff6a1a', '#9aa3b2']

function useMaterials() {
  return useMemo(() => {
    const m = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.35, ...opts })
    return {
      pistone: m('#c9ced8'),
      biella: m('#8d96a6'),
      albero: m('#6f7888'),
      valvolaAsp: m('#3aa0ff', { metalness: 0.4 }),
      valvolaSca: m('#ff4d5e', { metalness: 0.4 }),
      candela: m('#f4f6fb', { metalness: 0.1, roughness: 0.6 }),
      camme: m('#ffb03a', { metalness: 0.5 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: '#9fc4ff',
        transparent: true,
        opacity: 0.12,
        roughness: 0.1,
        metalness: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      head: new THREE.MeshPhysicalMaterial({
        color: '#c0c8d6',
        transparent: true,
        opacity: 0.1,
        roughness: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      gas: new THREE.MeshBasicMaterial({ color: '#3aa0ff', transparent: true, opacity: 0.35, depthWrite: false }),
      intakePipe: new THREE.MeshStandardMaterial({ color: '#3aa0ff', transparent: true, opacity: 0.18, depthWrite: false }),
      exhaustPipe: new THREE.MeshStandardMaterial({ color: '#ff4d5e', transparent: true, opacity: 0.18, depthWrite: false }),
      dark: m('#3a414f'),
    }
  }, [])
}

// Etichetta "a richiamo": il testo sta fuori dal disegno, una linea con un pallino
// lo collega al punto esatto del pezzo e lo segue mentre si muove.
const CALLOUTS = {
  pistone: [{ ref: 'piston', offset: [0.57, 0.05, 0], side: 1, dy: 0.15, text: 'Pistone' }],
  biella: [{ ref: 'rod', offset: [0, 0, 0], side: -1, dy: 0.1, text: 'Biella' }],
  albero: [{ ref: 'crank', offset: [0, 0, 0.75], side: 1, dy: -0.35, text: 'Albero motore' }],
  valvolaAsp: [{ ref: 'vIn', offset: [0, 0.02, 0], side: -1, dy: -0.25, text: 'Valvola di aspirazione', color: '#3aa0ff' }],
  valvolaSca: [{ ref: 'vEx', offset: [0, 0.02, 0], side: 1, dy: -0.25, text: 'Valvola di scarico', color: '#ff4d5e' }],
  candela: [{ ref: 'plug', offset: [0, 0.38, 0], side: 1, dy: 0.35, text: 'Candela' }],
  camme: [
    { ref: 'camIn', offset: [0, 0, 0.1], side: -1, dy: 0.35, text: 'Camme aspirazione', color: '#ffb03a' },
    { ref: 'camEx', offset: [0, 0, 0.1], side: 1, dy: 0.35, text: 'Camme scarico', color: '#ffb03a' },
  ],
}

// Particelle che scorrono in un condotto (miscela fresca o gas di scarico)
function Flow({ from, to, color, amountRef, reverse = false, count = 14 }) {
  const refs = useRef([])
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => i / count), [count])
  const a = useMemo(() => new THREE.Vector3(...from), [from])
  const b = useMemo(() => new THREE.Vector3(...to), [to])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    const amt = amountRef.current
    refs.current.forEach((m, i) => {
      if (!m) return
      seeds[i] = (seeds[i] + dt * (0.4 + amt * 1.6)) % 1
      const p = reverse ? 1 - seeds[i] : seeds[i]
      tmp.lerpVectors(a, b, p)
      m.position.set(tmp.x, tmp.y + Math.sin(i * 7.3) * 0.05, tmp.z + Math.cos(i * 3.1) * 0.08)
      m.visible = amt > 0.05
      m.scale.setScalar(0.6 + amt * 0.6)
    })
  })
  return seeds.map((_, i) => (
    <mesh key={i} ref={(el) => (refs.current[i] = el)}>
      <sphereGeometry args={[0.045, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  ))
}

export default function EngineScene({ mode, rpm = 1500, highlight = [], onPhase }) {
  const mat = useMaterials()
  const theta = useRef(0) // gradi
  const phaseT = useRef(0)
  const lastPhase = useRef(-1)
  const crank = useRef()
  const piston = useRef()
  const rod = useRef()
  const gas = useRef()
  const vIn = useRef()
  const vEx = useRef()
  const camIn = useRef()
  const camEx = useRef()
  const spark = useRef()
  const sparkLight = useRef()
  const plug = useRef()
  const flame = useRef()
  const flameCones = useRef([])
  const root = useRef()
  const inAmt = useRef(0)
  const exAmt = useRef(0)

  const hl = useMemo(() => new Set(highlight), [highlight])
  const partRefs = { piston, rod, crank, vIn, vEx, plug, camIn, camEx }

  // Geometria valvole: inclinate a V, sede nella testata
  const VA = 0.2 // inclinazione in radianti
  const seatIn = useMemo(() => new THREE.Vector2(-0.26, HEAD_Y + 0.02), [])
  const seatEx = useMemo(() => new THREE.Vector2(0.26, HEAD_Y + 0.02), [])
  const axIn = useMemo(() => new THREE.Vector2(-Math.sin(VA), Math.cos(VA)), [])
  const axEx = useMemo(() => new THREE.Vector2(Math.sin(VA), Math.cos(VA)), [])
  const camInPos = [seatIn.x + axIn.x * 1.2, seatIn.y + axIn.y * 1.2, 0]
  const camExPos = [seatEx.x + axEx.x * 1.2, seatEx.y + axEx.y * 1.2, 0]

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05)
    let currentRpm = 0
    if (mode.type === 'phase') {
      // Ripete lentamente un solo tempo, con una piccola pausa alla fine
      phaseT.current = (phaseT.current + d) % 3.6
      const p = Math.min(phaseT.current / 3, 1)
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      theta.current = mode.phase * 180 + eased * 179.9
      muteEngine()
    } else {
      currentRpm = mode.type === 'free' ? rpm : mode.rpm
      theta.current = (theta.current + ((currentRpm * 6) / SLOW) * d) % 720
      setEngineRpm(currentRpm, Math.min(currentRpm / 10000, 1))
    }

    const thDeg = theta.current
    const th = thDeg * deg

    // Albero motore: il perno di manovella sta in (r·sinθ, r·cosθ)
    crank.current.rotation.z = -th
    const px = R_CRANK * Math.sin(th)
    const py = R_CRANK * Math.cos(th)
    const y = pistonPinY(th)
    piston.current.position.y = y + 0.1
    // Biella dal perno di manovella allo spinotto del pistone
    const dx = 0 - px
    const dy = y - py
    rod.current.position.set(px + dx / 2, py + dy / 2, 0)
    rod.current.rotation.z = Math.atan2(-dx, dy)

    // Gas nella camera
    const top = y + 0.1 + 0.225
    const h = Math.max(HEAD_Y - top, 0.01)
    gas.current.scale.y = h
    gas.current.position.y = top + h / 2
    const ph = phaseOf(thDeg)
    const local = (((thDeg % 180) + 180) % 180) / 180
    const gm = gas.current.material
    if (ph === 0) {
      gm.color.set('#3aa0ff')
      gm.opacity = 0.18 + local * 0.2
    } else if (ph === 1) {
      gm.color.set('#a46bff')
      gm.opacity = 0.3 + local * 0.35
    } else if (ph === 2) {
      gm.color.setRGB(1, 0.35 + (1 - local) * 0.5, 0.05 + (1 - local) * 0.3)
      gm.opacity = 0.85 - local * 0.4
    } else {
      gm.color.set('#7d8594')
      gm.opacity = 0.45 - local * 0.3
    }

    // Valvole: aspirazione aperta circa nel 1° tempo, scarico nel 4°
    const li = lift(thDeg, 712, 196)
    const le = lift(thDeg, 532, 196)
    inAmt.current = li
    exAmt.current = le
    const L = 0.12
    vIn.current.position.set(seatIn.x - axIn.x * li * L, seatIn.y - axIn.y * li * L, 0)
    vEx.current.position.set(seatEx.x - axEx.x * le * L, seatEx.y - axEx.y * le * L, 0)

    // Alberi a camme: metà velocità dell'albero motore, camma rivolta alla valvola nel punto di massima alzata
    const phi = thDeg / 2
    camIn.current.rotation.z = VA - (phi - 45) * deg
    camEx.current.rotation.z = -VA - (phi - 315) * deg

    // Scintilla poco prima del PMS di scoppio (360°)
    const sparkOn = thDeg > 348 && thDeg < 372
    spark.current.visible = sparkOn
    sparkLight.current.intensity = sparkOn ? 6 : ph === 2 ? 4 * (1 - local) : 0
    // fronte di fiamma: parte dalla candela e si allarga fino al pistone, poi si spegne
    let fk = 0
    if (thDeg > 352 && thDeg < 360) fk = (thDeg - 352) / 8 * 0.4
    else if (ph === 2) fk = Math.min(1, 0.4 + local * 3) * Math.pow(Math.max(0, 1 - local * 1.4), 0.8)
    flame.current.visible = fk > 0.01
    if (fk > 0.01) {
      const grow = ph === 2 ? Math.min(1, 0.35 + local * 4) : 0.25
      flame.current.position.y = HEAD_Y - 0.02
      flameCones.current.forEach((c, i) => {
        if (!c) return
        const flick = 1 + Math.sin(state.clock.elapsedTime * (23 + i * 7) + i) * 0.12
        c.scale.set(grow * flick * (1 - i * 0.18), h * grow * (1 - i * 0.12) + 0.05, grow * flick * (1 - i * 0.18))
        c.position.y = -(h * grow * (1 - i * 0.12)) / 2
        c.material.opacity = fk * (0.55 + i * 0.15)
      })
    }

    // Evidenziazione pulsante
    const pulse = 0.35 + 0.35 * Math.sin(state.clock.elapsedTime * 5)
    ;['pistone', 'biella', 'albero', 'valvolaAsp', 'valvolaSca', 'candela', 'camme'].forEach((k) => {
      mat[k].emissive.set(hl.has(k) ? '#ff6a1a' : '#000000')
      mat[k].emissiveIntensity = hl.has(k) ? pulse : 0
    })

    if (ph !== lastPhase.current) {
      lastPhase.current = ph
      onPhase && onPhase(ph)
    }
  })

  return (
    <group ref={root} position={[0, -1.4, 0]}>
      {/* Albero motore con contrappesi */}
      <group ref={crank}>
        <mesh material={mat.albero} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 1.5, 24]} />
        </mesh>
        {[-0.22, 0.22].map((z) => (
          <group key={z} position={[0, 0, z]}>
            {/* contrappeso, opposto al perno di manovella */}
            <RoundedBox args={[0.95, 0.42, 0.12]} radius={0.05} position={[0, -0.3, 0]} material={mat.albero} />
            <mesh material={mat.albero} position={[0, R_CRANK / 2, 0]}>
              <boxGeometry args={[0.32, R_CRANK + 0.3, 0.12]} />
            </mesh>
          </group>
        ))}
        <mesh material={mat.albero} position={[0, R_CRANK, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.56, 20]} />
        </mesh>
      </group>

      {/* Biella */}
      <group ref={rod}>
        <mesh material={mat.biella}>
          <boxGeometry args={[0.12, L_ROD, 0.14]} />
        </mesh>
        <mesh material={mat.biella} position={[0, -L_ROD / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.16, 24]} />
        </mesh>
        <mesh material={mat.biella} position={[0, L_ROD / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.16, 20]} />
        </mesh>
      </group>

      {/* Pistone con fasce */}
      <group ref={piston}>
        <mesh material={mat.pistone}>
          <cylinderGeometry args={[0.57, 0.57, 0.45, 40]} />
        </mesh>
        {[0.12, 0.05].map((yy) => (
          <mesh key={yy} position={[0, yy, 0]} material={mat.dark}>
            <cylinderGeometry args={[0.575, 0.575, 0.025, 40]} />
          </mesh>
        ))}
      </group>

      {/* Gas nella camera di combustione */}
      <mesh ref={gas} material={mat.gas}>
        <cylinderGeometry args={[0.56, 0.56, 1, 40]} />
      </mesh>

      {/* Cilindro trasparente e basamento */}
      <mesh material={mat.glass} position={[0, 1.85, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 1.4, 40, 1, true]} />
      </mesh>
      <RoundedBox args={[1.9, 1.5, 1.2]} radius={0.25} position={[0, -0.05, 0]} material={mat.glass} />

      {/* Testata */}
      <RoundedBox args={[1.9, 1.3, 1.25]} radius={0.15} position={[0, HEAD_Y + 0.62, 0]} material={mat.head} />

      {/* Condotti di aspirazione e scarico */}
      <mesh material={mat.intakePipe} position={[-0.85, HEAD_Y + 0.35, 0]} rotation={[0, 0, Math.PI / 2 - 0.5]}>
        <cylinderGeometry args={[0.17, 0.2, 1.3, 20, 1, true]} />
      </mesh>
      <mesh material={mat.exhaustPipe} position={[0.85, HEAD_Y + 0.35, 0]} rotation={[0, 0, -Math.PI / 2 + 0.5]}>
        <cylinderGeometry args={[0.17, 0.2, 1.3, 20, 1, true]} />
      </mesh>
      <Flow from={[-1.45, HEAD_Y + 0.68, 0]} to={[-0.3, HEAD_Y - 0.1, 0]} color="#5fb4ff" amountRef={inAmt} />
      <Flow from={[0.3, HEAD_Y - 0.1, 0]} to={[1.5, HEAD_Y + 0.68, 0]} color="#b9c0cc" amountRef={exAmt} />

      {/* Valvole */}
      <group ref={vIn} rotation={[0, 0, VA]}>
        <mesh material={mat.valvolaAsp}>
          <cylinderGeometry args={[0.2, 0.2, 0.05, 28]} />
        </mesh>
        <mesh material={mat.valvolaAsp} position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 1, 10]} />
        </mesh>
        <mesh material={mat.dark} position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.35, 12, 4, true]} />
        </mesh>
      </group>
      <group ref={vEx} rotation={[0, 0, -VA]}>
        <mesh material={mat.valvolaSca}>
          <cylinderGeometry args={[0.18, 0.18, 0.05, 28]} />
        </mesh>
        <mesh material={mat.valvolaSca} position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 1, 10]} />
        </mesh>
        <mesh material={mat.dark} position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.35, 12, 4, true]} />
        </mesh>
      </group>

      {/* Alberi a camme (bialbero) */}
      {[
        [camIn, camInPos],
        [camEx, camExPos],
      ].map(([ref, pos], i) => (
        <group key={i} position={pos}>
          <mesh material={mat.camme} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 1.3, 12]} />
          </mesh>
          <group ref={ref}>
            <mesh material={mat.camme} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.14, 0.14, 0.2, 24]} />
            </mesh>
            <mesh material={mat.camme} position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.75, 1, 1.25]}>
              <cylinderGeometry args={[0.12, 0.12, 0.2, 24]} />
            </mesh>
          </group>
          {/* ingranaggio della distribuzione */}
          <mesh material={mat.dark} position={[0, 0, -0.55]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.06, 20]} />
          </mesh>
        </group>
      ))}

      {/* Candela */}
      <group ref={plug} position={[0, HEAD_Y + 0.5, 0.15]}>
        <mesh material={mat.candela}>
          <cylinderGeometry args={[0.07, 0.07, 0.75, 14]} />
        </mesh>
        <mesh material={mat.dark} position={[0, -0.4, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.08, 10]} />
        </mesh>
      </group>
      {/* fiamma dello scoppio */}
      <group ref={flame} visible={false}>
        {['#ff3a10', '#ff8a1a', '#ffe08a'].map((c, i) => (
          <mesh key={c} ref={(el) => (flameCones.current[i] = el)} rotation={[Math.PI, 0, 0]} renderOrder={5}>
            <coneGeometry args={[0.55, 1, 32, 1, true]} />
            <meshBasicMaterial color={c} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <mesh ref={spark} position={[0, HEAD_Y + 0.05, 0.15]}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshBasicMaterial color="#fff6a8" />
      </mesh>
      <pointLight ref={sparkLight} position={[0, HEAD_Y - 0.1, 0.3]} color="#ffa040" distance={4} intensity={0} />

      {/* Cinghia/catena della distribuzione (stilizzata) */}
      <mesh material={mat.dark} position={[0, 1.6, -0.55]}>
        <boxGeometry args={[0.06, 3.2, 0.04]} />
      </mesh>

      {/* Etichette a richiamo dei pezzi evidenziati */}
      {highlight.flatMap((k) =>
        (CALLOUTS[k] || []).map((c) => (
          <Callout key={c.text} root={root} target={partRefs[c.ref]} offset={c.offset} side={c.side} dy={c.dy} text={c.text} color={c.color} />
        ))
      )}
    </group>
  )
}

export { PHASE_COLORS }
