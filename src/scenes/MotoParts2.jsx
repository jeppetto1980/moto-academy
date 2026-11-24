// Motore cromato, scarico, ammortizzatore, sella, coda, frontale e frecce sporgenti.
import { useMemo } from 'react'
import { Line, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Halo, Hose, Pipe } from './MotoParts'
import { useSpringGeo as useSpringGeoLocal } from './parts'
import { drawLogo } from '../lib/logo'

const chrome = () => new THREE.MeshStandardMaterial({ color: '#eef1f5', metalness: 1, roughness: 0.14 })
const steel = () => new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 0.95, roughness: 0.3 })
const blackEng = () => new THREE.MeshStandardMaterial({ color: '#1a1b1f', metalness: 0.55, roughness: 0.42 })
const carbon = () => new THREE.MeshStandardMaterial({ color: '#16171a', metalness: 0.3, roughness: 0.35 })
const rubber = () => new THREE.MeshStandardMaterial({ color: '#121316', metalness: 0, roughness: 0.9 })

function extrudeSmooth(points, depth, bevel = 0.03, segs = 4) {
  const s = new THREE.Shape()
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: segs, curveSegments: 12 })
  g.translate(0, 0, -depth / 2)
  g.computeVertexNormals()
  return g
}

// Coperchio a cupola (frizione / alternatore) rivolto verso +z
function useDomeGeo(r, h) {
  return useMemo(() => {
    const pts = []
    for (let i = 0; i <= 16; i++) {
      const t = i / 16
      pts.push(new THREE.Vector2(r * Math.cos(t * Math.PI * 0.45) * (1 - 0.15 * t), h * Math.sin(t * Math.PI * 0.5)))
    }
    pts.push(new THREE.Vector2(0, h))
    const g = new THREE.LatheGeometry(pts.reverse(), 48)
    g.rotateX(Math.PI / 2)
    return g
  }, [r, h])
}

