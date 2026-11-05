import Image from "next/image";
import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { LoginForm } from "@/components/admin/login";
import { Footer } from "@/components/layout";
export const metadata = {
  title: "Administrator sign in",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Login() {
  if (await session()) redirect("/admin");
  return (
    <>
      <main id="main" className="login-shell">
        <div className="login-brand">
          <Image
            src="/images/school-logo.webp"
            alt="Yeneta Academy"
            width={45}
            height={45}
            priority
          />
          <div>
            <span className="eyebrow accent">YENETA ACADEMY</span>
            <b>Championship administration</b>
          </div>
        </div>
        <LoginForm />
      </main>
      <Footer />
    </>
  );
}
