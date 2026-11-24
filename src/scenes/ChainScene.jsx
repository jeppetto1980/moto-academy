// Capitolo 8: trasmissione finale. Viste: drive, teeth, links, sag, lube, worn, shaft.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import Callout from '../components/Callout'
import { mat, PathFlow, pulseHL, sprocketGeo } from './parts'
import { useMech, circle, union, diff, extrude, lathe } from './mech'

// Ruota dentata per catena: vani semicircolari dove si appoggiano i rulli, fori di alleggerimento e bulloni
function chainSprocketGeo(r, teeth, depth, { windows = 0, hole = 0.08 } = {}) {
  const roll = PITCH * 0.34
  const gaps = []
  for (let i = 0; i < teeth; i++) {
    const a = ((i + 0.5) / teeth) * Math.PI * 2
    gaps.push(circle(Math.cos(a) * r, Math.sin(a) * r, roll, 14))
  }
  let shape = diff(circle(0, 0, r + PITCH * 0.28, teeth * 6), ...gaps, circle(0, 0, hole, 32))
  if (windows) {
    const cuts = []
    const ri = hole + 0.12
    const ro = r - PITCH * 0.9
    for (let k = 0; k < windows; k++) {
      const a0 = (k / windows) * Math.PI * 2 + 0.22
      const a1 = ((k + 1) / windows) * Math.PI * 2 - 0.22
      const o = circle(0, 0, ro, 16, a0, a1)[0]
      const n = circle(0, 0, ri, 10, a1, a0)[0]
      cuts.push([[...o, ...n]])
    }
    shape = diff(shape, ...cuts)
  }
  return extrude(shape, depth - 0.01, 0.005, -(depth - 0.01) / 2, 6)
}
// piastrina della catena a "8"
function plateGeo(w, t) {
  const s = union(circle(-PITCH / 2, 0, w / 2, 20), circle(PITCH / 2, 0, w / 2, 20), [[[-PITCH / 2, -w * 0.36], [PITCH / 2, -w * 0.36], [PITCH / 2, w * 0.36], [-PITCH / 2, w * 0.36]]])
  return extrude(s, t, 0, -t / 2, 6)
}

const PITCH = 0.075
const rOf = (teeth) => (teeth * PITCH) / (2 * Math.PI) * 1.0 + 0.02
const XF = -1.35
const XR = 1.25