function Bolts({ n, r, z, mat, size = 0.012 }) {
  return Array.from({ length: n }).map((_, i) => {
    const a = (i / n) * Math.PI * 2
    return (
      <mesh key={i} material={mat} position={[Math.cos(a) * r, Math.sin(a) * r, z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[size, size, 0.012, 6]} />
      </mesh>
    )
  })
}

// ---------- MOTORE ----------
export function Engine({ m }) {
  const mt = useMemo(() => ({ chrome: chrome(), dome: new THREE.MeshStandardMaterial({ color: '#d7dbe2', metalness: 0.9, roughness: 0.24, side: THREE.DoubleSide }), steel: steel(), black: blackEng(), rubber: rubber(), glass: new THREE.MeshPhysicalMaterial({ color: '#ffb84a', transparent: true, opacity: 0.6, roughness: 0.05 }) }), [])
  const caseGeo = useMemo(
    () =>
      extrudeSmooth(
        [
          [-0.33, 0.62],
          [-0.3, 0.84],
          [-0.06, 0.96],
          [0.3, 0.96],
          [0.52, 0.86],
          [0.55, 0.6],
          [0.4, 0.5],
          [-0.2, 0.5],
        ],
        0.3,
        0.04,
        5
      ),
    []
  )
  const clutch = useDomeGeo(0.17, 0.035)
  const gen = useDomeGeo(0.14, 0.03)
  return (
    <group>
      {/* basamento */}
      <mesh geometry={caseGeo} material={mt.black} />
      {/* coperchio frizione cromato (lato destro) con viti, tappo olio e oblò */}
      <group position={[0.02, 0.72, -0.19]} rotation={[Math.PI, 0, 0]}>
        <mesh geometry={clutch} material={mt.dome} />
        <Bolts n={8} r={0.155} z={0.012} mat={mt.steel} />
        <mesh material={mt.black} position={[0, 0, 0.052]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.008, 6]} />
        </mesh>
      </group>
      <mesh material={m.gold} position={[0.12, 0.88, -0.2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.03, 16]} />
      </mesh>
      <mesh material={mt.glass} position={[0.3, 0.57, -0.192]}>
        <circleGeometry args={[0.03, 24]} />
      </mesh>
      {/* coperchio alternatore cromato (lato sinistro) */}
      <group position={[0.28, 0.7, 0.19]}>
        <mesh geometry={gen} material={mt.dome} />
        <Bolts n={6} r={0.125} z={0.01} mat={mt.steel} size={0.01} />
      </group>
      {/* cilindro con alette cromate */}
      <group position={[0.36, 1.03, 0]} rotation={[0, 0, -0.32]}>
        <RoundedBox args={[0.28, 0.36, 0.28]} radius={0.03} material={mt.black} />
        {Array.from({ length: 8 }).map((_, i) => (
          <RoundedBox key={i} args={[0.4 - Math.abs(i - 3.5) * 0.01, 0.014, 0.38 - Math.abs(i - 3.5) * 0.01]} radius={0.006} position={[0, -0.15 + i * 0.042, 0]} material={mt.chrome} />
        ))}
        {/* testata e coperchio valvole cromato con nervature */}
        <RoundedBox args={[0.34, 0.1, 0.34]} radius={0.03} position={[0, 0.22, 0]} material={mt.black} />
        <RoundedBox args={[0.3, 0.07, 0.28]} radius={0.03} position={[0, 0.3, 0]} material={mt.chrome} />
        {[-0.08, 0, 0.08].map((z) => (
          <RoundedBox key={z} args={[0.24, 0.02, 0.02]} radius={0.008} position={[0, 0.34, z]} material={mt.chrome} />
        ))}
        {/* flangia dello scarico */}
        <mesh material={mt.chrome} position={[0.17, 0.17, -0.06]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.048, 0.048, 0.02, 24]} />
        </mesh>
        {/* pipetta candela */}
        <mesh material={mt.rubber} position={[-0.05, 0.26, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.07, 12]} />
        </mesh>
      </group>
      <Hose points={[[0.31, 1.31, 0.2], [0.2, 1.33, 0.18], [0.05, 1.3, 0.12]]} r={0.007} material={mt.rubber} fittings={false} />
      {/* motorino d'avviamento */}
      <group position={[0.05, 0.98, 0.1]}>
        <mesh material={mt.chrome} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.16, 20]} />
        </mesh>
        <mesh material={mt.black} position={[0, 0, 0.085]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.045, 0.02, 20]} />
        </mesh>
      </group>
      {/* corpo farfallato e manicotto di aspirazione */}
      <mesh material={mt.steel} position={[0.08, 1.16, 0]} rotation={[0, 0, Math.PI / 2 - 0.45]}>
        <cylinderGeometry args={[0.055, 0.055, 0.14, 20]} />
      </mesh>
      <Hose points={[[0.04, 1.13, 0], [-0.04, 1.12, 0], [-0.12, 1.14, 0]]} r={0.045} material={mt.rubber} fittings={false} />
      {/* viti del basamento */}
      {[
        [-0.27, 0.58],
        [-0.25, 0.82],
        [0.48, 0.58],
        [0.48, 0.84],
        [0.1, 0.52],
      ].map(([x, y], i) =>
        [-1, 1].map((s) => (
          <mesh key={i + '' + s} material={mt.steel} position={[x, y, s * 0.192]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.012, 6]} />
          </mesh>
        ))
      )}
    </group>
  )
}

