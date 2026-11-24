// Capitolo 3: distribuzione. Viste: dohc, single, sohc, chain, four, clearance.
// Testate in sezione (metà posteriore piena con taglio tratteggiato, metà anteriore fantasma),
// valvole a fungo, molle a spire chiuse, punterie a bicchiere, camme con profilo vero, catena a rulli.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import Callout from '../components/Callout'
import { pulseHL } from './parts'
import {
  useMech, tinted, SectionBlock, HalfLathe, SparkPlug, valveGeo, springGeo, camGeo, gearGeo, lathe, pistonGeo, ringGeo,
  rect, strip, smooth, union, diff, poly, extrude, circle,
} from './mech'

const D = Math.PI / 180
// alzata (0..1) di una camma in funzione dell'angolo camma (gradi) e della posizione del lobo
function camLift(phiDeg, peak, half = 55) {
  const d = ((((phiDeg - peak) % 360) + 540) % 360) - 180
  if (Math.abs(d) > half) return 0
  const c = Math.cos(((d / half) * Math.PI) / 2)
  return c * c
}
const LIFT = 0.18 // corsa valvola in unità di scena
const VLEN = 1.5 // lunghezza valvola

function useMats() {
  const M = useMech()
  return useMemo(
    () => ({
      M,
      valvola: M.steel.clone(),
      valvolaAsp: tinted('#4a9dff', { metalness: 0.75, roughness: 0.28 }),
      valvolaSca: tinted('#ff5464', { metalness: 0.75, roughness: 0.28 }),
      molla: M.steelDark.clone(),
      camma: tinted('#e9b44c', { metalness: 0.9, roughness: 0.22 }),
      punteria: M.steel.clone(),
      bilanciere: M.forged.clone(),
      sede: M.brass.clone(),
      chain: M.steelDark.clone(),
      mark: new THREE.MeshBasicMaterial({ color: '#ff6a1a', toneMapped: false }),
      gap: new THREE.MeshBasicMaterial({ color: '#ff6a1a', transparent: true, opacity: 0.9, toneMapped: false }),
      shoe: new THREE.MeshStandardMaterial({ color: '#2b2f36', roughness: 0.7, metalness: 0.1 }),
    }),
    [M]
  )
}

function useGeos() {
  return useMemo(
    () => ({
      valveIn: valveGeo(0.24, VLEN, 0.04),
      valveEx: valveGeo(0.21, VLEN, 0.04),
      spring: springGeo(0.13, 6, 0.02),
      seat: lathe([[0.2, -0.012], [0.27, -0.012], [0.27, 0.025], [0.22, 0.025]], 48),
      guide: lathe([[0.042, 0], [0.065, 0], [0.065, 0.55], [0.058, 0.58], [0.042, 0.58]], 24),
      retainer: lathe([[0.045, 0], [0.15, 0], [0.15, 0.03], [0.06, 0.06], [0.045, 0.06]], 32),
      bucket: lathe([[0.19, 0], [0.195, 0.012], [0.195, 0.16], [0.183, 0.172], [0, 0.172], [0, 0.14], [0.17, 0.14], [0.17, 0], [0.19, 0]], 48),
      shim: lathe([[0, 0.172], [0.15, 0.172], [0.15, 0.19], [0, 0.19]], 32),
      cam: camGeo(0.24, LIFT, 0.28),
      camS: camGeo(0.17, 0.14, 0.22),
    }),
    []
  )
}

// Valvola completa: fungo, guida, molla, piattello, punteria. Origine = sede, asse +y.
function ValveAssy({ m, g, valveMat, valveGeo: vg, liftRef, axisTilt = 0, refs, bucket = true }) {
  const grp = useRef()
  const spring = useRef()
  useFrame(() => {
    const l = liftRef.current * LIFT
    grp.current.position.y = -l
    spring.current.scale.y = 0.62 - l
  })
  return (
    <group rotation={[0, 0, axisTilt]}>
      <group ref={grp}>
        <group ref={refs?.valve}>
          <mesh geometry={vg || g.valveIn} material={valveMat} />
        </group>
        <mesh geometry={g.retainer} material={m.M.steel} position={[0, VLEN - 0.08, 0]} />
        {bucket && (
          <group ref={refs?.bucket} position={[0, VLEN - 0.03, 0]}>
            <mesh geometry={g.bucket} material={m.punteria} />
            <mesh geometry={g.shim} material={m.M.gold} />
          </group>
        )}
      </group>
      <mesh geometry={g.guide} material={m.sede} position={[0, 0.3, 0]} />
      {/* la molla poggia sulla testata (fissa) e spinge sul piattello (mobile) */}
      <group ref={spring} position={[0, VLEN - 0.7, 0]}>
        <mesh geometry={g.spring} material={m.molla} />
      </group>
      <mesh ref={refs?.sede} geometry={g.seat} material={m.sede} />
    </group>
  )
}

