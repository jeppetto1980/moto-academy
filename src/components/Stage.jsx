import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'

// Contenitore 3D comune: luci, ombra a terra e controlli touch (ruota con un dito, zoom con due)
export default function Stage({ children, camera, target = [0, 0, 0], controlsRef, autoRotate = false, minD = 3, maxD = 12, shadowY = -1.5, className = 'stage', dim = false, bloom = false }) {
  return (
    <div className={className}>
      <Canvas dpr={[1, 2]} camera={{ fov: 38, position: camera }} gl={{ antialias: true, alpha: true }}>
        <hemisphereLight args={['#dfe8ff', '#20242e', dim ? 0.35 : 0.9]} />
        <directionalLight position={[4, 6, 5]} intensity={dim ? 0.5 : 1.6} />
        <directionalLight position={[-5, 3, -4]} intensity={dim ? 0.3 : 0.6} color="#9fc4ff" />
        <Suspense fallback={null}>{children}</Suspense>
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
