import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const [clients, leads, plEntries, cables, metadata, importRuns] = await Promise.all([
      ctx.db.query("clients").collect(),
      ctx.db.query("leads").collect(),
      ctx.db.query("plEntries").collect(),
      ctx.db.query("cables").collect(),
      ctx.db.query("metadata").collect(),
      ctx.db.query("importRuns").withIndex("by_imported_at").collect(),
    ]);
    const latestImport = importRuns.sort((a, b) => b.importedAt.localeCompare(a.importedAt))[0] ?? null;
    return {
      clients: clients.length,
      leads: leads.length,
      plEntries: plEntries.length,
      cables: cables.length,
      pendingContracts: clients.filter((client) => client.contractStatus !== "Completed").length,
      missingWhatsApp: clients.filter((client) => !client.whatsappGroup).length,
      source: metadata.find((item) => item.key === "source")?.value ?? null,
      generatedAt: metadata.find((item) => item.key === "generatedAt")?.value ?? null,
      updatedAt: metadata.find((item) => item.key === "updatedAt")?.value ?? null,
      backupFormat: metadata.find((item) => item.key === "backupFormat")?.value ?? null,
      latestImport,
    };
  },
});

export const listClients = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return (await ctx.db.query("clients").collect())
      .sort((a, b) => (a.number ?? 0) - (b.number ?? 0))
      .map(({ ebayPassword, ipPassword, aliexpressPassword, picodiPassword, ...client }) => client);
  },
});

export const exportSnapshot = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const [clients, leads, plEntries, cables, settings, metadata, importRuns] = await Promise.all([
      ctx.db.query("clients").collect(),
      ctx.db.query("leads").collect(),
      ctx.db.query("plEntries").collect(),
      ctx.db.query("cables").collect(),
      ctx.db.query("settings").collect(),
      ctx.db.query("metadata").collect(),
      ctx.db.query("importRuns").collect(),
    ]);
    return { clients, leads, plEntries, cables, settings, metadata, importRuns };
  },
});

export const replaceSnapshot = mutation({
  args: { snapshot: v.any() },
  handler: async (ctx, { snapshot }) => {
    await requireUser(ctx);
    const normalized = normalizeSnapshot(snapshot);
    const currentMetadata = await ctx.db.query("metadata").collect();
    const currentImportRuns = await ctx.db.query("importRuns").withIndex("by_imported_at").collect();
    const currentStamp = Math.max(
      metadataTimestamp(currentMetadata, "updatedAt"),
      metadataTimestamp(currentMetadata, "restoredAt"),
      currentImportRuns.length ? Date.parse([...currentImportRuns].sort((a, b) => b.importedAt.localeCompare(a.importedAt))[0].importedAt) || 0 : 0,
    );
    const incomingStamp = Math.max(
      metadataTimestamp(normalized.metadata, "updatedAt"),
      metadataTimestamp(normalized.metadata, "restoredAt"),
      Date.parse(String(normalized.importRun.importedAt ?? "")) || 0,
    );
    if (currentStamp > 0 && incomingStamp > 0 && incomingStamp + 1000 < currentStamp) {
      throw new Error("Stale snapshot rejected. Refresh to load the latest data before saving.");
    }
    const tables = ["clients", "leads", "plEntries", "cables", "settings", "metadata"] as const;
    for (const table of tables) {
      for (const item of await ctx.db.query(table).collect()) await ctx.db.delete(item._id);
    }
    for (const client of normalized.clients) await ctx.db.insert("clients", cleanClient(client) as any);
    for (const lead of normalized.leads) await ctx.db.insert("leads", cleanLead(lead) as any);
    for (const entry of normalized.plEntries) await ctx.db.insert("plEntries", cleanPlEntry(entry) as any);
    for (const cable of normalized.cables) await ctx.db.insert("cables", cleanCable(cable) as any);
    for (const setting of normalized.settings) await ctx.db.insert("settings", clean(setting) as any);
    for (const item of normalized.metadata) await ctx.db.insert("metadata", clean(item) as any);
    await ctx.db.insert("importRuns", {
      sourceKind: normalized.importRun.sourceKind,
      sourceLabel: normalized.importRun.sourceLabel,
      backupFormat: normalized.importRun.backupFormat,
      sourceGeneratedAt: normalized.importRun.sourceGeneratedAt,
      sourceUpdatedAt: normalized.importRun.sourceUpdatedAt,
      importedAt: normalized.importRun.importedAt,
      clientCount: normalized.clients.length,
      leadCount: normalized.leads.length,
      plEntryCount: normalized.plEntries.length,
      cableCount: normalized.cables.length,
      settingsCount: normalized.settings.length,
      metadataCount: normalized.metadata.length,
    });
  },
});

function clean<T extends Record<string, unknown>>(value: T) {
  const { _id, _creationTime, id, ...rest } = value;
  return rest;
}

function cleanClient(value: Record<string, unknown>) {
  return { ...clean(value), externalId: String(value.externalId ?? value.id) };
}

