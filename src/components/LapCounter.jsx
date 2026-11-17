import './LapCounter.css';

// Compteur de tours du plateau : overlay HTML posé AU-DESSUS du canevas,
// en haut au milieu de la page (même logique que Tutorial / Description-
// Navigator : r3f n'accepte que du 3D à l'intérieur du <Canvas>). Apparaît
// à partir du 2e tour complet et affiche le nombre de tours effectués.
export default function LapCounter({ laps }) {
  return (
    <div className="lap-counter" aria-live="polite">
      {laps} tour{laps > 1 ? 's' : ''}
    </div>
  );
}
