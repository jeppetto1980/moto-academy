// Capitoli 9 e 10: moto intera (senza officina) + viste ravvicinate di forcella, freni e gomme.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, Line, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import Callout from '../components/Callout'
import MotoScene from './MotoScene'
import { glass, mat, PathFlow, Pipe, useSpringGeo } from './parts'
import { useMech, HalfLathe, lathe, springGeo, circle, diff, union, extrude } from './mech'
import { RacingCaliper } from './MotoParts3'

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
  const spring = useMemo(() => springGeo(0.17, 10, 0.025), [])
  const M = useMech()
  const G = useMemo(
    () => ({
      // fodero esterno anodizzato oro, spaccato per vedere dentro
      outerP: [[0.25, -0.2], [0.32, -0.2], [0.34, -0.15], [0.34, 2.05], [0.36, 2.1], [0.36, 2.2], [0.25, 2.2], [0.25, 0.0], [0.23, -0.05], [0.23, -0.2]],
      seal: lathe([[0.22, -0.22], [0.33, -0.22], [0.33, -0.12], [0.22, -0.12], [0.22, -0.22]], 40),
      foot: lathe([[0, -1.25], [0.28, -1.25], [0.3, -1.1], [0.27, -0.95], [0.23, -0.9], [0, -0.9]], 40),
      cap: lathe([[0, 2.2], [0.3, 2.2], [0.3, 2.3], [0.2, 2.34], [0, 2.34]], 32),
      piston: lathe([[0.04, -0.03], [0.21, -0.03], [0.21, 0.03], [0.04, 0.03], [0.04, -0.03]], 32),
    }),
    []
  )
  const m = useMemo(
    () => ({
      outer: new THREE.MeshPhysicalMaterial({ color: '#d9a43a', metalness: 0.85, roughness: 0.22, clearcoat: 1 }),
      inner: M.chrome,
      alu: M.alu,
      section: M.section,
      ghost: M.ghost,
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
      <group ref={refs.outer} position={[0, 0, 0]}>
        <HalfLathe profile={G.outerP} material={m.outer} sectionMat={m.section} ghost={m.ghost} />
      </group>
      <mesh geometry={G.seal} material={M.rubber} />
      <mesh geometry={G.cap} material={M.alu} />
      <mesh material={M.steel} position={[0, 2.38, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.1, 6]} />
      </mesh>
      <group ref={springRef} position={[0, 0.6, 0]}>
        <mesh geometry={spring} material={m.spring} />
      </group>
      <group ref={refs.spring} position={[0.17, 1.4, 0]} />
      {/* stelo interno che scorre */}
      <group ref={inner}>
        <mesh material={m.inner} position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 1.8, 40]} />
        </mesh>
        {/* piedino con morsetto del perno ruota e attacchi radiali della pinza */}
        <group ref={refs.inner}>
          <mesh geometry={G.foot} material={m.alu} />
          <mesh material={m.alu} position={[0, -1.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.62, 28]} />
          </mesh>
          <mesh material={M.steel} position={[0, -1.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.8, 20]} />
          </mesh>
          {[-1.0, -0.62].map((y) => (
            <mesh key={y} material={m.alu} position={[0.3, y, 0]}>
              <boxGeometry args={[0.18, 0.12, 0.16]} />
            </mesh>
          ))}
        </group>
        <mesh material={m.tire} position={[0.0, -1.12, -0.5]}>
          <torusGeometry args={[0.62, 0.15, 14, 48, Math.PI]} />
        </mesh>
      </group>
      {/* olio e cartuccia idraulica */}
      <mesh ref={refs.oil} material={m.oil} position={[0, 0.0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.7, 28]} />
      </mesh>
      <mesh material={M.steel} position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.6, 12]} />
      </mesh>
      <mesh geometry={G.piston} material={M.brass} position={[0, 0.12, 0]} />
      <PathFlow points={[[0.05, 0.25, 0.1], [0.12, 0.45, 0.12], [0.05, 0.65, 0.1]]} count={10} size={0.035} color="#ffcf7a" speed={1.4} visibleRef={oilFlow} jitter={0.08} />
    </group>
  )
}

