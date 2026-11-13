import CaseDescription from './CaseDescription';
import { CASE_3D_ASSETS } from './case3DAssets';

const assets = CASE_3D_ASSETS.sentiment;

export default function DescriptionSentiment({ transition, caseRotation }) {
  return (
    <CaseDescription
      glbUrl={assets.glb}
      descriptionUrl={assets.description}
      cube={{ position: [1.8, 1, 3], rotation: [Math.PI/2, 0, 0], scale: 0.9, spinAxis: 'y' }}
      card={{ position: [-2.2, 2, -0.1], rotation: [Math.PI / 40, 0, -Math.PI] }}
      transition={transition}
      caseRotation={caseRotation}
    />
  );
}
