import './DescriptionNavigator.css';

// Flèches de navigation entre les cases, en overlay HTML au-dessus du
// canevas (comme le bouton du chatbot), une de chaque côté de l'écran.
// direction : +1 = flèche droite (case suivante), -1 = flèche gauche
// (case précédente). Les flèches ne chevauchent jamais les cases : elles
// sont collées aux bords de l'écran.
export default function DescriptionNavigator({ onNavigate }) {
  return (
    <div className="overlay-nav">
      <button
        className="overlay-nav-arrow overlay-nav-left"
        onClick={() => onNavigate(-1)}
        aria-label="Case précédente"
        title="Case précédente"
        type="button"
      >
         &#8249;{/* c'est le caractère ‹ pour la flèche gauche */}
      </button>
      <button
        className="overlay-nav-arrow overlay-nav-right"
        onClick={() => onNavigate(1)}
        aria-label="Case suivante"
        title="Case suivante"
        type="button"
      >
        &#8250; {/* c'est le caractère › pour la flèche droite */}
      </button>
    </div>
  );
}
