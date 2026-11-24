// Cambio a 5 marce con ingranaggi sempre in presa, frizione multidisco e pignone d'uscita.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useMech, lathe, extrude, strip, union, diff, circle, gearGeo } from './mech'

// Denti: la somma è costante (38) così tutte le coppie hanno lo stesso interasse
export const GEARS = [
  { n: 1, z1: 10, z2: 28 },
  { n: 2, z1: 13, z2: 25 },
  { n: 3, z1: 16, z2: 22 },
  { n: 4, z1: 18, z2: 20 },
  { n: 5, z1: 20, z2: 18 },
].map((g) => ({ ...g, ratio: g.z2 / g.z1 }))

const MODULE = 0.09
const C = (MODULE * 38) / 2 // interasse
const Y1 = C / 2
const Y2 = -C / 2
const ZPOS = [-1.5, -0.95, -0.4, 0.15, 0.7]
const WIDTH = 0.26
// Sfasamento iniziale perché i denti del secondario cadano nei vani del primario
const BETA0 = GEARS.map((g) => {
  const s1 = (Math.PI * 2) / g.z1
  const s2 = (Math.PI * 2) / g.z2
  const thP = -Math.PI / 2 - 0.315 * s1
  return Math.PI / 2 - 0.815 * s2 + thP / g.ratio
})

// Ingranaggio con fianchi arrotondati (stesso centro dente di prima, così l'ingranamento resta esatto)
function gearGeometry(teeth, width = WIDTH, hole = 0.1) {
  const r = (MODULE * teeth) / 2
  const ra = r + MODULE * 0.9 // testa
  const rf = r - MODULE * 1.1 // piede
  const shape = new THREE.Shape()
  const step = (Math.PI * 2) / teeth
  const prof = [
    [0, rf], [0.06, rf + (ra - rf) * 0.05], [0.12, rf + (ra - rf) * 0.35], [0.17, rf + (ra - rf) * 0.75], [0.21, ra - 0.006], [0.25, ra],
    [0.38, ra], [0.42, ra - 0.006], [0.46, rf + (ra - rf) * 0.75], [0.51, rf + (ra - rf) * 0.35], [0.57, rf + (ra - rf) * 0.05], [0.63, rf],
  ]
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    prof.forEach(([f, rr], j) => {
      const x = rr * Math.cos(a + f * step)
      const y = rr * Math.sin(a + f * step)
      if (i === 0 && j === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    })
  }
  const h = new THREE.Path()
  h.absarc(0, 0, hole, 0, Math.PI * 2, true)
  shape.holes.push(h)
  // fori di alleggerimento sugli ingranaggi grandi
  if (rf > 0.55) {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2
      const p = new THREE.Path()
      p.absarc(Math.cos(a) * rf * 0.6, Math.sin(a) * rf * 0.6, rf * 0.17, 0, Math.PI * 2, true)
      shape.holes.push(p)
    }
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - 0.02, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 6 })
  g.translate(0, 0, -(width - 0.02) / 2)
  return g
}

function Tag({ children, color = 'rgba(20,24,34,.85)', small, onClick }) {
  return (
    <Html center style={{ pointerEvents: onClick ? 'auto' : 'none' }} zIndexRange={[10, 0]}>
      <div
        onClick={onClick}
        style={{
          cursor: onClick ? 'pointer' : 'default',
          background: color,
          color: '#fff',
          padding: small ? '2px 7px' : '4px 10px',
          borderRadius: 999,
          fontSize: small ? 11 : 12,
          fontWeight: 800,
          whiteSpace: 'nowrap',
          border: '1px solid rgba(255,255,255,.15)',
        }}
      >
        {children}
      </div>
    </Html>
  )
}

// forcella del cambio: segue il manicotto lungo l'albero
function ForkFollow({ dogRef, geo, mat }) {
  const g = useRef()
  useFrame(() => {
    if (g.current && dogRef.current) g.current.position.z = dogRef.current.position.z
  })
  return (
    <group ref={g}>
      <mesh geometry={geo} material={mat} />
      <mesh material={mat} position={[0, 0.5, 0]}>
        <boxGeometry args={[0.06, 0.4, 0.05]} />
      </mesh>
    </group>
  )
}

/**
 * sim: oggetto mutabile condiviso con l'interfaccia
 *  { gear (0 = folle), clutch (bool), thetaE, thetaP, thetaS, wP, wS, wE }
 * Le velocità angolari (rad/s, già rallentate) sono calcolate dal chiamante in step().
 */
