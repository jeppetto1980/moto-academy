// Capitolo 4: alimentazione. Viste: ratio, carb, injection, compare.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import Callout from '../components/Callout'
import { glass, mat, Pipe, pulseHL } from './parts'
import { useMech, SectionBlock, HalfLathe, valveGeo, springGeo, lathe, rect, poly, strip, smooth, union, diff, extrude } from './mech'

// Comando del gas condiviso con l'interfaccia (pulsante "tieni premuto per dare gas")
export const fuelInput = { held: false, value: 0.15, base: 0.15 }

const R0 = 0.27
// profilo del condotto: nel carburatore si stringe (Venturi)
const radiusAt = (x, venturi) => (venturi ? R0 - 0.13 * Math.exp(-((x / 0.38) ** 2)) : R0)

function useDuctGeo(venturi) {
  return useMemo(() => {
    const pts = []
    for (let i = 0; i <= 60; i++) {
      const x = -1.6 + (3.2 * i) / 60
      pts.push(new THREE.Vector2(radiusAt(x, venturi), x))
    }
    const g = new THREE.LatheGeometry(pts, 40)
    g.rotateZ(-Math.PI / 2) // asse del tornio da y a x
    return g
  }, [venturi])
}

function Label({ text, color = '#eef1f6', bg = 'rgba(14,17,24,.8)' }) {
  return (
    <Html center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div style={{ background: bg, color, padding: '3px 10px', borderRadius: 8, fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap' }}>{text}</div>
    </Html>
  )
}

function Duct({ mode, throttleRef, hl, refs, showLabels = true }) {
  const carb = mode === 'carb'
  const M = useMech()
  const m = useMemo(
    () => ({
      M,
      duct: glass('#9fc4ff', 0.13),
      box: glass('#c0c8d6', 0.1),
      filtro: mat('#e8cf98', { metalness: 0, roughness: 0.95 }),
      fuel: new THREE.MeshStandardMaterial({ color: '#ff9a2a', transparent: true, opacity: 0.75, roughness: 0.3 }),
      float: mat('#f4f6fb', { metalness: 0.1 }),
      slide: M.steel.clone(),
      getto: M.brass.clone(),
      iniettore: mat('#23262d', { metalness: 0.2, roughness: 0.5 }),
      pompa: mat('#3aa0ff', { metalness: 0.3 }),
      ecu: mat('#1f2329', { metalness: 0.7, roughness: 0.4 }),
      sensor: mat('#ffb03a', { metalness: 0.3 }),
      head: glass('#c0c8d6', 0.12),
      valve: mat('#3aa0ff', { metalness: 0.4 }),
      exhaust: M.chrome.clone(),
      wire: mat('#ff4d5e', { metalness: 0.1, roughness: 0.7 }),
      tank: glass('#ff6a1a', 0.12),
    }),
    [M]
  )
  // geometrie realistiche: condotto spaccato, carburatore, vaschetta, scatola filtro, testata
  const G = useMemo(() => {
    const inner = [],
      outer = []
    for (let i = 0; i <= 60; i++) {
      const x = -1.6 + (3.2 * i) / 60
      inner.push([radiusAt(x, carb), x])
      const fl = Math.abs(x + 1.6) < 0.05 || Math.abs(x - 1.6) < 0.05 || Math.abs(x + 0.5) < 0.04 || Math.abs(x - 0.5) < 0.04 ? 0.06 : 0
      outer.push([R0 + 0.05 + fl, x])
    }
    const ductProfile = [...inner, ...outer.reverse()]
    const ductPoly = []
    for (let i = 0; i <= 30; i++) ductPoly.push([-0.5 + i / 30, radiusAt(-0.5 + i / 30, true)])
    for (let i = 30; i >= 0; i--) ductPoly.push([-0.5 + i / 30, -radiusAt(-0.5 + i / 30, true)])
    const body = diff(
      union(rect(-0.46, -0.42, 0.46, 0.42), rect(-0.16, 0.3, 0.16, 0.95)),
      [ductPoly],
      rect(-0.085, 0, 0.085, 1.0),
      strip([[0, -0.5], [0, -0.1]], 0.07)
    )
    const bowl = diff(rect(-0.42, -1.0, 0.42, -0.42), rect(-0.36, -0.94, 0.36, -0.42), rect(-0.05, -0.43, 0.05, -0.4))
    const airbox = diff(union(rect(-2.75, -0.6, -1.55, 0.6), rect(-3.05, 0.12, -2.7, 0.42)), rect(-2.68, -0.53, -1.62, 0.53), rect(-3.1, 0.18, -2.6, 0.36), rect(-1.7, -0.27, -1.5, 0.27))
    const zig = []
    for (let i = 0; i <= 14; i++) zig.push([-2.5 + i * 0.05, i % 2 ? 0.38 : -0.38])
    const filter = extrude(strip(zig, 0.012), 0.86, 0, -0.43)
    const port = smooth([[1.55, 0], [1.82, -0.04], [2.0, -0.28], [2.05, -0.52]], 20)
    const head = diff(
      rect(1.55, -0.75, 2.62, 0.62),
      strip(port, 0.4, 0.34),
      rect(1.72, -1.1, 2.48, -0.58),
      strip([[2.05 - 0.2 * 0.25, -0.55 + 0.98 * 0.25], [2.05 - 0.2 * 1.3, -0.55 + 0.98 * 1.3]], 0.08),
      strip([[2.05 - 0.2 * 0.75, -0.55 + 0.98 * 0.75], [2.05 - 0.2 * 1.4, -0.55 + 0.98 * 1.4]], 0.3)
    )
    return {
      ductProfile,
      body,
      bowl,
      airbox,
      filter,
      head,
      valve: valveGeo(0.17, 1.15, 0.03),
      spring: springGeo(0.1, 5, 0.015),
      float: lathe([[0, -0.07], [0.06, -0.065], [0.09, -0.04], [0.1, 0], [0.09, 0.04], [0.06, 0.065], [0, 0.07]], 24),
      jet: lathe([[0, -0.62], [0.035, -0.62], [0.035, -0.55], [0.05, -0.55], [0.05, -0.5], [0.028, -0.5], [0.028, -0.14], [0, -0.14]], 20),
      needle: lathe([[0, -0.36], [0.006, -0.36], [0.022, -0.05], [0.022, 0], [0, 0]], 16),
      injector: lathe([[0, -0.24], [0.02, -0.24], [0.025, -0.18], [0.05, -0.17], [0.05, -0.05], [0.07, -0.03], [0.07, 0.12], [0.055, 0.14], [0.055, 0.2], [0, 0.2]], 24),
      lambda: lathe([[0, -0.14], [0.03, -0.14], [0.03, -0.04], [0.05, -0.04], [0.05, 0.02], [0.035, 0.03], [0.03, 0.14], [0, 0.14]], 20),
    }
  }, [carb])
  const valveG = useRef()
  const air = useRef()
  const fuel = useRef()
  const slide = useRef()
  const butterfly = useRef()
  const AIR_N = 70
  const FUEL_N = 40
  const airP = useMemo(() => Array.from({ length: AIR_N }, () => ({ x: -2.6 + Math.random() * 4.2, a: Math.random() * Math.PI * 2, k: Math.random() })), [])
  const fuelP = useMemo(() => Array.from({ length: FUEL_N }, () => ({ life: Math.random(), v: new THREE.Vector3(), p: new THREE.Vector3() })), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const injTip = useMemo(() => new THREE.Vector3(1.0, 0.18, 0), [])
  const injDir = useMemo(() => new THREE.Vector3(0.75, -0.62, 0).normalize(), [])

  useFrame((state, dt) => {
    const th = throttleRef.current
    const t = state.clock.elapsedTime
    // aria
    airP.forEach((p, i) => {
      const r = p.x < -1.6 ? 0.42 : p.x > 1.6 ? 0.22 : radiusAt(p.x, carb)
      const v = (0.35 + th * 1.6) * ((R0 * R0) / (r * r)) * (p.x < -1.6 ? 0.5 : 1)
      p.x += v * dt
      if (p.x > 2.0) p.x = -2.6
      const rr = r * 0.8 * p.k
      dummy.position.set(p.x, Math.sin(p.a) * rr, Math.cos(p.a) * rr)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      air.current.setMatrixAt(i, dummy.matrix)
    })
    air.current.instanceMatrix.needsUpdate = true
    // benzina
    const pulse = mode === 'injection' ? (Math.sin(t * 9) > -0.2 ? 1 : 0) : 1
    fuelP.forEach((p, i) => {
      p.life += dt * (0.9 + th * 1.5)
      if (p.life > 1) {
        p.life = 0
        if (carb) {
          p.p.set(0.01, -0.12, 0)
          p.v.set(0.6 + th * 2.2, (Math.random() - 0.3) * 0.5, (Math.random() - 0.5) * 0.5)
        } else {
          p.p.copy(injTip)
          p.v.copy(injDir).multiplyScalar(1.1 + Math.random() * 0.6)
          p.v.x += (Math.random() - 0.5) * 0.4
          p.v.y += (Math.random() - 0.5) * 0.4
          p.v.z += (Math.random() - 0.5) * 0.4
        }
      }
      p.p.addScaledVector(p.v, dt)
      const vis = (carb ? th > 0.05 : pulse) && p.life < 0.85
      dummy.position.copy(p.p)
      dummy.scale.setScalar(vis ? (carb ? 0.6 + th : 0.6) * (1 - p.life * 0.6) : 0.0001)
      dummy.updateMatrix()
      fuel.current.setMatrixAt(i, dummy.matrix)
    })
    fuel.current.instanceMatrix.needsUpdate = true
    if (slide.current) slide.current.position.y = 0.05 + th * 0.42
    if (valveG.current) valveG.current.position.set(0.2 * Math.max(0, Math.sin(t * 5)) * 0.1, -0.98 * Math.max(0, Math.sin(t * 5)) * 0.1, 0)
    if (butterfly.current) butterfly.current.rotation.z = (1 - th) * (Math.PI / 2 - 0.12)
    // evidenziazioni
    const H = (k, mm) => pulseHL(mm, hl.has(k), t)
    H('filtro', m.filtro)
    H('getto', m.getto)
    H('saracinesca', m.slide)
    H('iniettore', m.iniettore)
    H('pompa', m.pompa)
    H('centralina', m.ecu)
    H('sensori', m.sensor)
    H('lambda', m.exhaust)
  })

  return (
    <group>
      {/* scatola filtro spaccata con filtro a pieghe */}
      <group ref={refs.airbox} position={[-2.15, 0, 0]} />
      <SectionBlock shape={G.airbox} depth={0.5} material={M.blackPaint} sectionMat={M.section} ghost={M.ghost} />
      <group ref={refs.filtro} position={[-2.15, 0, 0]}>
        <mesh geometry={G.filter} material={m.filtro} rotation={[-Math.PI / 2, 0, 0]} position={[2.15, 0, 0]} />
        <mesh material={M.rubber} position={[0, 0, 0]}>
          <boxGeometry args={[0.8, 0.06, 0.9]} />
        </mesh>
      </group>
      {/* condotto spaccato (con Venturi nel carburatore) */}
      <group rotation={[0, 0, -Math.PI / 2]}>
        <HalfLathe profile={G.ductProfile} material={carb ? M.alu : M.rubber} sectionMat={M.section} ghost={M.ghost} segs={48} />
      </group>
      {/* testata spaccata con condotto, valvola di aspirazione e molla */}
      <SectionBlock shape={G.head} depth={0.55} material={M.alu} sectionMat={M.section} ghost={M.ghost} />
      <group ref={refs.collettore} position={[1.3, 0, 0]} />
      <group position={[2.05, -0.55, 0]} rotation={[0, 0, 0.2]}>
        <group ref={valveG}>
          <mesh geometry={G.valve} material={m.valve} />
          <mesh material={M.steel} position={[0, 1.08, 0]}>
            <cylinderGeometry args={[0.09, 0.07, 0.04, 20]} />
          </mesh>
        </group>
        <mesh geometry={G.spring} material={M.steelDark} position={[0, 0.75, 0]} scale={[1, 0.32, 1]} />
      </group>

      {/* particelle */}
      <instancedMesh ref={air} args={[null, null, AIR_N]} frustumCulled={false}>
        <sphereGeometry args={[0.035, 6, 6]} />
        <meshBasicMaterial color="#7cc4ff" />
      </instancedMesh>
      <instancedMesh ref={fuel} args={[null, null, FUEL_N]} frustumCulled={false}>
        <sphereGeometry args={[0.035, 6, 6]} />
        <meshBasicMaterial color="#ffa53a" />
      </instancedMesh>

      {carb && (
        <group>
          {/* corpo carburatore in alluminio, spaccato */}
          <SectionBlock shape={G.body} depth={0.4} material={M.alu} sectionMat={M.section} ghost={M.ghost} />
          <mesh material={M.blackPaint} position={[0, 1.0, -0.0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.1, 28]} />
          </mesh>
          {/* saracinesca cilindrica con spillo conico */}
          <group ref={slide} position={[0, 0.3, 0]}>
            <mesh material={m.slide}>
              <cylinderGeometry args={[0.08, 0.08, 0.62, 24]} />
            </mesh>
            <mesh geometry={G.needle} material={M.steel} position={[0, -0.31, 0]} />
            <mesh material={M.steelDark} position={[0, 0.36, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.1, 6]} />
            </mesh>
          </group>
          <group ref={refs.saracinesca} position={[0, 0.62, 0]} />
          {/* vaschetta spaccata con benzina, galleggiante e spillo */}
          <group ref={refs.vaschetta} position={[0, -0.72, 0]} />
          <SectionBlock shape={G.bowl} depth={0.36} material={M.alu} sectionMat={M.section} ghost={M.ghost} />
          <mesh material={m.fuel} position={[0, -0.83, -0.1]}>
            <boxGeometry args={[0.72, 0.22, 0.5]} />
          </mesh>
          <group position={[0.17, -0.7, -0.05]}>
            <mesh geometry={G.float} material={m.float} rotation={[0, 0, Math.PI / 2]} scale={[1, 1.4, 1]} />
            <mesh material={M.brass} position={[-0.14, 0.06, 0]} rotation={[0, 0, 0.3]}>
              <boxGeometry args={[0.2, 0.015, 0.04]} />
            </mesh>
          </group>
          <mesh material={M.brass} position={[0.46, -0.52, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.18, 12]} />
          </mesh>
          <mesh material={M.steel} position={[0, -1.02, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.06, 6]} />
          </mesh>
          {/* getto principale in ottone */}
          <mesh ref={refs.getto} geometry={G.jet} material={m.getto} />
          <group ref={refs.venturi} position={[0, 0.14, 0]} />
        </group>
      )}

      {mode === 'injection' && (
        <group>
          {/* corpo farfallato con farfalla */}
          <group rotation={[0, 0, -Math.PI / 2]}>
            <HalfLathe profile={[[0.275, -0.28], [0.4, -0.28], [0.4, -0.22], [0.34, -0.2], [0.34, 0.2], [0.4, 0.22], [0.4, 0.28], [0.275, 0.28]]} material={M.alu} sectionMat={M.section} ghost={M.ghost} />
          </group>
          <mesh material={M.steel} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.9, 12]} />
          </mesh>
          <group ref={butterfly}>
            <mesh material={M.brass} rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.262, 0.262, 0.018, 36]} />
            </mesh>
          </group>
          {/* iniettore */}
          <group ref={refs.iniettore} position={[0.78, 0.42, 0]} rotation={[0, 0, 0.88]}>
            <mesh geometry={G.injector} material={m.iniettore} />
            <mesh material={M.steel} position={[0, -0.22, 0]}>
              <cylinderGeometry args={[0.022, 0.016, 0.06, 12]} />
            </mesh>
            <mesh material={M.rubber} position={[0, -0.12, 0]}>
              <torusGeometry args={[0.052, 0.012, 8, 20]} />
            </mesh>
            <mesh material={mat('#2c6e49', { metalness: 0.1, roughness: 0.6 })} position={[0.07, 0.16, 0]}>
              <boxGeometry args={[0.1, 0.09, 0.09]} />
            </mesh>
          </group>
          {/* serbatoio con pompa e tubo benzina */}
          <RoundedBox args={[1.4, 0.7, 0.9]} radius={0.2} position={[-0.4, 1.75, 0]} material={m.tank} />
          <mesh material={m.fuel} position={[-0.4, 1.6, 0]}>
            <boxGeometry args={[1.25, 0.32, 0.8]} />
          </mesh>
          <mesh ref={refs.pompa} material={m.pompa} position={[-0.1, 1.6, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.4, 16]} />
          </mesh>
          <Pipe points={[[-0.05, 1.45, 0], [0.5, 1.3, 0], [0.62, 0.75, 0]]} r={0.025} material={m.fuel} />
          {/* centralina e cavi */}
          <group ref={refs.centralina} position={[-2.0, 1.45, 0]}>
            <RoundedBox args={[0.7, 0.45, 0.16]} radius={0.03} material={m.ecu} />
            {Array.from({ length: 7 }).map((_, i) => (
              <mesh key={i} material={m.ecu} position={[-0.27 + i * 0.09, 0, 0.1]}>
                <boxGeometry args={[0.03, 0.4, 0.06]} />
              </mesh>
            ))}
            <mesh material={mat('#2fd47a', { metalness: 0.1, roughness: 0.6 })} position={[0.38, 0, 0]}>
              <boxGeometry args={[0.08, 0.3, 0.12]} />
            </mesh>
          </group>
          <Pipe points={[[-1.65, 1.45, 0], [-0.9, 1.1, 0.35], [0.4, 0.95, 0.35], [0.72, 0.68, 0.1]]} r={0.015} material={m.wire} />
          <Pipe points={[[-1.9, 1.22, 0], [-1.3, 0.75, 0.4], [-0.05, 0.55, 0.4], [0.05, 0.37, 0.3]]} r={0.012} material={m.wire} />
          {/* sensori: posizione farfalla, pressione, temperatura aria */}
          <group ref={refs.sensori}>
            <mesh material={m.sensor} position={[0, 0.2, 0.36]}>
              <boxGeometry args={[0.16, 0.16, 0.08]} />
            </mesh>
            <mesh material={m.sensor} position={[0.5, 0.3, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.14, 10]} />
            </mesh>
            <mesh material={m.sensor} position={[-2.15, 0.6, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.14, 10]} />
            </mesh>
          </group>
          {/* scarico con sonda lambda */}
          <Pipe points={[[2.4, -0.55, 0], [2.9, -0.7, 0], [3.1, -1.3, 0]]} r={0.12} material={m.exhaust} />
          <mesh ref={refs.lambda} geometry={G.lambda} material={m.sensor} position={[2.85, -0.5, 0]} rotation={[0, 0, -0.3]} />
        </group>
      )}
      {/* manopola del gas con cavo */}
      <Grip throttleRef={throttleRef} pos={carb ? [-1.05, 1.25, 0.3] : [-0.85, -0.95, 0.45]} cableTo={carb ? [0, 1.05, 0] : [0, -0.36, 0.3]} gripRef={refs.grip} />
      {!carb && <Pulley throttleRef={throttleRef} />}
    </group>
  )
}

