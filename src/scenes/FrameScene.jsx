// Capitoli 9 e 10: moto intera (senza officina) + viste ravvicinate di forcella, freni e gomme.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, Line, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import Callout from '../components/Callout'
import MotoScene from './MotoScene'
import { glass, mat, PathFlow, Pipe, useSpringGeo } from './parts'

function Label({ text, color = '#eef1f6' }) {
  return (
    <Html center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div style={{ background: 'rgba(14,17,24,.85)', color, padding: '3px 10px', borderRadius: 8, fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap' }}>{text}</div>
    </Html>
  )
}

// Porta la camera in una posizione fissa quando la vista cambia
function CamTo({ pos, target, controlsRef }) {
  const { camera } = useThree()
  const goal = useRef(null)
  useEffect(() => {
    goal.current = { p: new THREE.Vector3(...pos), t: new THREE.Vector3(...target) }
  }, [pos, target])
  useFrame((_, dt) => {
    const c = controlsRef?.current
    if (!goal.current || !c) return
    const k = Math.min(1, dt * 3.5)
    camera.position.lerp(goal.current.p, k)
    c.target.lerp(goal.current.t, k)
    c.update()
    if (camera.position.distanceTo(goal.current.p) < 0.02) goal.current = null
  })
  return null
}

const CLOSE_CAM = [1.2, 0.9, 7.2]
const CLOSE_TGT = [0, 0, 0]

// Quote di interasse e avancorsa disegnate sulla moto
function Geometry() {
  const fx = 1.33
  const steerGround = 1.536
  return (
    <group position={[0, 0, 0.45]}>
      <Line points={[[-1.33, 0.06, 0], [1.33, 0.06, 0]]} color="#ffb03a" lineWidth={2} />
      {[-1.33, 1.33].map((x) => (
        <Line key={x} points={[[x, 0.0, 0], [x, 0.6, 0]]} color="#ffb03a" lineWidth={1.5} dashed dashSize={0.05} gapSize={0.04} />
      ))}
      <group position={[0, 0.2, 0]}>
        <Label text="Interasse" color="#ffd28a" />
      </group>
      {/* asse di sterzo prolungato fino a terra */}
      <Line points={[[0.86, 1.98, 0], [steerGround, 0.0, 0]]} color="#3aa0ff" lineWidth={2} dashed dashSize={0.08} gapSize={0.05} />
      <Line points={[[fx, 0.0, 0], [fx, 0.6, 0]]} color="#9fd0ff" lineWidth={1.5} />
      <Line points={[[fx, -0.04, 0], [steerGround, -0.04, 0]]} color="#ff6a1a" lineWidth={4} />
      <group position={[1.65, -0.25, 0]}>
        <Label text="Avancorsa" color="#ffb08a" />
      </group>
      <group position={[0.95, 2.15, 0]}>
        <Label text="Asse di sterzo" color="#9fd0ff" />
      </group>
    </group>
  )
}

function Fork({ refs }) {
  const spring = useSpringGeo(0.17, 10, 0.025)
  const m = useMemo(
    () => ({
      outer: new THREE.MeshPhysicalMaterial({ color: '#d39b2a', transparent: true, opacity: 0.25, metalness: 0.6, roughness: 0.2, depthWrite: false, side: THREE.DoubleSide }),
      inner: mat('#c4c9d2', { metalness: 0.95, roughness: 0.15 }),
      spring: mat('#ff6a1a', { metalness: 0.5 }),
      oil: new THREE.MeshStandardMaterial({ color: '#c98a1a', transparent: true, opacity: 0.55 }),
      rod: mat('#5b6474'),
      tire: mat('#121317', { metalness: 0, roughness: 0.95 }),
    }),
    []
  )
  const inner = useRef()
  const springRef = useRef()
  const oilFlow = useRef(0)
  useFrame((s) => {
    const t = s.clock.elapsedTime
    // buca: compressione rapida, estensione frenata dall'olio
    const ph = t % 2.4
    const c = ph < 0.25 ? ph / 0.25 : Math.max(0, 1 - (ph - 0.25) / 1.4)
    const comp = c * c * 0.55
    inner.current.position.y = comp
    springRef.current.scale.y = 1.6 - comp
    oilFlow.current = c > 0.02 ? 1 : 0
  })
  return (
    <group position={[0, -0.3, 0]} rotation={[0, 0, 0.22]}>
      {/* stelo esterno trasparente (in alto, steli rovesciati) */}
      <mesh ref={refs.outer} material={m.outer} position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 2.4, 32, 1, true]} />
      </mesh>
      <group ref={springRef} position={[0, 0.6, 0]}>
        <mesh geometry={spring} material={m.spring} />
      </group>
      <group ref={refs.spring} position={[0.17, 1.4, 0]} />
      {/* stelo interno che scorre */}
      <group ref={inner}>
        <mesh material={m.inner} position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 1.7, 28]} />
        </mesh>
        <mesh ref={refs.inner} material={m.rod} position={[0, -1.1, 0]}>
          <boxGeometry args={[0.5, 0.25, 0.4]} />
        </mesh>
        <mesh material={m.tire} position={[0.0, -1.1, -0.45]}>
          <torusGeometry args={[0.6, 0.14, 10, 40, Math.PI]} />
        </mesh>
      </group>
      {/* olio e cartuccia idraulica */}
      <mesh ref={refs.oil} material={m.oil} position={[0, 0.0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.7, 28]} />
      </mesh>
      <mesh material={m.rod} position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.6, 10]} />
      </mesh>
      <PathFlow points={[[0.05, 0.25, 0.1], [0.12, 0.45, 0.12], [0.05, 0.65, 0.1]]} count={10} size={0.035} color="#ffcf7a" speed={1.4} visibleRef={oilFlow} jitter={0.08} />
    </group>
  )
}

