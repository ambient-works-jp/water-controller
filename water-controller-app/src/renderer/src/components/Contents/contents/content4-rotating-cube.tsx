/**
 * コンテンツ 4: 回転する立方体（Three.js）
 *
 * Three.js を使った基本的な 3D コンテンツのサンプル
 */

import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Content, ContentComponentProps } from '../types'

/**
 * 回転する立方体コンポーネント
 */
function RotatingCube(): React.JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null)

  // フレームごとに呼ばれる
  useFrame((_state, delta) => {
    if (meshRef.current) {
      // Y軸を中心に回転
      meshRef.current.rotation.y += delta * 0.5
      // X軸も少し回転
      meshRef.current.rotation.x += delta * 0.2
    }
  })

  return (
    <mesh ref={meshRef}>
      {/* 立方体のジオメトリ（1x1x1） */}
      <boxGeometry args={[1, 1, 1]} />
      {/* マテリアル（オレンジ色） */}
      <meshStandardMaterial color="orange" />
    </mesh>
  )
}

/**
 * Three.js シーンコンポーネント
 */
function ThreeScene({ width, height }: Omit<ContentComponentProps, 'time'>): React.JSX.Element {
  return (
    <Canvas
      style={{ width, height }}
      camera={{ position: [0, 0, 3], fov: 50 }}
      gl={{ antialias: true }}
    >
      {/* 環境光（全体を明るく） */}
      <ambientLight intensity={0.5} />
      {/* 指向性ライト（影を作る） */}
      <directionalLight position={[5, 5, 5]} intensity={1} />
      {/* 回転する立方体 */}
      <RotatingCube />
      {/* マウスでカメラ操作（オプション） */}
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  )
}

/**
 * コンテンツ定義
 */
export const rotatingCube: Content = {
  metadata: {
    id: 'rotating-cube',
    name: 'Rotating Cube',
    description: 'Three.js を使った回転する立方体'
  },
  component: ThreeScene
}
