
import {projects} from '../portfolio';
import {ProjectDetails,Demonstration} from '../exhibit-view';
import {ResumeProjects} from '../resume-content';
export default function Directory(){return <main className="direct-view"><nav><a href="/">← Enter the kingdom</a><a href="/resume">System Information</a></nav><h1>Project directory</h1><ResumeProjects/><h2>Interactive teaching exhibits</h2><p>Explore these illustrative architectures without using the 3D world. They are not representations of the projects listed above.</p>{projects.map((p,index)=><section key={p.id} id={p.id}><ProjectDetails index={index}><a href={'/?project='+p.id}>Mark this building in the world →</a></ProjectDetails><Demonstration index={index} standalone/></section>)}</main>}

