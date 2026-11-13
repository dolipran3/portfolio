import { useRef, useState } from 'react'
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber'

// Case d'angle du plateau : quand on clique dessus, la caméra zoome face à
// elle avec un roulis (angle passé dans `rotation`, autour de l'axe Z),
// puis à la fin de l'animation le chatbot s'ouvre et se présente
// (lecture de infoPerso.md message par message). C'est le flag `chatbot`
// dans le payload de sélection qui en informe CameraController.
export function StartCase({ position, rotation = [0, 0, 0], view, onSelect }) {
  const depart = useTexture('/depart.webp');
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
      castShadow
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation(); // évite de propager le clic au plateau derrière
        onSelect({ position, rotation, type: 'corner', chatbot: true });
      }}
    >
      <boxGeometry args={[3, 3, 1]} />
      <meshStandardMaterial attach="material-0" color="white" roughness={0.8}/>
      <meshStandardMaterial attach="material-1" color="white" roughness={0.8}/>
      <meshStandardMaterial attach="material-2" color="white" roughness={0.8}/>
      <meshStandardMaterial attach="material-3" color="white" roughness={0.8}/>
      <meshStandardMaterial attach="material-4" map={depart} roughness={0.8}/>
      <meshStandardMaterial attach="material-5" color="white" roughness={0.8}/>
    </mesh>
  );
}
