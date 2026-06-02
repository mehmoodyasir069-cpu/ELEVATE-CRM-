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
    const [clients, leads, plEntries, cables, metadata] = await Promise.all([
      ctx.db.query("clients").collect(),
      ctx.db.query("leads").collect(),
      ctx.db.query("plEntries").collect(),
      ctx.db.query("cables").collect(),
      ctx.db.query("metadata").collect(),
    ]);
    return {
      clients: clients.length,
      leads: leads.length,
      plEntries: plEntries.length,
      cables: cables.length,
      pendingContracts: clients.filter((client) => client.contractStatus !== "Completed").length,
      missingWhatsApp: clients.filter((client) => !client.whatsappGroup).length,
      source: metadata.find((item) => item.key === "source")?.value ?? null,
      generatedAt: metadata.find((item) => item.key === "generatedAt")?.value ?? null,
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
    const [clients, leads, plEntries, cables, settings, metadata] = await Promise.all([
      ctx.db.query("clients").collect(),
      ctx.db.query("leads").collect(),
      ctx.db.query("plEntries").collect(),
      ctx.db.query("cables").collect(),
      ctx.db.query("settings").collect(),
      ctx.db.query("metadata").collect(),
    ]);
    return { clients, leads, plEntries, cables, settings, metadata };
  },
});

export const replaceSnapshot = mutation({
  args: { snapshot: v.any() },
  handler: async (ctx, { snapshot }) => {
    await requireUser(ctx);
    const tables = ["clients", "leads", "plEntries", "cables", "settings", "metadata"] as const;
    for (const table of tables) {
      for (const item of await ctx.db.query(table).collect()) await ctx.db.delete(item._id);
    }
    for (const client of snapshot.clients ?? []) await ctx.db.insert("clients", cleanClient(client) as any);
    for (const lead of snapshot.leads ?? []) await ctx.db.insert("leads", cleanLead(lead) as any);
    for (const entry of snapshot.plEntries ?? []) await ctx.db.insert("plEntries", cleanPlEntry(entry) as any);
    for (const cable of snapshot.cables ?? []) await ctx.db.insert("cables", cleanCable(cable) as any);
    for (const setting of snapshot.settings ?? []) await ctx.db.insert("settings", clean(setting) as any);
    for (const item of snapshot.metadata ?? []) await ctx.db.insert("metadata", clean(item) as any);
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
    ...clean(value),
    externalId: String(value.externalId ?? value.id),
    clientExternalId: String(value.clientExternalId ?? value.clientId),
  };
}

function cleanCable(value: Record<string, unknown>) {
  return {
    ...clean(value),
    externalId: String(value.externalId ?? value.id),
    clientExternalId: String(value.clientExternalId ?? value.clientId),
  };
}