function Label({ text, color = '#eef1f6' }) {
  return (
    <Html center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div style={{ background: 'rgba(14,17,24,.82)', color, padding: '3px 10px', borderRadius: 8, fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap' }}>{text}</div>
    </Html>
  )
}

// Percorso analitico della catena attorno a due ruote dentate (con freccia del ramo inferiore)
function chainPath(rf, rr) {
  const d = XR - XF
  const a = Math.asin((rr - rf) / d)
  const line = d * Math.cos(a)
  const segs = [line, rr * (Math.PI + 2 * a), line, rf * (Math.PI - 2 * a)]
  const L = segs.reduce((x, y) => x + y, 0)
  const Fu = [XF - rf * Math.sin(a), rf * Math.cos(a)]
  const Ru = [XR - rr * Math.sin(a), rr * Math.cos(a)]
  const Rl = [XR - rr * Math.sin(a), -rr * Math.cos(a)]
  const Fl = [XF - rf * Math.sin(a), -rf * Math.cos(a)]
  return {
    L,
    at(s, sag = 0, out = [0, 0, 0]) {
      s = ((s % L) + L) % L
      if (s < segs[0]) {
        const u = s / segs[0]
        out[0] = Fu[0] + (Ru[0] - Fu[0]) * u
        out[1] = Fu[1] + (Ru[1] - Fu[1]) * u
        out[2] = Math.atan2(Ru[1] - Fu[1], Ru[0] - Fu[0])
        return out
      }
      s -= segs[0]
      if (s < segs[1]) {
        const ang = Math.PI / 2 + a - s / rr
        out[0] = XR + rr * Math.cos(ang)
        out[1] = rr * Math.sin(ang)
        out[2] = ang - Math.PI / 2
        return out
      }
      s -= segs[1]
      if (s < segs[2]) {
        const u = s / segs[2]
        out[0] = Rl[0] + (Fl[0] - Rl[0]) * u
        out[1] = Rl[1] + (Fl[1] - Rl[1]) * u - sag * Math.sin(Math.PI * u)
        out[2] = Math.atan2(Fl[1] - Rl[1], Fl[0] - Rl[0])
        return out
      }
      s -= segs[2]
      const ang = -Math.PI / 2 - a - s / rf
      out[0] = XF + rf * Math.cos(ang)
      out[1] = rf * Math.sin(ang)
      out[2] = ang - Math.PI / 2
      return out
    },
  }
}

function Drive({ front = 14, rear = 43, sag = false, lube = false, refs, hl }) {
  const rf = rOf(front)
  const rr = rOf(rear)
  const path = useMemo(() => chainPath(rf, rr), [rf, rr])
  const N = Math.floor(path.L / PITCH)
  const midY = -(rr + rf) / 2
  const M = useMech()
  const geos = useMemo(
    () => ({
      f: chainSprocketGeo(rf, front, 0.1, { hole: 0.06 }),
      r: chainSprocketGeo(rr, rear, 0.08, { windows: 6, hole: 0.12 }),
      plate: plateGeo(0.06, 0.012),
      tyre: lathe([[0.98, -0.12], [1.04, -0.16], [1.18, -0.17], [1.3, -0.12], [1.36, 0], [1.3, 0.12], [1.18, 0.17], [1.04, 0.16], [0.98, 0.12]], 96),
      rim: lathe([[0.9, -0.13], [0.99, -0.13], [0.99, -0.1], [0.94, -0.08], [0.94, 0.08], [0.99, 0.1], [0.99, 0.13], [0.9, 0.13], [0.88, 0], [0.9, -0.13]], 96),
      hub: lathe([[0.1, -0.2], [0.22, -0.2], [0.24, -0.1], [0.24, 0.1], [0.22, 0.2], [0.1, 0.2]], 40),
    }),
    [rf, rr, front, rear]
  )
  const m = useMemo(
    () => ({
      pignone: M.steel.clone(),
      corona: new THREE.MeshPhysicalMaterial({ color: '#d9a43a', metalness: 0.9, roughness: 0.25, clearcoat: 0.6 }),
      plateA: mat('#4a4f58', { metalness: 0.9, roughness: 0.35 }),
      plateB: mat('#b9bec6', { metalness: 0.95, roughness: 0.25 }),
      roller: mat('#8c929c', { metalness: 0.9, roughness: 0.3 }),
      tire: new THREE.MeshStandardMaterial({ color: '#16171a', metalness: 0, roughness: 0.9 }),
      rim: M.blackPaint,
      alu: M.alu,
      mark: new THREE.MeshBasicMaterial({ color: '#ff6a1a' }),
      finger: mat('#e0a98a', { metalness: 0, roughness: 0.8 }),
    }),
    []
  )
  const linksA = useRef()
  const linksB = useRef()
  const rollersI = useRef()
  const fr = useRef()
  const rr_ = useRef()
  const finger = useRef()
  const off = useRef(0)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tmp = useMemo(() => [0, 0, 0], [])
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const v = sag || lube ? 0.25 : 0.7
    off.current += v * dt
    const sg = sag ? 0.12 + 0.1 * Math.sin(t * 2.2) : 0
    for (let i = 0; i < N; i++) {
      path.at(off.current + i * PITCH, sg, tmp)
      // piastrine interne (scure) ed esterne (chiare) alternate, su entrambi i lati; rullo a ogni passo
      const zz = i % 2 ? 0.045 : 0.065
      dummy.rotation.set(0, 0, tmp[2])
      dummy.position.set(tmp[0], tmp[1], zz)
      dummy.updateMatrix()
      ;(i % 2 ? linksA : linksB).current.setMatrixAt(Math.floor(i / 2) * 2, dummy.matrix)
      dummy.position.set(tmp[0], tmp[1], -zz)
      dummy.updateMatrix()
      ;(i % 2 ? linksA : linksB).current.setMatrixAt(Math.floor(i / 2) * 2 + 1, dummy.matrix)
      path.at(off.current + i * PITCH - PITCH / 2, sg, tmp)
      dummy.position.set(tmp[0], tmp[1], 0)
      dummy.rotation.set(Math.PI / 2, 0, 0)
      dummy.updateMatrix()
      rollersI.current.setMatrixAt(i, dummy.matrix)
    }
    linksA.current.instanceMatrix.needsUpdate = true
    linksB.current.instanceMatrix.needsUpdate = true
    rollersI.current.instanceMatrix.needsUpdate = true
    fr.current.rotation.z = -off.current / rf
    rr_.current.rotation.z = -off.current / rr
    if (finger.current) finger.current.position.y = midY - sg - 0.2
    pulseHL(m.pignone, hl?.has('pignone'), t)
    pulseHL(m.corona, hl?.has('corona'), t)
    pulseHL(m.plateB, hl?.has('catena'), t)
  })
  const half = Math.ceil(N / 2)
  return (
    <group rotation={[0.08, -0.32, 0]}>
      {/* ruota posteriore attorno alla corona */}
      <group position={[XR, 0, -0.25]}>
        <mesh geometry={geos.tyre} material={m.tire} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={geos.rim} material={m.rim} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={geos.hub} material={m.alu} rotation={[Math.PI / 2, 0, 0]} />
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh key={i} material={m.rim} rotation={[0, 0, (i / 5) * Math.PI * 2]} position={[0, 0, 0]}>
            <boxGeometry args={[0.07, 1.8, 0.05]} />
          </mesh>
        ))}
      </group>
      <group ref={refs?.pignone} position={[XF, 0, 0]}>
        <group ref={fr}>
          <mesh geometry={geos.f} material={m.pignone} />
          <mesh material={m.mark} position={[0, rf * 0.6, 0.06]}>
            <boxGeometry args={[0.04, rf * 0.5, 0.02]} />
          </mesh>
        </group>
      </group>
      <group ref={refs?.corona} position={[XR, 0, 0]}>
        <group ref={rr_}>
          <mesh geometry={geos.r} material={m.corona} />
          <mesh material={m.mark} position={[0, rr * 0.6, 0.05]}>
            <boxGeometry args={[0.05, rr * 0.4, 0.02]} />
          </mesh>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} material={M.steel} position={[Math.cos(((i + 0.5) / 6) * Math.PI * 2) * 0.2, Math.sin(((i + 0.5) / 6) * Math.PI * 2) * 0.2, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.03, 6]} />
            </mesh>
          ))}
        </group>
      </group>
      <group ref={refs?.catena} position={[(XF + XR) / 2, rr * 0.9, 0]} />
      <instancedMesh ref={linksA} args={[geos.plate, m.plateA, half * 2]} frustumCulled={false} />
      <instancedMesh ref={linksB} args={[geos.plate, m.plateB, half * 2]} frustumCulled={false} />
      <instancedMesh ref={rollersI} args={[null, m.roller, N]} frustumCulled={false}>
        <cylinderGeometry args={[PITCH * 0.3, PITCH * 0.3, 0.08, 10]} />
      </instancedMesh>
      {sag && (
        <group>
          <group ref={finger} position={[(XF + XR) / 2, midY - 0.3, 0.1]}>
            <RoundedBox args={[0.14, 0.32, 0.14]} radius={0.06} material={m.finger} />
          </group>
          {/* righello */}
          <group position={[(XF + XR) / 2 + 0.25, midY - 0.1, 0.12]}>
            {Array.from({ length: 7 }).map((_, i) => (
              <mesh key={i} position={[0, 0.1 - i * 0.05, 0]}>
                <boxGeometry args={[i % 2 ? 0.06 : 0.12, 0.008, 0.01]} />
                <meshBasicMaterial color="#ffd23a" />
              </mesh>
            ))}
            <group position={[0.35, -0.05, 0]}>
              <Label text="gioco" color="#ffd23a" />
            </group>
          </group>
        </group>
      )}
      {lube && (
        <group>
          <group position={[(XF + XR) / 2 + 0.3, midY - 0.95, 0.3]} rotation={[0, 0, 0.5]}>
            <mesh>
              <cylinderGeometry args={[0.13, 0.13, 0.55, 18]} />
              <meshStandardMaterial color="#2a4fd0" metalness={0.5} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.33, 0]}>
              <cylinderGeometry args={[0.05, 0.08, 0.1, 12]} />
              <meshStandardMaterial color="#eee" />
            </mesh>
          </group>
          <PathFlow points={[[(XF + XR) / 2 + 0.15, midY - 0.65, 0.25], [(XF + XR) / 2 + 0.02, midY - 0.25, 0.1], [(XF + XR) / 2 - 0.05, midY + 0.02, 0.0]]} count={24} size={0.025} color="#cfe6ff" speed={1.2} jitter={0.12} />
        </group>
      )}
    </group>
  )
}

