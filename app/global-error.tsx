'use client';

import ErrorPage from './error';

export default function GlobalError(props:{error:Error;reset:()=>void}){return <html lang="en"><body><ErrorPage {...props}/></body></html>}
