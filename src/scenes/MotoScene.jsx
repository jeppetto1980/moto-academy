// Naked 125 moderna, design originale costruito interamente nel codice.
// Forme principali (serbatoio, fianchetti, codino, sella) estruse da profili 2D per un look spigoloso e moderno.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, Lightformer, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import Workshop from './Workshop'
import { Cables, ChainDrive, Dash, Handlebar, Headlight, Taillight, useTankGeo, Wheel as DetailWheel } from './MotoParts'
import { Engine, Exhaust, FrontDetails, Indicators, RearHugger, RearSuspension, Seat, Shrouds } from './MotoParts2'

// ---------- utilità geometriche ----------
function extrude(points, depth, bevel = 0.03, segs = 2) {
  const s = new THREE.Shape()
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: segs,
    curveSegments: 8,
  })
  g.translate(0, 0, -depth / 2)
  g.computeVertexNormals()
  return g
}

function Tube({ a, b, r = 0.028, material }) {
  const { pos, quat, len } = useMemo(() => {
    const A = new THREE.Vector3(...a)
    const B = new THREE.Vector3(...b)
    const dir = new THREE.Vector3().subVectors(B, A)
    const len = dir.length()
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    const pos = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5)
    return { pos, quat, len }
  }, [a, b])
  return (
    <mesh position={pos} quaternion={quat} material={material}>
      <cylinderGeometry args={[r, r, len, 14]} />
    </mesh>
  )
}

// Disco freno a margherita
function waveDisc(rOut, rIn, petals = 12) {
  const s = new THREE.Shape()
  const n = petals * 8
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const r = rOut - 0.018 * (0.5 + 0.5 * Math.cos(a * petals))
    const x = r * Math.cos(a)
    const y = r * Math.sin(a)
    i ? s.lineTo(x, y) : s.moveTo(x, y)
  }
  const hole = new THREE.Path()
  hole.absarc(0, 0, rIn, 0, Math.PI * 2, true)
  s.holes.push(hole)
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2
    const h = new THREE.Path()
    h.absarc(Math.cos(a) * (rOut - 0.045), Math.sin(a) * (rOut - 0.045), 0.009, 0, Math.PI * 2, true)
    s.holes.push(h)
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: false, curveSegments: 6 })
  g.translate(0, 0, -0.004)
  return g
}

// ---------- ruote ----------
function Wheel({ x, m, front, discGeo }) {
  const ref = useRef()
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z -= dt * 0.5
  })
  const tireW = front ? 1.15 : 1.5
  return (
    <group position={[x, 0.6, 0]}>
      <group ref={ref}>
        <mesh material={m.tire} scale={[1, 1, tireW]}>
          <torusGeometry args={[0.5, 0.1, 20, 64]} />
        </mesh>
        {/* cerchio con filetto colorato */}
        <mesh material={m.wheel}>
          <torusGeometry args={[0.415, 0.032, 10, 64]} />
        </mesh>
        <mesh material={m.paint} position={[0, 0, 0.034 * tireW]}>
          <torusGeometry args={[0.4, 0.007, 6, 64]} />
        </mesh>
        <mesh material={m.paint} position={[0, 0, -0.034 * tireW]}>
          <torusGeometry args={[0.4, 0.007, 6, 64]} />
        </mesh>
        {/* 6 razze sdoppiate */}
        {Array.from({ length: 6 }).map((_, i) =>
          [-0.09, 0.09].map((off) => {
            const a = (i * Math.PI) / 3 + off
            return (
              <mesh key={i + '' + off} material={m.wheel} position={[Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0]} rotation={[0, 0, a - Math.PI / 2]}>
                <boxGeometry args={[0.026, 0.36, 0.04]} />
              </mesh>
            )
          })
        )}
        <mesh material={m.wheel} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.16, 20]} />
        </mesh>
        <mesh geometry={discGeo} material={m.disc} position={[0, 0, front ? 0.1 : -0.1]} />
        {front && <mesh geometry={discGeo} material={m.disc} position={[0, 0, -0.1]} />}
      </group>
      {/* pinze */}
      {front ? (
        <RoundedBox args={[0.1, 0.2, 0.06]} radius={0.02} position={[-0.17, 0.2, 0.12]} rotation={[0, 0, 0.7]} material={m.gold} />
      ) : (
        <RoundedBox args={[0.09, 0.13, 0.05]} radius={0.02} position={[-0.13, -0.15, -0.12]} material={m.black} />
      )}
    </group>
  )
}

