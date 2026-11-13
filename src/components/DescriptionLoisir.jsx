import CaseDescription from './CaseDescription';
import { CASE_3D_ASSETS } from './case3DAssets';

const assets = CASE_3D_ASSETS.loisir;

export default function DescriptionLoisir({ transition, caseRotation }) {
  return (
    <CaseDescription
      descriptionUrl={assets.description}
      card={{ position: [-1, 2.9, -0.1], rotation: [Math.PI / 40, 0, Math.PI], dimensions: [3.5, 0.1, 2.2] }}
      transition={transition}
      caseRotation={caseRotation}
    />
  );
}
