import React from 'react';
import { Text3D, Center } from '@react-three/drei';

function BoardTitle({ position }) {
  return (
    <group position={position} rotation={[0, 0, -Math.PI / 4]}>
      <mesh position={[0, 0, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[9, 2.5, 0.5]} />
        <meshStandardMaterial color="red" roughness={0.6} />
      </mesh>

      <Center position={[0, 0.1, 0.1]}>
        <Text3D
          font="/KabelBdNormal.json"
          size={0.85}
          height={0.6}
          bevelEnabled
          bevelSize={0.03}
          bevelThickness={0.05}
          /* rotate : chaque lettre doit reprendre l'orientation du parent (diagonale) */
          rotation={[0, 0, 0]}
          castShadow
          receiveShadow
        >
          PORTFOLIO
          <meshStandardMaterial color="white" roughness={0.3} metalness={0.2} />
        </Text3D>
      </Center>
    </group>
  );
}

export default BoardTitle;