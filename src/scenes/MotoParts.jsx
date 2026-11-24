// Parti dettagliate della moto: serbatoio morbido, ruote, manubrio completo, fari e fanale LED.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { RacingCaliper } from './MotoParts3'
import * as THREE from 'three'

// ---------- utilità ----------
export function mergeGeos(geos) {
  // unisce più geometrie non indicizzate in una sola (meno oggetti da disegnare)
  const list = geos.map((g) => (g.index ? g.toNonIndexed() : g))
  let total = 0
  list.forEach((g) => (total += g.attributes.position.count))
  const pos = new Float32Array(total * 3)
  const nor = new Float32Array(total * 3)
  let o = 0
  list.forEach((g) => {
    pos.set(g.attributes.position.array, o * 3)
    nor.set(g.attributes.normal.array, o * 3)
    o += g.attributes.position.count
  })
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  return out
}

export function Pipe({ points, r = 0.02, material, segs = 32 }) {
  const geo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
    return new THREE.TubeGeometry(c, segs, r, 12, false)
  }, [points, r, segs])
  return <mesh geometry={geo} material={material} />
}

let haloTex = null
function getHaloTex() {
  if (haloTex) return haloTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.2, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  haloTex = new THREE.CanvasTexture(c)
  haloTex.colorSpace = THREE.SRGBColorSpace
  return haloTex
}

// Alone luminoso sempre rivolto verso la camera
export function Halo({ position, color = '#ffffff', size = 0.3, opacity = 0.8 }) {
  const tex = getHaloTex()
  return (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial map={tex} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </sprite>
  )
}

const glowMat = (color, intensity = 4) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, toneMapped: false })

// ---------- serbatoio: sfera deformata in una forma morbida e muscolosa ----------
export function useTankGeo() {
  return useMemo(() => {
    const g = new THREE.SphereGeometry(1, 72, 48)
    const p = g.attributes.position
    const v = new THREE.Vector3()
    const smooth = (a, b, x) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
      return t * t * (3 - 2 * t)
    }
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i)
      const u = (v.x + 1) / 2 // 0 = dietro, 1 = davanti
      // profilo laterale: alto e pieno davanti, scende verso la sella
      const top = 0.17 + 0.09 * smooth(0, 0.7, u)
      const centerY = 1.43 + 0.05 * smooth(0, 0.8, u)
      let y = v.y > 0 ? centerY + v.y * top : centerY + v.y * 0.16
      y = Math.max(y, 1.24 + 0.05 * u) // fondo piatto
      // larghezza: più larga davanti, rientranze per le ginocchia dietro
      let w = 0.17 + 0.09 * smooth(0, 0.65, u)
      const knee = (1 - smooth(0.15, 0.55, u)) * smooth(-0.6, 0.3, -v.y)
      w *= 1 - 0.28 * knee
      // sezione un po' "squadrata" per un look moderno
      const sz = Math.sign(v.z) * Math.pow(Math.abs(v.z), 0.82)
      const x = 0.43 + v.x * 0.47 - 0.05 * (1 - u) * (v.y > 0 ? v.y : 0)
      p.setXYZ(i, x, y, sz * w)
    }
    g.computeVertexNormals()
    return g
  }, [])
}

// ---------- ruota ----------
function useTireGeo(halfW) {
  return useMemo(() => {
    const pts = []
    const n = 40
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 - 0.55 + ((Math.PI + 1.1) * i) / n
      pts.push(new THREE.Vector2(0.5 + 0.105 * Math.cos(a), halfW * Math.sin(a)))
    }
    pts.unshift(new THREE.Vector2(0.43, -halfW * 0.72))
    pts.push(new THREE.Vector2(0.43, halfW * 0.72))
    const g = new THREE.LatheGeometry(pts, 96)
    g.rotateX(Math.PI / 2)
    return g
  }, [halfW])
}

function useRimGeo(halfW) {
  return useMemo(() => {
    const w = halfW * 0.78
    const pts = [
      new THREE.Vector2(0.445, -w),
      new THREE.Vector2(0.41, -w),
      new THREE.Vector2(0.395, -w * 0.4),
      new THREE.Vector2(0.385, 0),
      new THREE.Vector2(0.395, w * 0.4),
      new THREE.Vector2(0.41, w),
      new THREE.Vector2(0.445, w),
    ]
    const g = new THREE.LatheGeometry(pts, 96)
    g.rotateX(Math.PI / 2)
    return g
  }, [halfW])
}

