// Officina realistica attorno alla moto: pavimento in resina riflettente, plafoniere al neon,
// banco attrezzi, pannello utensili, cassettiera, compressore, fusti, scaffalature, poster e dettagli.
// Tutte le texture sono disegnate al volo su canvas (nessun file esterno).
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial, RoundedBox, SpotLight } from '@react-three/drei'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { drawLogo } from '../lib/logo'

let rectInit = false
const ROOM = 8
const H = 6

// ---------- texture ----------
function canvasTex(w, h, draw, repeat = [1, 1], srgb = true) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(...repeat)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}
function noise(ctx, w, h, alpha, n, size = 2) {
  for (let i = 0; i < n; i++) {
    const v = Math.random() * 255
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`
    ctx.fillRect(Math.random() * w, Math.random() * h, size, size)
  }
}
function stains(ctx, w, h, n, alpha) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(20,20,22,${alpha * (0.5 + Math.random())})`
    ctx.beginPath()
    ctx.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 70, 10 + Math.random() * 35, Math.random() * 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function useTextures() {
  return useMemo(() => {
    const floor = canvasTex(
      1024,
      1024,
      (ctx, w, h) => {
        ctx.fillStyle = '#5a5e66'
        ctx.fillRect(0, 0, w, h)
        noise(ctx, w, h, 0.04, 30000, 2)
        stains(ctx, w, h, 5, 0.04)
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'
        ctx.lineWidth = 3
        ctx.strokeRect(1, 1, w - 2, h - 2)
      },
      [3, 3]
    )
    const floorRough = canvasTex(
      512,
      512,
      (ctx, w, h) => {
        ctx.fillStyle = '#9a9a9a'
        ctx.fillRect(0, 0, w, h)
        noise(ctx, w, h, 0.1, 12000, 3)
        stains(ctx, w, h, 4, 0.08)
      },
      [3, 3],
      false
    )
    const wall = canvasTex(
      1024,
      512,
      (ctx, w, h) => {
        ctx.fillStyle = '#8a8d92'
        ctx.fillRect(0, 0, w, h)
        const bw = 128
        const bh = 64
        for (let y = 0; y < h; y += bh) {
          const off = (y / bh) % 2 ? bw / 2 : 0
          for (let x = -bw; x < w + bw; x += bw) {
            const v = 128 + Math.random() * 14
            ctx.fillStyle = `rgb(${v},${v + 1},${v + 4})`
            ctx.fillRect(x + off + 3, y + 3, bw - 6, bh - 6)
          }
        }
        noise(ctx, w, h, 0.06, 20000, 2)
        ctx.fillStyle = '#2f3439'
        ctx.fillRect(0, h * 0.72, w, h * 0.28)
        ctx.fillStyle = '#d8a51a'
        ctx.fillRect(0, h * 0.71, w, 8)
      },
      [4, 1]
    )
    const peg = canvasTex(
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#4b5059'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#16181c'
        for (let y = 8; y < h; y += 16)
          for (let x = 8; x < w; x += 16) {
            ctx.beginPath()
            ctx.arc(x, y, 2.6, 0, Math.PI * 2)
            ctx.fill()
          }
      },
      [5, 2.5]
    )
    const wood = canvasTex(512, 128, (ctx, w, h) => {
      ctx.fillStyle = '#7a5532'
      ctx.fillRect(0, 0, w, h)
      for (let i = 0; i < 60; i++) {
        ctx.strokeStyle = `rgba(${60 + Math.random() * 40},${35 + Math.random() * 25},15,0.35)`
        ctx.lineWidth = 1 + Math.random() * 2
        ctx.beginPath()
        const y = Math.random() * h
        ctx.moveTo(0, y)
        ctx.bezierCurveTo(w * 0.3, y + Math.random() * 10 - 5, w * 0.6, y + Math.random() * 10 - 5, w, y)
        ctx.stroke()
      }
    })
    return { floor, floorRough, wall, peg, wood }
  }, [])
}

function usePosters() {
  return useMemo(() => {
    const team = canvasTex(512, 720, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, '#15171c')
      g.addColorStop(1, '#2a1208')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? '#ff6a1a' : '#ffb03a'
        ctx.globalAlpha = 0.85
        ctx.beginPath()
        ctx.moveTo(-50 + i * 40, h)
        ctx.lineTo(80 + i * 40, h)
        ctx.lineTo(w + 40, h * 0.45 + i * 16)
        ctx.lineTo(w + 40, h * 0.42 + i * 16)
        ctx.closePath()
        ctx.fill()
      }
      ctx.globalAlpha = 1
      drawLogo(ctx, w / 2, 230, 150)
      ctx.fillStyle = '#fff'
      ctx.font = 'italic 900 64px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('MOTO', w / 2, 460)
      ctx.fillText('ACADEMY', w / 2, 530)
      ctx.font = '700 26px system-ui, sans-serif'
      ctx.fillStyle = '#ffb03a'
      ctx.fillText('RACING SCHOOL', w / 2, 575)
    })
    const engine = canvasTex(720, 512, (ctx) => {
      ctx.fillStyle = '#e9e4d8'
      ctx.fillRect(0, 0, 720, 512)
      ctx.fillStyle = '#1d3a6b'
      ctx.strokeStyle = '#1d3a6b'
      ctx.lineWidth = 4
      ctx.font = '900 40px system-ui, sans-serif'
      ctx.fillText('IL CICLO A 4 TEMPI', 40, 64)
      const names = ['ASPIRAZIONE', 'COMPRESSIONE', 'SCOPPIO', 'SCARICO']
      const cols = ['#3a7bd5', '#7a4fd0', '#e0531a', '#7d8594']
      for (let i = 0; i < 4; i++) {
        const x = 40 + i * 165
        ctx.strokeRect(x, 110, 130, 260)
        const py = [300, 170, 290, 160][i]
        ctx.fillStyle = cols[i]
        ctx.globalAlpha = 0.35
        ctx.fillRect(x + 4, 114, 122, py - 114)
        ctx.globalAlpha = 1
        ctx.fillStyle = '#8a8f99'
        ctx.fillRect(x + 6, py, 118, 50)
        ctx.fillStyle = '#1d3a6b'
        ctx.font = '800 17px system-ui, sans-serif'
        ctx.fillText(names[i], x + 4, 410)
        ctx.font = '900 36px system-ui, sans-serif'
        ctx.fillText(String(i + 1), x + 52, 460)
      }
    })
    const tyre = canvasTex(512, 640, (ctx) => {
      ctx.fillStyle = '#f2f2ee'
      ctx.fillRect(0, 0, 512, 640)
      ctx.fillStyle = '#c3122a'
      ctx.fillRect(0, 0, 512, 110)
      ctx.fillStyle = '#fff'
      ctx.font = '900 46px system-ui, sans-serif'
      ctx.fillText('PRESSIONI', 30, 72)
      ctx.fillStyle = '#222'
      const rows = [
        ['Solo pilota', 'ant 2,0 · post 2,2'],
        ['Con passeggero', 'ant 2,0 · post 2,4'],
        ['Sempre a gomme fredde', ''],
      ]
      rows.forEach((r, i) => {
        ctx.font = '700 30px system-ui, sans-serif'
        ctx.fillText(r[0], 30, 190 + i * 110)
        ctx.font = '900 30px system-ui, sans-serif'
        ctx.fillText(r[1], 30, 230 + i * 110)
      })
      ctx.font = 'italic 600 22px system-ui, sans-serif'
      ctx.fillStyle = '#666'
      ctx.fillText('valori indicativi in bar – vedi libretto', 30, 610)
    })
    const clock = canvasTex(256, 256, (ctx) => {
      ctx.fillStyle = '#f4f4f0'
      ctx.beginPath()
      ctx.arc(128, 128, 120, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#111'
      ctx.lineWidth = 10
      ctx.stroke()
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        ctx.lineWidth = i % 3 ? 4 : 8
        ctx.beginPath()
        ctx.moveTo(128 + Math.cos(a) * 95, 128 + Math.sin(a) * 95)
        ctx.lineTo(128 + Math.cos(a) * 110, 128 + Math.sin(a) * 110)
        ctx.stroke()
      }
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.moveTo(128, 128)
      ctx.lineTo(178, 98)
      ctx.stroke()
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(128, 128)
      ctx.lineTo(118, 38)
      ctx.stroke()
    })
    return { team, engine, tyre, clock }
  }, [])
}

