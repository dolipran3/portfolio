import { useTexture } from '@react-three/drei';

export function SwapCards({ textureUrl, position = [0, 0, -0.1], rotation = [0, -Math.PI / 40, Math.PI / 2], dimensions = [2.2, 0.1, 3] }) {
  const description = useTexture(textureUrl);

  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={dimensions} />
      <meshStandardMaterial attach="material-0" roughness={1}/>
      <meshStandardMaterial attach="material-1" roughness={1}/>
      <meshStandardMaterial attach="material-2" roughness={1}/>
      <meshStandardMaterial attach="material-3" map={description} roughness={1}/>
      <meshStandardMaterial attach="material-4" roughness={1}/>
      <meshStandardMaterial attach="material-5" roughness={1}/>
    </mesh>
  );
}