// Texture del pneumatico: battistrada a spina di pesce + scritte sul fianco (usata come rilievo)
const tireTexCache = {}
function getTireTex(label) {
  if (tireTexCache[label]) return tireTexCache[label]
  const W = 2048
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#7a7a7a'
  ctx.fillRect(0, 0, W, H)
  // leggera grana della gomma
  for (let i = 0; i < 9000; i++) {
    const v = 110 + Math.random() * 30
    ctx.fillStyle = `rgb(${v},${v},${v})`
    ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2)
  }
  // battistrada: intagli curvi alternati sui due lati del centro (v 0.3–0.7)
  ctx.strokeStyle = '#000'
  ctx.lineCap = 'round'
  const K = 44
  for (let k = 0; k < K; k++) {
    const x0 = (k / K) * W
    for (const side of [-1, 1]) {
      const off = side > 0 ? 0 : W / K / 2
      ctx.lineWidth = 9
      ctx.beginPath()
      ctx.moveTo(x0 + off, H * 0.5 + side * 18)
      ctx.bezierCurveTo(x0 + off + 14, H * 0.5 + side * 60, x0 + off + 30, H * 0.5 + side * 92, x0 + off + 52, H * 0.5 + side * 108)
      ctx.stroke()
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(x0 + off + 20, H * 0.5 + side * 120)
      ctx.lineTo(x0 + off + 34, H * 0.5 + side * 150)
      ctx.stroke()
    }
  }
  // scanalatura centrale sottile
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, H * 0.5)
  ctx.lineTo(W, H * 0.5)
  ctx.globalAlpha = 0.4
  ctx.stroke()
  ctx.globalAlpha = 1
  // scritte in rilievo sui fianchi
  ctx.fillStyle = '#e8e8e8'
  ctx.font = '800 34px system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  for (const vy of [0.12, 0.88]) {
    for (const x of [100, 1124]) {
      ctx.save()
      ctx.translate(x, H * vy)
      if (vy > 0.5) ctx.scale(-1, -1) // lato destro: testo leggibile anche da questo lato
      ctx.fillText(label + '   TUBELESS   RADIAL', 0, 0)
      ctx.restore()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.anisotropy = 8
  tireTexCache[label] = t
  return t
}

export function Wheel({ x, m, front, discGeo, spinRef }) {
  const halfW = front ? 0.1 : 0.135
  const tire = useTireGeo(halfW)
  const rim = useRimGeo(halfW)
  const ref = useRef()
  const tireMat = useMemo(() => {
    const t = getTireTex(front ? '110/70 R17 54H' : '150/60 R17 66H')
    return new THREE.MeshStandardMaterial({ color: '#4a4c50', roughness: 0.9, metalness: 0, map: t, bumpMap: t, bumpScale: 3.2 })
  }, [front])
  const rimMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c7ccd4', metalness: 0.95, roughness: 0.22 }), [])
  const spokeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d4d8df', metalness: 0.9, roughness: 0.32 }), [])
  // raggi a filo incrociati: 36 raggi, metà per lato
  const spokesGeo = useMemo(() => {
    const geos = []
    const N = 36
    const up = new THREE.Vector3(0, 1, 0)
    for (let i = 0; i < N; i++) {
      const side = i % 2 ? 1 : -1
      const a = (i / N) * Math.PI * 2
      const lean = (Math.floor(i / 2) % 2 ? 1 : -1) * 0.55 // incrocio tangente
      const A = new THREE.Vector3(Math.cos(a) * 0.075, Math.sin(a) * 0.075, side * halfW * 0.55)
      const B = new THREE.Vector3(Math.cos(a + lean) * 0.39, Math.sin(a + lean) * 0.39, side * halfW * 0.18)
      const dir = B.clone().sub(A)
      const len = dir.length()
      const g = new THREE.CylinderGeometry(0.006, 0.006, len, 6)
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize()))
      g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2)
      geos.push(g)
      // nipplo sul cerchio
      const n = new THREE.CylinderGeometry(0.008, 0.008, 0.025, 6)
      n.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize()))
      n.translate(B.x - dir.x / len * 0.01, B.y - dir.y / len * 0.01, B.z - dir.z / len * 0.01)
      geos.push(n)
    }
    return mergeGeos(geos)
  }, [halfW])
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z -= dt * (spinRef ? spinRef.current : 0.5)
  })
  return (
    <group position={[x, 0.6, 0]}>
      <group ref={ref}>
        <mesh geometry={tire} material={tireMat} />
        <mesh geometry={rim} material={rimMat} />
        <mesh geometry={spokesGeo} material={spokeMat} />
        {/* flange del mozzo */}
        {[-1, 1].map((s) => (
          <mesh key={s} material={m.alloy} position={[0, 0, s * halfW * 0.55]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.085, 0.085, 0.012, 32]} />
          </mesh>
        ))}
        {/* mozzo */}
        <mesh material={rimMat} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, halfW * 1.25, 24]} />
        </mesh>
        <mesh material={m.alloy} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, halfW * 1.7, 16]} />
        </mesh>
        <mesh material={m.gold} position={[0, 0, halfW * 0.9]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.02, 6]} />
        </mesh>
        {/* valvola */}
        <mesh material={m.alloy} position={[0.4, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.04, 8]} />
        </mesh>
        {/* disco flottante con flangia e rivetti */}
        {(front ? [1, -1] : [-1]).map((s) => (
          <group key={s} position={[0, 0, s * (halfW + 0.005)]}>
            <mesh geometry={discGeo} material={m.disc} />
            <mesh material={m.alloy}>
              <torusGeometry args={[front ? 0.15 : 0.11, 0.02, 8, 40]} />
            </mesh>
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i / 8) * Math.PI * 2
              const r = front ? 0.185 : 0.135
              return (
                <mesh key={i} material={m.gold} position={[Math.cos(a) * r, Math.sin(a) * r, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.011, 0.011, 0.02, 10]} />
                </mesh>
              )
            })}
          </group>
        ))}
      </group>
      {/* pinze */}
      {front ? (
        [1, -1].map((s) => <RacingCaliper key={s} discR={0.3} center={2.3} span={0.72} discZ={s * (halfW + 0.005)} side={s} />)
      ) : (
        <RacingCaliper discR={0.22} center={-1.75} span={0.6} discZ={-(halfW + 0.005)} side={-1} small />
      )}
    </group>
  )
}