// ---------- SCARICO: collettore cromato dal motore + silenziatore laterale ----------
export function Exhaust() {
  const mt = useMemo(() => ({ chrome: chrome(), steel: steel(), steelDS: Object.assign(steel(), { side: THREE.DoubleSide }), carbon: Object.assign(carbon(), { side: THREE.DoubleSide }) }), [])
  const header = [
    [0.57, 1.135, -0.06],
    [0.64, 1.06, -0.1],
    [0.665, 0.86, -0.13],
    [0.62, 0.56, -0.14],
    [0.46, 0.37, -0.15],
    [0.15, 0.31, -0.16],
    [-0.16, 0.34, -0.19],
    [-0.3, 0.4, -0.215],
  ]
  // silenziatore a megafono orientato verso l'alto/dietro
  const A = new THREE.Vector3(-0.3, 0.4, -0.215)
  const B = new THREE.Vector3(-0.86, 0.69, -0.26)
  const dir = B.clone().sub(A)
  const len = dir.length()
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
  const mufflerGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.034, 0),
      new THREE.Vector2(0.05, 0.06),
      new THREE.Vector2(0.075, 0.16),
      new THREE.Vector2(0.085, 0.3),
      new THREE.Vector2(0.088, len - 0.08),
      new THREE.Vector2(0.084, len - 0.04),
    ]
    return new THREE.LatheGeometry(pts, 40)
  }, [len])
  const pos = A.clone()
  return (
    <group>
      <Pipe points={header} r={0.03} material={mt.chrome} segs={96} />
      {/* fascetta e giunzione */}
      <mesh material={mt.steel} position={[-0.3, 0.4, -0.215]} quaternion={quat}>
        <cylinderGeometry args={[0.04, 0.04, 0.03, 20]} />
      </mesh>
      <group position={pos} quaternion={quat}>
        <mesh geometry={mufflerGeo} material={mt.steelDS} />
        {/* tappo finale in carbonio con terminale cromato */}
        <mesh material={mt.carbon} position={[0, len - 0.03, 0]}>
          <cylinderGeometry args={[0.07, 0.084, 0.04, 40]} />
        </mesh>
        <mesh material={mt.chrome} position={[0, len, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.04, 24, 1, true]} />
        </mesh>
        <mesh position={[0, len + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.027, 24]} />
          <meshBasicMaterial color="#050505" />
        </mesh>
        {/* paracalore in carbonio */}
        <mesh material={mt.carbon} position={[0, len * 0.55, -0.075]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.092, 0.092, len * 0.45, 24, 1, true, -0.9, 1.8]} />
        </mesh>
      </group>
      {/* staffa di supporto al telaio */}
      <Pipe points={[[-0.62, 0.565, -0.25], [-0.65, 0.75, -0.25], [-0.66, 0.91, -0.245]]} r={0.011} material={mt.steel} segs={12} />
    </group>
  )
}

// ---------- AMMORTIZZATORE con molla, serbatoio separato e leveraggio + scatola filtro/batteria ----------
export function RearSuspension({ m }) {
  const mt = useMemo(() => ({ chrome: chrome(), black: blackEng(), carbon: carbon() }), [])
  const spring = useSpringGeoLocal(0.046, 9, 0.011)
  const A = new THREE.Vector3(-0.5, 0.74, 0)
  const B = new THREE.Vector3(-0.3, 1.24, 0)
  const dir = B.clone().sub(A)
  const len = dir.length()
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
  const sideGeo = useMemo(
    () =>
      extrudeSmooth(
        [
          [-0.04, 1.33],
          [-0.6, 1.355],
          [-0.62, 1.25],
          [-0.42, 1.14],
          [-0.12, 1.1],
        ],
        0.012,
        0.014,
        4
      ),
    []
  )
  return (
    <group>
      {/* scatola filtro e batteria che riempiono il vano sotto la sella */}
      <RoundedBox args={[0.38, 0.3, 0.28]} radius={0.05} position={[-0.17, 1.13, 0]} material={mt.black} />
      <RoundedBox args={[0.2, 0.16, 0.2]} radius={0.02} position={[-0.56, 1.22, 0]} material={mt.carbon} />
      <mesh material={m.gold} position={[-0.5, 1.31, 0.05]}>
        <cylinderGeometry args={[0.012, 0.012, 0.02, 8]} />
      </mesh>
      {/* fianchetti sotto la sella */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={sideGeo} material={m.contrast} position={[0, 0, s * 0.175]} />
      ))}
      {/* ammortizzatore */}
      <group position={A} quaternion={quat}>
        <mesh material={mt.chrome} position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.022, 0.009, 8, 16]} />
        </mesh>
        <mesh material={m.gold} position={[0, len * 0.27, 0]}>
          <cylinderGeometry args={[0.03, 0.032, len * 0.42, 24]} />
        </mesh>
        <mesh material={mt.chrome} position={[0, len * 0.62, 0]}>
          <cylinderGeometry args={[0.012, 0.012, len * 0.5, 12]} />
        </mesh>
        <group position={[0, len * 0.12, 0]} scale={[1, len * 0.72, 1]}>
          <mesh geometry={spring} material={m.spring} />
        </group>
        {[len * 0.1, len * 0.86].map((y) => (
          <mesh key={y} material={m.gold} position={[0, y, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.018, 24]} />
          </mesh>
        ))}
        <mesh material={mt.black} position={[0, len * 0.95, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.06, 20]} />
        </mesh>
        {/* serbatoio separato (piggyback) */}
        <mesh material={m.gold} position={[0.075, len * 0.78, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.16, 20]} />
        </mesh>
        <mesh material={mt.black} position={[0.075, len * 0.87, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 20]} />
        </mesh>
      </group>
      {/* leveraggio progressivo sotto il forcellone */}
      {[-1, 1].map((s) => (
        <group key={s} position={[-0.47, 0.66, s * 0.035]}>
          <mesh material={mt.black} rotation={[0, 0, 0.3]}>
            <boxGeometry args={[0.16, 0.05, 0.012]} />
          </mesh>
        </group>
      ))}
      <Pipe points={[[-0.4, 0.62, 0], [-0.3, 0.64, 0], [-0.24, 0.7, 0]]} r={0.013} material={mt.black} segs={8} />
    </group>
  )
}