// ---------- materiali ----------
const M = {
  steel: () => new THREE.MeshStandardMaterial({ color: '#c4c9d2', metalness: 0.9, roughness: 0.3 }),
  dark: () => new THREE.MeshStandardMaterial({ color: '#25282e', metalness: 0.5, roughness: 0.5 }),
  rubber: () => new THREE.MeshStandardMaterial({ color: '#101113', metalness: 0, roughness: 0.92 }),
  red: () => new THREE.MeshPhysicalMaterial({ color: '#b3121b', metalness: 0.35, roughness: 0.32, clearcoat: 0.9 }),
  color: (c, r = 0.45, mt = 0.2) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt }),
}

// ---------- arredi ----------
function NeonFixture({ position, length = 2.4, intensity = 7 }) {
  const glow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f4f8ff', emissive: '#eef4ff', emissiveIntensity: 2.2, toneMapped: false }), [])
  const housing = useMemo(() => M.dark(), [])
  return (
    <group position={position}>
      {[-length / 2 + 0.2, length / 2 - 0.2].map((x) => (
        <mesh key={x} position={[x, (H - position[1]) / 2, 0]}>
          <cylinderGeometry args={[0.006, 0.006, H - position[1], 4]} />
          <meshBasicMaterial color="#111" />
        </mesh>
      ))}
      <RoundedBox args={[length, 0.08, 0.32]} radius={0.02} material={housing} />
      {[-0.08, 0.08].map((z) => (
        <mesh key={z} position={[0, -0.05, z]} rotation={[0, 0, Math.PI / 2]} material={glow}>
          <cylinderGeometry args={[0.025, 0.025, length - 0.12, 12]} />
        </mesh>
      ))}
      <rectAreaLight width={length} height={0.3} intensity={intensity} color="#eef4ff" position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  )
}

