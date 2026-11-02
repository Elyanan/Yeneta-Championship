import sharp from 'sharp';
import { requireAdmin, HttpError } from '@/lib/auth';
import { sanity } from '@/lib/sanity';
import { failure } from '@/lib/http';
export async function POST(request:Request){try{await requireAdmin(request);if(Number(request.headers.get('content-length')||0)>8_000_000)throw new HttpError(413,'Choose an image under 8 MB.');const f=(await request.formData()).get('file');if(!(f instanceof File)||f.size>8_000_000||!['image/png','image/jpeg','image/webp','image/avif'].includes(f.type))throw new HttpError(400,'Choose a PNG, JPEG, WebP or AVIF image under 8 MB.');const buffer=await sharp(Buffer.from(await f.arrayBuffer()),{limitInputPixels:40_000_000}).rotate().resize(600,600,{fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();const result=await sanity(true).assets.upload('image',buffer,{filename:'championship.webp',contentType:'image/webp'});return Response.json({url:result.url});}catch(e){return failure(e);}}
