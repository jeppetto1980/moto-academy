// Libreria di pezzi meccanici realistici usata dai capitoli: materiali PBR, texture procedurali,
// geometrie di pistone, biella, albero motore, valvole, camme, ingranaggi, candela e sezioni "a spaccato".
import { useMemo } from 'react'
import * as THREE from 'three'
import pc from 'polygon-clipping'

// ---------- texture procedurali (create una volta sola) ----------
const texCache = {}
function canvasTex(key, w, h, draw, repeat = [1, 1], srgb = false) {
  if (texCache[key]) return texCache[key]
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(...repeat)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  texCache[key] = t
  return t
}

// grana della fusione (alluminio grezzo, ghisa)
export const castTex = () =>
  canvasTex('cast', 256, 256, (g, w, h) => {
    const d = g.createImageData(w, h)
    for (let i = 0; i < d.data.length; i += 4) {
      const v = 150 + Math.random() * 90
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v
      d.data[i + 3] = 255
    }
    g.putImageData(d, 0, 0)
  }, [3, 3])

// spazzolato (righe sottili)
export const brushedTex = () =>
  canvasTex('brushed', 256, 256, (g, w, h) => {
    g.fillStyle = '#9a9a9a'
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 900; i++) {
      const y = Math.random() * h
      g.strokeStyle = Math.random() > 0.5 ? `rgba(255,255,255,${0.05 + Math.random() * 0.1})` : `rgba(0,0,0,${0.05 + Math.random() * 0.1})`
      g.lineWidth = Math.random() * 1.2
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(w, y + (Math.random() - 0.5) * 2)
      g.stroke()
    }
  }, [2, 2])

// superficie di taglio dello spaccato: arancio con tratteggio, come nei disegni tecnici
export const hatchTex = () =>
  canvasTex('hatch', 128, 128, (g, w, h) => {
    g.fillStyle = '#d9541c'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(120,30,0,0.55)'
    g.lineWidth = 5
    for (let i = -h; i < w * 2; i += 22) {
      g.beginPath()
      g.moveTo(i, 0)
      g.lineTo(i - h, h)
      g.stroke()
    }
  }, [1, 1], true)

// ---------- materiali ----------
export function useMech() {
  return useMemo(() => {
    const cast = castTex()
    const brushed = brushedTex()
    const hatch = hatchTex()
    const std = (o) => new THREE.MeshStandardMaterial(o)
    const phys = (o) => new THREE.MeshPhysicalMaterial(o)
    return {
      // alluminio pressofuso: grigio chiaro satinato con grana
      alu: std({ color: '#b9bec6', metalness: 0.75, roughness: 0.42, roughnessMap: cast, bumpMap: cast, bumpScale: 0.6 }),
      aluDark: std({ color: '#7d838d', metalness: 0.7, roughness: 0.5, roughnessMap: cast, bumpMap: cast, bumpScale: 0.6 }),
      // acciaio lavorato (alberi, perni)
      steel: std({ color: '#d5d9df', metalness: 0.9, roughness: 0.28, roughnessMap: brushed }),
      steelDark: std({ color: '#6a717c', metalness: 0.9, roughness: 0.35, roughnessMap: brushed }),
      forged: std({ color: '#aeb3bb', metalness: 0.8, roughness: 0.36, bumpMap: cast, bumpScale: 0.4 }),
      chrome: phys({ color: '#e6e9ee', metalness: 1, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }),
      // ottone/bronzo (sedi valvola, getti carburatore)
      brass: std({ color: '#c9a04a', metalness: 0.95, roughness: 0.28 }),
      copper: std({ color: '#c46a3a', metalness: 0.95, roughness: 0.3 }),
      // ceramica isolante della candela
      ceramic: phys({ color: '#f3f1ea', metalness: 0, roughness: 0.25, clearcoat: 0.6 }),
      rubber: std({ color: '#1c1e22', metalness: 0, roughness: 0.85 }),
      blackPaint: std({ color: '#22252b', metalness: 0.3, roughness: 0.55 }),
      gold: std({ color: '#d8a51a', metalness: 1, roughness: 0.25 }),
      section: std({ map: hatch, metalness: 0.2, roughness: 0.6 }),
      ghost: phys({ color: '#a9c6ff', transparent: true, opacity: 0.05, roughness: 0.1, metalness: 0, side: THREE.DoubleSide, depthWrite: false }),
      ghostEdge: new THREE.LineBasicMaterial({ color: '#9fc4ff', transparent: true, opacity: 0.25 }),
      oil: phys({ color: '#c88a18', transparent: true, opacity: 0.55, roughness: 0.05, transmission: 0.2, depthWrite: false }),
    }
  }, [])
}

