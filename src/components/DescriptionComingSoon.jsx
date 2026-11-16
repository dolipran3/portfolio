import { Center, Text3D } from '@react-three/drei';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';


import { Entrance, SlideGroup } from './CaseDescription';


// Vue de la case « à venir » : pas de description ni de carte, seulement le
// texte « COMING SOON » en néon 3D (glow via Bloom). Mêmes animations que les
// autres descriptions : glisse pendant la navigation par flèches + apparition
// en douceur (scale 0 -> 1).
export default function DescriptionComingSoon({ transition, caseRotation }) {
  const ref = useRef();
  useFrame((_, delta) => {
      if (!ref.current) return;
      ref.current.rotation['y'] += delta*0;
    });


  return (
    <SlideGroup transition={transition} caseRotation={caseRotation}>
      <group ref={ref} position={[0, 1, 3.5]} rotation={[Math.PI/2, Math.PI, 0]} scale={1}>
        <Entrance>
          <Center position={[0, 0, 0]}>
            <Text3D
              font="/KabelBdNormal.json"
              size={0.35}
              height={0.15}
              bevelEnabled
              bevelSize={0.03}
              bevelThickness={0.05}
              castShadow
              receiveShadow
              >
                COMING SOON
                <meshStandardMaterial color="white" roughness={0.9} metalness={0.2} />
              </Text3D>
          </Center>
        </Entrance>
      </group>
    </SlideGroup>
  );
}
