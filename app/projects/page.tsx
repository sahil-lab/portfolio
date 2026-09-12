import Link from 'next/link';
import {projects} from '../portfolio';
import {ProjectDetails,Demonstration} from '../exhibit-view';
export default function Directory(){return <main className="direct-view"><nav><Link href="/">← Enter the kingdom</Link><Link href="/resume">System Information</Link></nav><h1>Project directory</h1><p>Explore the same exhibits without using the 3D world. All current entries are labeled demonstration content.</p>{projects.map((p,index)=><section key={p.id} id={p.id}><ProjectDetails index={index}><Link href={'/?project='+p.id}>Mark this building in the world →</Link></ProjectDetails><Demonstration index={index} standalone/></section>)}</main>}