// Camma su albero, con perni e ruota di comando opzionale
function Cam({ m, geo, rotRef, refsCam, shaftLen = 1.4 }) {
  return (
    <group>
      <mesh material={m.camma} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, shaftLen, 20]} />
      </mesh>
      <group ref={rotRef}>
        <group ref={refsCam}>
          <mesh geometry={geo} material={m.camma} />
        </group>
      </group>
    </group>
  )
}

// testata spaccata con condotti, guide, alloggi molle e vano camme
function headShape({ seats, camD, w, top, bottom, roof, ports, cavity, plug = true }) {
  const cuts = [roof]
  seats.forEach(({ s, a }) => {
    const ax = [-Math.sin(a), Math.cos(a)]
    const at = (d) => [s[0] + ax[0] * d, s[1] + ax[1] * d]
    cuts.push(strip([at(0.05), at(0.95)], 0.1))
    cuts.push(strip([at(VLEN - 0.75), at(camD - 0.1)], 0.44))
  })
  ports.forEach((p) => cuts.push(strip(smooth(p.pts, 20), p.w0, p.w1)))
  cuts.push(cavity)
  if (plug) cuts.push(strip([[0, 0.05], [0, top + 0.3]], 0.16))
  return diff(rect(-w / 2, bottom, w / 2, top), ...cuts)
}

// cilindro alettato (profilo per HalfLathe)
function cylProfile(bore, y0, y1, fins = 6) {
  const p = [[bore, y0], [bore + 0.18, y0]]
  const step = (y1 - y0 - 0.12) / fins
  for (let i = 0; i < fins; i++) {
    const y = y0 + 0.08 + i * step
    p.push([bore + 0.18, y], [bore + 0.42, y + 0.02], [bore + 0.42, y + step * 0.45], [bore + 0.18, y + step * 0.55])
  }
  p.push([bore + 0.18, y1], [bore, y1])
  return p
}

// Catena a rulli istanziata lungo una curva chiusa: rulli + piastrine alternate
function RollerChain({ curve, count, speedRef, material, pitch = 0.1 }) {
  const rollers = useRef()
  const plates = useRef()
  const d = useMemo(() => new THREE.Object3D(), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  const p2 = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const off = speedRef.current
    for (let i = 0; i < count; i++) {
      const t = (((i / count + off) % 1) + 1) % 1
      const t2 = (((i + 1) / count + off) % 1 + 1) % 1
      curve.getPointAt(t, p)
      curve.getPointAt(t2, p2)
      d.position.copy(p)
      d.rotation.set(Math.PI / 2, 0, 0)
      d.scale.setScalar(1)
      d.updateMatrix()
      rollers.current.setMatrixAt(i, d.matrix)
      // piastrina tra due rulli (interna o esterna, alternate)
      d.position.lerpVectors(p, p2, 0.5)
      d.rotation.set(0, 0, Math.atan2(p2.y - p.y, p2.x - p.x))
      d.scale.set(1, 1, i % 2 ? 1 : 1.45)
      d.updateMatrix()
      plates.current.setMatrixAt(i, d.matrix)
    }
    rollers.current.instanceMatrix.needsUpdate = true
    plates.current.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <instancedMesh ref={rollers} args={[null, null, count]} frustumCulled={false} material={material}>
        <cylinderGeometry args={[pitch * 0.32, pitch * 0.32, pitch * 1.0, 12]} />
      </instancedMesh>
      <instancedMesh ref={plates} args={[null, null, count]} frustumCulled={false} material={material}>
        <boxGeometry args={[pitch * 1.45, pitch * 0.62, pitch * 0.8]} />
      </instancedMesh>
    </group>
  )
}

