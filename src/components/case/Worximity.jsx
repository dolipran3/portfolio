import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei';
import { preloadCase3D } from '../case3DAssets'

export function Worximity({ position, rotation = [0, 0, 0], view, onSelect}) {
  const worximityTexture = useTexture('/Worximity.webp');
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();

  useFrame(() => {
    if (!meshRef.current) return;

    const canHover = view === 'top'; 
    const targetZ = (hovered && canHover) ? position[2] + 1 : position[2];
    const currentZ = meshRef.current.position.z;

    // lerp sur Z uniquement
    meshRef.current.position.z += (targetZ - currentZ) * 0.1;
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      castShadow
      onPointerOver={() => {
        setHovered(true);
        // télécharge le modèle 3D de la description en anticipation du clic
        preloadCase3D('worximity');
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation(); // évite de propager le clic à d'autres meshes derrière
        onSelect({ position, rotation, type: 'worximity' });
      }}
    >
      <boxGeometry args={[3, 3, 1]} />
      <meshStandardMaterial attach="material-0" color="#9b7db4" roughness={0.8}/>
      <meshStandardMaterial attach="material-1" color="#9b7db4" roughness={0.8}/>
      <meshStandardMaterial attach="material-2" color="#9b7db4" roughness={0.8}/>
      <meshStandardMaterial attach="material-3" color="#9b7db4" roughness={0.8}/>
      <meshStandardMaterial attach="material-4" map={worximityTexture} roughness={0.8}/>
      <meshStandardMaterial attach="material-5" color="#9b7db4" roughness={0.8}/>
    </mesh>
  );
}