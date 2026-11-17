import { useEffect, useState } from 'react';

// Détecte les appareils dont l'entrée principale est un tactile
// (téléphones, tablettes). `pointer: coarse` ne correspond que si le
// doigt est l'input principal : un PC portable tactile (souris ou
// trackpad en entrée principale) reste donc considéré comme desktop.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

export default useIsMobile;