export default function ValveScene({ step, ctrl }) {
  const view = step.view
  const m = useMats()
  const M = m.M
  const g = useGeos()
  const hl = useMemo(() => new Set(step.highlight || []), [step])
  const root = useRef()
  const phi = useRef(0)
  const liftA = useRef(0)
  const liftB = useRef(0)
  const camA = useRef()
  const camB = useRef()
  const pistonRef = useRef()
  const chainOff = useRef(0)
  const r = {
    valveA: useRef(), valveB: useRef(), bucketA: useRef(), bucketB: useRef(), sedeA: useRef(), camA: useRef(), camB: useRef(),
    rockA: useRef(), rockB: useRef(), crankSp: useRef(), camSpA: useRef(), camSpB: useRef(), chainRef: useRef(), gapRef: useRef(),
  }
  const overlapTag = useRef()
  const valvesCtl = ctrl.valves || 4

  // ---------- geometrie delle viste ----------
  const S = useMemo(() => {
    const T = 0.22
    const dohcHead = headShape({
      seats: [{ s: [-0.38, 0], a: T }, { s: [0.38, 0], a: -T }],
      camD: 1.88,
      w: 2.7,
      top: 2.5,
      bottom: -0.11,
      roof: poly([[-0.86, -0.3], [-0.86, -0.105], [0, 0.085], [0.86, -0.105], [0.86, -0.3]]),
      ports: [
        { pts: [[-0.38, -0.02], [-0.55, 0.35], [-0.95, 0.62], [-1.5, 0.72]], w0: 0.36, w1: 0.42 },
        { pts: [[0.38, -0.02], [0.55, 0.33], [0.95, 0.55], [1.5, 0.6]], w0: 0.32, w1: 0.38 },
      ],
      cavity: rect(-1.27, 1.42, 1.27, 2.36),
    })
    const singleHead = headShape({
      seats: [{ s: [0, 0], a: 0 }],
      camD: 1.88,
      w: 1.7,
      top: 2.45,
      bottom: -0.2,
      roof: rect(-0.62, -0.4, 0.62, 0),
      ports: [{ pts: [[0, -0.02], [-0.22, 0.38], [-0.55, 0.62], [-1.0, 0.72]], w0: 0.4, w1: 0.44 }],
      cavity: rect(-0.6, 1.45, 0.6, 2.33),
      plug: false,
    })
    // pattino del tenditore e guida catena (strisce curve)
    const shoe = extrude(strip(smooth([[-1.18, -0.9], [-1.24, 0.1], [-1.2, 1.1]], 24), 0.1), 0.16, 0.01, -0.08)
    const guideR = extrude(strip(smooth([[1.16, -0.9], [1.2, 0.1], [1.17, 1.1]], 24), 0.08), 0.16, 0.01, -0.08)
    // catena: avvolge il pignone dell'albero motore e le due ruote delle camme
    const pts = []
    const arc = (cx, cy, rr, a0, a1, n) => {
      for (let i = 0; i <= n; i++) {
        const a = a0 + ((a1 - a0) * i) / n
        pts.push(new THREE.Vector3(cx + rr * Math.cos(a), cy + rr * Math.sin(a), 0))
      }
    }
    arc(0.75, 1.6, 0.7, -Math.PI / 2 + 0.25, Math.PI / 2, 14)
    arc(-0.75, 1.6, 0.7, Math.PI / 2, Math.PI * 1.5 - 0.25, 14)
    arc(0, -1.6, 0.4, Math.PI - 0.15, Math.PI * 2 + 0.15, 12)
    const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal')
    return {
      dohcHead,
      singleHead,
      dohcCyl: cylProfile(0.86, -1.3, -0.105, 5),
      piston: pistonGeo(0.84, 0.7),
      ring: ringGeo(0.84, 0.03),
      shoe,
      guideR,
      curve,
      chainLen: curve.getLength(),
      small: gearGeo(0.36, 12, 0.14, { toothH: 0.07, hole: 0.12, windows: 0 }),
      big: gearGeo(0.66, 24, 0.12, { toothH: 0.07, hole: 0.12, windows: 6 }),
      sohcBack: extrude([rect(-1.2, -0.15, 1.2, 2.1)], 0.25, 0.04, -0.75),
      rocker: (s) => extrude(union(strip([[-s * 0.26, 0.0], [s * 0.36, 0.0]], 0.1, 0.07), circle(0, 0, 0.085, 24)), 0.11, 0.015, -0.055),
    }
  }, [])
  const rockerGeo = useMemo(() => ({ l: S.rocker(-1), r: S.rocker(1) }), [S])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const speed = ctrl.overlap ? 55 : view === 'chain' ? 110 : 130
    phi.current = (phi.current + dt * speed) % 360
    const p = phi.current
    // aspirazione: picco a 45°, scarico a 315° (gradi camma) → incrocio attorno a 0°
    liftA.current = camLift(p, 45)
    liftB.current = camLift(p, 315)

    if (view === 'dohc' || view === 'single' || view === 'clearance') {
      if (camA.current) camA.current.rotation.z = Math.PI - (p - 45) * D + (view === 'dohc' ? 0.22 : 0)
      if (camB.current) camB.current.rotation.z = Math.PI - (p - 315) * D - 0.22
      // pistone: punto morto superiore all'incrocio (albero motore = 2 × camme)
      if (pistonRef.current) pistonRef.current.position.y = -0.5 - 0.62 * (1 - Math.cos(2 * p * D)) / 2
    }
    if (view === 'sohc') {
      if (camA.current) camA.current.rotation.z = -(p - 45) * D
      if (camB.current) camB.current.rotation.z = -(p - 315) * D
      if (r.rockA.current) r.rockA.current.rotation.z = liftA.current * 0.16
      if (r.rockB.current) r.rockB.current.rotation.z = -liftB.current * 0.16
    }
    if (view === 'chain') {
      const crank = p * 2 * D
      r.crankSp.current.rotation.z = -crank
      r.camSpA.current.rotation.z = -crank / 2
      r.camSpB.current.rotation.z = -crank / 2
      chainOff.current = -((crank * 0.4) / S.chainLen) * 0.8
    }
    if (overlapTag.current) overlapTag.current.style.opacity = ctrl.overlap && liftA.current > 0.03 && liftB.current > 0.03 ? 1 : 0

    Object.entries({ valvola: [m.valvola, m.valvolaAsp, m.valvolaSca], molla: [m.molla], camma: [m.camma], camme: [m.camma], punterie: [m.punteria], bilancieri: [m.bilanciere], sede: [m.sede], catena: [m.chain] }).forEach(([k, arr]) => {
      arr.forEach((mm) => pulseHL(mm, hl.has(k), t))
    })
  })

  const C = (props) => <Callout root={root} {...props} />
  const camDX = Math.sin(0.22) * 1.88
  const camDY = Math.cos(0.22) * 1.88

  return (
    <group ref={root}>
      {/* ---------- BIALBERO ---------- */}
      {view === 'dohc' && (
        <group position={[0, -0.9, 0]} scale={0.92}>
          <SectionBlock shape={S.dohcHead} depth={0.75} material={M.alu} sectionMat={M.section} ghost={M.ghost} />
          <HalfLathe profile={S.dohcCyl} material={M.alu} sectionMat={M.section} ghost={M.ghost} />
          <group ref={pistonRef}>
            <mesh geometry={S.piston} material={M.alu} position={[0, -0.39, 0]} />
            {[0.22, 0.14, 0.05].map((y) => (
              <mesh key={y} geometry={S.ring} material={M.steelDark} position={[0, y - 0.39, 0]} />
            ))}
          </group>
          {/* collettori */}
          <mesh material={M.rubber} position={[-1.62, 0.74, 0]} rotation={[0, 0, Math.PI / 2 - 0.15]}>
            <cylinderGeometry args={[0.24, 0.22, 0.3, 28, 1, true]} />
          </mesh>
          <mesh material={M.chrome} position={[1.6, 0.6, 0]} rotation={[0, 0, Math.PI / 2 + 0.05]}>
            <cylinderGeometry args={[0.19, 0.2, 0.3, 28, 1, true]} />
          </mesh>
          <group position={[0, 0.06, 0]}>
            <SparkPlug m={M} scale={1.25} />
          </group>
          <group position={[-0.38, 0, 0]}>
            <ValveAssy m={m} g={g} valveMat={m.valvolaAsp} valveGeo={g.valveIn} liftRef={liftA} axisTilt={0.22} refs={{ valve: r.valveA, bucket: r.bucketA }} />
          </group>
          <group position={[0.38, 0, 0]}>
            <ValveAssy m={m} g={g} valveMat={m.valvolaSca} valveGeo={g.valveEx} liftRef={liftB} axisTilt={-0.22} refs={{ valve: r.valveB, bucket: r.bucketB }} />
          </group>
          <group position={[-0.38 - camDX, camDY, 0]}>
            <Cam m={m} geo={g.cam} rotRef={camA} refsCam={r.camA} />
          </group>
          <group position={[0.38 + camDX, camDY, 0]}>
            <Cam m={m} geo={g.cam} rotRef={camB} refsCam={r.camB} />
          </group>
          <group position={[0, 2.75, 0]}>
            <Html center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
              <div ref={overlapTag} style={{ opacity: 0, transition: 'opacity .2s', background: '#ff6a1a', color: '#fff', padding: '4px 10px', borderRadius: 999, fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap' }}>
                INCROCIO
              </div>
            </Html>
          </group>
        </group>
      )}
      {view === 'dohc' && (hl.has('camme') || step.highlight.length === 0) && (
        <>
          <C target={r.camA} side={-1} dy={0.3} text="Albero a camme aspirazione" color="#3aa0ff" />
          <C target={r.camB} side={1} dy={0.3} text="Albero a camme scarico" color="#ff4d5e" />
        </>
      )}
      {view === 'dohc' && hl.has('punterie') && (
        <>
          <C target={r.bucketA} side={-1} dy={-0.3} text="Punteria a bicchiere" />
          <C target={r.bucketB} side={1} dy={-0.3} text="Punteria a bicchiere" />
        </>
      )}

      {/* ---------- UNA VALVOLA DA VICINO ---------- */}
      {(view === 'single' || view === 'clearance') && (
        <group position={[0, -1.3, 0]} scale={1.2}>
          <SectionBlock shape={S.singleHead} depth={0.7} material={M.alu} sectionMat={M.section} ghost={M.ghost} />
          <ValveAssy m={m} g={g} valveMat={m.valvola} valveGeo={g.valveIn} liftRef={liftA} refs={{ valve: r.valveA, bucket: r.bucketA, sede: r.sedeA }} />
          <group position={[0, 1.88 + (view === 'clearance' ? 0.08 : 0), 0]}>
            <Cam m={m} geo={g.cam} rotRef={camA} refsCam={r.camA} shaftLen={1.1} />
          </group>
          {view === 'clearance' && (
            <mesh ref={r.gapRef} material={m.gap} position={[0, 1.68, 0.05]}>
              <boxGeometry args={[0.42, 0.08, 0.3]} />
            </mesh>
          )}
        </group>
      )}
      {view === 'single' && (
        <>
          {hl.has('valvola') && <C target={r.valveA} offset={[0, 0.5, 0]} side={-1} dy={0.2} text="Stelo e fungo" />}
          {hl.has('molla') && <C target={r.bucketA} offset={[0.14, -0.35, 0]} side={1} dy={-0.1} text="Molla" />}
          {hl.has('sede') && <C target={r.sedeA} offset={[0.25, 0, 0]} side={1} dy={-0.2} text="Sede" color="#d8a51a" />}
          {hl.has('camma') && <C target={camA} side={1} dy={0.25} text="Camma" color="#ffb03a" />}
          {hl.has('camma') && <C target={r.bucketA} side={-1} dy={0.1} text="Punteria" />}
        </>
      )}
      {view === 'clearance' && <C target={r.gapRef} side={1} dy={0.2} text="Gioco valvole (ingrandito)" />}

      {/* ---------- MONOALBERO ---------- */}
      {view === 'sohc' && (
        <group position={[0, -1.2, 0]}>
          {/* parete posteriore della testata e fantasma anteriore */}
          <mesh geometry={S.sohcBack} material={M.alu} position={[0, 0, 0]} />
          <mesh material={M.ghost} position={[0, 0.98, 0]}>
            <boxGeometry args={[2.4, 2.25, 1.2]} />
          </mesh>
          <group position={[-0.5, 0, -0.18]}>
            <ValveAssy m={m} g={g} valveMat={m.valvolaAsp} valveGeo={g.valveIn} liftRef={liftA} refs={{ valve: r.valveA }} bucket={false} />
          </group>
          <group position={[0.5, 0, 0.18]}>
            <ValveAssy m={m} g={g} valveMat={m.valvolaSca} valveGeo={g.valveEx} liftRef={liftB} refs={{ valve: r.valveB }} bucket={false} />
          </group>
          {/* albero a camme centrale con due lobi */}
          <group position={[0, 1.45, 0]}>
            <mesh material={m.camma} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 1.4, 16]} />
            </mesh>
            <group position={[0, 0, -0.18]} ref={camA}>
              <group ref={r.camA}>
                <mesh geometry={g.camS} material={m.camma} />
              </group>
            </group>
            <group position={[0, 0, 0.18]} ref={camB}>
              <group ref={r.camB}>
                <mesh geometry={g.camS} material={m.camma} />
              </group>
            </group>
          </group>
          {/* bilancieri: fulcro tra camma e valvola, con rullino e vite di registro */}
          {[
            [-1, r.rockA, -0.18, rockerGeo.l],
            [1, r.rockB, 0.18, rockerGeo.r],
          ].map(([s, ref, z, geo]) => (
            <group key={s} position={[s * 0.28, 1.72, z]}>
              <mesh material={M.steel} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.045, 0.045, 0.34, 16]} />
              </mesh>
              <group ref={ref}>
                <mesh geometry={geo} material={m.bilanciere} />
                <mesh material={M.steel} position={[-s * 0.24, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.05, 0.05, 0.08, 18]} />
                </mesh>
                <mesh material={M.steel} position={[s * 0.22, -0.06, 0]}>
                  <cylinderGeometry args={[0.025, 0.025, 0.16, 12]} />
                </mesh>
                <mesh material={M.steelDark} position={[s * 0.22, 0.06, 0]}>
                  <cylinderGeometry args={[0.045, 0.045, 0.04, 6]} />
                </mesh>
              </group>
            </group>
          ))}
        </group>
      )}
      {view === 'sohc' && (
        <>
          <C target={r.rockA} offset={[-0.2, 0, 0]} side={-1} dy={0.35} text="Bilanciere" />
          <C target={r.rockB} offset={[0.2, 0, 0]} side={1} dy={0.35} text="Bilanciere" />
          <C target={r.camA} side={1} dy={-0.55} text="Unico albero a camme" color="#ffb03a" />
        </>
      )}

      {/* ---------- CATENA DI DISTRIBUZIONE ---------- */}
      {view === 'chain' && (
        <group scale={0.8}>
          {/* carter posteriore */}
          <mesh material={M.aluDark} position={[0, 0, -0.3]}>
            <boxGeometry args={[3.2, 4.6, 0.08]} />
          </mesh>
          <group ref={r.chainRef}>
            <RollerChain curve={S.curve} count={64} speedRef={chainOff} material={m.chain} pitch={0.11} />
          </group>
          <group position={[0, -1.6, 0]}>
            <group ref={r.crankSp}>
              <mesh geometry={S.small} material={M.steel} />
              <mesh material={m.mark} position={[0, 0.2, 0.08]}>
                <boxGeometry args={[0.05, 0.1, 0.02]} />
              </mesh>
            </group>
            <mesh material={M.steelDark} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.15]}>
              <cylinderGeometry args={[0.13, 0.13, 0.3, 24]} />
            </mesh>
          </group>
          {[
            [-0.75, r.camSpA],
            [0.75, r.camSpB],
          ].map(([x, ref]) => (
            <group key={x} position={[x, 1.6, 0]}>
              <group ref={ref}>
                <mesh geometry={S.big} material={m.camma} />
                <mesh material={m.mark} position={[0, 0.5, 0.07]}>
                  <boxGeometry args={[0.06, 0.14, 0.02]} />
                </mesh>
                {[0, 1, 2].map((k) => (
                  <mesh key={k} material={M.steel} position={[Math.cos((k * 2 * Math.PI) / 3) * 0.2, Math.sin((k * 2 * Math.PI) / 3) * 0.2, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.035, 0.035, 0.04, 6]} />
                  </mesh>
                ))}
              </group>
            </group>
          ))}
          {/* tenditore (pattino a sinistra) e guida (a destra) */}
          <mesh geometry={S.shoe} material={m.shoe} />
          <mesh geometry={S.guideR} material={m.shoe} />
          <mesh material={M.alu} position={[-1.45, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, 0.3, 16]} />
          </mesh>
        </group>
      )}
      {view === 'chain' && (
        <>
          <C target={r.crankSp} side={1} dy={-0.2} text="Albero motore (12 denti)" />
          <C target={r.camSpB} side={1} dy={0.45} text="Albero a camme (24 denti)" color="#ffb03a" />
          <C target={r.chainRef} offset={[-0.95, 0.1, 0]} side={-1} dy={0} text="Catena e tenditore" />
        </>
      )}

      {/* ---------- 2 O 4 VALVOLE ---------- */}
      {view === 'four' && <Chamber m={m} valves={valvesCtl} liftA={liftA} liftB={liftB} />}
    </group>
  )
}

