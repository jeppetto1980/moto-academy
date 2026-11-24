// Capitolo 6: olio e raffreddamento. Viste: heat, air, liquid, oil.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import Callout from '../components/Callout'
import { glass, mat, PathFlow, Pipe, pulseHL } from './parts'
import { useMech, HalfLathe, SectionBlock, pistonGeo, ringGeo, lathe, rect, diff, union, circle, strip, gearGeo, crankWebGeo, conRodGeo, extrude } from './mech'

// texture del pacco radiante: tubi verticali e alette fitte
let coreTex
function radiatorTex() {
  if (coreTex) return coreTex
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const g = c.getContext('2d')
  g.fillStyle = '#1d2026'
  g.fillRect(0, 0, 256, 256)
  for (let y = 0; y < 256; y += 4) {
    g.fillStyle = y % 8 ? '#7f868f' : '#a7adb5'
    g.fillRect(0, y, 256, 2)
  }
  for (let x = 0; x < 256; x += 21) {
    g.fillStyle = '#2b2f36'
    g.fillRect(x, 0, 6, 256)
  }
  coreTex = new THREE.CanvasTexture(c)
  coreTex.wrapS = coreTex.wrapT = THREE.RepeatWrapping
  coreTex.repeat.set(2, 4)
  coreTex.colorSpace = THREE.SRGBColorSpace
  return coreTex
}

const COLD = new THREE.Color('#3aa0ff')
const HOT = new THREE.Color('#ff3b2f')

