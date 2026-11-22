// Officina attorno alla moto: stanza, arredi, lampade a spot con fasci di luce visibili.
// Tutte le texture sono disegnate al volo su canvas (nessun file esterno).
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { SpotLight, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

const ROOM = 8 // metà lato della stanza
const H = 6 // altezza

function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  draw(ctx, w, h)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(...repeat)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function noise(ctx, w, h, alpha, n = 3000) {
  for (let i = 0; i < n; i++) {
    const v = Math.random() * 255
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2)
  }
}

function useTextures() {
  return useMemo(() => {
    const floor = canvasTex(
      512,
      512,
      (ctx, w, h) => {
        ctx.fillStyle = '#2a2c31'
        ctx.fillRect(0, 0, w, h)
        noise(ctx, w, h, 0.06, 9000)
        // macchie d'olio
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = 'rgba(0,0,0,0.12)'
          ctx.beginPath()
          ctx.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 40, 10 + Math.random() * 20, Math.random() * 3, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'
        ctx.lineWidth = 3
        ctx.strokeRect(0, 0, w, h)
      },
      [6, 6]
    )
    const wall = canvasTex(
      512,
      512,
      (ctx, w, h) => {
        // blocchi di cemento
        ctx.fillStyle = '#34373e'
        ctx.fillRect(0, 0, w, h)
        const bw = 128
        const bh = 64
        for (let y = 0; y < h; y += bh) {
          const off = (y / bh) % 2 ? bw / 2 : 0
          for (let x = -bw; x < w + bw; x += bw) {
            const v = 50 + Math.random() * 12
            ctx.fillStyle = `rgb(${v},${v + 2},${v + 6})`
            ctx.fillRect(x + off + 3, y + 3, bw - 6, bh - 6)
          }
        }
        noise(ctx, w, h, 0.05, 6000)
      },
      [5, 3]
    )
    const peg = canvasTex(
      256,
      256,
      (ctx, w, h) => {
        ctx.fillStyle = '#3d4048'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#1d1f24'
        for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 16) {
          ctx.beginPath()
          ctx.arc(x, y, 2.4, 0, Math.PI * 2)
          ctx.fill()
        }
      },
      [4, 2]
    )
    const sign = canvasTex(1024, 256, (ctx, w, h) => {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      ctx.font = '900 128px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = '#ff6a1a'
      ctx.shadowBlur = 40
      ctx.fillStyle = '#ffd1b0'
      ctx.fillText('MOTO ACADEMY', w / 2, h / 2 + 6)
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#ff7a2a'
      ctx.lineWidth = 6
      ctx.strokeText('MOTO ACADEMY', w / 2, h / 2 + 6)
    })
    sign.repeat.set(1, 1)
    return { floor, wall, peg, sign }
  }, [])
}

// Lampada a sospensione con fascio di luce visibile
function SpotLamp({ pos, target, color = '#ffd9a8', intensity = 40, angle = 0.42, beam = true, dist = 12 }) {
  const t = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(...target)
    return o
  }, [target])
  return (
    <group>
      <primitive object={t} />
      <SpotLight
        position={pos}
        target={t}
        color={color}
        intensity={intensity}
        angle={angle}
        penumbra={0.6}
        distance={dist}
        decay={1.6}
        attenuation={beam ? 6 : 0}
        anglePower={4}
        opacity={beam ? 0.22 : 0}
        radiusTop={0.12}
        radiusBottom={2.2}
      />
      {/* paralume */}
      <group position={pos}>
        <mesh position={[0, (H - pos[1]) / 2, 0]}>
          <cylinderGeometry args={[0.01, 0.01, H - pos[1], 4]} />
          <meshBasicMaterial color="#111" />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.1, 0.32, 0.26, 24, 1, true]} />
          <meshStandardMaterial color="#1c1e22" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.3, 24]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </group>
    </group>
  )
}

function Wrench({ position, rotation = 0, len = 0.6 }) {
  return (
    <group position={position} rotation={[0, 0, rotation]}>
      <mesh>
        <boxGeometry args={[0.05, len, 0.02]} />
        <meshStandardMaterial color="#c4c9d2" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, len / 2, 0]}>
        <torusGeometry args={[0.055, 0.02, 6, 16, Math.PI * 1.5]} />
        <meshStandardMaterial color="#c4c9d2" metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  )
}

