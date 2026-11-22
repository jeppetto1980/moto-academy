// Capitolo 6: olio e raffreddamento. Viste: heat, air, liquid, oil.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import Callout from '../components/Callout'
import { glass, mat, PathFlow, Pipe, pulseHL } from './parts'

const COLD = new THREE.Color('#3aa0ff')
const HOT = new THREE.Color('#ff3b2f')

export default function CoolingScene({ step, ctrl }) {
  const view = step.view
  const hl = useMemo(() => new Set(step.highlight || []), [step])
  const root = useRef()
  const temp = ctrl.temp ?? 90
  const open = temp >= 82
  const fanOn = ctrl.fan || temp >= 100
  const m = useMemo(
    () => ({
      block: glass('#c0c8d6', 0.14),
      cyl: mat('#8d96a6'),
      piston: mat('#c9ced8'),
      alette: mat('#9aa3b2', { metalness: 0.85 }),
      jacket: new THREE.MeshStandardMaterial({ color: '#3aa0ff', transparent: true, opacity: 0.35, depthWrite: false }),
      radiatore: mat('#2b2f38'),
      fin: mat('#7d8594', { metalness: 0.8 }),
      hose: mat('#1c1f26', { metalness: 0.1, roughness: 0.8 }),
      pompa: mat('#3aa0ff', { metalness: 0.4 }),
      termostato: mat('#ffb03a', { metalness: 0.5 }),
      ventola: mat('#3a414f'),
      vaso: glass('#e9ebef', 0.35),
      oil: new THREE.MeshStandardMaterial({ color: '#c98a1a', transparent: true, opacity: 0.85, roughness: 0.2, metalness: 0.1 }),
      coppa: glass('#c98a1a', 0.18),
      pompaOlio: mat('#ff6a1a', { metalness: 0.4 }),
      filtro: mat('#2a4fd0', { metalness: 0.4 }),
      crank: mat('#6f7888'),
    }),
    []
  )
  const refs = { alette: useRef(), pompa: useRef(), radiatore: useRef(), camicie: useRef(), termostato: useRef(), ventola: useRef(), vaso: useRef(), coppa: useRef(), pompaOlio: useRef(), filtro: useRef() }
  const fan = useRef()
  const piston = useRef()
  const crank = useRef()
  const heatGlow = useRef()

  // percorsi del liquido
  const P = useMemo(
    () => ({
      full: [
        [-1.25, -0.9, 0.4],
        [-1.75, -0.2, 0.45],
        [-1.75, 0.7, 0.45],
        [-1.0, 1.2, 0.3],
        [0.2, 1.35, 0.2],
        [1.3, 1.2, 0.1],
        [1.45, 0.4, 0.1],
        [1.45, -0.5, 0.1],
        [1.3, -1.2, 0.1],
        [0.2, -1.35, 0.3],
      ],
      bypass: [
        [-1.25, -0.9, 0.4],
        [-1.75, -0.2, 0.45],
        [-1.75, 0.7, 0.45],
        [-1.0, 1.2, 0.3],
        [-0.55, 0.6, 0.35],
        [-0.55, -0.6, 0.35],
      ],
      oil: [
        [0.0, -1.55, 0.2],
        [0.75, -1.35, 0.3],
        [1.05, -0.7, 0.3],
        [1.05, 0.5, 0.3],
        [0.7, 1.45, 0.3],
        [0.0, 1.5, 0.3],
        [-0.35, 0.6, 0.3],
        [-0.3, -0.5, 0.3],
        [-0.2, -1.3, 0.2],
      ],
      heat: [
        [0, 0.9, 0],
        [0.2, 1.6, 0],
        [-0.1, 2.3, 0],
      ],
    }),
    []
  )
  const tNorm = Math.min(Math.max((temp - 30) / 80, 0), 1)
  const coolantColor = useMemo(
    () => (t, c) => {
      // caldo appena uscito dal motore, si raffredda nel radiatore
      if (!open) return c.copy(COLD).lerp(HOT, tNorm)
      const k = t < 0.45 ? 1 : t < 0.8 ? 1 - (t - 0.45) / 0.35 : 0
      return c.copy(COLD).lerp(HOT, Math.max(0.15, k))
    },
    [open, tNorm]
  )
  const heatColor = useMemo(() => (t, c) => c.set('#ff6a1a').lerp(new THREE.Color('#1a1d24'), t), [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (fan.current && fanOn) fan.current.rotation.z += dt * 14
    if (piston.current) piston.current.position.y = (view === 'oil' ? 0.78 : 0.25) + Math.cos(t * 4) * (view === 'oil' ? 0.22 : 0.28)
    if (crank.current) crank.current.rotation.z = -t * 4
    if (heatGlow.current) heatGlow.current.emissiveIntensity = 0.5 + 0.35 * Math.sin(t * 3)
    Object.entries({ alette: m.alette, pompa: m.pompa, radiatore: m.radiatore, termostato: m.termostato, ventola: m.ventola, pompaOlio: m.pompaOlio, filtro: m.filtro }).forEach(([k, mm]) => pulseHL(mm, hl.has(k), t))
    m.jacket.opacity = hl.has('camicie') ? 0.4 + 0.2 * Math.sin(t * 5) : 0.3
  })

  const C = (p) => <Callout root={root} maxEdge={2.3} {...p} />

  const Engine = ({ x = 0, finned = false, glow = false }) => (
    <group position={[x, 0, 0]}>
      {finned ? (
        <group ref={refs.alette}>
          <mesh material={m.cyl} position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.55, 0.55, 1.5, 32]} />
          </mesh>
          {Array.from({ length: 11 }).map((_, i) => (
            <mesh key={i} material={m.alette} position={[0, -0.32 + i * 0.13, 0]}>
              <boxGeometry args={[1.7, 0.035, 1.5]} />
            </mesh>
          ))}
        </group>
      ) : (
        <RoundedBox args={[1.5, 2.0, 1.3]} radius={0.12} position={[0, 0.3, 0]} material={m.block} />
      )}
      {!finned && (
        <mesh ref={refs.camicie} material={m.jacket} position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.66, 0.66, 1.5, 32, 1, true]} />
        </mesh>
      )}
      {!finned && (
        <mesh material={glass('#9fc4ff', 0.15)} position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 1.5, 32, 1, true]} />
        </mesh>
      )}
      <mesh ref={piston} material={m.piston} position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.48, 0.48, 0.35, 32]} />
      </mesh>
      {glow && (
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.47, 0.47, 0.4, 32]} />
          <meshStandardMaterial ref={heatGlow} color="#ff5a1a" emissive="#ff4a10" emissiveIntensity={0.7} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  )

  return (
    <group ref={root}>
      {view === 'heat' && (
        <group position={[0, -0.6, 0]}>
          <Engine glow />
          <PathFlow points={P.heat} count={30} size={0.07} speed={0.4} colorFn={heatColor} jitter={0.7} />
          <Html position={[0, -1.25, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{ width: 220, fontSize: 11.5, fontWeight: 700, color: '#eef1f6', background: 'rgba(14,17,24,.8)', padding: 8, borderRadius: 10 }}>
              <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ width: '33%', background: '#2fd47a' }} />
                <div style={{ width: '67%', background: 'linear-gradient(90deg,#ff6a1a,#ff3b2f)' }} />
              </div>
              <span style={{ color: '#2fd47a' }}>≈⅓ movimento</span> · <span style={{ color: '#ff8a5a' }}>≈⅔ calore</span>
            </div>
          </Html>
        </group>
      )}

      {view === 'air' && (
        <group position={[0, -0.4, 0]}>
          <Engine finned glow />
          <PathFlow
            points={[[-2.2, 0.4, 0.2], [0, 0.45, 0.2], [2.2, 0.6, 0.2]]}
            count={40}
            size={0.05}
            speed={0.35}
            jitter={1.1}
            colorFn={(t, c) => c.copy(COLD).lerp(HOT, Math.min(1, Math.max(0, (t - 0.35) * 2.5)))}
          />
        </group>
      )}
      {view === 'air' && <C target={refs.alette} offset={[0.85, 0.3, 0]} side={1} dy={0.6} text="Alette di raffreddamento" />}

      {view === 'liquid' && (
        <group position={[-0.05, -0.1, 0]} scale={0.82}>
          <Engine x={-1.0} />
          {/* radiatore */}
          <group ref={refs.radiatore} position={[1.5, 0, 0]}>
            <RoundedBox args={[0.3, 2.4, 1.4]} radius={0.04} material={m.radiatore} />
            {Array.from({ length: 16 }).map((_, i) => (
              <mesh key={i} material={m.fin} position={[0.16, -1.05 + i * 0.14, 0]}>
                <boxGeometry args={[0.02, 0.03, 1.3]} />
              </mesh>
            ))}
          </group>
          {/* ventola dietro il radiatore */}
          <group ref={refs.ventola} position={[1.85, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <group ref={fan}>
              {Array.from({ length: 6 }).map((_, i) => (
                <mesh key={i} material={m.ventola} rotation={[0, 0, (i * Math.PI) / 3]} position={[0, 0, 0]}>
                  <boxGeometry args={[0.16, 1.0, 0.03]} />
                </mesh>
              ))}
            </group>
            <mesh material={m.ventola}>
              <torusGeometry args={[0.55, 0.03, 6, 32]} />
            </mesh>
          </group>
          {/* manicotti */}
          <Pipe points={[[-1.0, 1.25, 0.2], [0.2, 1.4, 0.15], [1.4, 1.1, 0.05]]} r={0.07} material={m.hose} />
          <Pipe points={[[1.4, -1.1, 0.05], [0.2, -1.4, 0.2], [-1.2, -0.95, 0.35]]} r={0.07} material={m.hose} />
          {/* pompa e termostato */}
          <mesh ref={refs.pompa} material={m.pompa} position={[-1.25, -0.9, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.2, 20]} />
          </mesh>
          <mesh ref={refs.termostato} material={m.termostato} position={[-0.75, 1.3, 0.2]}>
            <cylinderGeometry args={[0.13, 0.13, 0.22, 16]} />
          </mesh>
          {/* vaso di espansione */}
          <group ref={refs.vaso} position={[0.55, 1.95, 0]}>
            <RoundedBox args={[0.45, 0.5, 0.3]} radius={0.06} material={m.vaso} />
            <mesh position={[0, -0.08, 0]}>
              <boxGeometry args={[0.4, 0.25, 0.25]} />
              <meshStandardMaterial color="#2fd47a" transparent opacity={0.6} />
            </mesh>
          </group>
          <Pipe points={[[0.55, 1.68, 0], [0.75, 1.45, 0.05], [1.35, 1.2, 0.05]]} r={0.02} material={m.hose} />
          <PathFlow key={open ? 'full' : 'bypass'} points={open ? P.full : P.bypass} closed count={open ? 46 : 24} size={0.05} speed={0.16} colorFn={coolantColor} jitter={0.04} />
          <Html position={[0.3, -1.85, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{ fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', background: 'rgba(14,17,24,.8)', padding: '4px 10px', borderRadius: 8, color: temp >= 100 ? '#ff8f9a' : temp >= 82 ? '#ffd28a' : '#9fd0ff' }}>
              🌡️ {Math.round(temp)} °C · termostato {open ? 'aperto' : 'chiuso'}
              {fanOn ? ' · ventola ON' : ''}
            </div>
          </Html>
        </group>
      )}
      {view === 'liquid' && (
        <>
          {hl.has('pompa') && <C target={refs.pompa} side={-1} dy={-0.4} text="Pompa dell’acqua" color="#3aa0ff" />}
          {hl.has('radiatore') && <C target={refs.radiatore} offset={[0.15, -0.6, 0]} side={1} dy={-0.3} text="Radiatore" />}
          {hl.has('camicie') && <C target={refs.camicie} offset={[-0.66, 0.2, 0]} side={-1} dy={0.4} text="Camicie d’acqua" color="#3aa0ff" />}
          {hl.has('termostato') && <C target={refs.termostato} side={-1} dy={0.5} text="Termostato" color="#ffb03a" />}
          {hl.has('ventola') && <C target={refs.ventola} side={1} dy={0.9} text="Ventola" />}
          {hl.has('vaso') && <C target={refs.vaso} side={-1} dy={0.25} text="Vaso di espansione (MIN–MAX)" color="#2fd47a" />}
        </>
      )}

      {view === 'oil' && (
        <group position={[0, -0.1, 0]}>
          <RoundedBox args={[1.6, 3.0, 1.2]} radius={0.15} position={[0, 0, 0]} material={m.block} />
          <mesh material={glass('#9fc4ff', 0.15)} position={[0, 0.75, 0]}>
            <cylinderGeometry args={[0.45, 0.45, 1.2, 32, 1, true]} />
          </mesh>
          <mesh ref={piston} material={m.piston} position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.43, 0.43, 0.3, 32]} />
          </mesh>
          <group ref={crank} position={[0, -0.55, 0]}>
            <mesh material={m.crank}>
              <boxGeometry args={[0.25, 0.8, 0.15]} />
            </mesh>
          </group>
          {/* coppa con olio */}
          <group ref={refs.coppa} position={[0, -1.35, 0]}>
            <mesh material={m.oil} position={[0, -0.12, 0]}>
              <boxGeometry args={[1.45, 0.3, 1.05]} />
            </mesh>
          </group>
          <mesh ref={refs.pompaOlio} material={m.pompaOlio} position={[0.55, -1.3, 0.3]}>
            <cylinderGeometry args={[0.13, 0.13, 0.2, 16]} />
          </mesh>
          <mesh ref={refs.filtro} material={m.filtro} position={[1.0, -0.65, 0.3]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.18, 0.18, 0.3, 20]} />
          </mesh>
          <PathFlow points={P.oil} count={40} size={0.045} color="#ffb84a" speed={0.18} jitter={0.04} />
        </group>
      )}
      {view === 'oil' && (
        <>
          {hl.has('coppa') && <C target={refs.coppa} side={-1} dy={-0.3} text="Coppa dell’olio" color="#c98a1a" />}
          {hl.has('pompaOlio') && <C target={refs.pompaOlio} side={1} dy={-0.5} text="Pompa dell’olio" />}
          {hl.has('filtro') && <C target={refs.filtro} side={1} dy={0.3} text="Filtro olio" color="#2a4fd0" />}
        </>
      )}
    </group>
  )
}
