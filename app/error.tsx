'use client';

import {useEffect} from 'react';
import {RefreshCw,FileDown} from 'lucide-react';
import {diagnosticError,downloadDiagnostics,recordDiagnostic,startClientDiagnostics} from './client-diagnostics';

export default function ErrorPage({error,reset}:{error:Error;reset:()=>void}){
 useEffect(()=>{const stop=startClientDiagnostics();recordDiagnostic('window_error',{phase:'react-route',...diagnosticError(error)});return stop},[error]);
 return <main className="portfolio-sheet" role="alert"><h1>This view could not open</h1><div className="flex flex-wrap gap-3"><button type="button" onClick={reset}><RefreshCw size={18}/>Try again</button><button type="button" onClick={downloadDiagnostics}><FileDown size={18}/>Download diagnostics</button></div></main>;
}
