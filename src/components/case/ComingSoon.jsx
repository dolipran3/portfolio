import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei';

export function ComingSoonCase({ position, rotation = [0, 0, 0], view, onSelect}) {
  const comingSoonTexture = useTexture('/ComingSoon.webp');
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
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation(); // évite de propager le clic à d'autres meshes derrière
        onSelect({ position, rotation, type: 'comingSoon' });
      }}
    >
      <boxGeometry args={[3, 3, 1]} />
      <meshStandardMaterial attach="material-0" color="white" roughness={0.8}/>
      <meshStandardMaterial attach="material-1" color="white" roughness={0.8}/>
      <meshStandardMaterial attach="material-2" color="white" roughness={0.8}/>
      <meshStandardMaterial attach="material-3" color="white" roughness={0.8}/>
      <meshStandardMaterial attach="material-4" map={comingSoonTexture} roughness={0.8}/>
      <meshStandardMaterial attach="material-5" color="white" roughness={0.8}/>
    </mesh>
  );
}