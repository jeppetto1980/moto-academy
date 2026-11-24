// Pinze radiali monoblocco (stile racing), supporti e attacchi: ogni pezzo agganciato a qualcosa.
import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.35, ...o })

// Barra piatta tra due punti (staffe, supporti)
export function Strut({ a, b, w = 0.03, t = 0.01, material, round = false }) {
  const { pos, quat, len } = useMemo(() => {
    const A = new THREE.Vector3(...a)
    const B = new THREE.Vector3(...b)
    const d = B.clone().sub(A)
    return { len: d.length(), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), pos: A.clone().add(B).multiplyScalar(0.5) }
  }, [a, b])
  return (
    <group position={pos} quaternion={quat}>
      {round ? (
        <mesh material={material}>
          <cylinderGeometry args={[w / 2, w / 2, len, 12]} />
        </mesh>
      ) : (
        <RoundedBox args={[w, len + w * 0.6, t]} radius={Math.min(w, t) * 0.45} smoothness={3} material={material} />
      )}
    </group>
  )
}

export function Bolt({ position, axis = 'z', r = 0.012, len = 0.03, material }) {
  const rot = axis === 'z' ? [Math.PI / 2, 0, 0] : axis === 'x' ? [0, 0, Math.PI / 2] : [0, 0, 0]
  return (
    <group position={position} rotation={rot}>
      <mesh material={material}>
        <cylinderGeometry args={[r, r, len, 6]} />
      </mesh>
    </group>
  )
}

// ---------- pinza radiale monoblocco a 4 pistoncini ----------
// Profilo nel piano del disco: due lobi (pistoncini) con una "vita" centrale e la finestra per le pastiglie.
function caliperOutline(rI, rO, a0, a1, lobes) {
  const s = new THREE.Shape()
  const n = 40
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    const p = [Math.cos(a) * rO, Math.sin(a) * rO]
    i ? s.lineTo(...p) : s.moveTo(...p)
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n
    const a = a0 + (a1 - a0) * t
    // il bordo interno scende sui lobi e risale nella vita
    let bulge = 0
    lobes.forEach((c) => {
      const d = (t - c) / 0.2
      bulge += Math.exp(-d * d) * 0.028
    })
    const r = rI - bulge
    s.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  s.closePath()
  return s
}