// ---------- manubrio, leve, comandi, specchi ----------
export function Handlebar({ m }) {
  const mats = useMemo(
    () => ({
      rubber: new THREE.MeshStandardMaterial({ color: '#141518', roughness: 0.95 }),
      kill: new THREE.MeshStandardMaterial({ color: '#d4141c', roughness: 0.5 }),
      fluid: new THREE.MeshPhysicalMaterial({ color: '#3a3f4a', transparent: true, opacity: 0.55, roughness: 0.1 }),
      mirror: new THREE.MeshStandardMaterial({ color: '#eef4ff', metalness: 1, roughness: 0.02, envMapIntensity: 1.6 }),
      stem: new THREE.MeshStandardMaterial({ color: '#dfe3ea', metalness: 1, roughness: 0.16 }),
      rim: new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 0.95, roughness: 0.25 }),
    }),
    []
  )
  const barPts = (s) => [
    [0.905, 1.765, 0],
    [0.9, 1.772, s * 0.14],
    [0.885, 1.79, s * 0.28],
    [0.87, 1.805, s * 0.4],
  ]
  return (
    <group>
      {/* piastra superiore della forcella e tappi dorati */}
      <RoundedBox args={[0.2, 0.035, 0.36]} radius={0.015} position={[0.965, 1.66, 0]} rotation={[0, 0, -0.32]} material={m.alloy} />
      {[-0.12, 0.12].map((z) => (
        <mesh key={z} material={m.gold} position={[0.955, 1.69, z]} rotation={[0, 0, -0.32]}>
          <cylinderGeometry args={[0.035, 0.035, 0.03, 6]} />
        </mesh>
      ))}
      {/* cavallotti */}
      {[-0.06, 0.06].map((z) => (
        <RoundedBox key={z} args={[0.05, 0.08, 0.04]} radius={0.012} position={[0.91, 1.72, z]} material={m.black} />
      ))}
      {/* manubrio conificato */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Pipe points={barPts(s)} r={0.0175} material={m.black} />
          {/* manopola con nervature e contrappeso */}
          <group position={[0.874, 1.802, s * 0.36]}>
            <mesh material={mats.rubber} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.026, 0.026, 0.12, 20]} />
            </mesh>
            {Array.from({ length: 6 }).map((_, i) => (
              <mesh key={i} material={mats.rubber} position={[0, 0, -0.05 + i * 0.02]}>
                <torusGeometry args={[0.027, 0.004, 6, 20]} />
              </mesh>
            ))}
            <mesh material={m.alloy} position={[0, 0, s * 0.075]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.022, 0.026, 0.035, 16]} />
            </mesh>
          </group>
          {/* blocchetti comandi */}
          <RoundedBox args={[0.06, 0.05, 0.05]} radius={0.015} position={[0.885, 1.795, s * 0.27]} material={m.black} />
          {s < 0 && <RoundedBox args={[0.02, 0.018, 0.022]} radius={0.005} position={[0.86, 1.825, -0.27]} material={mats.kill} />}
          {/* leva (destra freno, sinistra frizione) con perno */}
          <RoundedBox args={[0.04, 0.03, 0.035]} radius={0.01} position={[0.9, 1.79, s * 0.22]} material={m.black} />
          <Pipe points={[[0.915, 1.787, s * 0.23], [0.955, 1.785, s * 0.27], [0.965, 1.782, s * 0.33], [0.96, 1.78, s * 0.39]]} r={0.0065} material={m.alloy} segs={16} />
          {/* specchio */}
          {/* stelo specchio in metallo con snodo a sfera */}
          <mesh material={mats.stem} position={[0.89, 1.805, s * 0.25]}>
            <cylinderGeometry args={[0.012, 0.014, 0.025, 12]} />
          </mesh>
          <Pipe points={[[0.89, 1.81, s * 0.25], [0.875, 1.9, s * 0.29], [0.85, 2.0, s * 0.34]]} r={0.0068} material={mats.stem} segs={24} />
          <mesh material={mats.stem} position={[0.848, 2.004, s * 0.342]}>
            <sphereGeometry args={[0.011, 12, 10]} />
          </mesh>
          <group position={[0.84, 2.03, s * 0.36]} rotation={[0, s * 0.2, 0]}>
            <mesh material={m.black} scale={[0.025, 0.045, 0.075]}>
              <sphereGeometry args={[1, 20, 14]} />
            </mesh>
            {/* vetro dello specchio con cornice */}
            <mesh material={mats.mirror} position={[-0.027, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[1, 0.58, 1]}>
              <circleGeometry args={[0.07, 32]} />
            </mesh>
            <mesh material={mats.rim} position={[-0.026, 0, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[1, 0.58, 1]}>
              <torusGeometry args={[0.07, 0.004, 6, 32]} />
            </mesh>
          </group>
        </group>
      ))}
      {/* serbatoio olio freno anteriore */}
      <group position={[0.875, 1.83, -0.2]}>
        <mesh material={mats.fluid}>
          <cylinderGeometry args={[0.022, 0.022, 0.04, 16]} />
        </mesh>
        <mesh material={m.black} position={[0, 0.024, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 0.008, 16]} />
        </mesh>
      </group>

    </group>
  )
}