function Brake({ refs }) {
  const m = useMemo(
    () => ({
      disc: mat('#c9ced8', { metalness: 0.5, roughness: 0.35 }),
      caliper: mat('#d4141c', { metalness: 0.4, roughness: 0.35 }),
      pad: mat('#3a3330', { metalness: 0.1, roughness: 0.9 }),
      lever: mat('#c4c9d2', { metalness: 0.9 }),
      pump: mat('#1c1f26'),
      res: glass('#e9ebef', 0.4),
      hose: mat('#111', { metalness: 0.2 }),
      fluid: new THREE.MeshStandardMaterial({ color: '#ffd23a', transparent: true, opacity: 0.7 }),
      piston: mat('#c4c9d2', { metalness: 0.9 }),
    }),
    []
  )
  const disc = useRef()
  const lever = useRef()
  const padA = useRef()
  const padB = useRef()
  const flow = useRef(0)
  const speed = useRef(4)
  const discGeo = useMemo(() => {
    const s = new THREE.Shape()
    s.absarc(0, 0, 0.95, 0, Math.PI * 2, false)
    const h = new THREE.Path()
    h.absarc(0, 0, 0.45, 0, Math.PI * 2, true)
    s.holes.push(h)
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      const p = new THREE.Path()
      p.absarc(Math.cos(a) * (i % 2 ? 0.7 : 0.8), Math.sin(a) * (i % 2 ? 0.7 : 0.8), 0.03, 0, Math.PI * 2, true)
      s.holes.push(p)
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false, curveSegments: 32 })
    g.translate(0, 0, -0.02)
    return g
  }, [])
  useFrame((st, dt) => {
    const t = st.clock.elapsedTime % 4
    const press = t > 1.5 && t < 3 ? Math.min(1, (t - 1.5) * 4) : t >= 3 ? Math.max(0, 1 - (t - 3) * 4) : 0
    lever.current.rotation.z = -press * 0.35
    padA.current.position.z = 0.09 - press * 0.035
    padB.current.position.z = -0.09 + press * 0.035
    flow.current = press > 0.05 && press < 0.99 ? 1 : 0
    speed.current = press > 0.5 ? Math.max(0, speed.current - dt * 4) : Math.min(4, speed.current + dt * 2)
    disc.current.rotation.z -= dt * speed.current
  })
  const hose = [[-1.65, 1.2, 0], [-1.3, 0.6, 0.2], [-0.2, 0.7, 0.25], [0.35, 0.95, 0.2]]
  return (
    <group rotation={[0.15, -0.35, 0]} position={[0.3, -0.25, 0]}>
      {/* disco forato */}
      <mesh ref={disc} geometry={discGeo} material={m.disc} />
      {/* pinza sul bordo del disco */}
      <group ref={refs.caliper} position={[0.55, 0.62, 0]} rotation={[0, 0, -0.8]}>
        <RoundedBox args={[0.38, 0.5, 0.42]} radius={0.06} material={m.caliper} />
        <mesh ref={padA} material={m.pad} position={[0, -0.12, 0.09]}>
          <boxGeometry args={[0.3, 0.22, 0.05]} />
        </mesh>
        <mesh ref={padB} material={m.pad} position={[0, -0.12, -0.09]}>
          <boxGeometry args={[0.3, 0.22, 0.05]} />
        </mesh>
        <group ref={refs.pads} position={[0, -0.12, 0.22]} />
      </group>
      {/* leva e pompa con serbatoio */}
      <group position={[-1.8, 1.25, 0]}>
        <mesh ref={refs.pump} material={m.pump} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.45, 16]} />
        </mesh>
        <RoundedBox args={[0.3, 0.2, 0.22]} radius={0.04} position={[0, 0.2, 0]} material={m.res} />
        <mesh material={m.fluid} position={[0, 0.17, 0]}>
          <boxGeometry args={[0.26, 0.1, 0.18]} />
        </mesh>
        <group ref={lever} position={[0.2, -0.05, 0]}>
          <mesh material={m.lever} position={[0.55, -0.03, 0]} rotation={[0, 0, -0.08]}>
            <boxGeometry args={[1.1, 0.05, 0.08]} />
          </mesh>
        </group>
        <group ref={refs.lever} position={[0.7, -0.08, 0]} />
      </group>
      <Pipe points={hose} r={0.03} material={m.hose} />
      <PathFlow points={hose} count={12} size={0.04} color="#ffd23a" speed={1.2} visibleRef={flow} jitter={0.01} />
      <group ref={refs.hose} position={[-0.6, 0.62, 0.25]} />
    </group>
  )
}

