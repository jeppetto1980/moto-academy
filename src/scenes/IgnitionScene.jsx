// Capitolo 5: accensione. Viste: circuit, plug, plugs3.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import Callout from '../components/Callout'
import { glass, mat, PathFlow, Pipe, pulseHL } from './parts'

function Label({ text, color = '#eef1f6' }) {
  return (
    <Html center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div style={{ background: 'rgba(14,17,24,.8)', color, padding: '3px 10px', borderRadius: 8, fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap' }}>{text}</div>
    </Html>
  )
}

// Candela: origine sulla punta degli elettrodi, asse verso l'alto
function Plug({ tip = '#c9ced8', sparkRef, refs = {}, soot, deposit = false }) {
  const m = useMemo(
    () => ({
      ceramic: mat('#f4f6fb', { metalness: 0.05, roughness: 0.35 }),
      steel: mat('#c4c9d2', { metalness: 0.9, roughness: 0.25 }),
      nickel: mat('#9aa3b2', { metalness: 0.9, roughness: 0.3 }),
      tipM: mat(tip, { metalness: soot ? 0 : 0.3, roughness: soot ? 1 : 0.5 }),
    }),
    [tip, soot]
  )
  return (
    <group>
      {/* elettrodo centrale */}
      <mesh ref={refs.centrale} material={deposit ? m.tipM : m.nickel} position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.14, 10]} />
      </mesh>
      {/* punta dell'isolante (colore = stato della combustione) */}
      <mesh material={m.tipM} position={[0, deposit ? 0.22 : 0.27, 0]}>
        <cylinderGeometry args={[0.05, 0.12, deposit ? 0.16 : 0.2, 18]} />
      </mesh>
      {deposit && (
        <mesh material={m.tipM} position={[0, 0.285, 0]}>
          <cylinderGeometry args={[0.145, 0.145, 0.02, 24]} />
        </mesh>
      )}
      {/* corpo filettato */}
      <group ref={refs.filetto} position={[0, 0.5, 0]}>
        <mesh material={m.steel}>
          <cylinderGeometry args={[0.15, 0.15, 0.42, 24]} />
        </mesh>
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh key={i} material={m.steel} position={[0, -0.19 + i * 0.047, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.152, 0.012, 6, 24]} />
          </mesh>
        ))}
      </group>
      {/* elettrodo di massa a uncino */}
      <group ref={refs.massa}>
        <mesh material={deposit ? m.tipM : m.nickel} position={[0.12, 0.22, 0]}>
          <boxGeometry args={[0.05, 0.16, 0.06]} />
        </mesh>
        <mesh material={deposit ? m.tipM : m.nickel} position={[0.06, 0.035, 0]}>
          <boxGeometry args={[0.17, 0.04, 0.06]} />
        </mesh>
      </group>
      {/* esagono e isolante in ceramica con nervature */}
      <mesh material={m.steel} position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.22, 6]} />
      </mesh>
      <group ref={refs.isolante} position={[0, 1.25, 0]}>
        <mesh material={m.ceramic}>
          <cylinderGeometry args={[0.1, 0.13, 0.66, 24]} />
        </mesh>
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh key={i} material={m.ceramic} position={[0, -0.05 + i * 0.09, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.11, 0.018, 6, 24]} />
          </mesh>
        ))}
      </group>
      <mesh material={m.steel} position={[0, 1.65, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.16, 12]} />
      </mesh>
      {sparkRef && (
        <mesh ref={sparkRef} position={[0, 0.03, 0]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial color="#cfe6ff" />
        </mesh>
      )}
    </group>
  )
}

