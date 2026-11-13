import React from 'react';

function Background({ onClick }) {
  return (
    <mesh 
      // receiveShadow uniquement : ce plan n'a rien devant lui à projeter,
      // le marquer castShadow l'injectait inutilement dans les passes d'ombre
      receiveShadow
      onClick={onClick}
      position={[0, 0, 0]}>
      <planeGeometry args={[1000, 1000]} />
      <meshStandardMaterial color="#219ebc" roughness={0.8} />
    </mesh>
  );
  // color="#219ebc"
}

export default Background;