// materiale colorato "di scena" (per evidenziare i ruoli: blu aspirazione, rosso scarico...)
export const tinted = (color, o = {}) => new THREE.MeshStandardMaterial({ color, metalness: 0.8, roughness: 0.3, ...o })

// ---------- poligoni 2D e spaccati ----------
export const circle = (cx, cy, r, n = 48, a0 = 0, a1 = Math.PI * 2) => {
  const pts = []
  const full = Math.abs(a1 - a0) >= Math.PI * 2 - 1e-6
  const N = full ? n : n + 1
  for (let i = 0; i < N; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return [pts]
}
export const rect = (x0, y0, x1, y1) => [[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]]
export const poly = (pts) => [pts]
// striscia di larghezza w lungo una spezzata (condotti, asole)
export function strip(points, w0, w1 = w0) {
  const L = [],
    R = []
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const a = points[Math.max(0, i - 1)]
    const b = points[Math.min(points.length - 1, i + 1)]
    let dx = b[0] - a[0],
      dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    dx /= l
    dy /= l
    const w = (w0 + (w1 - w0) * (i / (points.length - 1))) / 2
    L.push([p[0] - dy * w, p[1] + dx * w])
    R.push([p[0] + dy * w, p[1] - dx * w])
  }
  return [[...L, ...R.reverse()]]
}
// curva morbida (Catmull-Rom) campionata
export function smooth(points, n = 24) {
  const c = new THREE.SplineCurve(points.map((p) => new THREE.Vector2(...p)))
  return c.getPoints(n).map((v) => [v.x, v.y])
}

export const union = (...p) => pc.union(...p)
export const diff = (a, ...b) => pc.difference(a, ...b)

// multipoligono (polygon-clipping) -> array di THREE.Shape
export function toShapes(mp) {
  // accetta anche un poligono singolo [[x,y]...] annidato una volta in meno
  if (typeof mp[0][0][0] === 'number') mp = [mp]
  return mp.map((polyg) => {
    const [outer, ...holes] = polyg
    const s = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, y)))
    holes.forEach((h) => s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y)))))
    return s
  })
}

// estrusione di un profilo: gruppo 0 = facce (taglio), gruppo 1 = fianchi
export function extrude(mp, depth, bevel = 0, z0 = 0, curveSegments = 12) {
  const g = new THREE.ExtrudeGeometry(toShapes(mp), {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments,
  })
  g.translate(0, 0, z0)
  g.computeVertexNormals()
  return g
}

// solido di rotazione; phi = 0 guarda verso la camera (+z)
export function lathe(points, segs = 64, phiStart = 0, phiLen = Math.PI * 2) {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), segs, phiStart, phiLen)
  g.computeVertexNormals()
  return g
}

// Mezzo solido di rotazione "spaccato": tiene la metà posteriore e chiude il taglio con la faccia tratteggiata
// profile = contorno chiuso [[r,y]...] (r>0) in senso qualsiasi
export function HalfLathe({ profile, material, sectionMat, segs = 64, ghost }) {
  const { body, cap, ghostG } = useMemo(() => {
    const closed = [...profile, profile[0]]
    const body = lathe(closed, segs, Math.PI / 2, Math.PI)
    const ghostG = lathe(closed, segs, -Math.PI / 2, Math.PI)
    const shp = toShapes([[profile]])[0]
    const capG = new THREE.ShapeGeometry(shp, 8)
    // faccia destra (x>0) e sinistra (x<0, specchiata) sul piano z=0
    const left = capG.clone()
    left.scale(-1, 1, 1)
    const idx = left.index.array
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i]
      idx[i] = idx[i + 2]
      idx[i + 2] = t
    }
    const cap = mergeSimple([capG, left])
    return { body, cap, ghostG }
  }, [profile, segs])
  return (
    <group>
      <mesh geometry={body} material={material} castShadow receiveShadow />
      <mesh geometry={cap} material={sectionMat} position={[0, 0, 0.001]} />
      {ghost && <mesh geometry={ghostG} material={ghost} />}
    </group>
  )
}

