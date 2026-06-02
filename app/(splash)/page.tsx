import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex grow items-center bg-slate-950 px-6 py-20 text-slate-100">
      <section className="mx-auto max-w-3xl space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Elevate Commerce</p>
        <h1 className="text-5xl font-bold tracking-tight">Your CRM data, protected and organized in Convex.</h1>
        <p className="max-w-2xl text-lg text-slate-400">
          Manage the client ledger, leads, contracts, account care, finance records, payouts, cable costs, and team settings in one authenticated workspace.
        </p>
        <Link href="/signin"><Button className="bg-orange-600 hover:bg-orange-500">Open CRM</Button></Link>
      </section>
    </main>
  );
}
