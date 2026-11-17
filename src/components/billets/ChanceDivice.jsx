import { useRef } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BILLET } from '../case3DAssets';

const assets = BILLET['mobile'];

export default function ChanceDivice({position = [0, 0, 0], rotation = [-Math.PI/2, 0, 0]}) {
  const description = useTexture(assets.texture);
  const dos = useTexture(assets.dos);
  
  const mesh = useRef();
  const flipped = useRef(false);

  useFrame((_, delta) => {
    if (!mesh.current) return;
    const target = rotation[2] + (flipped.current ? Math.PI : 0);
    mesh.current.rotation.x = rotation[0];
    mesh.current.rotation.y = rotation[1];
    mesh.current.rotation.z = THREE.MathUtils.damp(mesh.current.rotation.z, target, 6, delta);
  });

  const handleClick = (e) => {
    e.stopPropagation();
    // Ignore les clics issus d'un drag caméra (orbite)
    if (e.delta > 5) return;
    flipped.current = !flipped.current;
  };

  return (
    <mesh
      ref={mesh}
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
      onClick={handleClick}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      <boxGeometry args={[2.2*1.3, 0.1, 3*1.3]} />
      <meshStandardMaterial attach="material-0" color="white" roughness={0.2}/>
      <meshStandardMaterial attach="material-1" color="white" roughness={0.8}/>
      <meshBasicMaterial attach="material-2" map={description} roughness={0.8}/>
      <meshBasicMaterial attach="material-3" map={dos} roughness={1}/>
      <meshStandardMaterial attach="material-4" color="white" roughness={0.8}/>
      <meshStandardMaterial attach="material-5" color="white" roughness={0.8}/>
    </mesh>
  );
}
