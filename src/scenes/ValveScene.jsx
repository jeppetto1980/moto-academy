// Capitolo 3: distribuzione. Viste: dohc, single, sohc, chain, four, clearance.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import Callout from '../components/Callout'
import { glass, mat, pulseHL, sprocketGeo, useSpringGeo } from './parts'

const D = Math.PI / 180
// alzata (0..1) di una camma in funzione dell'angolo camma (gradi) e della posizione del lobo
function camLift(phiDeg, peak, half = 55) {
  let d = ((((phiDeg - peak) % 360) + 540) % 360) - 180
  if (Math.abs(d) > half) return 0
  const c = Math.cos(((d / half) * Math.PI) / 2)
  return c * c
}

function useMats() {
  return useMemo(
    () => ({
      valvola: mat('#c9ced8'),
      valvolaAsp: mat('#3aa0ff', { metalness: 0.4 }),
      valvolaSca: mat('#ff4d5e', { metalness: 0.4 }),
      molla: mat('#9aa3b2', { metalness: 0.8 }),
      camma: mat('#ffb03a', { metalness: 0.5 }),
      punteria: mat('#6f7888'),
      bilanciere: mat('#8d96a6'),
      sede: mat('#d8a51a', { metalness: 0.7 }),
      head: glass('#c0c8d6', 0.1),
      block: glass('#9fc4ff', 0.1),
      dark: mat('#3a414f'),
      chain: mat('#5a606b', { metalness: 0.9 }),
      mark: new THREE.MeshBasicMaterial({ color: '#ff6a1a' }),
      gap: new THREE.MeshBasicMaterial({ color: '#ff6a1a', transparent: true, opacity: 0.9 }),
    }),
    []
  )
}

// Valvola completa: piattello, stelo, molla, punteria. Origine = sede.
function ValveAssy({ m, valveMat, liftRef, axisTilt = 0, springGeo, refs, bucket = true, len = 1.5 }) {
  const g = useRef()
  const spring = useRef()
  useFrame(() => {
    const l = liftRef.current * 0.18
    g.current.position.y = -l
    spring.current.scale.y = 0.62 - l
  })
  return (
    <group rotation={[0, 0, axisTilt]}>
      <group ref={g}>
        <group ref={refs?.valve}>
          <mesh material={valveMat}>
            <cylinderGeometry args={[0.22, 0.24, 0.05, 32]} />
          </mesh>
          <mesh material={valveMat} position={[0, len / 2, 0]}>
            <cylinderGeometry args={[0.035, 0.035, len, 12]} />
          </mesh>
        </group>
        {/* piattello superiore della molla + punteria */}
        <mesh material={m.dark} position={[0, len - 0.06, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.03, 20]} />
        </mesh>
        {bucket && (
          <mesh ref={refs?.bucket} material={m.punteria} position={[0, len + 0.06, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.18, 24]} />
          </mesh>
        )}
      </group>
      {/* la molla si appoggia sulla testata (fissa) e spinge sul piattello (mobile) */}
      <group ref={spring} position={[0, len - 0.66, 0]}>
        <mesh geometry={springGeo} material={m.molla} />
      </group>
      <mesh ref={refs?.sede} material={m.sede} position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.235, 0.025, 8, 32]} />
      </mesh>
    </group>
  )
}

function Cam({ m, rotRef, refsCam }) {
  return (
    <group ref={rotRef}>
      <group ref={refsCam}>
        <mesh material={m.camma} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.24, 28]} />
        </mesh>
        <mesh material={m.camma} position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.8, 1, 1.35]}>
          <cylinderGeometry args={[0.15, 0.15, 0.24, 28]} />
        </mesh>
      </group>
    </group>
  )
}

