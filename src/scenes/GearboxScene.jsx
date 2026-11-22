// Cambio a 5 marce con ingranaggi sempre in presa, frizione multidisco e pignone d'uscita.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

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

function gearGeometry(teeth, width = WIDTH, hole = 0.1) {
  const r = (MODULE * teeth) / 2
  const ra = r + MODULE * 0.9 // testa
  const rf = r - MODULE * 1.1 // piede
  const shape = new THREE.Shape()
  const step = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    const pts = [
      [rf, a],
      [ra, a + step * 0.18],
      [ra, a + step * 0.45],
      [rf, a + step * 0.63],
    ]
    pts.forEach(([rr, aa], j) => {
      const x = rr * Math.cos(aa)
      const y = rr * Math.sin(aa)
      if (i === 0 && j === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    })
    const x = rf * Math.cos(a + step)
    const y = rf * Math.sin(a + step)
    shape.lineTo(x, y)
  }
  const h = new THREE.Path()
  h.absarc(0, 0, hole, 0, Math.PI * 2, true)
  shape.holes.push(h)
  const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1, curveSegments: 4 })
  g.translate(0, 0, -width / 2)
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
      sprocket: gearGeometry(14, 0.1, 0.1),
    }),
    []
  )
  const mats = useMemo(() => {
    const m = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.75, roughness: 0.3, ...o })
    return {
      idle: GEARS.map(() => m('#9099aa')),
      shaft: m('#5d6576'),
      dog: m('#2fd47a', { metalness: 0.5 }),
      basket: m('#7a5a3a', { metalness: 0.3, roughness: 0.6 }),
      friction: m('#c98a4a', { metalness: 0.1, roughness: 0.9 }),
      steel: m('#c9ced8'),
      sprocket: m('#3a414f'),
    }
  }, [])

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
      mat.color.set(sel ? '#ff6a1a' : '#9099aa')
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
    <group rotation={[0, -0.75, 0]} position={[0, 0.1, 0.2]}>
      {/* Albero primario */}
      <group position={[0, Y1, 0]}>
        <group ref={primary}>
          <mesh material={mats.shaft} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.1]}>
            <cylinderGeometry args={[0.1, 0.1, 4, 16]} />
          </mesh>
          {GEARS.map((g, i) => (
            <mesh key={g.n} geometry={geos.p[i]} material={mats.idle[i]} position={[0, 0, ZPOS[i]]} />
          ))}
        </group>
        <group position={[0, 0, -2.45]}>
          <Tag>Albero primario</Tag>
        </group>
      </group>

      {/* Albero secondario */}
      <group position={[0, Y2, 0]}>
        <mesh ref={secShaft} material={mats.shaft} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 3.6, 16]} />
        </mesh>
        {GEARS.map((g, i) => (
          <mesh
            key={g.n}
            ref={(el) => (secGears.current[i] = el)}
            geometry={geos.s[i]}
            material={mats.idle[i]}
            position={[0, 0, ZPOS[i]]}
          />
        ))}
        <mesh ref={dog} material={mats.dog} position={[0, 0, ZPOS[0]]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.08, 6]} />
        </mesh>
        <mesh ref={sprocket} geometry={geos.sprocket} material={mats.sprocket} position={[0, 0, 1.45]} />
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
        <mesh ref={basket} material={mats.basket} position={[0, 0, 1.55]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.82, 0.82, 0.55, 28, 1, true]} />
        </mesh>
        {Array.from({ length: 7 }).map((_, i) => (
          <mesh key={i} ref={(el) => (plates.current[i] = el)} material={i % 2 ? mats.friction : mats.steel}>
            <cylinderGeometry args={[i % 2 ? 0.78 : 0.7, i % 2 ? 0.78 : 0.7, 0.035, 6 + (i % 2) * 18]} />
          </mesh>
        ))}
        <group position={[0, -1.05, 1.75]}>
          <Tag color="rgba(58,160,255,.9)">Frizione ← dal motore</Tag>
        </group>
      </group>
    </group>
  )
}
