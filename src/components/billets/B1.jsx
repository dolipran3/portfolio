
import { BILLET } from '../case3DAssets';
import { BilletsCards } from './BilletsCards';

const assets = BILLET['1'];

export default function B1({position = [0, 0, 0], rotation = [-Math.PI/2, 0, 0]}) {
  return (
    <BilletsCards
      textureUrl={assets.texture}
      color={assets.color}
      position = {position} 
      rotation= {rotation}
    />
  );
}
