import type {Metadata} from 'next';
import {BengaluruPlanetView} from '../bengaluru-planet-view';

export const metadata:Metadata={
 title:'Bengaluru as a planet — OpenStreetMap geography on a small world',
 description:'The civic core of Bengaluru from OpenStreetMap, kept at its mapped positions and bent onto a fictional planet with streamed tiles, landmarks and an accessible place index.',
};

export default function BengaluruPage(){return <BengaluruPlanetView/>}
