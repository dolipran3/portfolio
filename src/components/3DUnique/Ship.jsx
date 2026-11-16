import { useGLTF } from '@react-three/drei';
import { MODELE3D } from '../case3DAssets';

const assets = MODELE3D['ship'];

export default function Ship({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  const { scene } = useGLTF(assets.glb);

  return (
    <primitive
      object={scene}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow
    />
  );
}

// Préchargement du GLB dès l'import du module : le décodage se fait en amont,
// le premier rendu du bateau est synchrone (même logique que les cases).
useGLTF.preload(assets.glb);