export function RacingCaliper({ discR = 0.3, center = 2.3, span = 0.72, discZ = 0.105, side = 1, color = '#c3122a', small = false }) {
  const half = small ? 0.024 : 0.03
  const gap = 0.012
  const rO = discR + 0.032
  const rI = discR - (small ? 0.07 : 0.082)
  const a0 = center - span / 2
  const a1 = center + span / 2
  const lobes = small ? [0.5] : [0.27, 0.73]
  const geo = useMemo(() => {
    const body = new THREE.ExtrudeGeometry(caliperOutline(rI, rO, a0, a1, lobes), {
      depth: half,
      bevelEnabled: true,
      bevelThickness: 0.016,
      bevelSize: 0.014,
      bevelSegments: 7,
      curveSegments: 32,
    })
    // ponti alle estremità (la finestra centrale resta aperta)
    const bridge = (b0, b1) => {
      const s = new THREE.Shape()
      const n = 10
      for (let i = 0; i <= n; i++) {
        const a = b0 + ((b1 - b0) * i) / n
        i ? s.lineTo(Math.cos(a) * (rO + 0.004), Math.sin(a) * (rO + 0.004)) : s.moveTo(Math.cos(a) * (rO + 0.004), Math.sin(a) * (rO + 0.004))
      }
      for (let i = n; i >= 0; i--) {
        const a = b0 + ((b1 - b0) * i) / n
        s.lineTo(Math.cos(a) * (discR + 0.012), Math.sin(a) * (discR + 0.012))
      }
      s.closePath()
      const g = new THREE.ExtrudeGeometry(s, { depth: gap + 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 5, curveSegments: 12 })
      g.translate(0, 0, -(gap + 0.03) / 2)
      return g
    }
    const w = span * 0.3
    return { body, b1: bridge(a0 + 0.02, a0 + w), b2: bridge(a1 - w, a1 - 0.02) }
  }, [rI, rO, a0, a1, half, discR, span, small])
  const m = useMemo(
    () => ({
      body: new THREE.MeshPhysicalMaterial({ color, metalness: 0.25, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 }),
      steel: mat('#d9dde4', { metalness: 1, roughness: 0.18 }),
      dark: mat('#23252b', { metalness: 0.4, roughness: 0.5 }),
      gold: mat('#d8a54a', { metalness: 1, roughness: 0.25 }),
    }),
    [color]
  )
  const zOut = side * (gap / 2 + 0.016)
  const pc = (t) => {
    const a = a0 + span * t
    const r = (rI + rO) / 2 - 0.012
    return [Math.cos(a) * r, Math.sin(a) * r]
  }
  const mid = center
  return (
    <group position={[0, 0, discZ]}>
      {/* metà esterna e interna */}
      <mesh geometry={geo.body} material={m.body} position={[0, 0, zOut]} scale={[1, 1, side]} />
      <mesh geometry={geo.body} material={m.body} position={[0, 0, -zOut]} scale={[1, 1, -side]} />
      <mesh geometry={geo.b1} material={m.body} />
      <mesh geometry={geo.b2} material={m.body} />
      {/* coperchi dei pistoncini sul lato esterno */}
      {lobes.map((t, i) => {
        const [x, y] = pc(t)
        return (
          <mesh key={i} material={m.body} position={[x, y, side * (gap / 2 + 0.016 + half + 0.012)]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[small ? 0.03 : 0.034, small ? 0.034 : 0.038, 0.012, 32]} />
          </mesh>
        )
      })}
      {/* targhetta liscia centrale (dove andrebbe la scritta del costruttore) */}
      <mesh material={m.body} position={[pc(0.5)[0], pc(0.5)[1], side * (gap / 2 + 0.016 + half + 0.008)]} rotation={[0, 0, mid + Math.PI / 2]}>
        <boxGeometry args={[span * 0.32, 0.03, 0.006]} />
      </mesh>
      {/* perno pastiglie e molla visibili dalla finestra */}
      <mesh material={m.steel} position={[Math.cos(mid) * (discR + 0.02), Math.sin(mid) * (discR + 0.02), 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, gap + 0.09, 10]} />
      </mesh>
      <mesh material={m.steel} position={[Math.cos(mid) * (discR + 0.03), Math.sin(mid) * (discR + 0.03), 0]} rotation={[0, 0, mid]}>
        <boxGeometry args={[0.004, span * 0.16, 0.05]} />
      </mesh>
      {/* pastiglie */}
      {[-1, 1].map((k) => (
        <mesh key={k} material={m.dark} position={[Math.cos(mid) * (discR - 0.03), Math.sin(mid) * (discR - 0.03), k * (gap / 2 + 0.004)]} rotation={[0, 0, mid]}>
          <boxGeometry args={[0.05, span * 0.22, 0.008]} />
        </mesh>
      ))}
      {/* attacchi radiali con viti (lato forcella) */}
      {[a0 + 0.03, a1 - 0.03].map((a, i) => (
        <group key={i}>
          <mesh material={m.body} position={[Math.cos(a) * (rI - 0.012), Math.sin(a) * (rI - 0.012), -side * 0.005]} rotation={[0, 0, a]}>
            <boxGeometry args={[0.05, 0.034, 0.03]} />
          </mesh>
          <mesh material={m.steel} position={[Math.cos(a) * (rI - 0.05), Math.sin(a) * (rI - 0.05), -side * 0.005]} rotation={[0, 0, a - Math.PI / 2]}>
            <cylinderGeometry args={[0.009, 0.009, 0.06, 6]} />
          </mesh>
        </group>
      ))}
      {/* raccordo del tubo (banjo) e valvola di spurgo */}
      <mesh material={m.gold} position={[Math.cos(a0 + 0.1) * (rO + 0.016), Math.sin(a0 + 0.1) * (rO + 0.016), side * 0.018]}>
        <cylinderGeometry args={[0.012, 0.012, 0.018, 12]} />
      </mesh>
      <mesh material={m.steel} position={[Math.cos(a1 - 0.08) * (rO + 0.012), Math.sin(a1 - 0.08) * (rO + 0.012), side * 0.022]} rotation={[0, 0, a1 - 0.08 - Math.PI / 2]}>
        <cylinderGeometry args={[0.005, 0.007, 0.026, 8]} />
      </mesh>
    </group>
  )
}

// ---------- piedini forcella con perno ruota e supporti radiali della pinza ----------
export function ForkFeet({ m, discR = 0.3, center = 2.3, span = 0.72 }) {
  const rI = discR - 0.082
  const lugs = [center - span / 2 + 0.03, center + span / 2 - 0.03].map((a) => [Math.cos(a) * (rI - 0.05), Math.sin(a) * (rI - 0.05)])
  const tri = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0.03, -0.035)
    s.lineTo(lugs[0][0] + 0.02, lugs[0][1] + 0.01)
    s.lineTo(lugs[1][0] - 0.01, lugs[1][1] + 0.02)
    s.lineTo(-0.04, -0.02)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.008, bevelSegments: 3 })
    g.translate(0, 0, -0.011)
    return g
  }, [])
  return (
    <group position={[1.33, 0.6, 0]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0, s * 0.128]}>
          {/* piedino */}
          <mesh material={m.black} rotation={[0, 0, 0.36]} position={[-0.015, 0.04, 0]}>
            <cylinderGeometry args={[0.04, 0.045, 0.14, 20]} />
          </mesh>
          {/* supporto radiale della pinza */}
          <mesh geometry={tri} material={m.black} />
          {/* morsetto perno ruota con viti */}
          <mesh material={m.alloy} position={[0, 0, s * 0.012]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.03, 20]} />
          </mesh>
          {[-0.025, 0.025].map((dy) => (
            <Bolt key={dy} position={[0.035, dy, s * 0.012]} axis="x" r={0.006} len={0.03} material={m.alloy} />
          ))}
        </group>
      ))}
      {/* perno ruota passante */}
      <mesh material={m.alloy} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.3, 12]} />
      </mesh>
    </group>
  )
}

