import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { readSnapshot, mutate } from '@/lib/sanity';
import { failure, jsonBody } from '@/lib/http';
export async function GET(){try{await requireAdmin();return Response.json(await readSnapshot(),{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
export async function POST(request:Request){try{await requireAdmin(request);const body=z.object({revision:z.string().min(1),operation:z.unknown()}).parse(await jsonBody(request));const result=await mutate(body.revision,body.operation);revalidateTag('championship',{expire:0});return Response.json(result);}catch(e){return failure(e);}}
