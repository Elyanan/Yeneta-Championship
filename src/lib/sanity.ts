import 'server-only';
import { createClient } from '@sanity/client';
import { unstable_cache } from 'next/cache';
import type { Championship, Snapshot } from '@/types/championship';
import { initialData } from './initial';
import { validateState } from './validation';
import { applyOperation } from './operations';
export const DOCUMENT_ID='championship.current';
export const isConfigured=()=>Boolean(process.env.SANITY_PROJECT_ID&&process.env.SANITY_DATASET);
export function sanity(write=false){
  if(!isConfigured())throw new Error('Sanity is not configured. Follow README.md to connect the championship.');
  if(write&&!process.env.SANITY_API_WRITE_TOKEN)throw new Error('Sanity write access is not configured.');
  return createClient({projectId:process.env.SANITY_PROJECT_ID!,dataset:process.env.SANITY_DATASET!,apiVersion:process.env.SANITY_API_VERSION||'2026-11-01',useCdn:false,token:write?process.env.SANITY_API_WRITE_TOKEN:process.env.SANITY_API_READ_TOKEN,perspective:'published'});
}
export async function readSnapshot():Promise<Snapshot>{
  if(!isConfigured())return{data:initialData(),revision:'unconfigured',configured:false};
  const doc=await sanity().getDocument<{_id:string;_rev:string;payload:Championship}>(DOCUMENT_ID);
  if(!doc)throw new Error('The championship dataset has not been initialized. Run npm run seed.');
  return{data:validateState(doc.payload),revision:doc._rev,configured:true};
}
const cachedRead=unstable_cache(readSnapshot,['championship-snapshot'],{tags:['championship'],revalidate:60});
export async function publicSnapshot():Promise<Snapshot>{
  try{const snap=await cachedRead();return{...snap,revision:'public',data:{...snap.data,audit:[]}};}catch{ return{data:{...initialData(),teams:[]},revision:'unavailable',configured:true,error:'Championship data is temporarily unavailable. Please try again.'}; }
}
export async function mutate(revision:string,operation:unknown):Promise<Snapshot>{
  const before=await readSnapshot();
  if(before.revision!==revision)throw new Error('CONFLICT: Championship changed. Reload and try again.');
  const data=applyOperation(before.data,operation);
  const result=await sanity(true).patch(DOCUMENT_ID).ifRevisionId(revision).set({payload:data}).commit({visibility:'sync'});
  return{data,revision:result._rev,configured:true};
}