export const HOTSPOTS = {
  motore: [0.32, 0.98, 0.3],
  cambio: [-0.1, 0.7, 0.3],
  alimentazione: [0.06, 1.18, 0.24],
  radiatore: [0.74, 0.95, 0.28],
  serbatoio: [0.42, 1.74, 0.2],
  catena: [-0.78, 0.57, 0.3],
  scarico: [-0.55, 0.55, -0.3],
  forcella: [1.17, 1.1, 0.2],
  freni: [1.33, 0.6, 0.3],
  mono: [-0.4, 1.02, 0.14],
}

// punti usati solo come inquadrature nei capitoli (senza pallino)
export const VIEWPOINTS = {
  gomme: [-1.33, 1.05, 0.3],
  luci: [1.18, 1.42, 0.2],
  comandi: [0.88, 1.8, 0.35],
  telaio: [0.3, 1.2, 0.2],
  intera: null,
}

export const PAINTS = [
  { id: 'rosso', name: 'Rosso', color: '#c40f1b' },
  { id: 'nero', name: 'Nero', color: '#16181d' },
  { id: 'bianco', name: 'Bianco', color: '#e9ebef' },
  { id: 'blu', name: 'Blu', color: '#1747c9' },
  { id: 'lime', name: 'Lime', color: '#7bd424' },
]

function CameraRig({ focus, controlsRef }) {
  const { camera } = useThree()
  const goal = useRef(null)
  useEffect(() => {
    const hp = focus && (HOTSPOTS[focus] || VIEWPOINTS[focus])
    if (hp) {
      const p = new THREE.Vector3(...hp)
      const side = p.z < 0 ? -1 : 1
      goal.current = { target: p, pos: p.clone().add(new THREE.Vector3(1.3, 0.6, 3.1 * side)) }
    } else {
      goal.current = { target: new THREE.Vector3(0, 0.95, 0), pos: new THREE.Vector3(2.4, 1.9, 6.2) }
    }
  }, [focus])
  useFrame((_, dt) => {
    const c = controlsRef.current
    if (!goal.current || !c) return
    const k = Math.min(1, dt * 3)
    camera.position.lerp(goal.current.pos, k)
    c.target.lerp(goal.current.target, k)
    c.update()
    if (camera.position.distanceTo(goal.current.pos) < 0.02) goal.current = null
  })
  return null
}