function Tire({ code, refs }) {
  const m = useMemo(
    () => ({
      tread: mat('#1a1b1f', { metalness: 0, roughness: 0.95 }),
      carcass: mat('#d39b2a', { metalness: 0.2, roughness: 0.6 }),
      rim: mat('#2b2f38', { metalness: 0.6 }),
      groove: new THREE.MeshBasicMaterial({ color: '#000' }),
    }),
    []
  )
  const wheel = useRef()
  useFrame((_, dt) => {
    wheel.current.rotation.z -= dt * 0.4
  })
  const parts = [
    ['110', 'larghezza (mm)'],
    ['70', 'fianco = 70% della larghezza'],
    ['17', 'cerchio (pollici)'],
    ['54', 'carico max 212 kg'],
    ['H', 'fino a 210 km/h'],
  ]
  return (
    <group rotation={[0, -0.5, 0]}>
      <group ref={wheel}>
        {/* metà gomma intera, metà in sezione */}
        <mesh material={m.tread}>
          <torusGeometry args={[1.0, 0.32, 24, 64, Math.PI * 1.5]} />
        </mesh>
        <mesh material={m.carcass}>
          <torusGeometry args={[1.0, 0.26, 24, 64, Math.PI * 2]} />
        </mesh>
        <mesh material={m.rim}>
          <torusGeometry args={[0.72, 0.06, 10, 64]} />
        </mesh>
        {Array.from({ length: 18 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2
          return (
            <mesh key={i} material={m.groove} position={[Math.cos(a) * 1.315, Math.sin(a) * 1.315, (i % 2 ? 0.1 : -0.1)]} rotation={[0, 0, a + 0.5]}>
              <boxGeometry args={[0.02, 0.22, 0.04]} />
            </mesh>
          )
        })}
      </group>
      <group ref={refs.tread} position={[0, 1.3, 0]} />
      <group ref={refs.carcass} position={[1.25, -0.2, 0]} />
      {code && (
        <Html position={[0, -1.75, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(14,17,24,.88)', borderRadius: 10, padding: '8px 10px', width: 230 }}>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 1, color: '#fff', textAlign: 'center', marginBottom: 6 }}>
              <span style={{ color: '#ff8a3d' }}>110</span>/<span style={{ color: '#ffd23a' }}>70</span>-<span style={{ color: '#3aa0ff' }}>17</span> <span style={{ color: '#2fd47a' }}>54</span>
              <span style={{ color: '#ff7bd5' }}>H</span>
            </div>
            {parts.map(([k, d], i) => (
              <div key={k} style={{ fontSize: 11.5, color: '#cfd5df', display: 'flex', gap: 6 }}>
                <b style={{ width: 30, color: ['#ff8a3d', '#ffd23a', '#3aa0ff', '#2fd47a', '#ff7bd5'][i] }}>{k}</b>
                {d}
              </div>
            ))}
          </div>
        </Html>
      )}
    </group>
  )
}

export default function FrameScene({ step, ctrl, controlsRef }) {
  const view = step.view
  const root = useRef()
  const hl = useMemo(() => new Set(step.highlight || []), [step])
  const refs = { outer: useRef(), inner: useRef(), spring: useRef(), oil: useRef(), caliper: useRef(), pads: useRef(), pump: useRef(), lever: useRef(), hose: useRef(), tread: useRef(), carcass: useRef() }
  const C = (p) => <Callout root={root} maxEdge={2.3} {...p} />
  const bike = view === 'bike' || view === 'geometry'
  return (
    <group ref={root}>
      {bike && (
        <group>
          <MotoScene bare selected={view === 'geometry' ? null : step.focus || null} onSelect={() => {}} controlsRef={controlsRef} hl={hl} braking={!!step.braking} />
          {view === 'geometry' && <Geometry />}
        </group>
      )}
      {!bike && <CamTo pos={CLOSE_CAM} target={CLOSE_TGT} controlsRef={controlsRef} />}
      {view === 'fork' && <Fork refs={refs} />}
      {view === 'fork' && (
        <>
          <C target={refs.outer} offset={[0.32, 0.8, 0]} side={1} dy={0.4} text="Stelo esterno" color="#d39b2a" />
          <C target={refs.spring} side={-1} dy={0.4} text="Molla" />
          <C target={refs.oil} offset={[0.3, 0, 0]} side={1} dy={-0.3} text="Olio (idraulica)" color="#c98a1a" />
          <C target={refs.inner} side={-1} dy={-0.2} text="Stelo interno e piedino" />
        </>
      )}
      {view === 'brake' && <Brake refs={refs} />}
      {view === 'brake' && (
        <>
          <C target={refs.lever} side={1} dy={0.55} text="Leva" />
          <C target={refs.pump} side={-1} dy={0.4} text="Pompa con olio freni" color="#ffd23a" />
          <C target={refs.hose} side={-1} dy={-0.7} text="Tubo" />
          <C target={refs.caliper} side={1} dy={0.3} text="Pinza" color="#ff4d5e" />
          <C target={refs.pads} side={1} dy={-0.4} text="Pastiglie" />
        </>
      )}
      {view === 'tire' && <Tire code={ctrl.code} refs={refs} />}
      {view === 'tire' && !ctrl.code && (
        <>
          <C target={refs.tread} side={-1} dy={0.4} text="Battistrada" />
          <C target={refs.carcass} side={1} dy={0.3} text="Carcassa" color="#d39b2a" />
        </>
      )}
    </group>
  )
}
