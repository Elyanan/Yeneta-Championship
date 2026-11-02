import { randomBytes, scrypt as callbackScrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { SignJWT, jwtVerify } from 'jose';
const scrypt=promisify(callbackScrypt);
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');const hash=await scrypt(password,salt,64) as Buffer;return `scrypt$${salt}$${hash.toString('hex')}`;}
export async function verifyPassword(password:string,encoded:string){const [type,salt,key]=encoded.split('$');if(type!=='scrypt'||!salt||!key||!/^[0-9a-f]{128}$/.test(key))return false;const hash=await scrypt(password,salt,64) as Buffer;return timingSafeEqual(hash,Buffer.from(key,'hex'));}
export function safeEqual(a:string,b:string){return timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());}
const secret=()=>{const s=process.env.AUTH_SESSION_SECRET;if(!s||s.length<32)throw new Error('AUTH_SESSION_SECRET must contain at least 32 characters.');return new TextEncoder().encode(s);};
const audience='yeneta-admin';
export async function signSession(sid:string){return new SignJWT({role:'admin',sid}).setProtectedHeader({alg:'HS256'}).setIssuer('yeneta').setAudience(audience).setIssuedAt().setExpirationTime('8h').setJti(randomBytes(16).toString('hex')).sign(secret());}
export async function verifySession(token:string){try{const {payload}=await jwtVerify(token,secret(),{algorithms:['HS256'],issuer:'yeneta',audience});return payload.role==='admin'&&typeof payload.sid==='string'?payload.sid:null;}catch{return null;}}