function Brake({ refs }) {
  const m = useMemo(
    () => ({
      disc: mat('#c9ced8', { metalness: 0.85, roughness: 0.32 }),
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
  const M = useMech()
  // disco flottante: pista a margherita forata + flangia interna in alluminio con nottolini
  const discGeo = useMemo(() => {
    const outer = []
    for (let i = 0; i < 180; i++) {
      const a = (i / 180) * Math.PI * 2
      const r = 0.95 + 0.025 * Math.sin(a * 12)
      outer.push([Math.cos(a) * r, Math.sin(a) * r])
    }
    const holes = []
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2 + (i % 2) * 0.04
      holes.push(circle(Math.cos(a) * (i % 2 ? 0.74 : 0.84), Math.sin(a) * (i % 2 ? 0.74 : 0.84), 0.028, 10))
    }
    return extrude(diff([[outer]], circle(0, 0, 0.64, 64), ...holes), 0.04, 0, -0.02, 6)
  }, [])
  const carrierGeo = useMemo(() => {
    const spokes = Array.from({ length: 6 }, (_, k) => {
      const a = (k / 6) * Math.PI * 2
      const c = Math.cos(a),
        sn = Math.sin(a)
      return [[[c * 0.25 - sn * 0.07, sn * 0.25 + c * 0.07], [c * 0.66 - sn * 0.05, sn * 0.66 + c * 0.05], [c * 0.66 + sn * 0.05, sn * 0.66 - c * 0.05], [c * 0.25 + sn * 0.07, sn * 0.25 - c * 0.07]]]
    })
    return extrude(diff(union(circle(0, 0, 0.3, 48), ...spokes), circle(0, 0, 0.12, 24)), 0.05, 0.008, -0.025, 6)
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
      <group ref={disc}>
        <mesh geometry={discGeo} material={m.disc} />
        <mesh geometry={carrierGeo} material={M.alu} />
        {Array.from({ length: 12 }).map((_, k) => (
          <mesh key={k} material={M.steel} position={[Math.cos((k / 12) * Math.PI * 2) * 0.655, Math.sin((k / 12) * Math.PI * 2) * 0.655, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.07, 12]} />
          </mesh>
        ))}
      </group>
      {/* pinza radiale monoblocco a 4 pistoncini */}
      <group scale={3.15}>
        <RacingCaliper discR={0.3} center={0.85} span={0.72} discZ={0} />
      </group>
      {/* pinza sul bordo del disco */}
      <group ref={refs.caliper} position={[0.55, 0.62, 0]} rotation={[0, 0, -0.8]}>
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
          <cylinderGeometry args={[0.1, 0.1, 0.45, 24]} />
        </mesh>
        <mesh material={M.alu} position={[-0.32, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.25, 16]} />
        </mesh>
        <mesh material={M.steel} position={[0.1, -0.12, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.12, 6]} />
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
      tread: mat('#1a1b1f', { metalness: 0, roughness: 0.9 }),
      carcass: mat('#d39b2a', { metalness: 0.2, roughness: 0.6 }),
      belt: mat('#8d939c', { metalness: 0.9, roughness: 0.35 }),
      liner: mat('#3a3f47', { metalness: 0, roughness: 0.8 }),
      rim: mat('#22252b', { metalness: 0.6, roughness: 0.35 }),
      groove: new THREE.MeshBasicMaterial({ color: '#000' }),
    }),
    []
  )
  const wheel = useRef()
  useFrame((_, dt) => {
    wheel.current.rotation.z -= dt * 0.4
  })
  // sezione della gomma (r = distanza dall'asse, y = larghezza): battistrada, cintura, carcassa, liner
  const G = useMemo(() => {
    const prof = (s) => [[0.72 * s + 0.02, -0.3], [0.8, -0.34], [1.05, -0.34], [1.24, -0.27], [1.33, -0.12], [1.35, 0], [1.33, 0.12], [1.24, 0.27], [1.05, 0.34], [0.8, 0.34], [0.74, 0.3]]
    const L = (pts, phi) => lathe(pts, 96, 0, phi)
    const tread = prof(1)
    const tr = [...tread, [0.8, 0.27], [1.03, 0.27], [1.18, 0.22], [1.26, 0.1], [1.27, 0], [1.26, -0.1], [1.18, -0.22], [1.03, -0.27], [0.8, -0.27], tread[0]]
    const belt = [[1.18, -0.2], [1.25, -0.09], [1.265, 0], [1.25, 0.09], [1.18, 0.2], [1.17, 0.19], [1.235, 0.08], [1.25, 0], [1.235, -0.08], [1.17, -0.19], [1.18, -0.2]]
    const carc = [[0.76, -0.29], [1.02, -0.29], [1.2, -0.23], [1.27, -0.1], [1.285, 0], [1.27, 0.1], [1.2, 0.23], [1.02, 0.29], [0.76, 0.29], [0.76, 0.27], [1.0, 0.265], [1.18, 0.21], [1.245, 0.09], [1.26, 0], [1.245, -0.09], [1.18, -0.21], [1.0, -0.265], [0.76, -0.27], [0.76, -0.29]]
    const rim = [[0.62, -0.32], [0.76, -0.32], [0.76, -0.26], [0.7, -0.24], [0.7, 0.24], [0.76, 0.26], [0.76, 0.32], [0.62, 0.32], [0.6, 0], [0.62, -0.32]]
    // facce del taglio (chiudono la sezione e mostrano gli strati)
    const cap = (pts, phi) => {
      const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))))
      g.rotateY(phi - Math.PI / 2)
      return g
    }
    const caps = [
      [cap(tr, 0), 'tread'], [cap(tr, Math.PI * 1.55), 'tread'],
      [cap(belt, 0), 'belt'], [cap(belt, Math.PI * 1.65), 'belt'],
      [cap(carc, 0), 'carcass'], [cap(carc, Math.PI * 1.75), 'carcass'],
    ]
    return { tread: L(tr, Math.PI * 1.55), carcass: L(carc, Math.PI * 1.75), belt: L(belt, Math.PI * 1.65), rim: L(rim, Math.PI * 2), caps }
  }, [])
  const capM = useMemo(() => ({ tread: new THREE.MeshStandardMaterial({ color: '#2a2b30', roughness: 0.9, side: THREE.DoubleSide }), belt: new THREE.MeshStandardMaterial({ color: '#a7adb5', metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide }), carcass: new THREE.MeshStandardMaterial({ color: '#e0a83a', roughness: 0.6, side: THREE.DoubleSide }) }), [])
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
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh geometry={G.tread} material={m.tread} />
          <mesh geometry={G.belt} material={m.belt} />
          <mesh geometry={G.carcass} material={m.carcass} />
          <mesh geometry={G.rim} material={m.rim} />
          {G.caps.map(([g, k], i) => (
            <mesh key={i} geometry={g} material={capM[k]} />
          ))}
        </group>
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
