import Link from 'next/link';
import {ResumeContent} from '../exhibit-view';
export default function Resume(){return <main className="direct-view"><nav><Link href="/">← Enter the kingdom</Link><Link href="/projects">Project directory</Link></nav><h1>System Information</h1><ResumeContent/></main>}