// ---------- SELLA con cuciture e trama antiscivolo ----------
let seatTex = null
function getSeatTex() {
  if (seatTex) return seatTex
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#9a9a9a'
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#444'
  ctx.lineWidth = 4
  for (let i = -256; i < 512; i += 32) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + 256, 256)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(i + 256, 0)
    ctx.lineTo(i, 256)
    ctx.stroke()
  }
  seatTex = new THREE.CanvasTexture(c)
  seatTex.wrapS = seatTex.wrapT = THREE.RepeatWrapping
  seatTex.repeat.set(10, 3)
  return seatTex
}

export function Seat({ m, color }) {
  const mt = useMemo(() => {
    const t = getSeatTex()
    return {
      pad: new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.85, metalness: 0, bumpMap: t, bumpScale: 1.2 }),
      side: new THREE.MeshStandardMaterial({ color: '#1d1e22', roughness: 0.6, metalness: 0 }),
      alloy: steel(),
    }
  }, [])
  const rider = useMemo(
    () =>
      extrudeSmooth(
        [
          [0.04, 1.37],
          [0.02, 1.42],
          [-0.08, 1.445],
          [-0.58, 1.44],
          [-0.64, 1.4],
          [-0.62, 1.35],
          [-0.1, 1.33],
        ],
        0.2,
        0.045,
        6
      ),
    []
  )
  const pillion = useMemo(
    () =>
      extrudeSmooth(
        [
          [-0.66, 1.47],
          [-0.7, 1.515],
          [-0.96, 1.555],
          [-0.99, 1.52],
          [-0.94, 1.475],
        ],
        0.13,
        0.03,
        5
      ),
    []
  )
  const stitch = (z, pts) => pts.map(([x, y]) => [x, y, z])
  const top = [
    [0.03, 1.462],
    [-0.08, 1.488],
    [-0.35, 1.488],
    [-0.58, 1.484],
  ]
  return (
    <group>
      <mesh geometry={rider} material={mt.pad} />
      <mesh geometry={pillion} material={mt.pad} />
      {/* cuciture colorate */}
      {[-0.1, 0.1].map((z) => (
        <Line key={z} points={stitch(z, top)} color={color} lineWidth={1.4} dashed dashSize={0.012} gapSize={0.008} />
      ))}
      <Line points={stitch(0, top)} color={color} lineWidth={1.2} dashed dashSize={0.012} gapSize={0.008} />
      {[-0.07, 0.07].map((z) => (
        <Line key={'p' + z} points={stitch(z, [[-0.7, 1.548], [-0.84, 1.568], [-0.97, 1.585]])} color={color} lineWidth={1.2} dashed dashSize={0.012} gapSize={0.008} />
      ))}
      {/* maniglie per il passeggero */}
      {[-1, 1].map((s) => (
        <Pipe key={s} points={[[-0.7, 1.42, s * 0.13], [-0.78, 1.47, s * 0.175], [-0.96, 1.5, s * 0.165], [-1.03, 1.46, s * 0.11]]} r={0.012} material={mt.alloy} segs={24} />
      ))}
      {/* pedane passeggero con supporti */}
      {[-1, 1].map((s) => (
        <group key={'pp' + s}>
          <mesh material={mt.side} position={[-0.66, 0.91, s * 0.26]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 0.1, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ---------- coda: paraspruzzi posteriore ----------
export function RearHugger({ m }) {
  return (
    <mesh material={m.black} position={[-1.33, 0.6, 0]} rotation={[0, 0, 0.75]} scale={[1, 1, 2.9]}>
      <torusGeometry args={[0.655, 0.032, 10, 40, 1.15]} />
    </mesh>
  )
}

// ---------- frontale: staffe faro, protezioni forcella, griglia radiatore, clacson ----------
export function FrontDetails({ m }) {
  const mt = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 64, 64)
    ctx.fillStyle = '#5a606b'
    for (let y = 0; y < 64; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < 64; x += 8) ctx.fillRect(x, y, 4, 4)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(5, 5)
    return { grille: new THREE.MeshStandardMaterial({ map: t, metalness: 0.7, roughness: 0.4, alphaMap: t, transparent: true }), alloy: steel(), black: blackEng() }
  }, [])
  return (
    <group>
      {/* griglia di protezione del radiatore */}
      <group position={[0.765, 1.02, 0]} rotation={[0, Math.PI / 2, 0.28]}>
        <mesh material={mt.grille}>
          <planeGeometry args={[0.38, 0.4]} />
        </mesh>
      </group>
      {/* staffe del faro */}
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.12, 0.03, 0.012]} radius={0.006} position={[1.08, 1.47, s * 0.155]} rotation={[0, 0, -0.3]} material={mt.alloy} />
      ))}
      {/* protezioni degli steli forcella */}
      {[-0.12, 0.12].map((z) => (
        <mesh key={z} material={mt.black} position={[1.29, 0.72, z + Math.sign(z) * 0.035]} rotation={[0, 0, 0.36]}>
          <boxGeometry args={[0.03, 0.2, 0.012]} />
        </mesh>
      ))}
      {/* clacson */}
      <mesh material={mt.black} position={[1.12, 1.27, 0]} rotation={[0, 0, Math.PI / 2 - 0.3]}>
        <cylinderGeometry args={[0.045, 0.045, 0.03, 24]} />
      </mesh>
    </group>
  )
}

