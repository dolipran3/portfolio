import { useTexture } from '@react-three/drei';

export function BilletsCards({ textureUrl, color, position = [0, 0, 0], rotation = [0, 0, 0], dimension = [1.954*2.3, 0.03, 1*2.3] }) {
  const description = useTexture(textureUrl);

  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={dimension} />
      <meshStandardMaterial attach="material-0" color={color} roughness={0.2}/>
      <meshStandardMaterial attach="material-1" color={color} roughness={0.8}/>
      <meshStandardMaterial attach="material-2" color={color} roughness={0.8}/>
      <meshStandardMaterial attach="material-3" map={description} roughness={1}/>
      <meshStandardMaterial attach="material-4" color={color} roughness={0.8}/>
      <meshStandardMaterial attach="material-5" color={color} roughness={0.8}/>
    </mesh>
  );
}