export default function ValveScene({ step, ctrl }) {
  const view = step.view
  const m = useMats()
  const hl = useMemo(() => new Set(step.highlight || []), [step])
  const root = useRef()
  const phi = useRef(0)
  const liftA = useRef(0)
  const liftB = useRef(0)
  const camA = useRef()
  const camB = useRef()
  const spring = useSpringGeo(0.13, 6, 0.02)
  const r = {
    valveA: useRef(),
    valveB: useRef(),
    bucketA: useRef(),
    bucketB: useRef(),
    sedeA: useRef(),
    camA: useRef(),
    camB: useRef(),
    rockA: useRef(),
    rockB: useRef(),
    crankSp: useRef(),
    camSpA: useRef(),
    camSpB: useRef(),
    chainRef: useRef(),
    gapRef: useRef(),
  }
  const overlapTag = useRef()
  const valvesCtl = ctrl.valves || 4

  // catena di distribuzione
  const chain = useMemo(() => {
    const pts = []
    const arc = (cx, cy, rr, a0, a1, n) => {
      for (let i = 0; i <= n; i++) {
        const a = a0 + ((a1 - a0) * i) / n
        pts.push(new THREE.Vector3(cx + rr * Math.cos(a), cy + rr * Math.sin(a), 0))
      }
    }
    arc(0.75, 1.6, 0.66, -Math.PI / 2 + 0.25, Math.PI / 2, 10)
    arc(-0.75, 1.6, 0.66, Math.PI / 2, Math.PI * 1.5 - 0.25, 10)
    arc(0, -1.6, 0.36, Math.PI - 0.15, Math.PI * 2 + 0.15, 10)
    const curve = new THREE.CatmullRomCurve3(pts, true)
    return { curve, geo: new THREE.TubeGeometry(curve, 200, 0.03, 6, true) }
  }, [])
  const links = useRef([])
  const sp = useMemo(() => ({ small: sprocketGeo(0.33, 12), big: sprocketGeo(0.63, 24) }), [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const speed = ctrl.overlap ? 55 : view === 'chain' ? 110 : 130
    phi.current = (phi.current + dt * speed) % 360
    const p = phi.current
    // aspirazione: picco a 45°, scarico a 315° (gradi camma) → incrocio attorno a 0°
    liftA.current = camLift(p, 45)
    liftB.current = camLift(p, 315)

    if (view === 'dohc' || view === 'single' || view === 'clearance') {
      if (camA.current) camA.current.rotation.z = -(p - 45) * D + (view === 'dohc' ? 0.22 : 0)
      if (camB.current) camB.current.rotation.z = -(p - 315) * D - 0.22
    }
    if (view === 'sohc') {
      if (camA.current) camA.current.rotation.z = -(p - 45) * D + Math.PI
      if (camB.current) camB.current.rotation.z = -(p - 315) * D + Math.PI
      if (r.rockA.current) r.rockA.current.rotation.z = liftA.current * 0.16
      if (r.rockB.current) r.rockB.current.rotation.z = -liftB.current * 0.16
    }
    if (view === 'chain') {
      const crank = (p * 2) * D
      r.crankSp.current.rotation.z = -crank
      r.camSpA.current.rotation.z = -crank / 2
      r.camSpB.current.rotation.z = -crank / 2
      const off = ((crank * 0.36) / (2 * Math.PI * 1)) % 1
      links.current.forEach((l, i) => {
        if (!l) return
        const u = (i / links.current.length + off * 0.35) % 1
        l.position.copy(chain.curve.getPointAt(u))
      })
    }
    if (overlapTag.current) overlapTag.current.style.opacity = ctrl.overlap && liftA.current > 0.03 && liftB.current > 0.03 ? 1 : 0

    Object.entries({ valvola: [m.valvola, m.valvolaAsp, m.valvolaSca], molla: [m.molla], camma: [m.camma], camme: [m.camma], punterie: [m.punteria], bilancieri: [m.bilanciere], sede: [m.sede], catena: [m.chain] }).forEach(([k, arr]) => {
      arr.forEach((mm) => pulseHL(mm, hl.has(k), t))
    })
  })

  const C = (props) => <Callout root={root} {...props} />

  return (
    <group ref={root}>
      {/* ---------- BIALBERO ---------- */}
      {view === 'dohc' && (
        <group position={[0, -1.1, 0]}>
          <RoundedBox args={[2.6, 2.4, 1.3]} radius={0.15} position={[0, 1.15, 0]} material={m.head} />
          <mesh material={m.block} position={[0, -0.5, 0]}>
            <cylinderGeometry args={[0.85, 0.85, 1, 40, 1, true]} />
          </mesh>
          <mesh material={m.dark} position={[0, -0.75, 0]}>
            <cylinderGeometry args={[0.82, 0.82, 0.3, 40]} />
          </mesh>
          <group position={[-0.38, 0, 0]}>
            <ValveAssy m={m} valveMat={m.valvolaAsp} liftRef={liftA} axisTilt={0.22} springGeo={spring} refs={{ valve: r.valveA, bucket: r.bucketA }} />
          </group>
          <group position={[0.38, 0, 0]}>
            <ValveAssy m={m} valveMat={m.valvolaSca} liftRef={liftB} axisTilt={-0.22} springGeo={spring} refs={{ valve: r.valveB, bucket: r.bucketB }} />
          </group>
          <group position={[-0.38 - Math.sin(0.22) * 1.88, Math.cos(0.22) * 1.88, 0]}>
            <Cam m={m} rotRef={camA} refsCam={r.camA} />
            <mesh material={m.camma} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 1.4, 12]} />
            </mesh>
          </group>
          <group position={[0.38 + Math.sin(0.22) * 1.88, Math.cos(0.22) * 1.88, 0]}>
            <Cam m={m} rotRef={camB} refsCam={r.camB} />
            <mesh material={m.camma} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 1.4, 12]} />
            </mesh>
          </group>
          <group position={[0, 2.6, 0]}>
            <Html center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
              <div ref={overlapTag} style={{ opacity: 0, transition: 'opacity .2s', background: '#ff6a1a', color: '#fff', padding: '4px 10px', borderRadius: 999, fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap' }}>
                INCROCIO
              </div>
            </Html>
          </group>
        </group>
      )}
      {view === 'dohc' && (hl.has('camme') || step.highlight.length === 0) && (
        <>
          <C target={r.camA} side={-1} dy={0.3} text="Albero a camme aspirazione" color="#3aa0ff" />
          <C target={r.camB} side={1} dy={0.3} text="Albero a camme scarico" color="#ff4d5e" />
        </>
      )}
      {view === 'dohc' && hl.has('punterie') && (
        <>
          <C target={r.bucketA} side={-1} dy={-0.3} text="Punteria a bicchiere" />
          <C target={r.bucketB} side={1} dy={-0.3} text="Punteria a bicchiere" />
        </>
      )}

      {/* ---------- UNA VALVOLA DA VICINO ---------- */}
      {(view === 'single' || view === 'clearance') && (
        <group position={[0, -1.3, 0]} scale={1.25}>
          <RoundedBox args={[1.6, 1.8, 1]} radius={0.1} position={[0, 0.75, 0]} material={m.head} />
          <ValveAssy m={m} valveMat={m.valvola} liftRef={liftA} springGeo={spring} refs={{ valve: r.valveA, bucket: r.bucketA, sede: r.sedeA }} />
          <group position={[0, 1.88 + (view === 'clearance' ? 0.08 : 0), 0]}>
            <Cam m={m} rotRef={camA} refsCam={r.camA} />
            <mesh material={m.camma} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 1.2, 12]} />
            </mesh>
          </group>
          {view === 'clearance' && (
            <mesh ref={r.gapRef} material={m.gap} position={[0, 1.72, 0]}>
              <boxGeometry args={[0.42, 0.1, 0.3]} />
            </mesh>
          )}
        </group>
      )}
      {view === 'single' && (
        <>
          {hl.has('valvola') && <C target={r.valveA} offset={[0, 0.5, 0]} side={-1} dy={0.2} text="Stelo e piattello" />}
          {hl.has('molla') && <C target={r.bucketA} offset={[0.14, -0.35, 0]} side={1} dy={-0.1} text="Molla" />}
          {hl.has('sede') && <C target={r.sedeA} offset={[0.23, 0, 0]} side={1} dy={-0.2} text="Sede" color="#d8a51a" />}
          {hl.has('camma') && <C target={camA} side={1} dy={0.25} text="Camma" color="#ffb03a" />}
          {hl.has('camma') && <C target={r.bucketA} side={-1} dy={0.1} text="Punteria" />}
        </>
      )}
      {view === 'clearance' && <C target={r.gapRef} side={1} dy={0.2} text="Gioco valvole (ingrandito)" />}

      {/* ---------- MONOALBERO ---------- */}
      {view === 'sohc' && (
        <group position={[0, -1.2, 0]}>
          <RoundedBox args={[2.4, 2.6, 1.3]} radius={0.15} position={[0, 1.2, 0]} material={m.head} />
          <group position={[-0.5, 0, -0.18]}>
            <ValveAssy m={m} valveMat={m.valvolaAsp} liftRef={liftA} springGeo={spring} refs={{ valve: r.valveA }} bucket={false} />
          </group>
          <group position={[0.5, 0, 0.18]}>
            <ValveAssy m={m} valveMat={m.valvolaSca} liftRef={liftB} springGeo={spring} refs={{ valve: r.valveB }} bucket={false} />
          </group>
          {/* albero a camme centrale con due lobi */}
          <group position={[0, 1.45, 0]}>
            <mesh material={m.camma} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 1.4, 12]} />
            </mesh>
            <group position={[0, 0, -0.18]}>
              <Cam m={m} rotRef={camA} refsCam={r.camA} />
            </group>
            <group position={[0, 0, 0.18]}>
              <Cam m={m} rotRef={camB} refsCam={r.camB} />
            </group>
          </group>
          {/* bilancieri: fulcro tra camma e valvola */}
          {[
            [-1, r.rockA, -0.18],
            [1, r.rockB, 0.18],
          ].map(([s, ref, z]) => (
            <group key={s} position={[s * 0.28, 1.68, z]}>
              <mesh material={m.dark} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 0.3, 12]} />
              </mesh>
              <group ref={ref}>
                <RoundedBox args={[0.62, 0.09, 0.14]} radius={0.03} position={[s * 0.06, 0, 0]} material={m.bilanciere} />
                <mesh material={m.bilanciere} position={[s * 0.22, -0.08, 0]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.1, 10]} />
                </mesh>
              </group>
            </group>
          ))}
        </group>
      )}
      {view === 'sohc' && (
        <>
          <C target={r.rockA} offset={[-0.2, 0, 0]} side={-1} dy={0.35} text="Bilanciere" />
          <C target={r.rockB} offset={[0.2, 0, 0]} side={1} dy={0.35} text="Bilanciere" />
          <C target={r.camA} side={1} dy={-0.55} text="Unico albero a camme" color="#ffb03a" />
        </>
      )}

      {/* ---------- CATENA DI DISTRIBUZIONE ---------- */}
      {view === 'chain' && (
        <group scale={0.8}>
          <mesh ref={r.chainRef} geometry={chain.geo} material={m.chain} />
          {Array.from({ length: 36 }).map((_, i) => (
            <mesh key={i} ref={(el) => (links.current[i] = el)} material={m.dark}>
              <boxGeometry args={[0.07, 0.07, 0.09]} />
            </mesh>
          ))}
          <group position={[0, -1.6, 0]}>
            <group ref={r.crankSp}>
              <mesh geometry={sp.small} material={m.punteria} />
              <mesh material={m.mark} position={[0, 0.24, 0.05]}>
                <boxGeometry args={[0.06, 0.12, 0.02]} />
              </mesh>
            </group>
          </group>
          {[
            [-0.75, r.camSpA],
            [0.75, r.camSpB],
          ].map(([x, ref]) => (
            <group key={x} position={[x, 1.6, 0]}>
              <group ref={ref}>
                <mesh geometry={sp.big} material={m.camma} />
                <mesh material={m.mark} position={[0, 0.5, 0.05]}>
                  <boxGeometry args={[0.07, 0.16, 0.02]} />
                </mesh>
              </group>
            </group>
          ))}
          {/* tenditore */}
          <RoundedBox args={[0.12, 1.6, 0.14]} radius={0.05} position={[-1.12, 0.1, 0]} rotation={[0, 0, -0.12]} material={m.dark} />
        </group>
      )}
      {view === 'chain' && (
        <>
          <C target={r.crankSp} side={1} dy={-0.2} text="Albero motore (12 denti)" />
          <C target={r.camSpB} side={1} dy={0.45} text="Albero a camme (24 denti)" color="#ffb03a" />
          <C target={r.chainRef} offset={[-0.95, 0.1, 0]} side={-1} dy={0} text="Catena e tenditore" />
        </>
      )}

      {/* ---------- 2 O 4 VALVOLE ---------- */}
      {view === 'four' && <Chamber m={m} valves={valvesCtl} liftA={liftA} liftB={liftB} />}
    </group>
  )
}