export default function GearboxScene({ sim, step, onPickGear }) {
  const geos = useMemo(
    () => ({
      p: GEARS.map((g) => gearGeometry(g.z1)),
      s: GEARS.map((g) => gearGeometry(g.z2)),
      sprocket: gearGeo(0.38, 14, 0.1, { toothH: 0.09, hole: 0.1, windows: 0 }),
      hubP: lathe([[0.1, -0.2], [0.17, -0.2], [0.17, 0.2], [0.1, 0.2]], 32),
      hubS: lathe([[0.1, -0.19], [0.22, -0.19], [0.22, 0.19], [0.1, 0.19]], 32),
      basket: lathe([[0.84, -0.3], [0.9, -0.3], [0.9, 0.28], [0.25, 0.28], [0.25, 0.24], [0.84, 0.24], [0.84, -0.3]], 64),
      basketGear: gearGeo(1.0, 64, 0.1, { toothH: 0.05, hole: 0.86, windows: 0 }),
      friction: lathe([[0.42, -0.018], [0.8, -0.018], [0.8, 0.018], [0.42, 0.018], [0.42, -0.018]], 48),
      steelPlate: lathe([[0.3, -0.012], [0.74, -0.012], [0.74, 0.012], [0.3, 0.012], [0.3, -0.012]], 48),
      sleeve: lathe([[0.11, -0.07], [0.24, -0.07], [0.24, -0.02], [0.2, -0.015], [0.2, 0.015], [0.24, 0.02], [0.24, 0.07], [0.11, 0.07]], 32),
      fork: extrude(diff(circle(0, 0, 0.32, 40), circle(0, 0, 0.215, 40), [[[-0.4, 0.05], [0.4, 0.05], [0.4, 0.4], [-0.4, 0.4]]]), 0.035, 0.005, -0.0175),
      bearing: lathe([[0.1, -0.06], [0.22, -0.06], [0.22, 0.06], [0.1, 0.06], [0.1, -0.06]], 32),
    }),
    []
  )
  const M = useMech()
  const mats = useMemo(() => {
    const m = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.9, roughness: 0.28, ...o })
    return {
      idle: GEARS.map(() => m('#c3c8cf', { roughnessMap: M.steel.roughnessMap })),
      shaft: M.steel,
      dog: new THREE.MeshStandardMaterial({ color: '#2fd47a', metalness: 0.6, roughness: 0.3 }),
      basket: M.alu,
      friction: new THREE.MeshStandardMaterial({ color: '#b07a45', metalness: 0.05, roughness: 0.95, bumpMap: M.alu.bumpMap, bumpScale: 1.5 }),
      steel: M.steel,
      sprocket: M.steelDark,
      fork: M.brass,
      bearing: M.chrome,
    }
  }, [M])

  const primary = useRef()
  const secGears = useRef([])
  const secShaft = useRef()
  const dog = useRef()
  const plates = useRef([])
  const basket = useRef()
  const sprocket = useRef()
  const clutchGap = useRef(0)

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05)
    step && step(d)
    const s = sim.current
    s.thetaE += s.wE * d
    s.thetaP += s.wP * d
    s.thetaS += s.wS * d

    primary.current.rotation.z = s.thetaP
    GEARS.forEach((g, i) => {
      const m = secGears.current[i]
      if (m) m.rotation.z = -s.thetaP / g.ratio + BETA0[i]
      const sel = s.gear === g.n
      const mat = mats.idle[i]
      mat.color.set(sel ? '#ff8a3a' : '#c3c8cf')
      mat.emissive.set(sel ? '#ff6a1a' : '#000')
      mat.emissiveIntensity = sel ? 0.25 + 0.15 * Math.sin(state.clock.elapsedTime * 4) : 0
    })
    secShaft.current.rotation.y = s.thetaS
    sprocket.current.rotation.z = s.thetaS

    // Manicotto (innesto) che scorre verso la marcia selezionata
    const target = s.gear ? ZPOS[s.gear - 1] + WIDTH / 2 + 0.07 : (ZPOS[0] + ZPOS[1]) / 2 + 0.02
    dog.current.position.z += (target - dog.current.position.z) * Math.min(1, d * 10)
    dog.current.rotation.y = s.thetaS

    // Frizione: i dischi si allontanano quando tiri la leva
    clutchGap.current += ((s.clutch ? 1 : 0) - clutchGap.current) * Math.min(1, d * 12)
    plates.current.forEach((p, i) => {
      if (!p) return
      p.position.z = 1.35 + i * (0.06 + clutchGap.current * 0.05)
      // dischi d'attrito (dispari) girano col motore, dischi d'acciaio (pari) con il primario
      p.rotation.set(Math.PI / 2, i % 2 ? s.thetaE : s.thetaP, 0)
    })
    basket.current.rotation.y = s.thetaE
  })

  return (
    <group rotation={[0.18, -0.52, 0]} position={[0.1, 0.1, 0.2]} scale={0.9}>
      {/* Albero primario */}
      <group position={[0, Y1, 0]}>
        <group ref={primary}>
          <mesh material={mats.shaft} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.1]}>
            <cylinderGeometry args={[0.1, 0.1, 4, 24]} />
          </mesh>
          {/* scanalature dell'albero */}
          {Array.from({ length: 8 }).map((_, k) => (
            <mesh key={k} material={mats.shaft} position={[Math.cos((k * Math.PI) / 4) * 0.1, Math.sin((k * Math.PI) / 4) * 0.1, 1.15]} rotation={[0, 0, (k * Math.PI) / 4]}>
              <boxGeometry args={[0.02, 0.02, 0.6]} />
            </mesh>
          ))}
          {GEARS.map((g, i) => (
            <group key={g.n} position={[0, 0, ZPOS[i]]}>
              <mesh geometry={geos.p[i]} material={mats.idle[i]} />
              <mesh geometry={geos.hubP} material={mats.idle[i]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.8, 1]} />
            </group>
          ))}
        </group>
        <group position={[0, 0, -2.45]}>
          <Tag>Albero primario</Tag>
        </group>
      </group>

      {/* Albero secondario */}
      <group position={[0, Y2, 0]}>
        <mesh ref={secShaft} material={mats.shaft} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 3.6, 24]} />
        </mesh>
        {[-1.85, 1.2].map((z) => (
          <mesh key={z} geometry={geos.bearing} material={mats.bearing} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, z]} />
        ))}
        {GEARS.map((g, i) => (
          <mesh
            key={g.n}
            ref={(el) => (secGears.current[i] = el)}
            geometry={geos.s[i]}
            material={mats.idle[i]}
            position={[0, 0, ZPOS[i]]}
          />
        ))}
        {/* manicotto d'innesto con denti frontali e forcella */}
        <group ref={dog} position={[0, 0, ZPOS[0]]}>
          <mesh geometry={geos.sleeve} material={mats.dog} rotation={[Math.PI / 2, 0, 0]} />
          {Array.from({ length: 6 }).map((_, k) => (
            <mesh key={k} material={mats.dog} position={[Math.cos((k * Math.PI) / 3) * 0.19, Math.sin((k * Math.PI) / 3) * 0.19, -0.1]}>
              <boxGeometry args={[0.07, 0.07, 0.07]} />
            </mesh>
          ))}
        </group>
        <mesh ref={sprocket} geometry={geos.sprocket} material={mats.sprocket} position={[0, 0, 1.45]} />
        <ForkFollow dogRef={dog} geo={geos.fork} mat={mats.fork} />
        <group position={[0, 0, -2.3]}>
          <Tag>Albero secondario</Tag>
        </group>
        <group position={[0, -0.5, 1.6]}>
          <Tag>Pignone → catena</Tag>
        </group>
      </group>

      {/* Numeri delle marce */}
      {GEARS.map((g, i) => (
        <group key={g.n} position={[0, Y1 + 1.05, ZPOS[i]]}>
          <Tag small color="rgba(255,106,26,.9)" onClick={onPickGear ? () => onPickGear(g.n) : undefined}>
            {g.n}ª
          </Tag>
        </group>
      ))}

      {/* Frizione multidisco sul primario */}
      <group position={[0, Y1, 0]}>
        {/* campana della frizione (gira col motore) con corona dentata della trasmissione primaria */}
        <group ref={basket} position={[0, 0, 1.55]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh geometry={geos.basket} material={mats.basket} />
          <mesh geometry={geos.basketGear} material={mats.steel} position={[0, -0.33, 0]} rotation={[Math.PI / 2, 0, 0]} />
          {Array.from({ length: 8 }).map((_, k) => (
            <mesh key={k} material={mats.basket} position={[Math.cos((k * Math.PI) / 4) * 0.87, 0, Math.sin((k * Math.PI) / 4) * 0.87]} rotation={[0, -(k * Math.PI) / 4, 0]}>
              <boxGeometry args={[0.06, 0.5, 0.12]} />
            </mesh>
          ))}
        </group>
        {Array.from({ length: 7 }).map((_, i) => (
          <mesh key={i} ref={(el) => (plates.current[i] = el)} geometry={i % 2 ? geos.friction : geos.steelPlate} material={i % 2 ? mats.friction : mats.steel} />
        ))}
        {/* spingidisco con molle */}
        <mesh material={mats.basket} position={[0, 0, 1.95]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.55, 0.6, 0.06, 40]} />
        </mesh>
        {Array.from({ length: 5 }).map((_, k) => (
          <mesh key={k} material={mats.steel} position={[Math.cos((k * 2 * Math.PI) / 5) * 0.36, Math.sin((k * 2 * Math.PI) / 5) * 0.36, 2.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.12, 12]} />
          </mesh>
        ))}
        <group position={[0, -1.05, 1.75]}>
          <Tag color="rgba(58,160,255,.9)">Frizione ← dal motore</Tag>
        </group>
      </group>
    </group>
  )
}
