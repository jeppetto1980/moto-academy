import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { BIKE_SVG } from '../lib/loaderSvg'

// Segnala quando la scena ha disegnato i primi fotogrammi (quindi è davvero visibile)
function ReadySignal({ onReady }) {
  const n = useRef(0)
  useFrame(() => {
    n.current++
    if (n.current === 3) onReady()
  })
  return null
}

// Moto che si riempie mentre la scena 3D si prepara
function StageLoader({ hidden }) {
  const box = useRef()
  const [gone, setGone] = useState(false)
  useEffect(() => {
    let p = 0
    const svg = box.current
    const set = (v) => {
      p = v
      svg?.querySelector('.ld-fill')?.setAttribute('width', (v * 2).toFixed(1))
      const b = svg?.querySelector('.ld-bar i'); if (b) b.style.width = v + '%'
    }
    if (hidden) { set(100); const t = setTimeout(() => setGone(true), 500); return () => clearTimeout(t) }
    const t = setInterval(() => set(p + (92 - p) * 0.06), 100)
    return () => clearInterval(t)
  }, [hidden])
  if (gone) return null
  return (
    <div ref={box} className={'stage-loader' + (hidden ? ' out' : '')} aria-hidden="true">
      <div dangerouslySetInnerHTML={{ __html: BIKE_SVG }} />
      <div className="ld-bar"><i /></div>
      <span>Preparo la scena…</span>
    </div>
  )
}
import { ContactShadows, OrbitControls } from '@react-three/drei'

// Contenitore 3D comune: luci, ombra a terra e controlli touch (ruota con un dito, zoom con due)
export default function Stage({ children, camera, target = [0, 0, 0], controlsRef, autoRotate = false, minD = 3, maxD = 12, shadowY = -1.5, className = 'stage', dim = false, bloom = false }) {
  const [ready, setReady] = useState(false)
  const onReady = () => { setReady(true); window.__bootDone?.() }
  return (
    <div className={className}>
      <StageLoader hidden={ready} />
      <Canvas dpr={[1, 2]} camera={{ fov: 38, position: camera }} gl={{ antialias: true, alpha: true }}>
        <hemisphereLight args={['#dfe8ff', '#20242e', dim ? 0.35 : 0.9]} />
        <directionalLight position={[4, 6, 5]} intensity={dim ? 0.5 : 1.6} />
        <directionalLight position={[-5, 3, -4]} intensity={dim ? 0.3 : 0.6} color="#9fc4ff" />
        <Suspense fallback={null}>{children}<ReadySignal onReady={onReady} /></Suspense>
        <ContactShadows position={[0, shadowY, 0]} opacity={dim ? 0.7 : 0.45} scale={10} blur={2.4} far={4} />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          target={target}
          enablePan={false}
          minDistance={minD}
          maxDistance={maxD}
          autoRotate={autoRotate}
          autoRotateSpeed={0.8}
          enableDamping
        />
      </Canvas>
    </div>
  )
}