function Tire({ position, rotation = [Math.PI / 2, 0, 0], r = 0.5, w = 0.2 }) {
  const m = useMemo(() => ({ rubber: M.rubber(), rim: M.steel() }), [])
  return (
    <group position={position} rotation={rotation}>
      <mesh material={m.rubber}>
        <torusGeometry args={[r, w, 16, 40]} />
      </mesh>
      <mesh material={m.rim}>
        <torusGeometry args={[r - w * 0.6, 0.03, 8, 32]} />
      </mesh>
    </group>
  )
}

function Wrench({ position, len = 0.5 }) {
  const m = useMemo(() => M.steel(), [])
  return (
    <group position={position}>
      <mesh material={m}>
        <boxGeometry args={[0.04, len, 0.015]} />
      </mesh>
      <mesh material={m} position={[0, len / 2 + 0.02, 0]}>
        <torusGeometry args={[0.045, 0.016, 6, 16, Math.PI * 1.4]} />
      </mesh>
      <mesh material={m} position={[0, -len / 2 - 0.02, 0]}>
        <torusGeometry args={[0.035, 0.012, 6, 16]} />
      </mesh>
    </group>
  )
}

function Workbench({ position, tx }) {
  const m = useMemo(
    () => ({
      top: new THREE.MeshStandardMaterial({ map: tx.wood, roughness: 0.75 }),
      frame: M.dark(),
      steel: M.steel(),
      red: M.red(),
      blue: M.color('#2a4fd0', 0.35, 0.5),
      bottles: ['#c3122a', '#1c1f26', '#d8a51a', '#2a4fd0'].map((c) => M.color(c, 0.4, 0.2)),
    }),
    [tx]
  )
  return (
    <group position={position}>
      <RoundedBox args={[3.6, 0.1, 1.0]} radius={0.015} position={[0, 1.55, 0]} material={m.top} />
      <RoundedBox args={[1.1, 1.45, 0.9]} radius={0.02} position={[-1.15, 0.75, 0]} material={m.frame} />
      {Array.from({ length: 4 }).map((_, i) => (
        <group key={i} position={[-1.15, 0.3 + i * 0.33, 0.46]}>
          <mesh material={m.frame}>
            <boxGeometry args={[1.04, 0.3, 0.02]} />
          </mesh>
          <mesh material={m.steel} position={[0, 0.06, 0.02]}>
            <boxGeometry args={[0.5, 0.025, 0.03]} />
          </mesh>
        </group>
      ))}
      {[0.4, 1.7].map((x) =>
        [-0.42, 0.42].map((z) => (
          <mesh key={x + '' + z} material={m.frame} position={[x, 0.75, z]}>
            <boxGeometry args={[0.07, 1.5, 0.07]} />
          </mesh>
        ))
      )}
      <RoundedBox args={[1.5, 0.05, 0.9]} radius={0.01} position={[1.05, 0.35, 0]} material={m.frame} />
      {/* morsa */}
      <group position={[1.35, 1.7, 0.3]}>
        <RoundedBox args={[0.32, 0.18, 0.24]} radius={0.03} material={m.blue} />
        <mesh material={m.steel} position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.26, 10]} />
        </mesh>
      </group>
      {/* bottiglie d'olio */}
      {m.bottles.map((mt, i) => (
        <group key={i} position={[-1.5 + i * 0.22, 1.79, 0.15]}>
          <RoundedBox args={[0.14, 0.38, 0.09]} radius={0.03} material={mt} />
          <mesh position={[0.03, 0.22, 0]} material={m.frame}>
            <cylinderGeometry args={[0.025, 0.025, 0.05, 10]} />
          </mesh>
        </group>
      ))}
      {/* cassetta attrezzi, pistone e corona di ricambio */}
      <group position={[-0.4, 1.68, -0.15]}>
        <RoundedBox args={[0.7, 0.18, 0.3]} radius={0.03} material={m.red} />
        <mesh material={m.steel} position={[0, 0.15, 0]}>
          <torusGeometry args={[0.16, 0.012, 6, 20, Math.PI]} />
        </mesh>
      </group>
      <mesh material={m.steel} position={[0.45, 1.68, 0.25]}>
        <cylinderGeometry args={[0.1, 0.1, 0.18, 24]} />
      </mesh>
      <mesh material={m.steel} position={[0.85, 1.61, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.18, 0.02, 6, 36]} />
      </mesh>
      {/* lampada da banco */}
      <group position={[0.1, 1.6, -0.35]}>
        <mesh material={m.frame} position={[0, 0.3, 0]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.012, 0.012, 0.6, 8]} />
        </mesh>
        <mesh material={m.frame} position={[0.15, 0.6, 0.05]} rotation={[0, 0, -1.0]}>
          <coneGeometry args={[0.1, 0.16, 16, 1, true]} />
        </mesh>
        <pointLight position={[0.2, 0.55, 0.1]} color="#ffe2b8" intensity={2.5} distance={3} />
      </group>
    </group>
  )
}

