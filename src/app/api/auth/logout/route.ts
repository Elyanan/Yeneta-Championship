import { cookies } from 'next/headers';
import { checkOrigin, cookieName, cookieOptions, revokeSession } from '@/lib/auth';
import { failure } from '@/lib/http';
export async function POST(request:Request){try{checkOrigin(request);await revokeSession();(await cookies()).set(cookieName,'',{...cookieOptions,maxAge:0});return Response.json({ok:true});}catch(e){return failure(e);}}