function Grip({ throttleRef, pos, cableTo, gripRef }) {
  const sleeve = useRef()
  const m = useMemo(() => ({ bar: mat('#c4c9d2', { metalness: 0.9 }), grip: mat('#4a505c', { metalness: 0.1, roughness: 0.8 }), arrow: new THREE.MeshBasicMaterial({ color: '#ff6a1a' }), cable: mat('#9aa3b2', { metalness: 0.5 }) }), [])
  useFrame(() => {
    if (sleeve.current) sleeve.current.rotation.x = -throttleRef.current * 1.6
  })
  return (
    <group>
      <group ref={gripRef} position={pos} rotation={[0, 0.5, 0]}>
        <mesh material={m.bar} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.45]}>
          <cylinderGeometry args={[0.05, 0.05, 0.6, 14]} />
        </mesh>
        <group ref={sleeve}>
          <mesh material={m.grip} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.42, 20]} />
          </mesh>
          <mesh material={m.arrow} position={[0, 0.1, 0]}>
            <boxGeometry args={[0.04, 0.02, 0.38]} />
          </mesh>
          {[-0.15, 0, 0.15].map((z) => (
            <mesh key={z} material={m.arrow} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.102, 0.008, 6, 24]} />
            </mesh>
          ))}
        </group>
      </group>
      <Pipe points={[pos, [(pos[0] + cableTo[0]) / 2, (pos[1] + cableTo[1]) / 2 + 0.25, (pos[2] + cableTo[2]) / 2 + 0.1], cableTo]} r={0.012} material={m.cable} />
    </group>
  )
}

