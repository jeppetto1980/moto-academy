// Pezzi 3D riutilizzabili dai capitoli: molle, tubi, particelle che scorrono lungo un percorso.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.35, ...o })
export const glass = (color = '#9fc4ff', opacity = 0.12) =>
  new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false })

// Molla elicoidale alta 1 (va scalata in y per comprimerla)
export function useSpringGeo(radius = 0.12, turns = 7, wire = 0.018) {
  return useMemo(() => {
    const pts = []
    const n = turns * 24
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const a = t * turns * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * radius, t, Math.sin(a) * radius))
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, wire, 6, false)
  }, [radius, turns, wire])
}

export function Tube({ a, b, r = 0.03, material, color }) {
  const { pos, quat, len } = useMemo(() => {
    const A = new THREE.Vector3(...a)
    const B = new THREE.Vector3(...b)
    const dir = new THREE.Vector3().subVectors(B, A)
    const len = dir.length()
    return {
      len,
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
      pos: new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5),
    }
  }, [a, b])
  return (
    <mesh position={pos} quaternion={quat} material={material}>
      <cylinderGeometry args={[r, r, len, 14]} />
      {!material && <meshStandardMaterial color={color || '#8d96a6'} metalness={0.6} roughness={0.35} />}
    </mesh>
  )
}

// Tubo che segue una spezzata (con curve morbide)
export function Pipe({ points, r = 0.06, material, closed = false }) {
  const geo = useMemo(() => {
    const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', 0.1)
    return new THREE.TubeGeometry(c, points.length * 24, r, 12, closed)
  }, [points, r, closed])
  return <mesh geometry={geo} material={material} />
}

/**
 * Particelle lungo un percorso.
 * speedRef / colorFn opzionali: colorFn(t) restituisce un colore THREE per la posizione t (0..1).
 */
export function PathFlow({ points, count = 30, size = 0.05, color = '#5fb4ff', speed = 0.25, speedRef, visibleRef, colorFn, closed = false, jitter = 0.03 }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', 0.1), [points, closed])
  const mesh = useRef()
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({ t: i / count, j: [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5] })), [count])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const col = useMemo(() => new THREE.Color(), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    const m = mesh.current
    if (!m) return
    const sp = speedRef ? speedRef.current : speed
    const vis = visibleRef ? visibleRef.current : 1
    seeds.forEach((s, i) => {
      s.t = (s.t + dt * sp) % 1
      if (s.t < 0) s.t += 1
      curve.getPointAt(s.t, p)
      dummy.position.set(p.x + s.j[0] * jitter, p.y + s.j[1] * jitter, p.z + s.j[2] * jitter)
      dummy.scale.setScalar(vis > 0.02 ? 1 : 0.0001)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      if (colorFn) {
        colorFn(s.t, col)
        m.setColorAt(i, col)
      }
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[null, null, count]} frustumCulled={false}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial color={colorFn ? '#ffffff' : color} />
    </instancedMesh>
  )
}

// Evidenziazione pulsante di un materiale
export function pulseHL(material, on, t) {
  material.emissive.set(on ? '#ff6a1a' : '#000000')
  material.emissiveIntensity = on ? 0.35 + 0.3 * Math.sin(t * 5) : 0
}

// Ruota dentata semplice
export function sprocketGeo(r, teeth, depth = 0.08) {
  const s = new THREE.Shape()
  const step = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    const pts = [
      [r - 0.05, a],
      [r + 0.04, a + step * 0.25],
      [r + 0.04, a + step * 0.5],
      [r - 0.05, a + step * 0.75],
    ]
    pts.forEach(([rr, aa], j) => (i === 0 && j === 0 ? s.moveTo(rr * Math.cos(aa), rr * Math.sin(aa)) : s.lineTo(rr * Math.cos(aa), rr * Math.sin(aa))))
  }
  const h = new THREE.Path()
  h.absarc(0, 0, r * 0.25, 0, Math.PI * 2, true)
  s.holes.push(h)
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false })
  g.translate(0, 0, -depth / 2)
  return g
}
