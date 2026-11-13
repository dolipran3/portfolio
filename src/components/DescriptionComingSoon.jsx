import { Center, Text3D } from '@react-three/drei';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';


import { Entrance, SlideGroup } from './CaseDescription';

// Couleur du tube néon : magenta, qui tranche avec la case verte et le fond bleu.
const NEON_COLOR = '#187501';

// Matériau du tube néon : la lettre elle-même est sombre, c'est l'émission qui
// produit la couleur. Deux ingrédients pour que le Bloom (dans Scene.jsx) ne
// rattrape QUE ce texte :
// - emissive élevé (>= 2.0), très au-dessus des surfaces éclairées normales ;
// - toneMapped={false} : la valeur ne repasse pas dans le tone mapping, donc
//   reste > 1.0 dans le buffer de rendu que lit le Bloom.
// L'intensité d'émission est animée : pulsation continue (l'enseigne « respire »)
// + scintillement bref et rare, comme un tube néon fatigué.
function NeonMaterial() {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;

    // Pulsation douce autour de 2.0 (+/- 0.55).
    let intensity = 2 + Math.sin(t * 2.2) * 0.55;

    // Scintillement : le sinus à haute fréquence ne dépasse 0.9955 que pendant
    // quelques frames d'affilée, d'où de courts éclats « défaillants ».
    if (Math.sin(t * 23.1) > 0.9955) intensity *= 0.15;

    ref.current.emissiveIntensity = intensity;
  });

  return (
    <meshStandardMaterial
      ref={ref}
      color="#03aa1c"
      emissive={NEON_COLOR}
      emissiveIntensity={2}
      roughness={0.35}
      metalness={0}
      toneMapped={false}
    />
  );
}

// Une ligne de texte néon : mêmes les lettres biseautées que le titre PORTFOLIO,
// mais avec le matériau lumineux animé.
function NeonText({ children, ...props }) {
  return (
    <Text3D
      font="/KabelBdNormal.json"
      size={0.75}
      height={0.6}
      bevelEnabled
      bevelSize={0.03}
      bevelThickness={0.05}
      castShadow
      receiveShadow
      {...props}
    >
      {children}
      <NeonMaterial />
    </Text3D>
  );
}

// Vue de la case « à venir » : pas de description ni de carte, seulement le
// texte « COMING SOON » en néon 3D (glow via Bloom). Mêmes animations que les
// autres descriptions : glisse pendant la navigation par flèches + apparition
// en douceur (scale 0 -> 1).
export default function DescriptionComingSoon({ transition, caseRotation }) {
  const ref = useRef();
  useFrame((_, delta) => {
      if (!ref.current) return;
      ref.current.rotation['y'] += delta*0.3;
    });


  return (
    <SlideGroup transition={transition} caseRotation={caseRotation}>
      <group position={[0, 0, 3.4]} rotation={[0, -Math.PI / 2, -Math.PI / 2]} scale={1}>
        <group ref={ref}>
          <Entrance>
            <Center position={[0, 0.7, 0]}>
              <NeonText>COMING</NeonText>
            </Center>

            <Center position={[0, -0.7, 0]}>
              <NeonText>SOON</NeonText>
            </Center>
          </Entrance>
        </group>
      </group>
    </SlideGroup>
  );
}