export default function CoolingScene({ step, ctrl }) {
  const view = step.view
  const hl = useMemo(() => new Set(step.highlight || []), [step])
  const root = useRef()
  const temp = ctrl.temp ?? 90
  const open = temp >= 82
  const fanOn = ctrl.fan || temp >= 100
  const M = useMech()
  const m = useMemo(
    () => ({
      M,
      block: glass('#c0c8d6', 0.14),
      cyl: mat('#8d96a6'),
      piston: mat('#c9ced8'),
      alette: M.alu.clone(),
      jacket: new THREE.MeshStandardMaterial({ color: '#3aa0ff', transparent: true, opacity: 0.35, depthWrite: false }),
      radiatore: new THREE.MeshStandardMaterial({ map: radiatorTex(), bumpMap: radiatorTex(), bumpScale: 2, metalness: 0.6, roughness: 0.45 }),
      tank: mat('#2a2e35', { metalness: 0.6, roughness: 0.4 }),
      fin: mat('#7d8594', { metalness: 0.8 }),
      hose: mat('#1c1f26', { metalness: 0.1, roughness: 0.8 }),
      pompa: M.alu.clone(),
      termostato: M.brass.clone(),
      ventola: mat('#2a2d33', { metalness: 0.1, roughness: 0.55 }),
      vaso: glass('#e9ebef', 0.35),
      oil: new THREE.MeshStandardMaterial({ color: '#c98a1a', transparent: true, opacity: 0.85, roughness: 0.2, metalness: 0.1 }),
      coppa: glass('#c98a1a', 0.18),
      pompaOlio: mat('#ff6a1a', { metalness: 0.4 }),
      filtro: new THREE.MeshPhysicalMaterial({ color: '#2a4fd0', metalness: 0.5, roughness: 0.3, clearcoat: 1 }),
      crank: M.steel.clone(),
      coolantSec: new THREE.MeshStandardMaterial({ color: '#2f8fff', transparent: true, opacity: 0.85, roughness: 0.15 }),
    }),
    [M]
  )
  const G = useMemo(() => {
    // cilindro alettato (aria)
    const fins = [[0.5, -0.4], [0.62, -0.4]]
    for (let i = 0; i < 10; i++) {
      const y = -0.33 + i * 0.14
      fins.push([0.62, y], [0.92 - Math.abs(i - 5) * 0.012, y + 0.015], [0.92 - Math.abs(i - 5) * 0.012, y + 0.055], [0.62, y + 0.07])
    }
    fins.push([0.62, 1.1], [0.5, 1.1])
    // blocco a liquido: canna interna, camicia d'acqua, parete esterna
    const liner = [[0.5, -0.45], [0.58, -0.45], [0.58, 1.12], [0.5, 1.12]]
    const jacket = [[0.58, -0.3], [0.74, -0.3], [0.74, 1.05], [0.58, 1.05]]
    const wall = [[0.58, -0.45], [0.84, -0.45], [0.84, 1.12], [0.74, 1.12], [0.74, -0.3], [0.58, -0.3]]
    const wallTop = [[0.58, 1.05], [0.74, 1.05], [0.74, 1.12], [0.58, 1.12]]
    const headL = diff(rect(-0.9, 1.12, 0.9, 1.6), rect(-0.5, 1.0, 0.5, 1.22), rect(-0.68, 1.3, -0.4, 1.45), rect(0.4, 1.3, 0.68, 1.45))
    // ventola: pale svergolate estruse
    const blade = extrude([[[0.08, -0.05], [0.5, -0.12], [0.56, 0.0], [0.5, 0.12], [0.08, 0.06]]], 0.02, 0.005, -0.01)
    // blocco motore per il circuito dell'olio
    const crankcase = diff(union(rect(-0.85, -1.15, 0.85, 1.5), circle(0, -0.55, 0.85, 48)), union(rect(-0.47, 0.1, 0.47, 1.55), circle(0, -0.55, 0.62, 48)), rect(-0.72, -1.7, 0.72, -1.15))
    return {
      fins, liner, jacket, wall, wallTop, headL, blade, crankcase,
      piston: pistonGeo(0.49, 0.4),
      pistonO: pistonGeo(0.44, 0.36),
      ring: ringGeo(0.49, 0.025),
      web: crankWebGeo(0.25, 0.08, 0.1, 0.07),
      rod: conRodGeo(0.85, 0.07, 0.05, 0.08),
      pumpGearA: gearGeo(0.12, 9, 0.12, { toothH: 0.04, hole: 0.025, windows: 0 }),
      volute: lathe([[0.05, -0.12], [0.24, -0.12], [0.26, -0.08], [0.26, 0.08], [0.22, 0.12], [0.05, 0.12]], 40),
      filterCan: lathe([[0, -0.2], [0.17, -0.2], [0.19, -0.17], [0.19, 0.17], [0.17, 0.2], [0.05, 0.2], [0.05, 0.22], [0, 0.22]], 40),
      wax: lathe([[0, -0.12], [0.07, -0.12], [0.07, 0.02], [0.13, 0.02], [0.13, 0.05], [0.04, 0.05], [0.04, 0.14], [0, 0.14]], 28),
    }
  }, [])
  const pumpGears = useRef([])
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
    if (piston.current) piston.current.position.y = (view === 'oil' ? 0.6 : 0.25) + Math.cos(t * 4) * (view === 'oil' ? 0.25 : 0.24)
    pumpGears.current.forEach((g, i) => g && (g.rotation.z = (i ? 1 : -1) * t * 3 + (i ? 0.35 : 0)))
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
          <HalfLathe profile={G.fins} material={m.alette} sectionMat={M.section} ghost={M.ghost} />
          <SectionBlock shape={G.headL} depth={0.6} material={M.alu} sectionMat={M.section} ghost={M.ghost} />
        </group>
      ) : (
        <group>
          <HalfLathe profile={G.liner} material={M.steelDark} sectionMat={M.section} />
          <HalfLathe profile={G.wall} material={M.alu} sectionMat={M.section} ghost={M.ghost} />
          <HalfLathe profile={G.wallTop} material={M.alu} sectionMat={M.section} />
          <SectionBlock shape={G.headL} depth={0.65} material={M.alu} sectionMat={M.section} ghost={M.ghost} />
        </group>
      )}
      {!finned && (
        <group ref={refs.camicie}>
          <HalfLathe profile={G.jacket} material={m.jacket} sectionMat={m.coolantSec} />
        </group>
      )}
      <group ref={piston} position={[0, 0.25, 0]}>
        <mesh geometry={G.piston} material={m.piston} />
        {[0.12, 0.06].map((y) => (
          <mesh key={y} geometry={G.ring} material={M.steelDark} position={[0, y, 0]} />
        ))}
      </group>
      {glow && (
        <mesh position={[0, 0.82, 0]}>
          <cylinderGeometry args={[0.49, 0.49, 0.5, 40]} />
          <meshStandardMaterial ref={heatGlow} color="#ff5a1a" emissive="#ff4a10" emissiveIntensity={0.7} transparent opacity={0.7} depthWrite={false} />
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
            {/* pacco radiante (tubi + alette) tra due vaschette */}
            <mesh material={m.radiatore}>
              <boxGeometry args={[0.18, 2.0, 1.3]} />
            </mesh>
            {[-1.08, 1.08].map((y) => (
              <RoundedBox key={y} args={[0.26, 0.18, 1.38]} radius={0.05} position={[0, y, 0]} material={m.tank} />
            ))}
            {[-0.69, 0.69].map((z) => (
              <mesh key={z} material={m.tank} position={[0, 0, z]}>
                <boxGeometry args={[0.2, 2.0, 0.04]} />
              </mesh>
            ))}
            <mesh material={M.steel} position={[0, 1.22, 0.4]}>
              <cylinderGeometry args={[0.09, 0.09, 0.08, 20]} />
            </mesh>
            <mesh material={M.alu} position={[-0.15, 1.08, 0.0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.07, 0.07, 0.12, 16]} />
            </mesh>
            <mesh material={M.alu} position={[-0.15, -1.08, 0.0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.07, 0.07, 0.12, 16]} />
            </mesh>
          </group>
          {/* ventola dietro il radiatore */}
          <group ref={refs.ventola} position={[1.85, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <group ref={fan}>
              {Array.from({ length: 7 }).map((_, i) => (
                <group key={i} rotation={[0, 0, (i * Math.PI * 2) / 7]}>
                  <mesh geometry={G.blade} material={m.ventola} rotation={[0.45, 0, 0]} />
                </group>
              ))}
              <mesh material={m.ventola} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 0.08, 24]} />
              </mesh>
            </group>
            <mesh material={m.ventola}>
              <torusGeometry args={[0.6, 0.035, 8, 48]} />
            </mesh>
            {[0, 1, 2].map((k) => (
              <mesh key={k} material={m.ventola} rotation={[0, 0, (k * Math.PI * 2) / 3 + 0.3]} position={[0, 0, 0.1]}>
                <boxGeometry args={[0.03, 1.2, 0.03]} />
              </mesh>
            ))}
            <mesh material={M.steelDark} position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.13, 0.13, 0.16, 24]} />
            </mesh>
          </group>
          {/* manicotti */}
          <Pipe points={[[-1.0, 1.25, 0.2], [0.2, 1.4, 0.15], [1.4, 1.1, 0.05]]} r={0.07} material={m.hose} />
          <Pipe points={[[1.4, -1.1, 0.05], [0.2, -1.4, 0.2], [-1.2, -0.95, 0.35]]} r={0.07} material={m.hose} />
          {/* pompa e termostato */}
          <group ref={refs.pompa} position={[-1.25, -0.9, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh geometry={G.volute} material={m.pompa} />
            {Array.from({ length: 6 }).map((_, i) => (
              <mesh key={i} material={M.steel} rotation={[0, (i * Math.PI) / 3, 0]} position={[0, -0.13, 0]}>
                <boxGeometry args={[0.4, 0.04, 0.02]} />
              </mesh>
            ))}
          </group>
          <group ref={refs.termostato} position={[-0.75, 1.3, 0.2]}>
            <mesh geometry={G.wax} material={m.termostato} />
            <mesh material={M.steelDark} position={[0, -0.02, 0]} scale={[1, 0.2, 1]}>
              <torusGeometry args={[0.1, 0.012, 6, 20]} />
            </mesh>
          </group>
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
          <SectionBlock shape={G.crankcase} depth={0.6} material={M.alu} sectionMat={M.section} ghost={M.ghost} />
          <group ref={piston} position={[0, 0.6, 0]}>
            <mesh geometry={G.pistonO} material={m.piston} />
          </group>
          <group ref={crank} position={[0, -0.55, 0]}>
            {[-0.1, 0.1].map((z) => (
              <mesh key={z} geometry={G.web} material={m.crank} position={[0, 0, z]} />
            ))}
            <mesh material={m.crank} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.8, 20]} />
            </mesh>
          </group>
          {/* coppa con olio */}
          <group ref={refs.coppa} position={[0, -1.35, 0]}>
            <mesh material={m.oil} position={[0, -0.12, 0]}>
              <boxGeometry args={[1.45, 0.3, 1.05]} />
            </mesh>
          </group>
          {/* pompa a ingranaggi: due ruote che girano in senso opposto */}
          <group ref={refs.pompaOlio} position={[0.5, -1.3, 0.3]}>
            <mesh material={m.pompaOlio} position={[0.1, 0, -0.08]}>
              <boxGeometry args={[0.5, 0.32, 0.06]} />
            </mesh>
            {[0, 1].map((i) => (
              <group key={i} ref={(el) => (pumpGears.current[i] = el)} position={[i * 0.21, 0, 0]}>
                <mesh geometry={G.pumpGearA} material={M.steel} />
              </group>
            ))}
          </group>
          {/* filtro a cartuccia con carta pieghettata */}
          <group ref={refs.filtro} position={[1.05, -0.65, 0.3]} rotation={[0, 0, Math.PI / 2]}>
            <mesh geometry={G.filterCan} material={m.filtro} />
            {Array.from({ length: 6 }).map((_, i) => (
              <mesh key={i} material={m.filtro} position={[0, -0.14 + i * 0.056, 0]}>
                <torusGeometry args={[0.19, 0.008, 6, 32]} />
              </mesh>
            ))}
          </group>
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