// ---------- frecce sporgenti su stelo ----------
function Indicator({ base, tip, m }) {
  const lens = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffa31a', emissive: '#ffa31a', emissiveIntensity: 6, toneMapped: false }), [])
  const A = new THREE.Vector3(...base)
  const B = new THREE.Vector3(...tip)
  const dir = B.clone().sub(A).normalize()
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
  const front = tip[0] > 0
  return (
    <group>
      <Pipe points={[base, tip]} r={0.007} material={m.black} segs={2} />
      <group position={tip} quaternion={quat}>
        <mesh material={m.black} scale={[1, 1.8, 1]}>
          <sphereGeometry args={[0.022, 16, 12]} />
        </mesh>
      </group>
      <mesh material={lens} position={[tip[0] + (front ? 0.018 : -0.018), tip[1], tip[2]]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1.6]}>
        <sphereGeometry args={[0.017, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <Halo position={[tip[0] + (front ? 0.04 : -0.04), tip[1], tip[2]]} color="#ffa31a" size={0.1} opacity={0.55} />
    </group>
  )
}

export function Indicators({ m }) {
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Indicator base={[1.08, 1.475, s * 0.16]} tip={[1.1, 1.49, s * 0.27]} m={m} />
          <Indicator base={[-1.22, 1.2, s * 0.05]} tip={[-1.25, 1.215, s * 0.2]} m={m} />
        </group>
      ))}
    </group>
  )
}

// ---------- carene laterali bombate con prese d'aria, viti e logo ----------
const SHROUD = [
  [1.0, 1.5],
  [0.8, 1.61],
  [0.42, 1.41],
  [0.5, 1.11],
  [0.72, 1.01],
  [0.92, 1.2],
]
const SX0 = 0.38
const SY0 = 0.97
const SW = 0.68
const SH = 0.68