function Links({ refs }) {
  const m = useMemo(() => ({ outer: mat('#9aa3b2', { metalness: 0.9 }), inner: mat('#5a606b', { metalness: 0.9 }), pin: mat('#e2e6ec', { metalness: 1, roughness: 0.2 }), roller: mat('#d8a51a', { metalness: 0.8 }), oring: mat('#ff4d5e', { metalness: 0, roughness: 0.6 }) }), [])
  const P = 0.7
  return (
    <group rotation={[0.5, -0.5, 0]} position={[0.2, 0, 0]}>
      {[-1.5, -0.5, 0.5, 1.5].map((x, i) => (
        <group key={i} position={[x * P, 0, 0]}>
          {/* piastrine interne (attorno ai rulli) */}
          {[-0.16, 0.16].map((z) => (
            <RoundedBox key={z} ref={i === 1 && z > 0 ? refs.inner : undefined} args={[P * 1.05, 0.36, 0.05]} radius={0.12} position={[P / 2, 0, z]} material={m.inner} />
          ))}
          {/* piastrine esterne */}
          {[-0.28, 0.28].map((z) => (
            <RoundedBox key={z} ref={i === 2 && z > 0 ? refs.outer : undefined} args={[P * 1.05, 0.4, 0.05]} radius={0.14} position={[0, 0, z]} material={m.outer} />
          ))}
          {/* perno, rullo e O-ring */}
          <mesh ref={i === 1 ? refs.pin : undefined} material={m.pin} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.7, 16]} />
          </mesh>
          <mesh ref={i === 2 ? refs.roller : undefined} material={m.roller} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.26, 24]} />
          </mesh>
          {[-0.22, 0.22].map((z) => (
            <mesh key={z} ref={i === 0 && z > 0 ? refs.oring : undefined} material={m.oring} position={[0, 0, z]}>
              <torusGeometry args={[0.1, 0.022, 8, 20]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function Worn() {
  const m = useMemo(() => ({ ok: mat('#d8a51a', { metalness: 0.8 }), bad: mat('#8a6a2a', { metalness: 0.5, roughness: 0.7 }) }), [])
  const good = useMemo(() => sprocketGeo(0.85, 36, 0.08), [])
  const worn = useMemo(() => {
    // denti a "pinna di squalo": inclinati e appuntiti
    const r = 0.85
    const teeth = 36
    const s = new THREE.Shape()
    const step = (Math.PI * 2) / teeth
    for (let i = 0; i < teeth; i++) {
      const a = i * step
      const pts = [
        [r - 0.05, a],
        [r + 0.05, a + step * 0.62],
        [r - 0.05, a + step * 0.8],
      ]
      pts.forEach(([rr, aa], j) => (i === 0 && j === 0 ? s.moveTo(rr * Math.cos(aa), rr * Math.sin(aa)) : s.lineTo(rr * Math.cos(aa), rr * Math.sin(aa))))
    }
    const h = new THREE.Path()
    h.absarc(0, 0, 0.25, 0, Math.PI * 2, true)
    s.holes.push(h)
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false })
    g.translate(0, 0, -0.04)
    return g
  }, [])
  const a = useRef()
  const b = useRef()
  useFrame((_, dt) => {
    a.current.rotation.z -= dt * 0.3
    b.current.rotation.z -= dt * 0.3
  })
  return (
    <group>
      <group position={[-1.05, 0.15, 0]}>
        <mesh ref={a} geometry={good} material={m.ok} />
        <group position={[0, -1.2, 0]}>
          <Label text="Nuova" color="#2fd47a" />
        </group>
      </group>
      <group position={[1.05, 0.15, 0]}>
        <mesh ref={b} geometry={worn} material={m.bad} />
        <group position={[0, -1.2, 0]}>
          <Label text="Consumata: pinna di squalo" color="#ff8f9a" />
        </group>
      </group>
    </group>
  )
}

function Shaft({ refs }) {
  const m = useMemo(() => ({ shaft: mat('#c4c9d2', { metalness: 0.9 }), gear: mat('#d8a51a', { metalness: 0.8 }), arm: new THREE.MeshPhysicalMaterial({ color: '#9fc4ff', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }) }), [])
  const s1 = useRef()
  const g1 = useRef()
  const g2 = useRef()
  const g3 = useRef()
  useFrame((_, dt) => {
    s1.current.rotation.y += dt * 3
    g1.current.rotation.y += dt * 3
    g2.current.rotation.y -= dt * 3
    g3.current.rotation.y += dt * 1.2
  })
  const Bevel = ({ r, reff }) => (
    <mesh ref={reff} material={m.gear}>
      <cylinderGeometry args={[r * 0.6, r, r * 0.6, 18]} />
    </mesh>
  )
  return (
    <group rotation={[0.25, -0.35, 0]} position={[-0.7, 0, 0]} scale={0.9}>
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh ref={s1} material={m.shaft} position={[0, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 2.6, 16]} />
        </mesh>
        <mesh material={m.arm}>
          <cylinderGeometry args={[0.25, 0.25, 2.8, 24, 1, true]} />
        </mesh>
        <group position={[0, -1.4, 0]} rotation={[Math.PI, 0, 0]}>
          <Bevel r={0.22} reff={g1} />
        </group>
      </group>
      {/* coppia conica in uscita dal motore e alla ruota */}
      <group ref={refs.bevel} position={[1.62, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <group ref={g3}>
          <Bevel r={0.45} reff={g2} />
        </group>
      </group>
      <group position={[1.62, 0, -0.5]}>
        <mesh>
          <torusGeometry args={[1.0, 0.15, 12, 48]} />
          <meshStandardMaterial color="#121317" roughness={0.95} />
        </mesh>
      </group>
      <group position={[0, 0.55, 0]}>
        <Label text="Albero di trasmissione (cardano)" />
      </group>
    </group>
  )
}

export default function ChainScene({ step, ctrl }) {
  const view = step.view
  const hl = useMemo(() => new Set(step.highlight || []), [step])
  const root = useRef()
  const refs = { pignone: useRef(), corona: useRef(), catena: useRef(), outer: useRef(), inner: useRef(), pin: useRef(), roller: useRef(), oring: useRef(), bevel: useRef() }
  const C = (p) => <Callout root={root} maxEdge={2.3} {...p} />
  const front = ctrl.front || 14
  const rear = ctrl.rear || 43
  const ratio = rear / front
  const base = 43 / 14
  return (
    <group ref={root}>
      {['drive', 'teeth', 'sag', 'lube'].includes(view) && (
        <group scale={0.85} position={[-0.3, -0.05, 0]}>
          <Drive front={front} rear={rear} sag={view === 'sag'} lube={view === 'lube'} refs={refs} hl={hl} />
        </group>
      )}
      {view === 'drive' && (
        <>
          <C target={refs.pignone} side={-1} dy={0.75} text={`Pignone (${front} denti)`} />
          <C target={refs.corona} offset={[0.5, 0.3, 0]} side={1} dy={0.9} text={`Corona (${rear} denti)`} color="#d8a51a" />
          {hl.has('catena') && <C target={refs.catena} side={-1} dy={-1.25} text="Catena" />}
        </>
      )}
      {view === 'teeth' && (
        <Html position={[0, -1.85, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ width: 230, background: 'rgba(14,17,24,.85)', borderRadius: 10, padding: 8, fontSize: 12, fontWeight: 700, color: '#eef1f6' }}>
            <div style={{ marginBottom: 6 }}>
              Rapporto {rear}:{front} = <b style={{ color: '#ffb03a' }}>{ratio.toFixed(2).replace('.', ',')}</b>
            </div>
            {[
              ['Spinta', ratio / base, '#ff6a1a'],
              ['Velocità max', base / ratio, '#3aa0ff'],
            ].map(([l, k, c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 78 }}>{l}</span>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,.1)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: Math.min(100, k * 60) + '%', height: '100%', background: c }} />
                </div>
                <span style={{ width: 40, textAlign: 'right' }}>{k >= 1 ? '+' : ''}{Math.round((k - 1) * 100)}%</span>
              </div>
            ))}
          </div>
        </Html>
      )}
      {view === 'links' && <Links refs={refs} />}
      {view === 'links' && (
        <>
          <C target={refs.outer} side={1} dy={0.55} text="Piastrina esterna" />
          <C target={refs.inner} side={-1} dy={0.6} text="Piastrina interna" />
          <C target={refs.roller} side={1} dy={-0.6} text="Rullo" color="#d8a51a" />
          <C target={refs.pin} side={-1} dy={-0.5} text="Perno" />
          <C target={refs.oring} side={-1} dy={-1.0} text="O-ring" color="#ff4d5e" />
        </>
      )}
      {view === 'worn' && <Worn />}
      {view === 'shaft' && <Shaft refs={refs} />}
    </group>
  )
}