function ToolCabinet({ position }) {
  const m = useMemo(() => ({ red: M.red(), steel: M.steel(), dark: M.dark(), rubber: M.rubber() }), [])
  return (
    <group position={position}>
      <RoundedBox args={[1.5, 1.7, 0.75]} radius={0.04} position={[0, 1.0, 0]} material={m.red} />
      <RoundedBox args={[1.55, 0.06, 0.8]} radius={0.02} position={[0, 1.87, 0]} material={m.dark} />
      {Array.from({ length: 7 }).map((_, i) => (
        <group key={i} position={[0, 0.3 + i * 0.22, 0.38]}>
          <mesh material={m.dark}>
            <boxGeometry args={[1.42, 0.008, 0.01]} />
          </mesh>
          <mesh material={m.steel} position={[0, 0.1, 0.02]}>
            <boxGeometry args={[1.1, 0.025, 0.03]} />
          </mesh>
        </group>
      ))}
      {[-0.6, 0.6].map((x) =>
        [-0.28, 0.28].map((z) => (
          <mesh key={x + '' + z} material={m.rubber} position={[x, 0.08, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.05, 16]} />
          </mesh>
        ))
      )}
      <mesh material={m.steel} position={[0.82, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.015, 6, 20, Math.PI]} />
      </mesh>
    </group>
  )
}

function Compressor({ position }) {
  const m = useMemo(() => ({ red: M.red(), dark: M.dark(), steel: M.steel(), rubber: M.rubber(), hose: M.color('#d8a51a', 0.6, 0) }), [])
  const coil = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 200; i++) {
      const a = (i / 200) * Math.PI * 2 * 4
      pts.push(new THREE.Vector3(Math.cos(a) * (0.28 + i * 0.0003), Math.sin(a) * (0.28 + i * 0.0003), (i / 200) * 0.12))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.014, 6, false)
  }, [])
  return (
    <group position={position}>
      <mesh material={m.red} position={[0, 0.42, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.28, 0.9, 8, 24]} />
      </mesh>
      <RoundedBox args={[0.5, 0.35, 0.4]} radius={0.04} position={[0, 0.85, 0]} material={m.dark} />
      <mesh material={m.steel} position={[0.1, 1.05, 0.15]}>
        <cylinderGeometry args={[0.06, 0.06, 0.02, 20]} />
      </mesh>
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} material={m.rubber} position={[x, 0.1, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.06, 16]} />
        </mesh>
      ))}
      <mesh geometry={coil} material={m.hose} position={[0.95, 0.5, 0]} rotation={[0, Math.PI / 2, 0]} />
    </group>
  )
}

