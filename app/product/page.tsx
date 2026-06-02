"use client";

import { ChangeEvent, useEffect } from "react";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/UserMenu";

export default function ProductPage() {
  return (
    <>
      <AuthLoading><main className="p-8">Loading CRM...</main></AuthLoading>
      <Unauthenticated><RedirectToSignIn /></Unauthenticated>
      <Authenticated><CrmDashboard /></Authenticated>
    </>
  );
}

function RedirectToSignIn() {
  const router = useRouter();
  useEffect(() => router.push("/signin"), [router]);
  return <main className="p-8">Redirecting to sign in...</main>;
}

function CrmDashboard() {
  const summary = useQuery(api.crm.dashboard);
  const clients = useQuery(api.crm.listClients);
  const snapshot = useQuery(api.crm.exportSnapshot);
  const restore = useMutation(api.crm.replaceSnapshot);

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await restore({ snapshot: JSON.parse(await file.text()) });
    event.target.value = "";
  }

  function exportBackup() {
    if (!snapshot) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }));
    link.download = `elevate-crm-convex-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Elevate Commerce</p>
            <h1 className="text-3xl font-bold">Convex CRM</h1>
            <p className="text-sm text-slate-400">Authenticated database workspace for your master ledger.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportBackup}>Export JSON</Button>
            <label className="cursor-pointer rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
              Restore JSON<input className="hidden" type="file" accept=".json,application/json" onChange={importBackup} />
            </label>
            <UserMenu />
          </div>
        </header>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Stat label="Clients" value={summary?.clients} />
          <Stat label="Leads" value={summary?.leads} />
          <Stat label="P&L entries" value={summary?.plEntries} />
          <Stat label="Cable costs" value={summary?.cables} />
          <Stat label="Contracts pending" value={summary?.pendingContracts} warning />
          <Stat label="Missing WhatsApp" value={summary?.missingWhatsApp} warning />
        </section>
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="font-semibold">Client ledger</h2>
            <p className="text-xs text-slate-400">{String(summary?.source ?? "Imported JSON")} | generated {String(summary?.generatedAt ?? "unknown")}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800 text-xs uppercase text-slate-400"><tr><th className="p-3">#</th><th className="p-3">Client</th><th className="p-3">Team</th><th className="p-3">Seller</th><th className="p-3">Contract</th><th className="p-3">WhatsApp</th></tr></thead>
              <tbody>{clients?.map((client) => <tr className="border-t border-slate-800" key={client._id}><td className="p-3">{client.number}</td><td className="p-3 font-medium">{client.name}</td><td className="p-3">{client.team}</td><td className="p-3">{client.sellerType}</td><td className="p-3">{client.contractStatus}</td><td className="p-3">{client.whatsappGroup ? "Added" : "Missing"}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, warning = false }: { label: string; value?: number; warning?: boolean }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs uppercase text-slate-400">{label}</p><p className={`mt-2 text-2xl font-bold ${warning ? "text-orange-400" : "text-white"}`}>{value ?? "..."}</p></div>;
}