export default function MotoScene({ selected, onSelect, controlsRef, color = '#c40f1b', bare = false, hl = null, braking = false }) {
  const m = useMemo(() => {
    const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.3, roughness: 0.5, ...o })
    const light = color === '#e9ebef' || color === '#7bd424'
    return {
      paint: new THREE.MeshPhysicalMaterial({ color, metalness: light ? 0.05 : 0.3, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18 }),
      black: new THREE.MeshPhysicalMaterial({ color: '#0e0f12', metalness: 0.2, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.3 }),
      matte: std('#1b1d22', { roughness: 0.8, metalness: 0.1 }),
      contrast: std(light ? '#1b1d22' : '#2a2d34', { roughness: 0.55 }),
      frame: std('#1a1b1f', { metalness: 0.5, roughness: 0.4 }),
      alloy: std('#aeb4bf', { metalness: 0.85, roughness: 0.38 }),
      swing: std('#9aa1ad', { metalness: 0.7, roughness: 0.55 }),
      chromeFork: std('#e9edf2', { metalness: 1, roughness: 0.12 }),
      engine: std('#202227', { metalness: 0.6, roughness: 0.45 }),
      fin: std('#8e95a1', { metalness: 0.9, roughness: 0.3 }),
      wheel: std('#141519', { metalness: 0.4, roughness: 0.4 }),
      tire: std('#111214', { metalness: 0, roughness: 0.95 }),
      disc: std('#d3d7de', { metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide }),
      gold: std('#d39b2a', { metalness: 1, roughness: 0.22 }),
      seat: std('#151619', { metalness: 0, roughness: 0.95 }),
      led: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#dff0ff', emissiveIntensity: 3 }),
      ledRed: new THREE.MeshStandardMaterial({ color: '#ff2a2a', emissive: '#ff1a1a', emissiveIntensity: 3 }),
      ledAmber: new THREE.MeshStandardMaterial({ color: '#ffae2a', emissive: '#ff9a1a', emissiveIntensity: 1.5 }),
      screen: new THREE.MeshStandardMaterial({ color: '#0a1a2a', emissive: '#2a8cff', emissiveIntensity: 1.2 }),
      chain: std('#5a606b', { metalness: 0.9, roughness: 0.35 }),
      spring: std(color === '#16181d' ? '#ff6a1a' : color, { metalness: 0.5, roughness: 0.3 }),
      plate: std('#f2f2f2', { roughness: 0.6 }),
      glow: new THREE.MeshBasicMaterial({ color: '#ff6a1a' }),
      floor: std('#101217', { metalness: 0.6, roughness: 0.35 }),
    }
  }, [color])

  const tankGeo = useTankGeo()
  const g = useMemo(
    () => ({
      // serbatoio: profilo laterale spigoloso
      tank: extrude(
        [
          [0.9, 1.5],
          [0.74, 1.68],
          [0.32, 1.7],
          [0.04, 1.54],
          [-0.02, 1.36],
          [0.08, 1.24],
          [0.52, 1.22],
          [0.84, 1.32],
        ],
        0.34,
        0.075,
        3
      ),
      // fianchetti (convogliatori) sopra il radiatore
      shroud: extrude(
        [
          [1.0, 1.5],
          [0.8, 1.6],
          [0.42, 1.4],
          [0.5, 1.12],
          [0.72, 1.02],
          [0.9, 1.2],
        ],
        0.014,
        0.016,
        4
      ),
      shroudAccent: extrude(
        [
          [0.96, 1.46],
          [0.82, 1.53],
          [0.58, 1.38],
          [0.7, 1.24],
        ],
        0.012,
        0.006
      ),
      seat: extrude(
        [
          [0.02, 1.42],
          [-0.62, 1.43],
          [-0.7, 1.5],
          [-0.98, 1.54],
          [-0.98, 1.48],
          [-0.66, 1.38],
          [-0.02, 1.34],
        ],
        0.24,
        0.04,
        5
      ),
      tail: extrude(
        [
          [-0.55, 1.36],
          [-0.95, 1.5],
          [-1.3, 1.6],
          [-1.32, 1.55],
          [-1.05, 1.4],
          [-0.62, 1.26],
        ],
        0.18,
        0.035,
        5
      ),
      flyscreen: extrude(
        [
          [1.03, 1.52],
          [1.14, 1.5],
          [1.06, 1.72],
          [0.98, 1.74],
        ],
        0.2,
        0.015
      ),
      swingarm: extrude(
        [
          [-0.16, 0.86],
          [-0.55, 0.82],
          [-1.36, 0.67],
          [-1.36, 0.55],
          [-0.55, 0.66],
          [-0.18, 0.68],
        ],
        0.045,
        0.015
      ),
      bellyPan: extrude(
        [
          [0.5, 0.4],
          [0.3, 0.24],
          [-0.3, 0.26],
          [-0.36, 0.36],
          [0.0, 0.42],
        ],
        0.3,
        0.03
      ),
      disc: waveDisc(0.3, 0.12),
      discRear: waveDisc(0.22, 0.09, 10),
    }),
    []
  )

  // catena
  const chainGeo = useMemo(() => {
    const A = new THREE.Vector2(-0.16, 0.72)
    const B = new THREE.Vector2(-1.33, 0.6)
    const ra = 0.075
    const rb = 0.21
    const pts = []
    for (let i = 0; i <= 16; i++) {
      const t = -Math.PI / 2 + (i / 16) * Math.PI
      pts.push(new THREE.Vector3(A.x + ra * Math.cos(t), A.y + ra * Math.sin(t), 0.215))
    }
    for (let i = 0; i <= 24; i++) {
      const t = Math.PI / 2 + (i / 24) * Math.PI
      pts.push(new THREE.Vector3(B.x + rb * Math.cos(t), B.y + rb * Math.sin(t), 0.215))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 140, 0.016, 6, true)
  }, [])

  const ring = useRef()
  const bike = useRef()
  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (ring.current) ring.current.material.opacity = 0.55 + 0.25 * Math.sin(t * 2)
    if (hl) {
      const H = { telaio: [m.frame], forcella: [m.gold], forcellone: [m.swing], mono: [m.spring], freni: [m.disc, m.gold], gomme: [m.tire], catena: [m.chain] }
      Object.entries(H).forEach(([k, arr]) =>
        arr.forEach((mm) => {
          mm.emissive.set(hl.has(k) ? '#ff6a1a' : '#000')
          mm.emissiveIntensity = hl.has(k) ? 0.35 + 0.3 * Math.sin(t * 5) : 0
        })
      )
    }
    if (bike.current) {
      // in frenata il peso va avanti: la moto "affonda" sull'anteriore
      const k = braking ? Math.max(0, Math.sin(t * 1.6)) : 0
      bike.current.rotation.z = -0.045 * k
      bike.current.position.y = -0.03 * k
    }
  })

  return (
    <group>
      {/* Luci "da studio" calcolate al volo: danno riflessi lucidi alla vernice */}
      <Environment resolution={256} background={false}>
        <Lightformer form="rect" intensity={2.5} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[6, 2, 3]} rotation-y={-Math.PI / 2} scale={[8, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[-6, 2, -3]} rotation-y={Math.PI / 2} scale={[8, 1.2, 1]} />
        <Lightformer form="ring" color="#ff7a2a" intensity={1.2} position={[0, 3, -7]} scale={4} />
      </Environment>

      <CameraRig focus={selected} controlsRef={controlsRef} />

      {/* Pedana da showroom */}
      {!bare && <Workshop />}
      <mesh material={m.floor} position={[0, -0.03, 0]}>
        <cylinderGeometry args={[2.25, 2.3, 0.06, 64]} />
      </mesh>
      <mesh ref={ring} position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.25, 96]} />
        <meshBasicMaterial color="#ff6a1a" transparent opacity={0.7} />
      </mesh>

      <group ref={bike}>
      <DetailWheel x={-1.33} m={m} discGeo={g.discRear} />
      <DetailWheel x={1.33} m={m} front discGeo={g.disc} />

      {/* Parafango anteriore */}
      <mesh material={m.paint} position={[1.33, 0.6, 0]} rotation={[0, 0, 0.75]} scale={[1, 1, 2.6]}>
        <torusGeometry args={[0.645, 0.035, 12, 48, 1.25]} />
      </mesh>

      {/* Forcella a steli rovesciati (dorata) */}
      {[-0.12, 0.12].map((z) => (
        <group key={z}>
          <Tube a={[1.33, 0.6, z]} b={[1.18, 1.0, z]} r={0.03} material={m.chromeFork} />
          <Tube a={[1.2, 0.95, z]} b={[0.98, 1.62, z]} r={0.048} material={m.gold} />
        </group>
      ))}
      <RoundedBox args={[0.12, 0.06, 0.34]} radius={0.02} position={[1.0, 1.58, 0]} rotation={[0, 0, -0.32]} material={m.black} />
      <RoundedBox args={[0.12, 0.06, 0.34]} radius={0.02} position={[1.08, 1.34, 0]} rotation={[0, 0, -0.32]} material={m.black} />

      <Headlight m={m} castLight={!bare} />
      <mesh geometry={g.flyscreen} material={m.paint} />
      <Dash m={m} />
      <Handlebar m={m} />

      {/* Telaio a traliccio */}
      {[-0.17, 0.17].map((z) => (
        <group key={z}>
          <Tube a={[0.97, 1.55, z * 0.55]} b={[-0.2, 1.3, z]} material={m.frame} />
          <Tube a={[0.97, 1.5, z * 0.55]} b={[-0.22, 0.82, z]} material={m.frame} />
          <Tube a={[-0.2, 1.3, z]} b={[-0.22, 0.82, z]} material={m.frame} />
          <Tube a={[0.55, 1.44, z * 0.8]} b={[0.35, 1.13, z * 0.85]} material={m.frame} />
          <Tube a={[0.2, 1.37, z]} b={[0.05, 1.03, z]} material={m.frame} />
          <Tube a={[-0.2, 1.3, z]} b={[-1.08, 1.43, z * 0.55]} r={0.02} material={m.frame} />
          <Tube a={[-0.22, 0.98, z]} b={[-0.92, 1.38, z * 0.6]} r={0.02} material={m.frame} />
          {/* pedane */}
          <Tube a={[-0.24, 0.8, z * 1.3]} b={[-0.24, 0.8, z * 1.85]} r={0.018} material={m.alloy} />
          <RoundedBox args={[0.2, 0.12, 0.012]} radius={0.004} position={[-0.27, 0.86, z * 1.25]} rotation={[0, 0, -0.4]} material={m.alloy} />
          <mesh geometry={g.swingarm} material={m.swing} position={[0, 0, z * 1.05]} />
        </group>
      ))}

      <RearSuspension m={m} />
      <RearHugger m={m} />

      {/* Serbatoio e fianchetti */}
      <mesh geometry={tankGeo} material={m.paint} />
      {/* tappo serbatoio */}
      <mesh material={m.alloy} position={[0.56, 1.722, 0]} rotation={[0, 0, -0.08]}>
        <cylinderGeometry args={[0.055, 0.058, 0.02, 32]} />
      </mesh>
      <mesh material={m.black} position={[0.56, 1.733, 0]} rotation={[0, 0, -0.08]}>
        <cylinderGeometry args={[0.035, 0.035, 0.01, 24]} />
      </mesh>
      <Shrouds color={color} />
      <Seat m={m} color={color === '#16181d' ? '#ff6a1a' : color} />
      <mesh geometry={g.tail} material={m.paint} />
      <Taillight m={m} />

      {/* Radiatore (raffreddamento a liquido) */}
      <group position={[0.72, 1.02, 0]} rotation={[0, 0, -0.28]}>
        <RoundedBox args={[0.05, 0.42, 0.4]} radius={0.01} material={m.matte} />
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh key={i} material={m.fin} position={[0.027, -0.17 + i * 0.042, 0]}>
            <boxGeometry args={[0.004, 0.008, 0.36]} />
          </mesh>
        ))}
      </group>

      <Engine m={m} />
      <Exhaust />
      <FrontDetails m={m} />
      <Indicators m={m} />

      {/* Catena, pignone e corona */}
      <ChainDrive m={m} />
      <Cables m={m} />

      </group>

      {/* Hotspot */}
      {!bare && Object.entries(HOTSPOTS).filter(([k]) => !selected || k === selected).map(([k, p], i) => (
        <group key={k} position={p}>
          <Html center zIndexRange={[20, 0]}>
            <div
              className={'hotspot' + (selected === k ? ' sel' : '')}
              style={{ animationDelay: `${i * 0.2}s` }}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(k)
              }}
            >
              +
            </div>
          </Html>
        </group>
      ))}
    </group>
  )
}
