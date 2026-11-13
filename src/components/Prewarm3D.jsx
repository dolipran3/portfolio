import { Suspense, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { CASE_3D_ASSETS, onCase3DPreloaded } from './case3DAssets';

// Prépare le GPU pour un modèle dont le préchargement vient de se terminer :
// compilation des shaders + envoi des textures sur la carte graphique, via
// gl.compileAsync qui étale le travail sur plusieurs frames au lieu de geler
// le main thread. Sans ça, ce travail se paye d'un coup au premier affichage
// du modèle — pile pendant l'animation caméra qui amène vers la case.
function PrewarmCase3D({ type }) {
  const { gl, camera } = useThree();
  // Résolu immédiatement depuis le cache : le preload est déjà terminé.
  const { scene } = useGLTF(CASE_3D_ASSETS[type].glb);

  useEffect(() => {
    // Les shaders et textures compilés ici sont réutilisés tels quels par la
    // description (mêmes instances de matériaux, même objet de scène).
    gl.compileAsync(scene, camera).catch(() => {});
  }, [gl, camera, scene]);

  return null;
}

// Se branche sur le préchargeur : monte un PrewarmCase3D pour chaque modèle
// une fois seulement qu'il est en cache (jamais avant, sinon on affecterait
// tous les téléchargements au démarrage et perdrait la priorisation).
export default function Prewarm3D() {
  const [readyTypes, setReadyTypes] = useState(() => new Set());

  useEffect(() => {
    return onCase3DPreloaded((type) => {
      // Les cases sans modèle 3D (ex. loisir) n'ont rien à préchauffer côté
      // GPU : on n'écoute pas leur notification de préchargement, sinon le
      // useGLTF ci-dessus partirait sur un GLB non défini et planterait.
      if (!CASE_3D_ASSETS[type].glb) return;
      setReadyTypes((prev) => {
        if (prev.has(type)) return prev;
        const next = new Set(prev);
        next.add(type);
        return next;
      });
    });
  }, []);

  return (
    <>
      {[...readyTypes].map((type) => (
        <Suspense key={type} fallback={null}>
          <PrewarmCase3D type={type} />
        </Suspense>
      ))}
    </>
  );
}
