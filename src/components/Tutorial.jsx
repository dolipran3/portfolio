import { useEffect, useRef, useState } from 'react';
import './Tutorial.css';

// Tutoriel de première visite (overlay HTML au-dessus du canevas, comme les
// flèches de navigation). Quatre guides animés, affichés l'un après l'autre :
// 1. "plate"  : doigt qui monte et appuie sur le plateau (vue initiale).
// 2. "case"   : doigt qui appuie sur une case (vue du dessus).
// 3. "back"   : flèche qui désigne l'extérieur de la description
//               (vue projet : cliquer à l'extérieur pour revenir).
// 4. "nav"    : flèche qui glisse vers la flèche latérale (vue projet :
//               changer de projet).
// Une étape disparaît dès que l'utilisateur fait l'action correspondante
// (ou automatiquement au bout de STEP_TIMEOUT secondes), et ne revient plus.

// Durée maximale d'affichage d'une étape (en secondes) : un guide ne dure
// jamais plus longtemps, même sans aucune interaction.
const STEP_TIMEOUT = 10;

// GIF du doigt qui clique (public/click-clicking.gif), 200x200 : la pointe
// de l'index se situe vers 39 % / 29 % de l'image (mesuré sur la 1re frame),
// d'où l'offset CSS qui place la pointe pile sur la cible. Le GIF étant
// dessiné en trait noir, il est blanc via un filtre CSS (voir Tutorial.css).
const CLICK_GIF = '/click-clicking.gif';

// Flèche courbe (pointée vers le bas) : désigne une zone vers laquelle
// cliquer, ici l'extérieur de la description pour revenir en arrière.
function CurvedArrowIcon() {
  return (
    <svg className="tutorial-arrow" viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M16 8 C 44 14, 50 32, 45 50"
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M35 46 L45 56 L54 45"
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Flèche droite (pointée vers la droite) : glisse vers la flèche latérale
// de navigation pour montrer qu'on peut changer de projet.
function StraightArrowIcon() {
  return (
    <svg className="tutorial-arrow" viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M4 24 H36 M36 24 L22 10 M36 24 L22 38"
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Une étape du tutoriel : toujours montée dans le DOM (opacity 0 quand
// inactive, pour garder un fondu doux), mais entièrement non cliquable.
// show : l'étape est active ; onExpire : appelé STEP_TIMEOUT s après
// l'activation (retire définitivement l'étape côté parent).
function StepHint({ show, className, children, onExpire }) {
  // Dernière version du callback, relue par le minuteur au déclenchement :
  // évite de relancer le décompte à chaque re-render du parent.
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (!show) return undefined;
    const timer = setTimeout(() => onExpireRef.current?.(), STEP_TIMEOUT * 1000);
    return () => clearTimeout(timer);
  }, [show]);

  return (
    <div
      className={`tutorial-hint ${className ?? ''} ${show ? 'visible' : ''}`}
    >
      {children}
    </div>
  );
}

// Guides étape par étape. Chaque action consommée passe à l'étape suivante :
// clic plateau en vue initiale => étape "case" (top), sélection d'une case
// => étapes "back" + "nav" (vue projet), navigation ou retour => fin.
export default function Tutorial({ view, navigating }) {
  // Étape de la progression du tutoriel : 'plate' | 'case' | 'visit' | null.
  // null = tutoriel terminé, plus jamais affiché.
  const [stage, setStage] = useState('plate');
  // Étapes déjà affichées 10 s sans interaction : elles ne reviennent plus.
  const [expired, setExpired] = useState({});
  // Proposition officielle de React pour ajuster un état en réaction à un
  // changement de props (re-render précédent mémorisé), sans effet.
  const [prevProps, setPrevProps] = useState({ view, navigating });

  // Progression du tutoriel dès que la vue change ou qu'une navigation par
  // flèche démarre : l'étape courante s'estompe, la suivante apparaît.
  if (prevProps.view !== view || prevProps.navigating !== navigating) {
    setPrevProps({ view, navigating });

    let next = stage;
    if (stage === 'plate' && view === 'top') {
      // Le plateau (ou une case) a été cliqué depuis la vue initiale :
      // on passe à l'étape "cliquer sur une case".
      next = 'case';
    } else if (stage === 'case' && view === 'case') {
      // Une case a été sélectionnée : guides de la vue projet.
      next = 'visit';
    } else if (stage === 'visit' && (navigating || view !== 'case')) {
      // Navigation par flèche ou retour en arrière : tutoriel terminé.
      next = null;
    }

    if (next !== stage) {
      setStage(next);
    }
  }

  const markExpired = (key) => () => setExpired((prev) => ({ ...prev, [key]: true }));

  const showPlate = stage === 'plate' && view === 'initial' && !expired.plate;
  const showCase = stage === 'case' && view === 'top' && !expired.case;
  const showBack = stage === 'visit' && view === 'case' && !expired.back;
  const showNav = stage === 'visit' && view === 'case' && !expired.nav;

  return (
    <div className="tutorial-overlay" aria-hidden="true">
      <StepHint show={showPlate} className="hint-plate" onExpire={markExpired('plate')}>
        <div className="tutorial-motion">
          <img className="tutorial-hand" src={CLICK_GIF} alt="" draggable="false" />
        </div>
        <span className="tutorial-label">Cliquez sur le plateau</span>
      </StepHint>

      <StepHint show={showCase} className="hint-case" onExpire={markExpired('case')}>
        <div className="tutorial-motion">
          <img className="tutorial-hand" src={CLICK_GIF} alt="" draggable="false" />
        </div>
        <span className="tutorial-label">Cliquez sur une case</span>
      </StepHint>

      <StepHint show={showBack} className="hint-back" onExpire={markExpired('back')}>
        <span className="tutorial-label">Cliquez à l&rsquo;extérieur pour revenir</span>
        <div className="tutorial-nudge">
          <CurvedArrowIcon />
        </div>
      </StepHint>

      <StepHint show={showNav} className="hint-nav" onExpire={markExpired('nav')}>
        <div className="tutorial-slide">
          <StraightArrowIcon />
        </div>
        <span className="tutorial-label">Changez de projet</span>
      </StepHint>
    </div>
  );
}