// ---------- strumentazione TFT con grafica ----------
export function Dash({ m }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 160
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#05070c'
    ctx.fillRect(0, 0, 256, 160)
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = i < 6 ? '#2fd47a' : i < 16 ? '#ffb03a' : '#ff4d5e'
      ctx.globalAlpha = i < 9 ? 1 : 0.25
      ctx.fillRect(14 + i * 11.5, 22 + (19 - i) * 1.2, 9, 22 - (19 - i) * 1.2)
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 64px system-ui, sans-serif'
    ctx.fillText('0', 30, 120)
    ctx.font = '700 18px system-ui, sans-serif'
    ctx.fillStyle = '#9aa3b2'
    ctx.fillText('km/h', 76, 120)
    ctx.fillStyle = '#2fd47a'
    ctx.font = '900 54px system-ui, sans-serif'
    ctx.fillText('N', 196, 118)
    ctx.fillStyle = '#ff6a1a'
    ctx.fillRect(14, 140, 228, 3)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return (
    <group position={[0.945, 1.745, 0]} rotation={[0, 0, 0.75]}>
      <RoundedBox args={[0.035, 0.12, 0.19]} radius={0.012} material={m.black} />
      <mesh position={[0.019, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.165, 0.1]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ---------- faro anteriore full LED ----------
export function Headlight({ m, castLight = true }) {
  const drl = useMemo(() => glowMat('#e8f4ff', 8), [])
  const proj = useMemo(() => glowMat('#ffffff', 10), [])
  const amber = useMemo(() => glowMat('#ffa31a', 6), [])
  const lens = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#c8d6e8', transparent: true, opacity: 0.18, roughness: 0.02, metalness: 0, clearcoat: 1 }), [])
  const chrome = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e8ecf2', metalness: 1, roughness: 0.08 }), [])
  const target = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(3.6, 0, 0)
    return o
  }, [])
  return (
    <group>
      <group position={[1.135, 1.42, 0]} rotation={[0, 0, -0.3]}>
        {/* corpo */}
        <RoundedBox args={[0.17, 0.29, 0.32]} radius={0.06} smoothness={6} material={m.black} />
        {/* cornice anteriore */}
        <RoundedBox args={[0.02, 0.25, 0.28]} radius={0.008} position={[0.085, 0, 0]} material={m.matte} />
        {/* parabola cromata e proiettore */}
        <mesh material={chrome} position={[0.07, -0.045, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.035, 0.05, 32, 1, true]} />
        </mesh>
        <mesh material={proj} position={[0.092, -0.045, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 0.008, 32]} />
        </mesh>
        <mesh material={lens} position={[0.088, -0.045, 0]} scale={[0.35, 1, 1]}>
          <sphereGeometry args={[0.072, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        {/* luci diurne a sopracciglio */}
        {[-1, 1].map((s) => (
          <group key={s} position={[0.097, 0.065, s * 0.075]} rotation={[s * 0.5, 0, 0]}>
            <RoundedBox args={[0.012, 0.024, 0.13]} radius={0.006} material={drl} />
          </group>
        ))}
        <Halo position={[0.13, 0.065, 0.075]} color="#dcefff" size={0.2} opacity={0.55} />
        <Halo position={[0.13, 0.065, -0.075]} color="#dcefff" size={0.2} opacity={0.55} />
        <Halo position={[0.13, -0.045, 0]} color="#ffffff" size={0.3} opacity={0.7} />
      </group>
      {/* fascio di luce che illumina il pavimento davanti alla moto */}
      {castLight && (
        <>
          <primitive object={target} />
          <spotLight position={[1.25, 1.4, 0]} target={target} color="#e8f2ff" intensity={30} angle={0.45} penumbra={0.6} distance={9} decay={1.5} />
        </>
      )}
    </group>
  )
}

// ---------- fanale posteriore LED ----------
export function Taillight({ m }) {
  const red = useMemo(() => glowMat('#ff1a1a', 14), [])
  const amber = useMemo(() => glowMat('#ffa31a', 6), [])
  const plateTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 160
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#f4f4f4'
    ctx.fillRect(0, 0, 256, 160)
    ctx.strokeStyle = '#222'
    ctx.lineWidth = 6
    ctx.strokeRect(4, 4, 248, 152)
    ctx.fillStyle = '#1747c9'
    ctx.fillRect(4, 4, 40, 152)
    ctx.fillStyle = '#111'
    ctx.font = '900 54px system-ui, sans-serif'
    ctx.fillText('MA 125', 56, 100)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return (
    <group>
      <group position={[-1.295, 1.555, 0]} rotation={[0, 0, 0.35]}>
        <RoundedBox args={[0.02, 0.04, 0.17]} radius={0.008} material={m.black} />
        <RoundedBox args={[0.008, 0.022, 0.15]} radius={0.004} position={[-0.012, 0, 0]} material={red} />
        <Halo position={[-0.04, 0, 0]} color="#ff2a2a" size={0.3} opacity={0.7} />
      </group>
      <pointLight position={[-1.4, 1.5, 0]} color="#ff2020" intensity={1.2} distance={1.6} />
      {/* portatarga con targa */}
      <Pipe points={[[-1.05, 1.36, 0], [-1.2, 1.24, 0], [-1.3, 1.13, 0]]} r={0.016} material={m.black} segs={12} />
      <mesh position={[-1.315, 1.075, 0]} rotation={[0, -Math.PI / 2, -0.25]}>
        <planeGeometry args={[0.17, 0.11]} />
        <meshStandardMaterial map={plateTex} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ---------- pinza freno monoblocco: corpo arrotondato che abbraccia il disco ----------
function sectorShape(rIn, rOut, a0, a1, n = 16) {
  const s = new THREE.Shape()
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    const p = [Math.cos(a) * rOut, Math.sin(a) * rOut]
    i ? s.lineTo(...p) : s.moveTo(...p)
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n
    s.lineTo(Math.cos(a) * rIn, Math.sin(a) * rIn)
  }
  s.closePath()
  return s
}

export function Caliper({ discR = 0.3, center = 2.44, span = 0.72, discZ = 0.105, side = 1, material, small = false }) {
  const half = small ? 0.026 : 0.034 // spessore di ogni metà
  const gap = 0.012 // spazio per il disco
  const geo = useMemo(() => {
    const rIn = discR - (small ? 0.075 : 0.09)
    const rOut = discR + 0.035
    const halfG = new THREE.ExtrudeGeometry(sectorShape(rIn, rOut, center - span / 2, center + span / 2), {
      depth: half,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 5,
      curveSegments: 24,
    })
    const bridge = new THREE.ExtrudeGeometry(sectorShape(discR + 0.012, rOut + 0.004, center - span / 2 + 0.04, center + span / 2 - 0.04), {
      depth: gap + 0.02,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 4,
      curveSegments: 24,
    })
    return { halfG, bridge }
  }, [discR, center, span, half, small])
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d8dce3', metalness: 1, roughness: 0.2 }), [])
  const pistonMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2d34', metalness: 0.6, roughness: 0.35 }), [])
  const pistons = small ? [0] : [-0.16, 0.16]
  const pr = discR - 0.03
  return (
    <group position={[0, 0, discZ]}>
      {/* metà esterna e metà interna */}
      <mesh geometry={geo.halfG} material={material} position={[0, 0, side * (gap / 2 + 0.012)]} scale={[1, 1, side]} />
      <mesh geometry={geo.halfG} material={material} position={[0, 0, -side * (gap / 2 + 0.012)]} scale={[1, 1, -side]} />
      {/* ponte sopra il disco */}
      <mesh geometry={geo.bridge} material={material} position={[0, 0, -(gap + 0.02) / 2]} />
      {/* rigonfiamenti dei pistoncini sul lato esterno */}
      {pistons.map((o, i) => {
        const a = center + o * span
        return (
          <mesh key={i} material={material} position={[Math.cos(a) * pr, Math.sin(a) * pr, side * (gap / 2 + half + 0.024)]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[small ? 0.026 : 0.032, small ? 0.03 : 0.036, 0.014, 24]} />
          </mesh>
        )
      })}
      {/* finestra centrale con perno pastiglie */}
      <mesh material={pistonMat} position={[Math.cos(center) * (discR + 0.02), Math.sin(center) * (discR + 0.02), side * (gap / 2 + half + 0.02)]} rotation={[0, 0, center]}>
        <boxGeometry args={[0.02, small ? 0.05 : 0.08, 0.006]} />
      </mesh>
      {/* viti di fissaggio radiali e valvola di spurgo */}
      {[-1, 1].map((k) => {
        const a = center + k * (span / 2 + 0.02)
        return (
          <mesh key={k} material={steel} position={[Math.cos(a) * (discR - 0.03), Math.sin(a) * (discR - 0.03), -side * 0.03]} rotation={[0, 0, a]}>
            <cylinderGeometry args={[0.011, 0.011, 0.05, 6]} />
          </mesh>
        )
      })}
      <mesh material={steel} position={[Math.cos(center - span * 0.3) * (discR + 0.05), Math.sin(center - span * 0.3) * (discR + 0.05), side * 0.02]} rotation={[0, 0, center - span * 0.3 - Math.PI / 2]}>
        <cylinderGeometry args={[0.006, 0.008, 0.03, 8]} />
      </mesh>
    </group>
  )
}

// ---------- tubi e cavi morbidi ----------
export function Hose({ points, r = 0.008, material, fittings = true }) {
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d8dce3', metalness: 1, roughness: 0.2 }), [])
  const geo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal')
    return new THREE.TubeGeometry(c, 96, r, 10, false)
  }, [points, r])
  return (
    <group>
      <mesh geometry={geo} material={material} />
      {fittings &&
        [points[0], points[points.length - 1]].map((p, i) => (
          <mesh key={i} material={steel} position={p}>
            <sphereGeometry args={[r * 1.9, 12, 10]} />
          </mesh>
        ))}
    </group>
  )
}

export function Cables({ m }) {
  const hoseMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#15161a', metalness: 0.2, roughness: 0.45 }), [])
  const cableMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#202227', metalness: 0.1, roughness: 0.6 }), [])
  const wireMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0d0e10', metalness: 0, roughness: 0.7 }), [])
  return (
    <group>
      {/* freno anteriore: pompa → ripartitore → due pinze */}
      <Hose points={[[0.875, 1.81, -0.2], [0.97, 1.74, -0.17], [1.05, 1.56, -0.06], [1.1, 1.36, 0]]} material={hoseMat} />
      <mesh material={m.alloy} position={[1.105, 1.345, 0]}>
        <boxGeometry args={[0.03, 0.03, 0.05]} />
      </mesh>
      {[-1, 1].map((s) => (
        <Hose key={s} points={[[1.105, 1.335, s * 0.02], [1.14, 1.22, s * 0.11], [1.175, 1.05, s * 0.17], [1.16, 0.93, s * 0.135]]} material={hoseMat} />
      ))}
      {/* freno posteriore: pompa vicino alla pedana destra → pinza */}
      <mesh material={m.black} position={[-0.17, 0.83, -0.25]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.018, 0.018, 0.09, 12]} />
      </mesh>
      <Hose points={[[-0.18, 0.8, -0.25], [-0.45, 0.62, -0.24], [-0.95, 0.5, -0.215], [-1.27, 0.43, -0.18]]} material={hoseMat} />
      {/* cavi del gas (2) dalla manopola destra al corpo farfallato */}
      {[0, 0.014].map((o) => (
        <Hose key={o} points={[[0.89, 1.785, -0.255 + o], [0.99, 1.66, -0.21 + o], [0.86, 1.3, -0.13 + o], [0.4, 1.2, -0.09 + o], [0.12, 1.17, -0.03 + o]]} r={0.0055} material={cableMat} fittings={false} />
      ))}
      {/* cavo frizione dalla leva sinistra al carter */}
      <Hose points={[[0.9, 1.79, 0.235], [0.99, 1.64, 0.2], [0.82, 1.15, 0.24], [0.4, 0.92, 0.25], [0.06, 0.82, 0.215]]} r={0.0055} material={cableMat} fittings={false} />
      {/* cablaggi dei blocchetti verso il faro e il cruscotto */}
      {[-1, 1].map((s) => (
        <Hose key={s} points={[[0.89, 1.775, s * 0.26], [0.93, 1.69, s * 0.13], [1.0, 1.52, s * 0.05], [1.06, 1.44, s * 0.02]]} r={0.0045} material={wireMat} fittings={false} />
      ))}
      <Hose points={[[0.935, 1.72, 0], [0.99, 1.6, 0.01], [1.055, 1.47, 0]]} r={0.0045} material={wireMat} fittings={false} />
    </group>
  )
}

// ---------- trasmissione finale: pignone, corona e catena a maglie ----------
function sprocketShape(r, teeth, roller, holes = []) {
  const s = new THREE.Shape()
  const step = (Math.PI * 2) / teeth
  const tip = r + roller * 1.25
  const root = r - roller * 0.95
  let first = true
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    // sede del rullo (arco) e dente
    for (let k = -2; k <= 2; k++) {
      const aa = a + (k / 2) * step * 0.28
      const rr = root + (Math.abs(k) / 2) ** 2 * roller * 0.9
      const p = [Math.cos(aa) * rr, Math.sin(aa) * rr]
      first ? s.moveTo(...p) : s.lineTo(...p)
      first = false
    }
    const t1 = a + step * 0.42
    const t2 = a + step * 0.58
    s.lineTo(Math.cos(t1) * tip, Math.sin(t1) * tip)
    s.lineTo(Math.cos(t2) * tip, Math.sin(t2) * tip)
  }
  s.closePath()
  holes.forEach(([x, y, hr]) => {
    const h = new THREE.Path()
    h.absarc(x, y, hr, 0, Math.PI * 2, true)
    s.holes.push(h)
  })
  return s
}

