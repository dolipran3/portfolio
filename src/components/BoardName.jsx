import React from 'react';
import { Text3D, Center } from '@react-three/drei';

function BoardName({ position }) {
  return (
    <group position={position} rotation={[0, 0, -Math.PI / 4]}>

      <Center position={[0, 0.1, 0.1]}>
        <Text3D
          font="/KabelBdNormal.json"
          size={0.40}
          height={0.6}
          bevelEnabled
          bevelSize={0.03}
          bevelThickness={0.05}
          /* rotate : chaque lettre doit reprendre l'orientation du parent (diagonale) */
          rotation={[0, 0, 0]}
          castShadow
          receiveShadow
        >
          BAPTISTE LE BAIL
          <meshStandardMaterial color="#cbcbcb" roughness={0.8} metalness={0.2} />
        </Text3D>
      </Center>
    </group>
  );
}

export default BoardName;