import { useTexture, useVideoTexture } from '@react-three/drei';

// Faces du centre du plateau (faces 3 et 4 de la boîte) avec la texture
// image. La texture est chargée via useTexture, qui doit être appelé depuis
// un composant rendu À L'INTÉRIEUR du <Canvas> de Scene.jsx (le hook s'appuie
// sur le contexte r3f) et qui suspend pendant le chargement, d'où le Suspense
// côté scène.
function ImageCentreFaces() {
  const centrePlateauTexture = useTexture('/CentrePlateau.webp');
  return (
    <>
      <meshStandardMaterial attach="material-3" map={centrePlateauTexture} roughness={0.8}/>
      <meshStandardMaterial attach="material-4" map={centrePlateauTexture} roughness={0.8}/>
    </>
  );
}

// Mêmes faces, mais avec la texture vidéo. Ce composant n'est monté qu'une
// fois le seuil de tours franchi : useVideoTexture ne doit pas charger (ni
// lire, avec le son !) rickroll.mp4 dès le chargement de la page.
function VideoCentreFaces() {
  const texture = useVideoTexture('/rickroll.mp4', {
    loop: true,
    muted: false,
    playsInline: true,
    start: true,
  })
  return (
    <>
      <meshStandardMaterial attach="material-3" map={texture} roughness={0.8}/>
      <meshStandardMaterial attach="material-4" map={texture} roughness={0.8}/>
    </>
  );
}

// Le plateau central (le grand cube sur lequel sont posées les cases).
// lapCount : nombre de tours complets du plateau effectués par l'utilisateur
// (remonté par CameraController via Scene). Passé ce seuil, la texture image
// du centre cède sa place à la vidéo.
const RICKROLL_LAPS = 30;

function Plateau({ onClick, lapCount = 0 }) {
  return (
    <mesh position={[0, 0, 0.5]} castShadow receiveShadow onClick={onClick}>
      <boxGeometry args={[9, 9, 0.8]} />
      <meshStandardMaterial attach="material-0" color="#e9e9e9" roughness={0.8}/>
      <meshStandardMaterial attach="material-1" color="#e9e9e9" roughness={0.8}/>
      <meshStandardMaterial attach="material-2" color="#e9e9e9" roughness={0.8}/>
      {lapCount > RICKROLL_LAPS ? <VideoCentreFaces /> : <ImageCentreFaces />}
      <meshStandardMaterial attach="material-5" color="#e9e9e9" roughness={0.8}/>
    </mesh>
  );
}

export default Plateau;