export function ChainDrive({ front = [-0.16, 0.72], rear = [-1.33, 0.6], z = 0.215, frontTeeth = 14, rearTeeth = 43, wheelSpeed = 0.5, m }) {
  const P = 0.032 // passo catena
  const rf = (frontTeeth * P) / (2 * Math.PI)
  const rr = (rearTeeth * P) / (2 * Math.PI)
  const roller = P * 0.3
  const geo = useMemo(() => {
    const holes = []
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3
      holes.push([Math.cos(a) * rr * 0.58, Math.sin(a) * rr * 0.58, rr * 0.2])
      holes.push([Math.cos(a + Math.PI / 5) * rr * 0.36, Math.sin(a + Math.PI / 5) * rr * 0.36, rr * 0.05])
    }
    holes.push([0, 0, rr * 0.2])
    const corona = new THREE.ExtrudeGeometry(sprocketShape(rr, rearTeeth, roller, holes), { depth: 0.012, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1, curveSegments: 12 })
    corona.translate(0, 0, -0.006)
    const pignone = new THREE.ExtrudeGeometry(sprocketShape(rf, frontTeeth, roller, [[0, 0, rf * 0.35]]), { depth: 0.016, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1, curveSegments: 8 })
    pignone.translate(0, 0, -0.008)
    return { corona, pignone }
  }, [rf, rr, rearTeeth, frontTeeth, roller])

  // percorso della catena (tangenti esterne alle due ruote dentate)
  const path = useMemo(() => {
    const F = new THREE.Vector2(...front)
    const R = new THREE.Vector2(...rear)
    const d = R.clone().sub(F)
    const D = d.length()
    const phi = Math.atan2(d.y, d.x)
    const a = Math.asin((rr - rf) / D)
    const line = D * Math.cos(a)
    const segs = [line, rr * (Math.PI + 2 * a), line, rf * (Math.PI - 2 * a)]
    const L = segs.reduce((x, y) => x + y, 0)
    const cp = Math.cos(phi)
    const sp = Math.sin(phi)
    const toW = (x, y, out) => {
      out[0] = F.x + x * cp - y * sp
      out[1] = F.y + x * sp + y * cp
    }
    const at = (s, out) => {
      s = ((s % L) + L) % L
      let x, y, ang
      if (s < segs[0]) {
        const u = s / segs[0]
        const x0 = -rf * Math.sin(a), y0 = rf * Math.cos(a)
        const x1 = D - rr * Math.sin(a), y1 = rr * Math.cos(a)
        x = x0 + (x1 - x0) * u
        y = y0 + (y1 - y0) * u
        ang = Math.atan2(y1 - y0, x1 - x0)
      } else if ((s -= segs[0]) < segs[1]) {
        const t = Math.PI / 2 + a - s / rr
        x = D + rr * Math.cos(t)
        y = rr * Math.sin(t)
        ang = t - Math.PI / 2
      } else if ((s -= segs[1]) < segs[2]) {
        const u = s / segs[2]
        const x0 = D - rr * Math.sin(a), y0 = -rr * Math.cos(a)
        const x1 = -rf * Math.sin(a), y1 = -rf * Math.cos(a)
        x = x0 + (x1 - x0) * u
        y = y0 + (y1 - y0) * u
        ang = Math.atan2(y1 - y0, x1 - x0)
      } else {
        s -= segs[2]
        const t = -Math.PI / 2 - a - s / rf
        x = rf * Math.cos(t)
        y = rf * Math.sin(t)
        ang = t - Math.PI / 2
      }
      toW(x, y, out)
      out[2] = ang + phi
      return out
    }
    // il primo tratto è quello di sopra o di sotto nel mondo?
    const probe = [0, 0, 0]
    at(segs[0] / 2, probe)
    const firstIsTop = probe[1] > (F.y + R.y) / 2
    return { at, L, firstIsTop }
  }, [front, rear, rf, rr])

  const N = Math.floor(path.L / P)
  const plates = useRef()
  const rollers = useRef()
  const cor = useRef()
  const pig = useRef()
  const off = useRef(0)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tmp = useMemo(() => [0, 0, 0], [])
  const plateMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3b3f47', metalness: 0.85, roughness: 0.35 }), [])
  const rollerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b9a06a', metalness: 0.9, roughness: 0.3 }), [])
  const coronaMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9ced8', metalness: 0.9, roughness: 0.28 }), [])
  const pignoneMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7d838e', metalness: 0.95, roughness: 0.3 }), [])
  useFrame((_, dt) => {
    // la ruota gira in senso orario: il ramo superiore va verso il pignone
    const v = wheelSpeed * rr
    off.current += (path.firstIsTop ? -1 : 1) * v * dt
    for (let i = 0; i < N; i++) {
      path.at(off.current + i * P, tmp)
      // piastrine: alternate interne/esterne, su entrambi i lati
      for (let side = 0; side < 2; side++) {
        const zz = (side ? 1 : -1) * (i % 2 ? 0.0105 : 0.0145)
        dummy.position.set(tmp[0], tmp[1], z + zz)
        dummy.rotation.set(0, 0, tmp[2])
        dummy.scale.set(1, i % 2 ? 0.88 : 1, 1)
        dummy.updateMatrix()
        plates.current.setMatrixAt(i * 2 + side, dummy.matrix)
      }
      dummy.position.set(tmp[0] + Math.cos(tmp[2]) * P * 0.5, tmp[1] + Math.sin(tmp[2]) * P * 0.5, z)
      dummy.rotation.set(Math.PI / 2, 0, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      rollers.current.setMatrixAt(i, dummy.matrix)
    }
    plates.current.instanceMatrix.needsUpdate = true
    rollers.current.instanceMatrix.needsUpdate = true
    cor.current.rotation.z -= wheelSpeed * dt
    pig.current.rotation.z -= ((wheelSpeed * rr) / rf) * dt
  })
  return (
    <group>
      <group position={[rear[0], rear[1], z]}>
        <mesh ref={cor} geometry={geo.corona} material={coronaMat} />
        {/* viti della corona */}
        {Array.from({ length: 5 }).map((_, i) => {
          const a = (i / 5) * Math.PI * 2
          return (
            <mesh key={i} material={m.gold} position={[Math.cos(a) * rr * 0.32, Math.sin(a) * rr * 0.32, -0.008]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 0.01, 6]} />
            </mesh>
          )
        })}
      </group>
      <group position={[front[0], front[1], z]}>
        <mesh ref={pig} geometry={geo.pignone} material={pignoneMat} />
        <mesh material={m.black} position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[rf * 0.4, rf * 0.4, 0.01, 12]} />
        </mesh>
      </group>
      <instancedMesh ref={plates} args={[null, null, N * 2]} material={plateMat} frustumCulled={false}>
        <boxGeometry args={[P * 1.32, P * 0.62, 0.0035]} />
      </instancedMesh>
      <instancedMesh ref={rollers} args={[null, null, N]} material={rollerMat} frustumCulled={false}>
        <cylinderGeometry args={[roller, roller, 0.022, 10]} />
      </instancedMesh>
      {/* paracatena */}
      <mesh material={m.black} position={[-0.72, 0.745, z + 0.006]} rotation={[0, 0, Math.atan2(0.6 - 0.72, -1.33 + 0.16) + Math.PI]}>
        <boxGeometry args={[0.55, 0.012, 0.045]} />
      </mesh>
    </group>
  )
}
