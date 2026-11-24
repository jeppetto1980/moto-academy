// Motore monocilindrico 4 tempi bialbero, in sezione "da disegno tecnico":
// la metà posteriore di basamento, cilindro e testata è piena (taglio tratteggiato arancio),
// la metà anteriore è un vetro fantasma, così si vedono i pezzi in movimento.
// Cinematica calcolata: angolo albero motore θ da 0° a 720° (2 giri = 4 tempi).
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { setEngineRpm, muteEngine } from '../lib/sound'
import Callout from '../components/Callout'
import {
  useMech, tinted, HalfLathe, SectionBlock, SparkPlug, pistonGeo, ringGeo, conRodGeo, rodWebGeo, crankWebGeo, camGeo, gearGeo,
  valveGeo, springGeo, lathe, circle, rect, poly, strip, smooth, union, diff, chainCurve, glowTex, extrude,
} from './mech'

const R_CRANK = 0.5 // raggio di manovella (metà corsa)
const L_ROD = 1.6 // lunghezza biella
const HEAD_Y = 2.55 // piano della testata
const ROOF = 0.13 // altezza del tetto della camera ("pent roof")
const SLOW = 40 // fattore di rallentamento dell'animazione
const VA = 0.2 // inclinazione valvole
const deg = Math.PI / 180

function pistonPinY(theta) {
  const s = Math.sin(theta)
  return R_CRANK * Math.cos(theta) + Math.sqrt(L_ROD * L_ROD - R_CRANK * R_CRANK * s * s)
}
// Alzata valvola (0..1) in una finestra angolare [start, start+len] (gradi, ciclo 720)
function lift(thetaDeg, start, len) {
  const d = (((thetaDeg - start) % 720) + 720) % 720
  if (d > len) return 0
  const s = Math.sin((Math.PI * d) / len)
  return s * s
}
export function phaseOf(thetaDeg) {
  return Math.floor((((thetaDeg % 720) + 720) % 720) / 180)
}
const PHASE_COLORS = ['#3aa0ff', '#a46bff', '#ff6a1a', '#9aa3b2']

// sedi valvola sul tetto della camera e assi delle valvole
const seatIn = [-0.26, HEAD_Y + ROOF * (0.34 / 0.6)]
const seatEx = [0.26, HEAD_Y + ROOF * (0.34 / 0.6)]
const axIn = [-Math.sin(VA), Math.cos(VA)]
const axEx = [Math.sin(VA), Math.cos(VA)]
const along = (s, a, d) => [s[0] + a[0] * d, s[1] + a[1] * d]
const CAM_D = 1.2
const camInPos = along(seatIn, axIn, CAM_D)
const camExPos = along(seatEx, axEx, CAM_D)
const PORT_IN = smooth([[seatIn[0], seatIn[1] - 0.02], [-0.42, HEAD_Y + 0.3], [-0.72, HEAD_Y + 0.5], [-1.15, HEAD_Y + 0.6]], 20)
const PORT_EX = smooth([[seatEx[0], seatEx[1] - 0.02], [0.42, HEAD_Y + 0.28], [0.72, HEAD_Y + 0.44], [1.15, HEAD_Y + 0.5]], 20)

const CALLOUTS = {
  pistone: [{ ref: 'piston', offset: [0.57, 0.2, 0], side: 1, dy: 0.15, text: 'Pistone' }],
  biella: [{ ref: 'rod', offset: [0, L_ROD * 0.45, 0], side: -1, dy: 0.1, text: 'Biella' }],
  albero: [{ ref: 'crank', offset: [0, 0, 0.75], side: 1, dy: -0.35, text: 'Albero motore' }],
  valvolaAsp: [{ ref: 'vIn', offset: [0, 0.02, 0], side: -1, dy: -0.25, text: 'Valvola di aspirazione', color: '#3aa0ff' }],
  valvolaSca: [{ ref: 'vEx', offset: [0, 0.02, 0], side: 1, dy: -0.25, text: 'Valvola di scarico', color: '#ff4d5e' }],
  candela: [{ ref: 'plug', offset: [0, 0.55, 0], side: 1, dy: 0.35, text: 'Candela' }],
  camme: [
    { ref: 'camIn', offset: [0, 0, 0.1], side: -1, dy: 0.35, text: 'Camme aspirazione', color: '#ffb03a' },
    { ref: 'camEx', offset: [0, 0, 0.1], side: 1, dy: 0.35, text: 'Camme scarico', color: '#ffb03a' },
  ],
}

