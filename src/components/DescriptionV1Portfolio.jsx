import CaseDescription from './CaseDescription';
import { CASE_3D_ASSETS } from './case3DAssets';

const assets = CASE_3D_ASSETS.v1Portfolio;

export default function DescriptionV1Portfolio({ transition, caseRotation }) {
  return (
    <CaseDescription
      glbUrl={assets.glb}
      descriptionUrl={assets.description}
      cube={{ position: [0, 2.2, 3], rotation: [0, 0, -Math.PI/2], scale: 0.9, spinAxis: 'x' }}
      card={{ position: [0, 0, -0.1], rotation: [0, -Math.PI / 40, Math.PI/2] }}
      transition={transition}
      caseRotation={caseRotation}
    />
  );
}