function Chamber({ m, valves, liftA, liftB }) {
  const refs = useRef([])
  useFrame(() => {
    refs.current.forEach((g, i) => {
      if (!g) return
      const l = (g.userData.intake ? liftA.current : liftB.current) * 0.25
      g.position.z = l
    })
  })
  const list =
    valves === 2
      ? [
          { x: -0.5, y: 0, r: 0.46, intake: true },
          { x: 0.5, y: 0, r: 0.4, intake: false },
        ]
      : [
          { x: -0.5, y: 0.43, r: 0.34, intake: true },
          { x: -0.5, y: -0.43, r: 0.34, intake: true },
          { x: 0.52, y: 0.4, r: 0.3, intake: false },
          { x: 0.52, y: -0.4, r: 0.3, intake: false },
        ]
  const plug = valves === 2 ? [0, 0.72] : [0, 0]
  return (
    <group rotation={[-0.35, 0.25, 0]} position={[0, 0.1, 0]}>
      <mesh material={m.dark} position={[0, 0, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.35, 1.35, 0.08, 64]} />
      </mesh>
      <mesh position={[0, 0, -0.005]}>
        <circleGeometry args={[1.25, 64]} />
        <meshStandardMaterial color="#20242c" metalness={0.5} roughness={0.5} />
      </mesh>
      {list.map((v, i) => (
        <group key={valves + '-' + i} ref={(el) => {
          refs.current[i] = el
          if (el) el.userData.intake = v.intake
        }} position={[v.x, v.y, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={v.intake ? m.valvolaAsp : m.valvolaSca}>
            <cylinderGeometry args={[v.r, v.r, 0.05, 40]} />
          </mesh>
        </group>
      ))}
      <mesh position={[plug[0], plug[1], 0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.06, 20]} />
        <meshStandardMaterial color="#f4f6fb" emissive="#ffb03a" emissiveIntensity={0.4} />
      </mesh>
      <Html position={[0, -1.6, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{ display: 'flex', gap: 10, fontSize: 11.5, fontWeight: 700, color: '#eef1f6', whiteSpace: 'nowrap', background: 'rgba(14,17,24,.78)', padding: '4px 10px', borderRadius: 8 }}>
          <span style={{ color: '#5fb4ff' }}>● aspirazione</span>
          <span style={{ color: '#ff7b88' }}>● scarico</span>
          <span style={{ color: '#ffd59a' }}>● candela</span>
        </div>
      </Html>
    </group>
  )
}