// ---------- codino morbido rialzato ----------
export function useTailGeo() {
  return useMemo(() => {
    const g = new THREE.SphereGeometry(1, 56, 32)
    const p = g.attributes.position
    const v = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i)
      const u = (v.x + 1) / 2 // 0 = punta posteriore, 1 = davanti
      const x = -1.34 + u * 0.8
      const bottom = 1.47 - 0.13 * u
      const top = 1.6 - 0.12 * u
      const h = top - bottom
      let y = bottom + h * (0.5 + 0.5 * v.y)
      if (v.y < -0.2) y = bottom + h * 0.4 * (1 + v.y) // fondo quasi piatto
      const w = 0.06 + 0.1 * Math.pow(u, 0.7)
      const z = Math.sign(v.z) * Math.pow(Math.abs(v.z), 0.85) * w
      p.setXYZ(i, x, y, z)
    }
    g.computeVertexNormals()
    return g
  }, [])
}

// ---------- telaio: piastre del perno forcellone, attacchi motore, staffe ----------
export function FrameDetails({ m }) {
  const plate = useMemo(() => {
    const s = new THREE.Shape()
    const pts = [
      [-0.34, 0.66],
      [-0.12, 0.66],
      [-0.08, 0.86],
      [-0.18, 1.04],
      [-0.3, 1.0],
      [-0.36, 0.82],
    ]
    pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
    s.closePath()
    const h = new THREE.Path()
    h.absarc(-0.21, 0.77, 0.03, 0, Math.PI * 2, true)
    s.holes.push(h)
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.008, bevelSegments: 3 })
    g.translate(0, 0, -0.007)
    return g
  }, [])
  return (
    <group>
      {/* piastre laterali del perno forcellone */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={plate} material={m.alloy} position={[0, 0, s * 0.198]} />
          {/* attacco motore anteriore: dal telaio alla testata */}
          <Strut a={[0.47, 1.19, s * 0.15]} b={[0.42, 1.27, s * 0.13]} w={0.05} t={0.012} material={m.alloy} />
          <Bolt position={[0.42, 1.27, s * 0.14]} r={0.012} len={0.03} material={m.alloy} />
          {/* attacco motore posteriore al basamento */}
          <Bolt position={[-0.27, 0.92, s * 0.2]} r={0.012} len={0.03} material={m.alloy} />
          <Bolt position={[-0.3, 0.7, s * 0.2]} r={0.012} len={0.03} material={m.alloy} />
          {/* staffe pedane passeggero: dal telaietto alla pedana */}
          <Strut a={[-0.56, 1.18, s * 0.14]} b={[-0.66, 0.92, s * 0.24]} w={0.045} t={0.012} material={m.alloy} />
          {/* attacchi parafango posteriore al forcellone */}
          <Strut a={[-0.86, 1.03, s * 0.13]} b={[-0.86, 0.77, s * 0.178]} w={0.022} t={0.008} material={m.black} />
          {/* staffe del parafango anteriore agli steli */}
          <Strut a={[1.22, 1.22, s * 0.09]} b={[1.19, 1.0, s * 0.128]} w={0.03} t={0.008} material={m.black} />
        </group>
      ))}
      {/* perno del forcellone passante con dadi */}
      <mesh material={m.alloy} position={[-0.21, 0.77, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.46, 12]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={'n' + s} material={m.gold} position={[-0.21, 0.77, s * 0.23]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.015, 6]} />
        </mesh>
      ))}
      {/* traversa sotto la sella che regge batteria e filtro */}
      <Strut a={[-0.62, 1.3, -0.14]} b={[-0.62, 1.3, 0.14]} w={0.025} round material={m.frame} />
      <Strut a={[-0.05, 1.3, -0.16]} b={[-0.05, 1.3, 0.16]} w={0.025} round material={m.frame} />
    </group>
  )
}

// ---------- supporto pinza posteriore con braccio di reazione ----------
export function RearCaliperMount({ m }) {
  return (
    <group>
      <Strut a={[-1.33, 0.6, -0.175]} b={[-1.36, 0.36, -0.172]} w={0.06} t={0.012} material={m.alloy} />
      <Strut a={[-1.34, 0.42, -0.178]} b={[-0.9, 0.62, -0.186]} w={0.022} t={0.01} material={m.alloy} />
      <mesh material={m.gold} position={[-1.33, 0.6, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.016, 6]} />
      </mesh>
    </group>
  )
}
