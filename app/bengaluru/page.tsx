import type {Metadata} from 'next';
import Image from 'next/image';
import Home from '../page';

export const metadata:Metadata={
 title:'Bengaluru as a planet — OpenStreetMap geography on a small world',
 description:'Explore Bengaluru with the kingdom character or angel: mapped OpenStreetMap streets, streamed buildings, district navigation and a source-derived fallback.',
};

export default function BengaluruPage(){return <><Home initialBengaluru/><noscript><Image src="/assets/bengaluru-region-v1/planet-fallback.svg" alt="Bengaluru globe derived from OpenStreetMap buildings, roads, parks and lakes." width={1024} height={1024} unoptimized loading="eager" style={{width:'100%',height:'auto'}}/><p>Map data: <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, ODbL 1.0.</p></noscript></>}
