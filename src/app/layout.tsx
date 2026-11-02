import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';
export const metadata:Metadata={metadataBase:new URL(process.env.APP_ORIGIN||'http://localhost:3000'),title:{default:'Yeneta School Championship | Every point. Every champion.',template:'%s | Yeneta Championship'},description:'The official home of Yeneta Academy sports. Football, volleyball, chess and table tennis standings, athletes and match results.',icons:{icon:'/images/favicon.png'},openGraph:{title:'Yeneta School Championship',description:'One school. Every champion.',images:['/images/school-logo.webp']}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body><Providers><a href="#main" className="skip-link">Skip to content</a>{children}</Providers></body></html>;}
