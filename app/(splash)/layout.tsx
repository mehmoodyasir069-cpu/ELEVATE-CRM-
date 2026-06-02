import Link from "next/link";
import { ReactNode } from "react";

export default function SplashPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950">
      <header className="border-b border-slate-800 px-6 py-5 text-slate-100">
        <Link href="/" className="font-semibold">Elevate Commerce CRM</Link>
      </header>
      {children}
    </div>
  );
}