// Camera di scoppio vista dal pistone: tetto in alluminio con funghi delle valvole e candela
function Chamber({ m, valves, liftA, liftB }) {
  const M = m.M
  const refs = useRef([])
  useFrame(() => {
    refs.current.forEach((g) => {
      if (!g) return
      const l = (g.userData.intake ? liftA.current : liftB.current) * 0.25
      g.position.z = g.userData.z0 + l
    })
  })
  const dome = useMemo(() => lathe([[0, 0.0], [0.6, -0.04], [1.15, -0.14], [1.3, -0.16], [1.45, -0.16], [1.45, 0.3], [0, 0.3]], 72), [])
  const roofZ = (x, y) => {
    const rr = Math.hypot(x, y)
    return rr < 0.6 ? (rr / 0.6) * 0.04 : 0.04 + ((rr - 0.6) / 0.55) * 0.1
  }
  const face = useMemo(() => {
    const geos = {}
    ;[0.46, 0.4, 0.34, 0.3].forEach((r) => {
      geos[r] = lathe([[0, 0], [r * 0.9, 0], [r, 0.015], [r, 0.04], [r * 0.7, 0.09], [0.06, 0.2], [0.04, 0.5], [0, 0.5]], 40)
    })
    return geos
  }, [])
  const list =
    valves === 2
      ? [
          { x: -0.5, y: 0, r: 0.46, intake: true },
          { x: 0.5, y: 0, r: 0.4, intake: false },
        ]
      : [
          { x: -0.5, y: 0.43, r: 0.34, intake: true },
          { x: -0.5, y: -0.43, r: 0.34, intake: true },
          { x: 0.52, y: 0.4, r: 0.3, intake: false },
          { x: 0.52, y: -0.4, r: 0.3, intake: false },
        ]
  const plug = valves === 2 ? [0, 0.72] : [0, 0]
  return (
    <group rotation={[-0.35, 0.25, 0]} position={[0, 0.1, 0]}>
      {/* tetto della camera (guardato dal basso): asse del tornio lungo z */}
      <mesh geometry={dome} material={M.aluDark} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.02]} />
      {list.map((v, i) => (
        <group
          key={valves + '-' + i}
          ref={(el) => {
            refs.current[i] = el
            if (el) {
              el.userData.intake = v.intake
              el.userData.z0 = roofZ(v.x, v.y) + 0.035
            }
          }}
          position={[v.x, v.y, roofZ(v.x, v.y) + 0.035]}
        >
          <mesh geometry={face[v.r]} rotation={[-Math.PI / 2, 0, 0]} material={v.intake ? m.valvolaAsp : m.valvolaSca} />
        </group>
      ))}
      {list.map((v, i) => (
        <mesh key={'s' + i} position={[v.x, v.y, roofZ(v.x, v.y) + 0.03]}>
          <ringGeometry args={[v.r * 0.98, v.r * 1.1, 48]} />
          <meshStandardMaterial color="#c9a04a" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      <group position={[plug[0], plug[1], roofZ(plug[0], plug[1]) + 0.04]} rotation={[-Math.PI / 2, 0, 0]}>
        <SparkPlug m={M} scale={1.3} />
      </group>
      <Html position={[0, -1.6, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{ display: 'flex', gap: 10, fontSize: 11.5, fontWeight: 700, color: '#eef1f6', whiteSpace: 'nowrap', background: 'rgba(14,17,24,.78)', padding: '4px 10px', borderRadius: 8 }}>
          <span style={{ color: '#5fb4ff' }}>● aspirazione</span>
          <span style={{ color: '#ff7b88' }}>● scarico</span>
          <span style={{ color: '#ffd59a' }}>● candela</span>
        </div>
      </Html>
    </group>
  )
}