function cleanLead(value: Record<string, unknown>) {
  return { ...clean(value), externalId: String(value.externalId ?? value.id) };
}

function cleanPlEntry(value: Record<string, unknown>) {
  return {
    externalId: String(value.externalId ?? value.id),
    clientId: String(value.clientId ?? value.clientExternalId ?? ""),
    clientExternalId: String(value.clientExternalId ?? value.clientId),
    clientName: value.clientName,
    team: value.team,
    assistantName: value.assistantName,
    partnerName: value.partnerName,
    partnerPct: value.partnerPct,
    month: value.month,
    gross: value.gross,
    expenses: value.expenses,
    net: value.net,
    baseProfit: value.baseProfit,
    serviceCharges: value.serviceCharges,
    serviceChargesCollected: value.serviceChargesCollected,
    officeCharge: value.officeCharge,
    officeChargeMethod: value.officeChargeMethod,
    officeChargeReserve: value.officeChargeReserve,
    gbpReceived: value.gbpReceived,
    pkrReceived: value.pkrReceived,
    gbpPkrRate: value.gbpPkrRate,
    invoiceSent: value.invoiceSent,
    collectionStatus: value.collectionStatus,
    tlPaid: value.tlPaid,
    vaPaid: value.vaPaid,
    partnerPaid: value.partnerPaid,
    yasirPaid: value.yasirPaid,
    zubairPaid: value.zubairPaid,
    splitBase: value.splitBase,
    agencyBeforeCharge: value.agencyBeforeCharge,
    agencyShare: value.agencyShare,
    amountOwedGbp: value.amountOwedGbp,
    clientShare: value.clientShare,
    tlName: value.tlName,
    vaName: value.vaName,
    manualClientShare: value.manualClientShare,
    manualOfficePool: value.manualOfficePool,
    manualPartnerShare: value.manualPartnerShare,
    manualTlShare: value.manualTlShare,
    manualVaShare: value.manualVaShare,
    manualYasirShare: value.manualYasirShare,
    manualZubairShare: value.manualZubairShare,
    vaPct: value.vaPct,
    tlPct: value.tlPct,
    vaShare: value.vaShare,
    tlShare: value.tlShare,
    partnerShare: value.partnerShare,
    yasirShare: value.yasirShare,
    zubairShare: value.zubairShare,
    notes: value.notes,
  };
}

function cleanCable(value: Record<string, unknown>) {
  return {
    ...clean(value),
    externalId: String(value.externalId ?? value.id),
    clientExternalId: String(value.clientExternalId ?? value.clientId),
  };
}

function metadataTimestamp(rows: Record<string, unknown>[], key: string) {
  const raw = rows.find((item) => String(item?.key) === key)?.value;
  const ts = Date.parse(String(raw ?? ""));
  return Number.isFinite(ts) ? ts : 0;
}

function normalizeSnapshot(raw: any) {
  const clients = Array.isArray(raw?.clients) ? raw.clients : [];
  const leads = Array.isArray(raw?.leads) ? raw.leads : [];
  const plEntries = Array.isArray(raw?.plEntries) ? raw.plEntries : [];
  const cables = Array.isArray(raw?.cables) ? raw.cables : [];
  const settings =
    Array.isArray(raw?.settings) && raw.settings.length > 0
      ? raw.settings
      : [
          { key: "teams", values: Array.isArray(raw?.teams) ? raw.teams : [] },
          { key: "assistants", values: Array.isArray(raw?.assistants) ? raw.assistants : [] },
          { key: "partners", values: Array.isArray(raw?.partners) ? raw.partners : [] },
        ].filter((item) => item.values.length > 0);
  const existingMetadata = (Array.isArray(raw?.metadata) ? raw.metadata : []) as Record<string, unknown>[];
  const metadataByKey = new Map<string, Record<string, unknown>>(
    existingMetadata.map((item) => [String(item.key), item]),
  );
  const addMetadata = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    metadataByKey.set(key, { key, value });
  };
  addMetadata("source", raw?.source);
  addMetadata("generatedAt", raw?.generatedAt);
  addMetadata("updatedAt", raw?.updatedAt);
  addMetadata("backupFormat", raw?.backupFormat);
  addMetadata("restoredFrom", raw?.restoredFrom);
  addMetadata("restoredAt", raw?.restoredAt);
  const metadata = Array.from(metadataByKey.values());
  return {
    clients,
    leads,
    plEntries,
    cables,
    settings,
    metadata,
    importRun: {
      sourceKind: typeof raw?.backupFormat === "string" ? "backup" : "seed",
      sourceLabel: typeof raw?.source === "string" ? raw.source : "Unknown source",
      backupFormat: typeof raw?.backupFormat === "string" ? raw.backupFormat : undefined,
      sourceGeneratedAt: typeof raw?.generatedAt === "string" ? raw.generatedAt : undefined,
      sourceUpdatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : undefined,
      importedAt: new Date().toISOString(),
    },
  };
}