function shroudTexture(color, mirror) {
  const N = 1024
  const c = document.createElement('canvas')
  c.width = c.height = N
  const ctx = c.getContext('2d')
  // coordinate locali della carena → pixel (eventualmente specchiate per il lato destro)
  const P = ([x, y]) => {
    let u = (x - SX0) / SW
    if (mirror) u = 1 - u
    return [u * N, (1 - (y - SY0) / SH) * N]
  }
  const path = (pts) => {
    ctx.beginPath()
    pts.forEach((p, i) => (i ? ctx.lineTo(...P(p)) : ctx.moveTo(...P(p))))
    ctx.closePath()
  }
  // base: plastica scura
  ctx.fillStyle = '#1b1d22'
  path(SHROUD)
  ctx.fill()
  ctx.save()
  path(SHROUD)
  ctx.clip()
  // fascia nel colore della moto
  ctx.fillStyle = color
  path([
    [1.02, 1.49],
    [0.82, 1.6],
    [0.6, 1.49],
    [0.86, 1.36],
  ])
  ctx.fill()
  // filetto arancione
  ctx.strokeStyle = '#ff6a1a'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(...P([0.56, 1.44]))
  ctx.lineTo(...P([0.84, 1.3]))
  ctx.lineTo(...P([0.98, 1.36]))
  ctx.stroke()
  // prese d'aria
  ctx.strokeStyle = '#050608'
  ctx.lineCap = 'round'
  for (let i = 0; i < 4; i++) {
    ctx.lineWidth = 16
    ctx.beginPath()
    ctx.moveTo(...P([0.78 + i * 0.035, 1.08 + i * 0.02]))
    ctx.lineTo(...P([0.86 + i * 0.035, 1.2 + i * 0.02]))
    ctx.stroke()
  }
  // logo
  const [lx, ly] = P([0.63, 1.25])
  drawLogo(ctx, lx, ly, N * 0.12)
  ctx.font = `italic 900 ${N * 0.04}px system-ui, sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.fillText('MOTO ACADEMY', lx, ly + N * 0.17)
  ctx.restore()
  // bordo chiaro
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 5
  path(SHROUD)
  ctx.stroke()
  const map = new THREE.CanvasTexture(c)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 8
  // maschera della forma
  const a = document.createElement('canvas')
  a.width = a.height = 256
  const actx = a.getContext('2d')
  actx.fillStyle = '#000'
  actx.fillRect(0, 0, 256, 256)
  actx.fillStyle = '#fff'
  actx.beginPath()
  SHROUD.forEach((p, i) => {
    let u = (p[0] - SX0) / SW
    if (mirror) u = 1 - u
    const q = [u * 256, (1 - (p[1] - SY0) / SH) * 256]
    i ? actx.lineTo(...q) : actx.moveTo(...q)
  })
  actx.closePath()
  actx.fill()
  const alpha = new THREE.CanvasTexture(a)
  return { map, alpha }
}

export function Shrouds({ color }) {
  const geo = useMemo(() => {
    // piano molto suddiviso, curvato verso l'esterno (bombato)
    const g = new THREE.PlaneGeometry(SW, SH, 48, 48)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / (SW / 2)
      const y = p.getY(i) / (SH / 2)
      const b = Math.max(0, 1 - 0.55 * x * x - 0.75 * y * y)
      p.setZ(i, 0.045 * b * b)
    }
    g.computeVertexNormals()
    return g
  }, [])
  const mats = useMemo(
    () =>
      [false, true].map((mirror) => {
        const t = shroudTexture(color, mirror)
        return new THREE.MeshPhysicalMaterial({ map: t.map, alphaMap: t.alpha, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.35, metalness: 0.15, clearcoat: 0.8, clearcoatRoughness: 0.2 })
      }),
    [color]
  )
  const bolt = useMemo(() => steel(), [])
  const cx = SX0 + SW / 2
  const cy = SY0 + SH / 2
  return (
    <group>
      {/* lato sinistro (+z) */}
      <mesh geometry={geo} material={mats[0]} position={[cx, cy, 0.262]} />
      {/* lato destro (−z): girato e con texture specchiata */}
      <mesh geometry={geo} material={mats[1]} position={[cx, cy, -0.262]} rotation={[0, Math.PI, 0]} />
      {[-1, 1].map((s) =>
        [
          [0.5, 1.15],
          [0.9, 1.47],
        ].map(([x, y], i) => (
          <mesh key={s + '' + i} material={bolt} position={[x, y, s * 0.283]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.01, 6]} />
          </mesh>
        ))
      )}
    </group>
  )
}