export default function Workshop() {
  const tx = useTextures()
  const neon = useRef()
  useFrame((s) => {
    if (neon.current) neon.current.material.opacity = 0.92 + 0.08 * Math.sin(s.clock.elapsedTime * 13) * Math.sin(s.clock.elapsedTime * 1.7)
  })

  const metal = (c, r = 0.4, m = 0.6) => <meshStandardMaterial color={c} roughness={r} metalness={m} />

  return (
    <group>
      <fog attach="fog" args={['#0a0b0e', 7, 19]} />

      {/* Pavimento e pareti */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[ROOM * 2, ROOM * 2]} />
        <meshStandardMaterial map={tx.floor} roughness={0.75} metalness={0.15} />
      </mesh>
      {[
        [0, H / 2, -ROOM, 0],
        [0, H / 2, ROOM, Math.PI],
        [-ROOM, H / 2, 0, Math.PI / 2],
        [ROOM, H / 2, 0, -Math.PI / 2],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, r, 0]}>
          <planeGeometry args={[ROOM * 2, H]} />
          <meshStandardMaterial map={tx.wall} roughness={0.9} metalness={0} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[ROOM * 2, ROOM * 2]} />
        <meshStandardMaterial color="#0d0e11" />
      </mesh>
      {/* strisce di sicurezza gialle/nere attorno alla pedana */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, (i * Math.PI) / 2]} position={[Math.sin((i * Math.PI) / 2) * 3, 0.002, Math.cos((i * Math.PI) / 2) * 3]}>
          <planeGeometry args={[6, 0.12]} />
          <meshStandardMaterial color="#d8a51a" roughness={0.6} />
        </mesh>
      ))}

      {/* ---------- Parete di fondo: banco, pannello attrezzi, insegna ---------- */}
      <group position={[0, 0, -ROOM + 0.05]}>
        {/* insegna al neon */}
        <mesh ref={neon} position={[0, 4.4, 0.02]}>
          <planeGeometry args={[4.2, 1.05]} />
          <meshBasicMaterial map={tx.sign} transparent blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 4.4, 0.8]} color="#ff7a2a" intensity={4} distance={5} />

        {/* pannello forato con attrezzi */}
        <mesh position={[-1.6, 2.6, 0.03]}>
          <planeGeometry args={[3.4, 1.5]} />
          <meshStandardMaterial map={tx.peg} roughness={0.7} />
        </mesh>
        {[0.45, 0.55, 0.62, 0.5, 0.4].map((l, i) => (
          <Wrench key={i} position={[-2.9 + i * 0.22, 2.75, 0.07]} len={l} />
        ))}
        {/* martello e cacciaviti */}
        <group position={[-1.5, 2.7, 0.07]}>
          <mesh>
            <boxGeometry args={[0.05, 0.7, 0.04]} />
            {metal('#7a4a22', 0.7, 0)}
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <boxGeometry args={[0.32, 0.1, 0.08]} />
            {metal('#2b2e35', 0.4, 0.9)}
          </mesh>
        </group>
        {['#d4141c', '#ffb03a', '#1f6fe0', '#d4141c', '#2fd47a'].map((c, i) => (
          <group key={i} position={[-1.0 + i * 0.16, 2.8, 0.07]}>
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.22, 10]} />
              {metal(c, 0.5, 0.1)}
            </mesh>
            <mesh position={[0, -0.12, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.3, 6]} />
              {metal('#c4c9d2', 0.25, 0.9)}
            </mesh>
          </group>
        ))}
        <mesh position={[-0.05, 2.15, 0.08]}>
          <torusGeometry args={[0.25, 0.04, 8, 24]} />
          {metal('#d8a51a', 0.5, 0.2)}
        </mesh>

        {/* banco da lavoro */}
        <group position={[-1.6, 0, 0.55]}>
          <RoundedBox args={[3.6, 0.12, 1.0]} radius={0.02} position={[0, 1.55, 0]}>
            {metal('#6b4a2c', 0.8, 0)}
          </RoundedBox>
          {[-1.65, 1.65].map((x) =>
            [-0.4, 0.4].map((z) => (
              <mesh key={x + '' + z} position={[x, 0.75, z]}>
                <boxGeometry args={[0.08, 1.5, 0.08]} />
                {metal('#2a2d34')}
              </mesh>
            ))
          )}
          <RoundedBox args={[3.4, 0.06, 0.9]} radius={0.01} position={[0, 0.45, 0]}>
            {metal('#2a2d34')}
          </RoundedBox>
          {/* morsa e lattine d'olio */}
          <RoundedBox args={[0.3, 0.22, 0.25]} radius={0.03} position={[1.3, 1.72, 0.2]}>
            {metal('#2a4fd0', 0.4, 0.5)}
          </RoundedBox>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[-1.2 + i * 0.26, 1.78, 0.1]}>
              <cylinderGeometry args={[0.1, 0.1, 0.34, 18]} />
              {metal(['#d4141c', '#2a2d34', '#ffb03a'][i], 0.35, 0.6)}
            </mesh>
          ))}
          {/* casco sul banco */}
          <mesh position={[0.3, 1.82, 0.05]} scale={[0.26, 0.24, 0.3]}>
            <sphereGeometry args={[1, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            <meshPhysicalMaterial color="#e9ebef" roughness={0.25} clearcoat={1} />
          </mesh>
          {/* lampada da banco */}
          <pointLight position={[0, 2.3, 0.4]} color="#ffe2b8" intensity={3} distance={4} />
        </group>

        {/* cassettiera rossa su ruote */}
        <group position={[2.2, 0, 0.5]}>
          <RoundedBox args={[1.5, 1.6, 0.8]} radius={0.04} position={[0, 0.95, 0]}>
            <meshPhysicalMaterial color="#b3121b" roughness={0.3} metalness={0.3} clearcoat={0.8} />
          </RoundedBox>
          {Array.from({ length: 6 }).map((_, i) => (
            <group key={i} position={[0, 0.3 + i * 0.25, 0.41]}>
              <mesh>
                <boxGeometry args={[1.4, 0.008, 0.01]} />
                {metal('#000')}
              </mesh>
              <mesh position={[0, 0.11, 0.01]}>
                <boxGeometry args={[0.9, 0.025, 0.03]} />
                {metal('#c4c9d2', 0.25, 0.9)}
              </mesh>
            </group>
          ))}
          {[-0.6, 0.6].map((x) => (
            <mesh key={x} position={[x, 0.08, 0.25]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.08, 0.08, 0.06, 14]} />
              {metal('#111')}
            </mesh>
          ))}
        </group>

        {/* pila di pneumatici */}
        <group position={[5.6, 0, 1.0]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[(i % 2) * 0.06, 0.2 + i * 0.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.55, 0.19, 14, 32]} />
              <meshStandardMaterial color="#111214" roughness={0.95} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ---------- Parete destra: serranda ---------- */}
      <group position={[ROOM - 0.05, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 2.2, 0.02]}>
          <planeGeometry args={[5, 4.4]} />
          {metal('#555a63', 0.5, 0.6)}
        </mesh>
        {Array.from({ length: 22 }).map((_, i) => (
          <mesh key={i} position={[0, 0.1 + i * 0.2, 0.05]}>
            <boxGeometry args={[5, 0.03, 0.04]} />
            {metal('#3a3e46', 0.5, 0.6)}
          </mesh>
        ))}
        <mesh position={[0, 4.5, 0.15]}>
          <boxGeometry args={[5.3, 0.3, 0.3]} />
          {metal('#2a2d34')}
        </mesh>
      </group>

      {/* ---------- Parete sinistra: scaffale ---------- */}
      <group position={[-ROOM + 0.5, 0, 1]} rotation={[0, Math.PI / 2, 0]}>
        {[0.6, 1.6, 2.6, 3.6].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[4, 0.06, 0.8]} />
            {metal('#2a2d34')}
          </mesh>
        ))}
        {[-1.95, 1.95].map((x) => (
          <mesh key={x} position={[x, 2, 0]}>
            <boxGeometry args={[0.06, 4, 0.8]} />
            {metal('#d8a51a', 0.5, 0.3)}
          </mesh>
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh key={i} position={[-1.6 + (i % 5) * 0.8, 0.85 + Math.floor(i / 5) * 2, 0]}>
            <boxGeometry args={[0.6, 0.45, 0.55]} />
            {metal(['#7a5a3a', '#2a4fd0', '#7a5a3a', '#d4141c', '#5b6474'][i % 5], 0.8, 0)}
          </mesh>
        ))}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-1 + i * 0.9, 1.85, 0]}>
            <torusGeometry args={[0.32, 0.12, 10, 24]} />
            <meshStandardMaterial color="#111214" roughness={0.95} />
          </mesh>
        ))}
      </group>

      {/* ---------- Luci ---------- */}
      {/* luce principale dall'alto sulla moto */}
      <SpotLamp pos={[0.6, 4.6, 1.2]} target={[0, 0.6, 0]} intensity={42} angle={0.5} />
      {/* luci di contorno da dietro: staccano la sagoma dallo sfondo */}
      <SpotLamp pos={[-2.8, 4.2, -2.6]} target={[0, 0.8, 0]} intensity={40} angle={0.45} color="#9fc4ff" />
      <SpotLamp pos={[3, 4.2, -2.4]} target={[0, 0.8, 0]} intensity={36} angle={0.45} color="#ffd9a8" />
      {/* luci d'ambiente sulle pareti */}
      <SpotLamp pos={[-1.6, 5, -6]} target={[-1.6, 1.5, -7.6]} intensity={22} angle={0.6} beam={false} />
      <SpotLamp pos={[3.5, 5, -6]} target={[3.5, 0.5, -7.6]} intensity={18} angle={0.55} beam={false} />
      <SpotLamp pos={[-6.2, 5, 1]} target={[-7.5, 1.5, 1]} intensity={14} angle={0.7} beam={false} />
    </group>
  )
}
