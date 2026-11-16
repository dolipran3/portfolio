
import { BILLET } from '../case3DAssets';
import { BilletsCards } from './BilletsCards';

const assets = BILLET['10'];

export default function B10({position = [0, 0, 0], rotation = [-Math.PI/2, 0, 0]}) {
  return (
    <BilletsCards
      textureUrl={assets.texture}
      color={assets.color}
      position = {position} 
      rotation= {rotation}
    />
  );
}
