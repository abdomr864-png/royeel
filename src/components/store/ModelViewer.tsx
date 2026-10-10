'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bounds, ContactShadows, Environment, OrbitControls, useGLTF } from '@react-three/drei'

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

// The coat's .glb model, turning slowly; the visitor drags to rotate it.
export default function ModelViewer({ url, label }: { url: string; label: string }) {
  return (
    <Canvas
      camera={{ position: [0, 0.2, 3.2], fov: 32 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      aria-label={label}
      role="img"
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <directionalLight position={[-4, 2, -3]} intensity={0.6} color="#d8bf8c" />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.15}>
          <Model url={url} />
        </Bounds>
        <ContactShadows position={[0, -1.1, 0]} opacity={0.35} scale={6} blur={2.6} far={2} />
        <Environment preset="studio" />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={1.4}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.8}
      />
    </Canvas>
  )
}