// unisce geometrie non indicizzate/indicizzate con soli position+normal+uv
export function mergeSimple(geos) {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g))
  const attrs = ['position', 'normal', 'uv']
  const out = new THREE.BufferGeometry()
  attrs.forEach((a) => {
    const size = parts[0].attributes[a].itemSize
    const total = parts.reduce((s, g) => s + g.attributes[a].count * size, 0)
    const arr = new Float32Array(total)
    let o = 0
    parts.forEach((g) => {
      arr.set(g.attributes[a].array, o)
      o += g.attributes[a].count * size
    })
    out.setAttribute(a, new THREE.BufferAttribute(arr, size))
  })
  out.computeVertexNormals()
  return out
}

// Blocco spaccato estruso: metà posteriore piena (z da -depth a 0) con taglio tratteggiato + metà anteriore "fantasma"
export function SectionBlock({ shape, depth, material, sectionMat, ghost, bevel = 0.02 }) {
  const { back, front } = useMemo(() => {
    const back = extrude(shape, depth - bevel, bevel, -depth + bevel)
    const front = ghost ? extrude(shape, depth, 0, 0) : null
    return { back, front }
  }, [shape, depth, bevel, ghost])
  return (
    <group>
      <mesh geometry={back} material={[sectionMat, material]} />
      {ghost && <mesh geometry={front} material={ghost} />}
    </group>
  )
}

// ---------- pezzi ----------

// Profilo del pistone (per lathe): cielo leggermente bombato, 3 cave per le fasce, mantello
export function pistonGeo(r = 0.57, h = 0.62) {
  const t = h / 2
  const g = 0.022 // profondità cava
  const pts = [
    [0, t + 0.04],
    [r * 0.55, t + 0.03],
    [r * 0.92, t + 0.005],
    [r, t - 0.02],
    // fasce: elastica, di tenuta, raschiaolio
    [r, t - 0.07], [r - g, t - 0.07], [r - g, t - 0.105], [r, t - 0.105],
    [r, t - 0.15], [r - g, t - 0.15], [r - g, t - 0.185], [r, t - 0.185],
    [r, t - 0.23], [r - g, t - 0.23], [r - g, t - 0.275], [r, t - 0.275],
    [r * 0.995, -t],
    [r * 0.93, -t],
    [r * 0.93, t - 0.1],
    [0, t - 0.1],
  ]
  return lathe(pts, 72)
}

// fasce elastiche (anelli scuri nelle cave)
export function ringGeo(r = 0.57, w = 0.03) {
  return lathe([[r - 0.02, -w / 2], [r + 0.002, -w / 2], [r + 0.002, w / 2], [r - 0.02, w / 2], [r - 0.02, -w / 2]], 72)
}

// Biella in profilo: occhio grande, fusto rastremato, occhio piccolo (z centrata)
export function conRodGeo(len = 1.6, bigR = 0.22, smallR = 0.12, t = 0.14) {
  const body = union(
    circle(0, 0, bigR + 0.07, 48),
    circle(0, len, smallR + 0.06, 40),
    poly([[-bigR * 0.6, 0.1], [bigR * 0.6, 0.1], [smallR * 0.55, len - 0.05], [-smallR * 0.55, len - 0.05]])
  )
  const shape = diff(body, circle(0, 0, bigR, 48), circle(0, len, smallR, 40))
  const g = extrude(shape, t - 0.03, 0.015, -(t - 0.03) / 2)
  return g
}
// nervatura a "doppia T" del fusto (pannello incassato su entrambe le facce)
export function rodWebGeo(len = 1.6, bigR = 0.22, smallR = 0.12, t = 0.14) {
  const s = poly([[-bigR * 0.32, bigR + 0.12], [bigR * 0.32, bigR + 0.12], [smallR * 0.25, len - smallR - 0.1], [-smallR * 0.25, len - smallR - 0.1]])
  return extrude([s], t + 0.012, 0, -(t + 0.012) / 2)
}

// Spalla dell'albero motore: perno di manovella in alto, contrappeso semicircolare in basso
export function crankWebGeo(throwR = 0.5, t = 0.12, mainR = 0.17, pinR = 0.11) {
  const shape = union(
    circle(0, throwR, pinR + 0.12, 40),
    circle(0, 0, mainR + 0.12, 40),
    poly([[-pinR - 0.1, throwR], [pinR + 0.1, throwR], [mainR + 0.18, 0], [-mainR - 0.18, 0]]),
    circle(0, 0, throwR * 1.05, 64, Math.PI * 1.08, Math.PI * 1.92),
    poly(circle(0, 0, throwR * 1.05, 32, Math.PI * 1.08, Math.PI * 1.92)[0].concat([[0, 0]]))
  )
  // fori di alleggerimento nel contrappeso
  const s2 = diff(shape, circle(-throwR * 0.48, -throwR * 0.55, 0.07, 24), circle(throwR * 0.48, -throwR * 0.55, 0.07, 24))
  return extrude(s2, t - 0.03, 0.015, -(t - 0.03) / 2)
}

