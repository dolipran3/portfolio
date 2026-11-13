import { useTexture } from '@react-three/drei';

// Le plateau central (le grand cube sur lequel sont posées les cases).
// La texture du centre est chargée via useTexture, qui doit être appelée
// depuis un composant rendu À L'INTÉRIEUR du <Canvas> de Scene.jsx (le hook
// s'appuie sur le contexte r3f) et qui suspend pendant le chargement, d'où
// le Suspense côté scène.
function Plateau({ onClick }) {
  const centrePlateauTexture = useTexture('/CentrePlateau.webp');
  return (
    <mesh position={[0, 0, 0.5]} castShadow receiveShadow onClick={onClick}>
      <boxGeometry args={[9, 9, 0.8]} />
      <meshStandardMaterial attach="material-0" color="#e9e9e9" roughness={0.8}/>
      <meshStandardMaterial attach="material-1" color="#e9e9e9" roughness={0.8}/>
      <meshStandardMaterial attach="material-2" color="#e9e9e9" roughness={0.8}/>
      <meshStandardMaterial attach="material-3" color="#e9e9e9" roughness={0.8}/>
      <meshStandardMaterial attach="material-4" map={centrePlateauTexture} roughness={0.8}/>
      <meshStandardMaterial attach="material-5" color="#e9e9e9" roughness={0.8}/>
    </mesh>
  );
}

export default Plateau;
