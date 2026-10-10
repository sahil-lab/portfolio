'use client';

import {useEffect} from 'react';
import {startClientDiagnostics} from './client-diagnostics';

export function ClientDiagnostics(){useEffect(()=>{try{return startClientDiagnostics()}catch{return}},[]);return null}