// Particelle lungo un condotto curvo (miscela fresca o gas di scarico)
function CurveFlow({ points, color, amountRef, reverse = false, count = 26, size = 0.045 }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map(([x, y, z = 0]) => new THREE.Vector3(x, y, z))), [points])
  const mesh = useRef()
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({ t: i / count, j: [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5] })), [count])
  const d = useMemo(() => new THREE.Object3D(), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    const amt = amountRef.current
    seeds.forEach((s, i) => {
      s.t = (s.t + dt * (0.25 + amt * 1.4)) % 1
      curve.getPointAt(reverse ? 1 - s.t : s.t, p)
      d.position.set(p.x + s.j[0] * 0.12, p.y + s.j[1] * 0.1, p.z + s.j[2] * 0.3)
      d.scale.setScalar(amt > 0.04 ? (0.5 + amt * 0.8) * (0.7 + Math.abs(s.j[0])) : 0.0001)
      d.updateMatrix()
      mesh.current.setMatrixAt(i, d.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[null, null, count]} frustumCulled={false}>
      <sphereGeometry args={[size, 10, 10]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} />
    </instancedMesh>
  )
}

// Catena di distribuzione a rulli che gira con l'albero motore
function TimingChain({ thetaRef, z }) {
  const curve = useMemo(
    () =>
      chainCurve([
        [0, -0.22, z], [0.2, -0.05, z], [0.32, 1.4, z], [camExPos[0] + 0.32, camExPos[1], z], [camExPos[0], camExPos[1] + 0.36, z],
        [camExPos[0] - 0.3, camExPos[1] + 0.12, z], [camInPos[0] + 0.3, camInPos[1] + 0.12, z], [camInPos[0], camInPos[1] + 0.36, z],
        [camInPos[0] - 0.32, camInPos[1], z], [-0.32, 1.4, z], [-0.2, -0.05, z],
      ]),
    [z]
  )
  const N = 92
  const mesh = useRef()
  const d = useMemo(() => new THREE.Object3D(), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  const tg = useMemo(() => new THREE.Vector3(), [])
  const len = useMemo(() => curve.getLength(), [curve])
  useFrame(() => {
    const off = ((thetaRef.current * deg * 0.19) / len) % 1
    for (let i = 0; i < N; i++) {
      const t = (((i / N - off) % 1) + 1) % 1
      curve.getPointAt(t, p)
      curve.getTangentAt(t, tg)
      d.position.copy(p)
      d.rotation.set(0, 0, Math.atan2(tg.y, tg.x))
      d.updateMatrix()
      mesh.current.setMatrixAt(i, d.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[null, null, N]} frustumCulled={false}>
      <boxGeometry args={[0.06, 0.03, 0.07]} />
      <meshStandardMaterial color="#5d636e" metalness={0.9} roughness={0.35} />
    </instancedMesh>
  )
}

function Valve({ G, M, seat, tilt, vRef, sRef, geo, vm }) {
  return (
    <group position={[seat[0], seat[1], 0]} rotation={[0, 0, tilt]}>
      <mesh geometry={G.seat} material={M.brass} />
      <group ref={vRef}>
        <mesh geometry={geo} material={vm} />
        <mesh geometry={G.retainer} material={M.steel} position={[0, 0.88, 0]} />
        <mesh geometry={G.bucket} material={M.steel} position={[0, CAM_D - 0.12 - 0.16, 0]} />
      </group>
      {/* la molla poggia sulla testata e spinge sul piattello */}
      <group ref={sRef} position={[0, 0.5, 0]} scale={[1, 0.38, 1]}>
        <mesh geometry={G.spring} material={M.steelDark} />
      </group>
    </group>
  )
}

export default function EngineScene({ mode, rpm = 1500, highlight = [], onPhase }) {
  const M = useMech()
  // materiali dei pezzi evidenziabili (copie indipendenti)
  const P = useMemo(
    () => ({
      pistone: M.alu.clone(),
      biella: M.forged.clone(),
      albero: M.steel.clone(),
      valvolaAsp: tinted('#4a9dff', { metalness: 0.75, roughness: 0.28 }),
      valvolaSca: tinted('#ff5464', { metalness: 0.75, roughness: 0.28 }),
      candela: M.ceramic.clone(),
      camme: tinted('#e9b44c', { metalness: 0.9, roughness: 0.22 }),
      gas: new THREE.MeshBasicMaterial({ color: '#3aa0ff', transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }),
      glow: new THREE.SpriteMaterial({ map: glowTex(), color: '#ffb060', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    }),
    [M]
  )
  const theta = useRef(0)
  const phaseT = useRef(0)
  const lastPhase = useRef(-1)
  const crank = useRef(), piston = useRef(), rod = useRef(), gas = useRef()
  const vIn = useRef(), vEx = useRef(), sprIn = useRef(), sprEx = useRef()
  const camIn = useRef(), camEx = useRef()
  const spark = useRef(), sparkLight = useRef(), plug = useRef(), glow = useRef()
  const flame = useRef(), flameCones = useRef([])
  const root = useRef()
  const inAmt = useRef(0), exAmt = useRef(0)
  const hl = useMemo(() => new Set(highlight), [highlight])
  const partRefs = { piston, rod, crank, vIn, vEx, plug, camIn, camEx }

  // ---------- geometrie (una volta sola) ----------
  const G = useMemo(() => {
    // cilindro alettato (profilo r,y)
    const cyl = [[0.6, 0.86], [0.8, 0.86]]
    const nF = 9
    for (let i = 0; i < nF; i++) {
      const y0 = 0.98 + i * 0.165
      cyl.push([0.8, y0], [1.02 - i * 0.004, y0 + 0.02], [1.02 - i * 0.004, y0 + 0.07], [0.8, y0 + 0.09])
    }
    cyl.push([0.8, HEAD_Y], [0.6, HEAD_Y])
    // basamento
    const crankcase = diff(
      union(circle(0, 0, 1.02, 72), rect(-0.95, -0.2, 0.95, 0.86), rect(-0.7, -1.12, 0.7, -0.6)),
      union(circle(0, 0, 0.8, 72), rect(-0.62, 0, 0.62, 0.9))
    )
    const oil = diff(rect(-0.66, -1.06, 0.66, -0.66), diff(rect(-1, -1.2, 1, -0.66), union(circle(0, 0, 0.8, 72), rect(-0.68, -1.06, 0.68, -0.66))))
    // testata: tetto della camera, condotti, guide valvole, alloggio molle/punterie, vano camme, pozzetto candela
    const roof = poly([[-0.6, HEAD_Y - 0.05], [-0.6, HEAD_Y], [0, HEAD_Y + ROOF], [0.6, HEAD_Y], [0.6, HEAD_Y - 0.05]])
    const guide = (s, a) => strip([along(s, a, 0.05), along(s, a, 0.75)], 0.085)
    const bore = (s, a) => strip([along(s, a, 0.5), along(s, a, 1.16)], 0.38)
    const head = diff(
      union(rect(-1.0, HEAD_Y, 1.0, 3.55), rect(-0.95, 3.5, 0.95, 4.18)),
      roof,
      strip(PORT_IN, 0.3, 0.36),
      strip(PORT_EX, 0.27, 0.32),
      guide(seatIn, axIn), guide(seatEx, axEx),
      bore(seatIn, axIn), bore(seatEx, axEx),
      rect(-0.86, 3.5, 0.86, 4.08),
      strip([[0, HEAD_Y + ROOF + 0.02], [0, 4.4]], 0.17)
    )
    const crankWeb = crankWebGeo(R_CRANK, 0.12, 0.17, 0.11)
    const shaft = lathe([[0, -1.0], [0.1, -1.0], [0.12, -0.96], [0.12, -0.6], [0.17, -0.58], [0.17, -0.3], [0, -0.3]], 40)
    const shaft2 = shaft.clone()
    shaft2.scale(1, 1, -1)
    return {
      cyl,
      crankcase,
      oil: extrude(oil, 0.72, 0, -0.74),
      head,
      piston: pistonGeo(0.57, 0.62),
      ring: ringGeo(0.57, 0.03),
      rod: conRodGeo(L_ROD, 0.115, 0.075, 0.14),
      rodWeb: rodWebGeo(L_ROD, 0.115, 0.075, 0.1),
      crankWeb,
      shaftA: shaft,
      cam: camGeo(0.12, 0.12, 0.2),
      camSpr: gearGeo(0.36, 32, 0.05, { toothH: 0.035, hole: 0.06, windows: 4 }),
      crankSpr: gearGeo(0.18, 16, 0.05, { toothH: 0.035, hole: 0.1, windows: 0 }),
      valveIn: valveGeo(0.2, 0.96),
      valveEx: valveGeo(0.18, 0.96),
      spring: springGeo(0.11, 6, 0.016),
      bucket: lathe([[0.15, 0], [0.155, 0.01], [0.155, 0.15], [0.145, 0.16], [0, 0.16], [0, 0.13], [0.13, 0.13], [0.13, 0], [0.15, 0]], 40),
      retainer: lathe([[0.04, 0], [0.12, 0], [0.12, 0.025], [0.05, 0.05], [0.04, 0.05]], 32),
      seat: lathe([[0.17, -0.01], [0.23, -0.01], [0.23, 0.02], [0.19, 0.02]], 40),
    }
  }, [])

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05)
    let currentRpm = 0
    if (mode.type === 'phase') {
      phaseT.current = (phaseT.current + d) % 3.6
      const p = Math.min(phaseT.current / 3, 1)
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      theta.current = mode.phase * 180 + eased * 179.9
      muteEngine()
    } else {
      currentRpm = mode.type === 'free' ? rpm : mode.rpm
      theta.current = (theta.current + ((currentRpm * 6) / SLOW) * d) % 720
      setEngineRpm(currentRpm, Math.min(currentRpm / 10000, 1))
    }
    const thDeg = theta.current
    const th = thDeg * deg
    const t = state.clock.elapsedTime

    crank.current.rotation.z = -th
    const px = R_CRANK * Math.sin(th)
    const py = R_CRANK * Math.cos(th)
    const y = pistonPinY(th)
    piston.current.position.y = y
    rod.current.position.set(px, py, 0)
    rod.current.rotation.z = Math.atan2(px, y - py)

    // gas nella camera (dal cielo del pistone al tetto)
    const top = y + 0.35
    const h = Math.max(HEAD_Y + ROOF * 0.5 - top, 0.01)
    gas.current.scale.y = h
    gas.current.position.y = top + h / 2
    const ph = phaseOf(thDeg)
    const local = (((thDeg % 180) + 180) % 180) / 180
    const gm = gas.current.material
    if (ph === 0) {
      gm.color.set('#3aa0ff')
      gm.opacity = 0.15 + local * 0.2
    } else if (ph === 1) {
      gm.color.lerpColors(new THREE.Color('#3aa0ff'), new THREE.Color('#b26bff'), local)
      gm.opacity = 0.3 + local * 0.35
    } else if (ph === 2) {
      gm.color.setRGB(1, 0.35 + (1 - local) * 0.55, 0.05 + (1 - local) * 0.35)
      gm.opacity = 0.85 - local * 0.45
    } else {
      gm.color.set('#7d8594')
      gm.opacity = 0.45 - local * 0.3
    }

    // valvole, molle e camme
    const li = lift(thDeg, 712, 196)
    const le = lift(thDeg, 532, 196)
    inAmt.current = li
    exAmt.current = le
    const L = 0.12
    vIn.current.position.set(-axIn[0] * li * L, -axIn[1] * li * L, 0)
    vEx.current.position.set(-axEx[0] * le * L, -axEx[1] * le * L, 0)
    sprIn.current.scale.y = 0.38 - li * L
    sprEx.current.scale.y = 0.38 - le * L
    const phi = thDeg / 2
    camIn.current.rotation.z = VA + Math.PI - (phi - 45) * deg
    camEx.current.rotation.z = -VA + Math.PI - (phi - 315) * deg

    // scintilla poco prima del PMS di scoppio e fronte di fiamma
    const sparkOn = thDeg > 348 && thDeg < 372
    spark.current.visible = sparkOn && Math.sin(t * 90) > -0.3
    sparkLight.current.intensity = sparkOn ? 8 : ph === 2 ? 6 * (1 - local) : 0
    let fk = 0
    if (thDeg > 352 && thDeg < 360) fk = ((thDeg - 352) / 8) * 0.4
    else if (ph === 2) fk = Math.min(1, 0.4 + local * 3) * Math.pow(Math.max(0, 1 - local * 1.4), 0.8)
    flame.current.visible = fk > 0.01
    glow.current.visible = fk > 0.01 || sparkOn
    if (glow.current.visible) {
      const s = sparkOn && fk < 0.05 ? 0.5 : 0.6 + fk * 1.6
      glow.current.scale.set(s * 1.6, s, 1)
      glow.current.position.y = HEAD_Y + ROOF * 0.4 - (ph === 2 ? h * 0.35 : 0)
      P.glow.opacity = Math.max(fk, sparkOn ? 0.6 : 0)
    }
    if (fk > 0.01) {
      const grow = ph === 2 ? Math.min(1, 0.35 + local * 4) : 0.25
      flame.current.position.y = HEAD_Y + ROOF * 0.8
      flameCones.current.forEach((c, i) => {
        if (!c) return
        const flick = 1 + Math.sin(t * (23 + i * 7) + i) * 0.12
        const hh = (h + ROOF * 0.6) * grow * (1 - i * 0.12) + 0.05
        c.scale.set(grow * flick * (1 - i * 0.18), hh, grow * flick * (1 - i * 0.18))
        c.position.y = -hh / 2
        c.material.opacity = fk * (0.5 + i * 0.15)
      })
    }

    const pulse = 0.35 + 0.35 * Math.sin(t * 5)
    ;['pistone', 'biella', 'albero', 'valvolaAsp', 'valvolaSca', 'candela', 'camme'].forEach((k) => {
      P[k].emissive.set(hl.has(k) ? '#ff6a1a' : '#000000')
      P[k].emissiveIntensity = hl.has(k) ? pulse : 0
    })
    if (ph !== lastPhase.current) {
      lastPhase.current = ph
      onPhase && onPhase(ph)
    }
  })

  return (
    <group ref={root} position={[0, -1.4, 0]}>
      {/* ---- carter, cilindro e testata spaccati ---- */}
      <SectionBlock shape={G.crankcase} depth={0.78} material={M.alu} sectionMat={M.section} ghost={M.ghost} />
      <mesh geometry={G.oil} material={M.oil} />
      <HalfLathe profile={G.cyl} material={M.alu} sectionMat={M.section} ghost={M.ghost} />
      {/* canna del cilindro in ghisa */}
      <mesh material={M.steelDark} geometry={useMemo(() => lathe([[0.6, 0.86], [0.6, HEAD_Y], [0.605, HEAD_Y], [0.605, 0.86], [0.6, 0.86]], 64, Math.PI / 2, Math.PI), [])} />
      <SectionBlock shape={G.head} depth={0.8} material={M.alu} sectionMat={M.section} ghost={M.ghost} />
      {/* coperchio punterie */}
      <mesh position={[0, 4.22, -0.4]} material={M.blackPaint}>
        <boxGeometry args={[1.95, 0.1, 0.8]} />
      </mesh>

      {/* collettore di aspirazione e scarico */}
      <mesh material={M.rubber}>
        <tubeGeometry args={[new THREE.CatmullRomCurve3([[-1.12, HEAD_Y + 0.6, 0], [-1.4, HEAD_Y + 0.68, 0], [-1.75, HEAD_Y + 0.74, 0]].map((v) => new THREE.Vector3(...v))), 16, 0.19, 24, false]} />
      </mesh>
      <mesh material={M.chrome}>
        <tubeGeometry args={[new THREE.CatmullRomCurve3([[1.12, HEAD_Y + 0.5, 0], [1.45, HEAD_Y + 0.48, 0], [1.7, HEAD_Y + 0.15, 0], [1.75, HEAD_Y - 0.5, 0]].map((v) => new THREE.Vector3(...v))), 30, 0.15, 24, false]} />
      </mesh>
      <CurveFlow points={[[-1.9, HEAD_Y + 0.76], [-1.15, HEAD_Y + 0.6], ...PORT_IN.slice().reverse().filter((_, i) => i % 4 === 0), [-0.22, HEAD_Y - 0.15], [0, HEAD_Y - 0.35]]} color="#5fb4ff" amountRef={inAmt} />
      <CurveFlow points={[[0.1, HEAD_Y - 0.25], [0.24, HEAD_Y - 0.05], ...PORT_EX.filter((_, i) => i % 4 === 0), [1.45, HEAD_Y + 0.48], [1.72, HEAD_Y + 0.1], [1.76, HEAD_Y - 0.6]]} color="#b9c0cc" amountRef={exAmt} />

      {/* ---- albero motore ---- */}
      <group ref={crank}>
        <mesh geometry={G.shaftA} material={P.albero} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={G.shaftA} material={P.albero} rotation={[-Math.PI / 2, 0, 0]} />
        {[-0.22, 0.22].map((z) => (
          <mesh key={z} geometry={G.crankWeb} material={P.albero} position={[0, 0, z]} />
        ))}
        <mesh material={P.albero} position={[0, R_CRANK, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.34, 28]} />
        </mesh>
        <mesh geometry={G.crankSpr} material={M.steelDark} position={[0, 0, -0.95]} />
      </group>

      {/* ---- biella ---- */}
      <group ref={rod}>
        <mesh geometry={G.rod} material={P.biella} />
        <mesh geometry={G.rodWeb} material={P.biella} />
        {/* bronzine e bulloni del cappello */}
        <mesh material={M.brass} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.118, 0.118, 0.13, 28, 1, true]} />
        </mesh>
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} material={M.steel} position={[x, -0.02, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.34, 10]} />
          </mesh>
        ))}
      </group>

      {/* ---- pistone con fasce e spinotto ---- */}
      <group ref={piston}>
        <mesh geometry={G.piston} material={P.pistone} />
        {[0.2225, 0.1425, 0.0575].map((yy, i) => (
          <mesh key={yy} geometry={G.ring} material={i === 2 ? M.steelDark : M.steel} position={[0, yy, 0]} scale={[1, i === 2 ? 1.3 : 1, 1]} />
        ))}
        <mesh material={M.steel} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 1.0, 24]} />
        </mesh>
      </group>

      {/* gas nella camera di combustione */}
      <mesh ref={gas} material={P.gas}>
        <cylinderGeometry args={[0.59, 0.59, 1, 48]} />
      </mesh>

      {/* ---- valvole ---- */}
      <Valve G={G} M={M} seat={seatIn} tilt={VA} vRef={vIn} sRef={sprIn} geo={G.valveIn} vm={P.valvolaAsp} />
      <Valve G={G} M={M} seat={seatEx} tilt={-VA} vRef={vEx} sRef={sprEx} geo={G.valveEx} vm={P.valvolaSca} />

      {/* ---- alberi a camme (bialbero) con ruote dentate ---- */}
      {[[camIn, camInPos], [camEx, camExPos]].map(([ref, pos], i) => (
        <group key={i} position={[pos[0], pos[1], 0]}>
          <mesh material={P.camme} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.3]}>
            <cylinderGeometry args={[0.065, 0.065, 1.4, 20]} />
          </mesh>
          <group ref={ref}>
            <mesh geometry={G.cam} material={P.camme} />
            <mesh geometry={G.camSpr} material={M.steelDark} position={[0, 0, -0.95]} />
          </group>
        </group>
      ))}
      <TimingChain thetaRef={theta} z={-0.95} />

      {/* ---- candela con cappuccio e cavo ---- */}
      <group ref={plug} position={[0, HEAD_Y + ROOF - 0.01, 0]}>
        <SparkPlug m={M} scale={1.15} />
        <mesh material={M.rubber} position={[0, 1.25, 0]}>
          <cylinderGeometry args={[0.1, 0.085, 0.75, 20]} />
        </mesh>
        <mesh material={M.rubber}>
          <tubeGeometry args={[new THREE.CatmullRomCurve3([[0, 1.6, 0], [0.1, 1.9, 0], [0.6, 2.0, -0.2], [1.2, 1.9, -0.4]].map((v) => new THREE.Vector3(...v))), 20, 0.035, 10, false]} />
        </mesh>
      </group>

      {/* ---- scintilla, bagliore e fiamma ---- */}
      <group ref={flame} visible={false}>
        {['#ff3a10', '#ff8a1a', '#ffe08a'].map((c, i) => (
          <mesh key={c} ref={(el) => (flameCones.current[i] = el)} rotation={[Math.PI, 0, 0]} renderOrder={5}>
            <coneGeometry args={[0.56, 1, 40, 1, true]} />
            <meshBasicMaterial color={c} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <sprite ref={glow} material={P.glow} position={[0, HEAD_Y, 0.2]} renderOrder={6} visible={false} />
      <mesh ref={spark} position={[0, HEAD_Y + ROOF - 0.05, 0]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color="#e8f4ff" toneMapped={false} />
      </mesh>
      <pointLight ref={sparkLight} position={[0, HEAD_Y, 0.6]} color="#ffa040" distance={4} intensity={0} />

      {highlight.flatMap((k) =>
        (CALLOUTS[k] || []).map((c) => <Callout key={c.text} root={root} target={partRefs[c.ref]} offset={c.offset} side={c.side} dy={c.dy} text={c.text} color={c.color} />)
      )}
    </group>
  )
}

export { PHASE_COLORS }