function Pulley({ throttleRef }) {
  const g = useRef()
  useFrame(() => {
    if (g.current) g.current.rotation.z = -throttleRef.current * 1.4
  })
  return (
    <group ref={g} position={[0, 0, 0.36]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.05, 24]} />
        <meshStandardMaterial color="#b9c0cc" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.16, 0.03]}>
        <boxGeometry args={[0.05, 0.08, 0.02]} />
        <meshBasicMaterial color="#ff6a1a" />
      </mesh>
    </group>
  )
}

function Ratio() {
  const cubes = useRef([])
  useFrame((s) => {
    cubes.current.forEach((c, i) => {
      if (!c) return
      const t = (s.clock.elapsedTime * 0.8 - i * 0.08) % 4
      const drop = Math.max(0, 1 - t * 2)
      c.position.y = c.userData.y + drop * 2
      c.material.opacity = 1 - drop
    })
  })
  const air = []
  for (let i = 0; i < 15; i++) air.push([-2.0 + (i % 5) * 0.42, -0.9 + Math.floor(i / 5) * 0.42])
  return (
    <group position={[0, 0.1, 0]}>
      {air.map(([x, y], i) => (
        <mesh key={i} ref={(el) => (cubes.current[i] = el) && (el.userData.y = y)} position={[x, y, 0]}>
          <boxGeometry args={[0.34, 0.34, 0.34]} />
          <meshStandardMaterial color="#3aa0ff" transparent metalness={0.2} roughness={0.4} />
        </mesh>
      ))}
      <mesh ref={(el) => (cubes.current[15] = el) && (el.userData.y = -0.9)} position={[1.6, -0.9, 0]}>
        <boxGeometry args={[0.34, 0.34, 0.34]} />
        <meshStandardMaterial color="#ff9a2a" transparent metalness={0.2} roughness={0.4} />
      </mesh>
      <group position={[-1.16, 0.75, 0]}>
        <Label text="≈ 14,7 g di aria" color="#9fd0ff" />
      </group>
      <group position={[1.6, -0.25, 0]}>
        <Label text="1 g di benzina" color="#ffc58a" />
      </group>
      <mesh position={[0.6, -0.9, 0]}>
        <boxGeometry args={[0.04, 0.6, 0.04]} />
        <meshBasicMaterial color="#5b6474" />
      </mesh>
    </group>
  )
}

