// Etichetta "a richiamo": testo fuori dal disegno, collegato al pezzo da una linea con un pallino.
// Segue il pezzo mentre si muove e si dispone sempre ai lati dello schermo.
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

export default function Callout({ root, target, offset = [0, 0, 0], side = 1, dy = 0, text, color = '#ff8a3d', spread = 0.36, minEdge = 0.85, maxEdge = 1.5 }) {
  const { camera, size } = useThree()
  const tag = useRef()
  const dot = useRef()
  const v = useMemo(
    () => ({ off: new THREE.Vector3(...offset), a: new THREE.Vector3(), e: new THREE.Vector3(), l: new THREE.Vector3(), c: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3(), t: new THREE.Vector3() }),
    [offset]
  )
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3))
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false })
    const l = new THREE.Line(g, m)
    l.renderOrder = 20
    l.frustumCulled = false
    return l
  }, [color])

  useFrame(() => {
    if (!target.current || !root.current) return
    // punto del pezzo, in coordinate mondo
    v.a.copy(v.off)
    target.current.localToWorld(v.a)
    root.current.getWorldPosition(v.c)
    // assi "destra" e "su" dello schermo
    v.r.set(1, 0, 0).applyQuaternion(camera.quaternion)
    v.u.set(0, 1, 0).applyQuaternion(camera.quaternion)
    const along = v.t.copy(v.a).sub(v.c).dot(v.r)
    // distanza dal centro adattata alla larghezza dello schermo, così il testo non esce
    const dist = camera.position.distanceTo(v.c)
    const halfW = dist * Math.tan((camera.fov * Math.PI) / 360) * (size.width / size.height)
    const edge = Math.min(Math.max(halfW * spread, minEdge), maxEdge)
    // se il pezzo è già oltre il bordo, l'etichetta va appena più in là (senza uscire dallo schermo)
    let goal = edge
    if (side * along > edge - 0.25) goal = Math.max(Math.min(side * along + 0.35, halfW - 1.6), edge)
    const d = side * goal - along
    v.l.copy(v.a).addScaledVector(v.r, d).addScaledVector(v.u, dy)
    v.e.copy(v.a).addScaledVector(v.r, d - side * 0.28).addScaledVector(v.u, dy)
    root.current.worldToLocal(v.a)
    root.current.worldToLocal(v.e)
    root.current.worldToLocal(v.l)
    const pos = line.geometry.attributes.position
    pos.setXYZ(0, v.a.x, v.a.y, v.a.z)
    pos.setXYZ(1, v.e.x, v.e.y, v.e.z)
    pos.setXYZ(2, v.l.x, v.l.y, v.l.z)
    pos.needsUpdate = true
    dot.current.position.copy(v.a)
    tag.current.position.copy(v.l)
  })

  return (
    <>
      <primitive object={line} />
      <mesh ref={dot} renderOrder={21}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshBasicMaterial color={color} depthTest={false} transparent />
      </mesh>
      <group ref={tag}>
        <Html style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
          <div
            style={{
              transform: side > 0 ? 'translate(4px, -50%)' : 'translate(calc(-100% - 4px), -50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(14,17,24,.78)',
              backdropFilter: 'blur(6px)',
              color: '#eef1f6',
              padding: '3px 9px',
              borderRadius: 8,
              fontSize: 11.5,
              fontWeight: 650,
              lineHeight: 1.2,
              width: 'max-content',
              maxWidth: 128,
              boxSizing: 'border-box',
              border: `1px solid ${color}66`,
              flexDirection: side > 0 ? 'row' : 'row-reverse',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 3, background: color, flex: 'none' }} />
            <span style={{ minWidth: 0, overflowWrap: 'anywhere', textAlign: side > 0 ? 'left' : 'right' }}>{text}</span>
          </div>
        </Html>
      </group>
    </>
  )
}