// Camma: cerchio di base + naso; profilo armonico. Asse lungo z, naso verso +y
export function camGeo(baseR = 0.12, liftH = 0.08, width = 0.18, half = 62) {
  const pts = []
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2
    const dDeg = (((a * 180) / Math.PI + 90) % 360) - 180 // 0 sul naso (+y)
    let r = baseR
    if (Math.abs(dDeg) < half) {
      const c = Math.cos(((dDeg / half) * Math.PI) / 2)
      r += liftH * c * c
    }
    pts.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  return extrude([[pts]], width - 0.02, 0.01, -(width - 0.02) / 2, 6)
}

// Ingranaggio a denti dritti con profilo arrotondato, mozzo e fori di alleggerimento
export function gearGeo(r = 0.5, teeth = 24, depth = 0.12, opts = {}) {
  const { toothH = Math.min(0.09, r * 0.18), hole = r * 0.22, windows = r > 0.35 ? 5 : 0, bevel = 0.008 } = opts
  const pts = []
  const step = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    const prof = [
      [r - toothH * 0.55, 0],
      [r - toothH * 0.4, 0.12],
      [r + toothH * 0.25, 0.22],
      [r + toothH * 0.45, 0.32],
      [r + toothH * 0.45, 0.43],
      [r + toothH * 0.25, 0.53],
      [r - toothH * 0.4, 0.63],
      [r - toothH * 0.55, 0.75],
    ]
    prof.forEach(([rr, f]) => pts.push([Math.cos(a + f * step) * rr, Math.sin(a + f * step) * rr]))
  }
  let shape = [[pts]]
  const cut = [circle(0, 0, hole, 32)]
  if (windows) {
    const ri = hole + 0.06,
      ro = r - toothH - 0.07
    if (ro - ri > 0.06) {
      for (let k = 0; k < windows; k++) {
        const a0 = (k / windows) * Math.PI * 2 + 0.18,
          a1 = ((k + 1) / windows) * Math.PI * 2 - 0.18
        const outer = circle(0, 0, ro, 16, a0, a1)[0]
        const inner = circle(0, 0, ri, 10, a1, a0)[0]
        cut.push([[...outer, ...inner]])
      }
    }
  }
  shape = diff(shape, ...cut)
  return extrude(shape, depth - bevel * 2, bevel, -(depth - bevel * 2) / 2, 8)
}

// Valvola a fungo (lathe): stelo, raccordo, piattello con fascia di tenuta. Origine = faccia del fungo, asse +y
export function valveGeo(headR = 0.2, len = 1.4, stemR = 0.034) {
  return lathe(
    [
      [0, -0.025],
      [headR * 0.85, -0.025],
      [headR, -0.01],
      [headR, 0.012],
      [headR * 0.82, 0.05],
      [headR * 0.5, 0.1],
      [stemR * 1.8, 0.2],
      [stemR, 0.32],
      [stemR, len - 0.06],
      [stemR * 0.8, len - 0.05],
      [stemR * 0.8, len - 0.02],
      [stemR, len - 0.01],
      [stemR * 0.6, len],
      [0, len],
    ],
    40
  )
}