export default function IgnitionScene({ step }) {
  const view = step.view
  const hl = useMemo(() => new Set(step.highlight || []), [step])
  const root = useRef()
  const fly = useRef()
  const spark = useRef()
  const spark2 = useRef()
  const flash = useRef()
  const htVis = useRef(0)
  const m = useMemo(
    () => ({
      batteria: mat('#2b2f38', { metalness: 0.2, roughness: 0.6 }),
      plus: mat('#ff4d5e'),
      minus: mat('#111'),
      centralina: mat('#2fd47a', { metalness: 0.2, roughness: 0.6 }),
      bobina: mat('#1c1f26'),
      rame: mat('#d0813c', { metalness: 0.9, roughness: 0.3 }),
      volano: mat('#8d96a6', { metalness: 0.8 }),
      magnete: mat('#3aa0ff', { metalness: 0.3 }),
      pickup: mat('#ffb03a', { metalness: 0.3 }),
      motorino: mat('#5b6474', { metalness: 0.7 }),
      wireRed: mat('#ff4d5e', { metalness: 0.1, roughness: 0.7 }),
      wireBlack: mat('#15171c', { metalness: 0.1, roughness: 0.6 }),
      wireYellow: mat('#ffd23a', { metalness: 0.1, roughness: 0.7 }),
      head: glass('#c0c8d6', 0.12),
    }),
    []
  )
  const refs = { batteria: useRef(), volano: useRef(), bobina: useRef(), cavo: useRef(), pickup: useRef(), centralina: useRef(), motorino: useRef() }
  const plugRefs = { centrale: useRef(), massa: useRef(), isolante: useRef(), filetto: useRef() }

  const W = useMemo(
    () => ({
      bat2ecu: [[-2.05, -0.2, 0], [-1.6, 0.5, 0.1], [-1.0, 0.9, 0]],
      ecu2coil: [[-0.2, 0.95, 0], [0.3, 1.1, 0.1], [0.65, 0.95, 0]],
      ht: [[1.2, 0.95, 0], [1.75, 1.15, 0.1], [2.15, 0.85, 0], [2.15, 0.55, 0]],
      pick2ecu: [[0.15, -0.95, 0], [0.2, -0.2, 0.15], [-0.5, 0.65, 0]],
      bat2start: [[-2.4, -0.95, 0], [-2.5, -1.4, 0.1], [-2.1, -1.65, 0]],
      alt2bat: [[-1.0, -1.25, 0.2], [-1.6, -1.0, 0.25], [-2.0, -0.95, 0]],
    }),
    []
  )

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (view === 'circuit') {
      fly.current.rotation.z -= dt * 3.2
      const a = ((-fly.current.rotation.z % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      // il dentino passa davanti al pick-up → scintilla
      const fire = a > 0.55 && a < 0.8
      spark.current.visible = fire
      flash.current.intensity = fire ? 5 : Math.max(0, flash.current.intensity - dt * 20)
      htVis.current = fire ? 1 : 0
    }
    if (view === 'plug' && spark2.current) spark2.current.visible = Math.sin(t * 6) > 0.85
    Object.entries({ batteria: m.batteria, volano: m.volano, bobina: m.bobina, cavo: m.wireBlack, pickup: m.pickup, centralina: m.centralina, motorino: m.motorino }).forEach(([k, mm]) => pulseHL(mm, hl.has(k), t))
  })

  const C = (p) => <Callout root={root} maxEdge={2.3} {...p} />

  return (
    <group ref={root}>
      {view === 'circuit' && (
        <group scale={0.78} position={[0.05, 0.1, 0]}>
          {/* batteria */}
          <group ref={refs.batteria} position={[-2.2, -0.55, 0]}>
            <RoundedBox args={[0.8, 0.6, 0.5]} radius={0.05} material={m.batteria} />
            <mesh material={m.plus} position={[-0.2, 0.36, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.12, 12]} />
            </mesh>
            <mesh material={m.minus} position={[0.2, 0.36, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.12, 12]} />
            </mesh>
            <group position={[0, 0, 0.27]}>
              <Label text="12 V" />
            </group>
          </group>
          {/* centralina */}
          <RoundedBox ref={refs.centralina} args={[0.9, 0.5, 0.2]} radius={0.04} position={[-0.6, 0.95, 0]} material={m.centralina} />
          {/* bobina con avvolgimenti */}
          <group ref={refs.bobina} position={[0.92, 0.95, 0]} rotation={[0, 0, Math.PI / 2]}>
            <mesh material={m.bobina}>
              <cylinderGeometry args={[0.2, 0.2, 0.62, 20]} />
            </mesh>
            {Array.from({ length: 10 }).map((_, i) => (
              <mesh key={i} material={m.rame} position={[0, -0.26 + i * 0.058, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.21, i < 3 ? 0.028 : 0.014, 6, 24]} />
              </mesh>
            ))}
          </group>
          {/* testata con candela */}
          <RoundedBox args={[1.1, 0.8, 0.8]} radius={0.08} position={[2.15, -0.2, 0]} material={m.head} />
          <group position={[2.15, -0.35, 0]} scale={0.5}>
            <Plug sparkRef={spark} />
          </group>
          <pointLight ref={flash} position={[2.15, -0.5, 0.4]} color="#9fd0ff" intensity={0} distance={2.5} />
          {/* volano con magneti e dentino + pick-up */}
          <group position={[-0.6, -1.3, 0]}>
            <group ref={fly}>
              <mesh ref={refs.volano} material={m.volano} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.62, 0.62, 0.18, 40]} />
              </mesh>
              {Array.from({ length: 8 }).map((_, i) => {
                const a = (i / 8) * Math.PI * 2
                return (
                  <mesh key={i} material={m.magnete} position={[Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0.1]} rotation={[0, 0, a]}>
                    <boxGeometry args={[0.12, 0.18, 0.04]} />
                  </mesh>
                )
              })}
              <mesh material={m.pickup} position={[0.66, 0, 0]}>
                <boxGeometry args={[0.1, 0.12, 0.18]} />
              </mesh>
            </group>
          </group>
          <mesh ref={refs.pickup} material={m.pickup} position={[0.12, -1.0, 0]} rotation={[0, 0, -0.6]}>
            <boxGeometry args={[0.14, 0.22, 0.16]} />
          </mesh>
          {/* motorino d'avviamento */}
          <group ref={refs.motorino} position={[-1.75, -1.7, 0]} rotation={[0, 0, Math.PI / 2]}>
            <mesh material={m.motorino}>
              <cylinderGeometry args={[0.17, 0.17, 0.55, 20]} />
            </mesh>
          </group>
          {/* cavi */}
          <Pipe points={W.bat2ecu} r={0.022} material={m.wireRed} />
          <Pipe points={W.ecu2coil} r={0.022} material={m.wireRed} />
          <group ref={refs.cavo}>
            <Pipe points={W.ht} r={0.045} material={m.wireBlack} />
          </group>
          <Pipe points={W.pick2ecu} r={0.016} material={m.wireYellow} />
          <Pipe points={W.bat2start} r={0.035} material={m.wireRed} />
          <Pipe points={W.alt2bat} r={0.02} material={m.wireYellow} />
          {/* impulsi elettrici */}
          <PathFlow points={W.bat2ecu} count={6} size={0.04} color="#ffe28a" speed={0.6} />
          <PathFlow points={W.ecu2coil} count={5} size={0.04} color="#ffe28a" speed={0.7} />
          <PathFlow points={W.ht} count={8} size={0.06} color="#cfe6ff" speed={2.2} visibleRef={htVis} />
          <PathFlow points={W.pick2ecu} count={5} size={0.035} color="#ffd23a" speed={0.6} />
          <PathFlow points={W.alt2bat} count={5} size={0.035} color="#7cc4ff" speed={0.5} />
        </group>
      )}
      {view === 'circuit' && (
        <>
          {hl.has('batteria') && <C target={refs.batteria} side={-1} dy={0.75} text="Batteria" />}
          {hl.has('volano') && <C target={refs.volano} offset={[-0.5, 0, 0]} side={-1} dy={-0.35} text="Volano (alternatore)" color="#3aa0ff" />}
          {hl.has('bobina') && <C target={refs.bobina} side={1} dy={0.55} text="Bobina" color="#d0813c" />}
          {hl.has('cavo') && <C target={refs.cavo} offset={[1.75, 1.15, 0]} side={1} dy={0.35} text="Cavo candela (alta tensione)" />}
          {hl.has('pickup') && <C target={refs.pickup} side={1} dy={-0.5} text="Pick-up" color="#ffb03a" />}
          {hl.has('centralina') && <C target={refs.centralina} side={-1} dy={0.5} text="Centralina" color="#2fd47a" />}
          {hl.has('motorino') && <C target={refs.motorino} side={-1} dy={-0.3} text="Motorino d’avviamento" />}
        </>
      )}

      {view === 'plug' && (
        <group position={[0, -1.6, 0]} scale={1.75}>
          <Plug sparkRef={spark2} refs={plugRefs} />
        </group>
      )}
      {view === 'plug' && (
        <>
          <C target={plugRefs.centrale} side={-1} dy={-0.1} text="Elettrodo centrale" />
          <C target={plugRefs.massa} offset={[0.06, 0, 0]} side={1} dy={-0.25} text="Elettrodo di massa" />
          <C target={plugRefs.isolante} side={-1} dy={0.2} text="Isolante in ceramica" />
          <C target={plugRefs.filetto} offset={[0.15, 0, 0]} side={1} dy={0.2} text="Filettatura" />
        </>
      )}

      {view === 'plugs3' && (
        <group position={[0, -1.1, 0]}>
          {[
            ['#c8a27a', 'Nocciola: OK', '#2fd47a', false],
            ['#141414', 'Nera: grassa', '#ff8f9a', true],
            ['#f2f2ee', 'Bianca: magra', '#9fd0ff', false],
          ].map(([c, text, col, soot], i) => (
            <group key={i} position={[(i - 1) * 1.2, 0.2, 0]} scale={1.15} rotation={[0.45, 0, 0]}>
              <Plug tip={c} soot={soot} deposit />
              <group position={[0, -0.25, 0]}>
                <Label text={text} color={col} />
              </group>
            </group>
          ))}
        </group>
      )}
    </group>
  )
}