function Drum({ position, color }) {
  const m = useMemo(() => M.color(color, 0.45, 0.45), [color])
  return (
    <group position={position}>
      <mesh material={m} position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 1.2, 32]} />
      </mesh>
      {[0.3, 0.9].map((y) => (
        <mesh key={y} material={m} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.385, 0.02, 6, 32]} />
        </mesh>
      ))}
    </group>
  )
}

function Extinguisher({ position }) {
  const m = useMemo(() => ({ red: M.red(), dark: M.dark() }), [])
  return (
    <group position={position}>
      <mesh material={m.red} position={[0, 0.3, 0]}>
        <capsuleGeometry args={[0.1, 0.4, 8, 16]} />
      </mesh>
      <mesh material={m.dark} position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.08, 10]} />
      </mesh>
      <mesh material={m.dark} position={[0.06, 0.66, 0]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.14, 0.02, 0.03]} />
      </mesh>
    </group>
  )
}

function Poster({ position, rotation = [0, 0, 0], tex, size = [1, 1.4] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.005]}>
        <planeGeometry args={[size[0] + 0.06, size[1] + 0.06]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh>
        <planeGeometry args={size} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
    </group>
  )
}

export default function Workshop() {
  if (!rectInit) {
    RectAreaLightUniformsLib.init()
    rectInit = true
  }
  const tx = useTextures()
  const posters = usePosters()
  const neon = useRef()
  const m = useMemo(
    () => ({
      steel: M.steel(),
      dark: M.dark(),
      wall: new THREE.MeshStandardMaterial({ map: tx.wall, roughness: 0.92 }),
      peg: new THREE.MeshStandardMaterial({ map: tx.peg, roughness: 0.7 }),
      yellow: M.color('#d8a51a', 0.55, 0.3),
      boxes: ['#8a6a45', '#2a4fd0', '#8a6a45', '#c3122a', '#5b6474', '#8a6a45'].map((c) => M.color(c, 0.8, 0)),
      tools: ['#c3122a', '#ffb03a', '#1f6fe0', '#c3122a', '#2fd47a', '#ffb03a'].map((c) => M.color(c, 0.4, 0.1)),
    }),
    [tx]
  )
  useFrame((s) => {
    if (neon.current) neon.current.material.opacity = 0.93 + 0.07 * Math.sin(s.clock.elapsedTime * 13) * Math.sin(s.clock.elapsedTime * 1.7)
  })
  const signTex = useMemo(
    () =>
      canvasTex(1024, 256, (ctx, w, h) => {
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, w, h)
        ctx.font = 'italic 900 120px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.shadowColor = '#ff6a1a'
        ctx.shadowBlur = 40
        ctx.fillStyle = '#ffd1b0'
        ctx.fillText('MOTO ACADEMY', w / 2, h / 2 + 6)
        ctx.shadowBlur = 0
        ctx.strokeStyle = '#ff7a2a'
        ctx.lineWidth = 5
        ctx.strokeText('MOTO ACADEMY', w / 2, h / 2 + 6)
      }),
    []
  )

  return (
    <group>
      <fog attach="fog" args={['#0c0d10', 10, 24]} />

      {/* pavimento in resina che riflette moto e luci */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]}>
        <planeGeometry args={[ROOM * 2, ROOM * 2]} />
        <MeshReflectorMaterial
          map={tx.floor}
          roughnessMap={tx.floorRough}
          blur={[300, 80]}
          resolution={512}
          mixBlur={1}
          mixStrength={1.4}
          mixContrast={1}
          roughness={0.75}
          metalness={0.25}
          depthScale={0.8}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.3}
          color="#8c9098"
        />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, (i * Math.PI) / 2]} position={[Math.sin((i * Math.PI) / 2) * 3, -0.005, Math.cos((i * Math.PI) / 2) * 3]} material={m.yellow}>
          <planeGeometry args={[6.12, 0.1]} />
        </mesh>
      ))}

      {/* pareti, soffitto e travi */}
      {[
        [0, H / 2, -ROOM, 0],
        [0, H / 2, ROOM, Math.PI],
        [-ROOM, H / 2, 0, Math.PI / 2],
        [ROOM, H / 2, 0, -Math.PI / 2],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, r, 0]} material={m.wall}>
          <planeGeometry args={[ROOM * 2, H]} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[ROOM * 2, ROOM * 2]} />
        <meshStandardMaterial color="#1a1c20" roughness={0.9} />
      </mesh>
      {[-5, -1.7, 1.7, 5].map((x) => (
        <mesh key={x} material={m.dark} position={[x, H - 0.25, 0]}>
          <boxGeometry args={[0.25, 0.5, ROOM * 2]} />
        </mesh>
      ))}
      <mesh material={m.steel} position={[0, 5.3, -ROOM + 0.06]}>
        <boxGeometry args={[ROOM * 2, 0.08, 0.06]} />
      </mesh>

      {/* ---------- parete di fondo ---------- */}
      <group position={[0, 0, -ROOM + 0.05]}>
        <mesh ref={neon} position={[0, 4.55, 0.02]}>
          <planeGeometry args={[4.2, 1.05]} />
          <meshBasicMaterial map={signTex} transparent blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 4.5, 0.8]} color="#ff7a2a" intensity={3} distance={5} />

        <mesh material={m.peg} position={[-1.6, 2.65, 0.03]}>
          <planeGeometry args={[3.6, 1.6]} />
        </mesh>
        {[0.35, 0.42, 0.5, 0.58, 0.66, 0.74].map((l, i) => (
          <Wrench key={i} position={[-3.1 + i * 0.17, 2.9, 0.07]} len={l} />
        ))}
        {m.tools.map((mt, i) => (
          <group key={i} position={[-1.8 + i * 0.14, 2.95, 0.07]}>
            <mesh material={mt} position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.035, 0.03, 0.24, 10]} />
            </mesh>
            <mesh material={m.steel} position={[0, -0.13, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.3, 6]} />
            </mesh>
          </group>
        ))}
        {[0, 1].map((i) => (
          <group key={i} position={[-0.75 + i * 0.25, 2.75, 0.07]}>
            {[-1, 1].map((s) => (
              <mesh key={s} material={m.tools[i ? 0 : 2]} rotation={[0, 0, s * 0.12]} position={[s * 0.03, 0, 0]}>
                <boxGeometry args={[0.035, 0.4, 0.02]} />
              </mesh>
            ))}
          </group>
        ))}
        <group position={[-0.1, 2.75, 0.07]}>
          <mesh material={M.color('#7a4a22', 0.7, 0)}>
            <boxGeometry args={[0.05, 0.6, 0.04]} />
          </mesh>
          <mesh material={m.dark} position={[0, 0.31, 0]}>
            <boxGeometry args={[0.3, 0.09, 0.08]} />
          </mesh>
        </group>
        {[0.45, 0.9].map((x, i) => (
          <mesh key={x} material={m.steel} position={[x - 1.5, 2.1, 0.07]}>
            <torusGeometry args={[0.18 - i * 0.04, 0.025, 6, 32]} />
          </mesh>
        ))}

        <Workbench position={[-1.6, 0, 0.6]} tx={tx} />
        <ToolCabinet position={[2.3, 0, 0.45]} />
        <Poster position={[3.9, 3.0, 0.02]} tex={posters.team} size={[1.1, 1.55]} />
        <Poster position={[1.1, 3.3, 0.02]} tex={posters.engine} size={[1.4, 1.0]} />
        <mesh position={[5.6, 3.9, 0.03]}>
          <circleGeometry args={[0.35, 40]} />
          <meshStandardMaterial map={posters.clock} roughness={0.5} />
        </mesh>
        <Extinguisher position={[5.4, 1.0, 0.15]} />
        {[0, 1, 2, 3].map((i) => (
          <Tire key={i} position={[6.4, 0.2 + i * 0.4, 1.1]} rotation={[Math.PI / 2, 0, i * 0.4]} r={0.48} w={0.18} />
        ))}
        <RoundedBox args={[0.8, 1.0, 0.18]} radius={0.03} position={[-5.3, 2.4, 0.1]} material={M.color('#9aa1ad', 0.5, 0.4)} />
        <mesh position={[-5.3, 2.75, 0.2]} material={m.yellow}>
          <boxGeometry args={[0.12, 0.12, 0.02]} />
        </mesh>
      </group>

      {/* ---------- parete destra: serranda con luce che filtra e finestre ---------- */}
      <group position={[ROOM - 0.05, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 2.2, 0.02]} material={M.color('#6b7079', 0.45, 0.6)}>
          <planeGeometry args={[5, 4.4]} />
        </mesh>
        {Array.from({ length: 22 }).map((_, i) => (
          <mesh key={i} material={m.dark} position={[0, 0.1 + i * 0.2, 0.05]}>
            <boxGeometry args={[5, 0.03, 0.04]} />
          </mesh>
        ))}
        <mesh position={[0, 0.03, 0.06]}>
          <planeGeometry args={[5, 0.06]} />
          <meshBasicMaterial color="#fff2d8" toneMapped={false} />
        </mesh>
        <mesh material={m.dark} position={[0, 4.5, 0.15]}>
          <boxGeometry args={[5.3, 0.3, 0.3]} />
        </mesh>
        {[-4, 4].map((x) => (
          <group key={x} position={[x, 4.3, 0.03]}>
            <mesh>
              <planeGeometry args={[1.8, 0.9]} />
              <meshBasicMaterial color="#a8c4e6" toneMapped={false} />
            </mesh>
            <mesh material={m.dark} position={[0, 0, 0.01]}>
              <boxGeometry args={[0.05, 0.9, 0.03]} />
            </mesh>
          </group>
        ))}
        <rectAreaLight width={5} height={0.4} intensity={2} color="#fff2d8" position={[0, 0.2, 0.3]} />
        <Compressor position={[3.8, 0, 1.0]} />
      </group>

      {/* ---------- parete sinistra: scaffalature, fusti, ricambi ---------- */}
      <group position={[-ROOM + 0.55, 0, 0.5]} rotation={[0, Math.PI / 2, 0]}>
        {[0.5, 1.5, 2.5, 3.5].map((y) => (
          <mesh key={y} material={m.dark} position={[0, y, 0]}>
            <boxGeometry args={[4.2, 0.05, 0.8]} />
          </mesh>
        ))}
        {[-2.05, 0, 2.05].map((x) => (
          <mesh key={x} material={m.yellow} position={[x, 2, 0]}>
            <boxGeometry args={[0.06, 4, 0.8]} />
          </mesh>
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <RoundedBox key={i} args={[0.55, 0.42, 0.55]} radius={0.03} position={[-1.7 + (i % 6) * 0.68, 0.75 + Math.floor(i / 6) * 2, 0]} material={m.boxes[i % 6]} />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <Tire key={i} position={[-1.3 + i * 0.85, 1.85, 0]} rotation={[0, 0, 0]} r={0.3} w={0.12} />
        ))}
        <mesh position={[1.5, 3.75, 0]} scale={[0.24, 0.22, 0.28]}>
          <sphereGeometry args={[1, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshPhysicalMaterial color="#e9ebef" roughness={0.2} clearcoat={1} />
        </mesh>
      </group>
      <Drum position={[-6.6, 0, -5.8]} color="#1f4fa0" />
      <Drum position={[-5.75, 0, -6.4]} color="#c3122a" />
      <Poster position={[-ROOM + 0.03, 3.4, 3.8]} rotation={[0, Math.PI / 2, 0]} tex={posters.tyre} size={[0.9, 1.12]} />

      {/* ---------- luci: plafoniere al neon, faretto sulla moto e controluce ---------- */}
      <NeonFixture position={[0, 4.6, 0]} length={2.6} intensity={9} />
      <NeonFixture position={[0, 4.6, -3.6]} length={2.6} intensity={6} />
      <NeonFixture position={[-4.4, 4.6, 0]} length={2.6} intensity={5} />
      <NeonFixture position={[4.4, 4.6, 0]} length={2.6} intensity={5} />
      <NeonFixture position={[0, 4.6, 3.6]} length={2.6} intensity={5} />
      <SpotLight position={[0.8, 5.2, 1.6]} target-position={[0, 0.6, 0]} color="#fff3e2" intensity={28} angle={0.42} penumbra={0.7} distance={10} decay={1.4} attenuation={5} anglePower={4} opacity={0.12} />
      <spotLight position={[-3, 4.2, -3]} color="#9fc4ff" intensity={22} angle={0.5} penumbra={0.8} distance={10} decay={1.5} />
    </group>
  )
}