// Candela completa (gruppo): terminale, isolatore a costole, esagono, filetto, elettrodi. Punta in basso (y=0)
export function SparkPlug({ m, scale = 1, glowRef }) {
  const geos = useMemo(() => {
    const ins = []
    for (let i = 0; i < 5; i++) ins.push([0.05, 0.42 + i * 0.05], [0.058, 0.44 + i * 0.05])
    const insulator = lathe([[0, 0.38], [0.06, 0.38], ...ins, [0.05, 0.68], [0.03, 0.72], [0, 0.72]], 32)
    const thread = []
    for (let i = 0; i < 14; i++) thread.push([0.055, 0.04 + i * 0.016], [0.048, 0.048 + i * 0.016])
    const body = lathe([[0, 0.02], [0.048, 0.02], ...thread, [0.06, 0.27], [0.06, 0.29], [0, 0.29]], 32)
    const hex = new THREE.CylinderGeometry(0.1, 0.1, 0.09, 6)
    hex.translate(0, 0.335, 0)
    const term = lathe([[0, 0.72], [0.02, 0.72], [0.02, 0.76], [0.032, 0.77], [0.032, 0.8], [0.02, 0.81], [0, 0.81]], 20)
    const tip = lathe([[0, -0.01], [0.012, -0.01], [0.012, 0.03], [0.025, 0.03], [0.025, 0.05], [0, 0.05]], 16)
    const ground = new THREE.TorusGeometry(0.03, 0.009, 6, 12, Math.PI * 0.9)
    ground.rotateY(Math.PI / 2)
    ground.translate(0, 0.02, 0.0)
    return { insulator, body, hex, term, tip, ground }
  }, [])
  return (
    <group scale={scale}>
      <mesh geometry={geos.insulator} material={m.ceramic} />
      <mesh geometry={geos.body} material={m.steel} />
      <mesh geometry={geos.hex} material={m.steel} />
      <mesh geometry={geos.term} material={m.steel} />
      <mesh geometry={geos.tip} material={m.copper} />
      <mesh geometry={geos.ground} material={m.steelDark} position={[0, -0.005, 0]} />
      {glowRef && (
        <mesh ref={glowRef} position={[0, -0.02, 0]} visible={false}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#cfe6ff" toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

// Molla elicoidale con spire di estremità chiuse; alta 1, scalare in y
export function springGeo(radius = 0.12, turns = 7, wire = 0.018) {
  const pts = []
  const n = turns * 28
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = t * turns * Math.PI * 2
    // spire ravvicinate alle estremità
    const e = 1 / turns
    let y
    if (t < e) y = (t / e) * wire * 2.2
    else if (t > 1 - e) y = 1 - ((1 - t) / e) * wire * 2.2
    else y = wire * 2.2 + ((t - e) / (1 - 2 * e)) * (1 - wire * 4.4)
    pts.push(new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius))
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, wire, 8, false)
}

// Catena a rulli lungo un percorso chiuso (punti 3D sul piano z): restituisce i parametri per le istanze
export function chainCurve(points) {
  return new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), true, 'centripetal')
}

// Texture morbida per bagliori (sprite)
export const glowTex = () =>
  canvasTex('glow', 128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    gr.addColorStop(0, 'rgba(255,255,255,1)')
    gr.addColorStop(0.25, 'rgba(255,255,255,0.6)')
    gr.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, w, h)
  })

// Battistrada a spina di pesce per gomme fatte al tornio (lathe): disegna gli intagli solo
// nella fascia di v (0..1 lungo il profilo) che corrisponde alla corona della gomma.
export function treadTex(vMin, vMax, blocks = 36) {
  return canvasTex(`tread-${vMin}-${vMax}-${blocks}`, 2048, 512, (g, w, h) => {
    g.fillStyle = '#3a3b40'
    g.fillRect(0, 0, w, h)
    // leggera grana della gomma
    for (let i = 0; i < 6000; i++) {
      g.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},0.03)`
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2)
    }
    const y0 = (1 - vMax) * h
    const y1 = (1 - vMin) * h
    const yc = (y0 + y1) / 2
    const half = (y1 - y0) / 2
    const step = w / blocks
    g.strokeStyle = '#050506'
    g.lineCap = 'round'
    for (let k = 0; k < blocks; k++) {
      const x = k * step
      // intagli principali a V, sfalsati sui due lati
      g.lineWidth = step * 0.16
      g.beginPath()
      g.moveTo(x, yc - half * 0.12)
      g.lineTo(x + step * 0.75, yc - half * 0.88)
      g.stroke()
      g.beginPath()
      g.moveTo(x + step * 0.5, yc + half * 0.12)
      g.lineTo(x + step * 1.25, yc + half * 0.88)
      g.stroke()
      // intagli secondari corti verso le spalle
      g.lineWidth = step * 0.08
      g.beginPath()
      g.moveTo(x + step * 0.25, yc - half * 0.55)
      g.lineTo(x + step * 0.55, yc - half * 0.98)
      g.stroke()
      g.beginPath()
      g.moveTo(x + step * 0.75, yc + half * 0.55)
      g.lineTo(x + step * 1.05, yc + half * 0.98)
      g.stroke()
    }
    // spalle lisce leggermente più chiare (bordo dell'area battistrada)
    g.fillStyle = 'rgba(255,255,255,0.05)'
    g.fillRect(0, y0 - 6, w, 6)
    g.fillRect(0, y1, w, 6)
  }, [1, 1], true)
}