export default function FuelScene({ step, ctrl }) {
  const view = step.view
  const hl = useMemo(() => new Set(step.highlight || []), [step])
  const root = useRef()
  const throttleRef = useRef(ctrl.throttle ?? 0.5)
  const interactive = view === 'carb' || view === 'injection' || view === 'compare'
  fuelInput.base = ctrl.throttle ?? 0.15
  useFrame((_, dt) => {
    if (!interactive) return
    // tieni premuto: il gas si apre progressivamente; rilasci: la molla lo richiude
    if (fuelInput.held) fuelInput.value = Math.min(1, fuelInput.value + dt * 1.1)
    else fuelInput.value += (fuelInput.base - fuelInput.value) * Math.min(1, dt * 4)
    throttleRef.current = fuelInput.value
  })
  const refs = {
    airbox: useRef(),
    filtro: useRef(),
    collettore: useRef(),
    saracinesca: useRef(),
    vaschetta: useRef(),
    getto: useRef(),
    venturi: useRef(),
    iniettore: useRef(),
    pompa: useRef(),
    centralina: useRef(),
    sensori: useRef(),
    lambda: useRef(),
    grip: useRef(),
  }
  const C = (p) => <Callout root={root} maxEdge={2.2} {...p} />
  const callouts = {
    filtro: <C key="f" target={refs.filtro} side={-1} dy={0.8} text="Filtro aria" />,
    airbox: <C key="a" target={refs.airbox} offset={[0, -0.55, 0]} side={-1} dy={-0.5} text="Scatola filtro" />,
    collettore: <C key="c" target={refs.collettore} side={1} dy={0.7} text="Collettore" />,
    venturi: <C key="v" target={refs.venturi} side={1} dy={0.9} text="Venturi (strozzatura)" />,
    getto: <C key="g" target={refs.getto} side={1} dy={-0.25} text="Getto" color="#d8a51a" />,
    vaschetta: <C key="va" target={refs.vaschetta} offset={[-0.4, 0, 0]} side={-1} dy={-0.3} text="Vaschetta e galleggiante" />,
    saracinesca: <C key="s" target={refs.saracinesca} side={-1} dy={0.5} text="Saracinesca del gas" />,
    iniettore: <C key="i" target={refs.iniettore} side={1} dy={0.5} text="Iniettore" />,
    pompa: <C key="p" target={refs.pompa} side={1} dy={0.4} text="Pompa benzina" color="#3aa0ff" />,
    centralina: <C key="e" target={refs.centralina} side={-1} dy={0.4} text="Centralina (ECU)" color="#2fd47a" />,
    sensori: <C key="se" target={refs.sensori} offset={[0, 0.2, 0.36]} side={-1} dy={-0.9} text="Sensori farfalla, pressione, aria" color="#ffb03a" />,
    grip: <C key="gr" target={refs.grip} side={-1} dy={0.35} text="Manopola del gas" />,
    lambda: <C key="l" target={refs.lambda} side={1} dy={-0.75} text="Sonda lambda" color="#ffb03a" />,
  }

  return (
    <group ref={root}>
      {view === 'ratio' && <Ratio />}
      {(view === 'carb' || view === 'injection') && (
        <group scale={view === 'injection' ? 0.68 : 0.8} position={[view === 'injection' ? -0.45 : -0.2, view === 'injection' ? -0.45 : 0, 0]}>
          <Duct mode={view} throttleRef={throttleRef} hl={hl} refs={refs} />
        </group>
      )}
      {(view === 'carb' || view === 'injection') && [...step.highlight, 'grip'].map((k) => callouts[k])}
      {view === 'compare' && (
        <>
          <group scale={0.5} position={[-0.3, 1.0, 0]}>
            <Duct mode="carb" throttleRef={throttleRef} hl={hl} refs={{}} />
            <group position={[0, 1.2, 0]}>
              <Label text="Carburatore" />
            </group>
          </group>
          <group scale={0.5} position={[-0.3, -1.3, 0]}>
            <Duct mode="injection" throttleRef={throttleRef} hl={hl} refs={{}} />
            <group position={[0, 2.6, 0]}>
              <Label text="Iniezione elettronica" />
            </group>
          </group>
        </>
      )}
    </group>
  )
}
