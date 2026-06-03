import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const defaultSourcePath = path.resolve("../data.js");
const outDir = path.resolve(".convex/import");

const cliSource = process.argv[2] ? path.resolve(process.argv[2]) : defaultSourcePath;
if (!fs.existsSync(cliSource)) {
  throw new Error(`Local CRM snapshot not found at ${cliSource}`);
}
const seed = loadSnapshot(cliSource);

fs.mkdirSync(outDir, { recursive: true });

function writeJsonLines(name, rows) {
  const file = path.join(outDir, `${name}.jsonl`);
  fs.writeFileSync(file, rows.length > 0 ? `${rows.map((row) => JSON.stringify(row)).join("\n")}\n` : "");
  return file;
}

const files = {
  clients: writeJsonLines(
    "clients",
    seed.clients.map((client, index) => {
      const cleaned = cleanDoc(client);
      return {
        externalId: String(cleaned.externalId ?? cleaned.id ?? `client-${index + 1}`),
        ...omitKeys(cleaned, ["externalId", "id"]),
      };
    }),
  ),
  leads: writeJsonLines(
    "leads",
    seed.leads.map((lead, index) => {
      const cleaned = cleanDoc(lead);
      return {
        externalId: String(cleaned.externalId ?? cleaned.id ?? `lead-${index + 1}`),
        ...omitKeys(cleaned, ["externalId", "id"]),
      };
    }),
  ),
  plEntries: writeJsonLines(
    "plEntries",
    seed.plEntries.map((entry, index) => {
      const cleaned = cleanDoc(entry);
      return {
        externalId: String(cleaned.externalId ?? cleaned.id ?? `pl-${index + 1}`),
        clientExternalId: String(cleaned.clientExternalId ?? cleaned.clientId ?? ""),
        ...omitKeys(cleaned, ["externalId", "id", "clientExternalId", "clientId"]),
      };
    }),
  ),
  cables: writeJsonLines(
    "cables",
    seed.cables.map((cable, index) => {
      const cleaned = cleanDoc(cable);
      return {
        externalId: String(cleaned.externalId ?? cleaned.id ?? `cable-${index + 1}`),
        clientExternalId: String(cleaned.clientExternalId ?? cleaned.clientId ?? ""),
        ...omitKeys(cleaned, ["externalId", "id", "clientExternalId", "clientId"]),
      };
    }),
  ),
  settings: writeJsonLines("settings", seed.settings.map(cleanDoc)),
  metadata: writeJsonLines("metadata", seed.metadata.map(cleanDoc)),
  importRuns: writeJsonLines("importRuns", [cleanDoc(seed.importRun)]),
};

for (const [table, file] of Object.entries(files)) {
  const args = ["convex", "import", "--replace", "--yes", "--format", "jsonLines", "--table", table, file];
  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const commandArgs = process.platform === "win32" ? ["/d", "/s", "/c", "npx.cmd", ...args] : args;
  execFileSync(command, commandArgs, {
    stdio: "inherit",
  });
}

console.log(`Imported ${seed.clients.length} clients and ${seed.leads.length} leads into Convex.`);

function loadSnapshot(sourcePath) {
  if (sourcePath.toLowerCase().endsWith(".json")) {
    return normalizeSnapshot(JSON.parse(fs.readFileSync(sourcePath, "utf8")), sourcePath, "backup");
  }
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(sourcePath, "utf8"), sandbox);
  return normalizeSnapshot(sandbox.window.ELEVATE_SEED, sourcePath, "seed");
}

function normalizeSnapshot(raw, sourcePath, sourceKind) {
  const teams = Array.isArray(raw?.teams) && raw.teams.length > 0
    ? raw.teams
    : ["Hamad Khan", "Umar Malik", "Jahanzaib", "Faheem Farooqi", "Pindi Team", "Yasir Team"];
  const assistants = Array.isArray(raw?.assistants) && raw.assistants.length > 0
    ? raw.assistants
    : ["Faizan", "Hamad M", "Salman Ali", "Asad Abbas", "Asad", "Moeez", "Zahid", "Farman", "Arslan", "Anees", "Abbas", "Yasir"];
  const partners = Array.isArray(raw?.partners) && raw.partners.length > 0 ? raw.partners : ["Osama", "Faraz"];
  const settings = Array.isArray(raw?.settings) && raw.settings.length > 0
    ? raw.settings
    : [
        { key: "teams", values: teams },
        { key: "assistants", values: assistants },
        { key: "partners", values: partners },
      ];
  const metadataMap = new Map(Array.isArray(raw?.metadata) ? raw.metadata.map((item) => [String(item.key), item]) : []);
  const putMetadata = (key, value) => {
    if (value === undefined || value === null || value === "") return;
    metadataMap.set(key, { key, value });
  };
  putMetadata("source", raw?.source ?? path.basename(sourcePath));
  putMetadata("generatedAt", raw?.generatedAt);
  putMetadata("updatedAt", raw?.updatedAt);
  putMetadata("backupFormat", raw?.backupFormat);
  putMetadata("importPreparedAt", new Date().toISOString());
  putMetadata("importSourcePath", sourcePath);
  return {
    clients: Array.isArray(raw?.clients) ? raw.clients : [],
    leads: Array.isArray(raw?.leads) ? raw.leads : [],
    plEntries: Array.isArray(raw?.plEntries) ? raw.plEntries : [],
    cables: Array.isArray(raw?.cables) ? raw.cables : [],
    settings,
    metadata: Array.from(metadataMap.values()),
    importRun: {
      sourceKind,
      sourceLabel: String(raw?.source ?? path.basename(sourcePath)),
      backupFormat: typeof raw?.backupFormat === "string" ? raw.backupFormat : undefined,
      sourceGeneratedAt: typeof raw?.generatedAt === "string" ? raw.generatedAt : undefined,
      sourceUpdatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : undefined,
      importedAt: new Date().toISOString(),
      clientCount: Array.isArray(raw?.clients) ? raw.clients.length : 0,
      leadCount: Array.isArray(raw?.leads) ? raw.leads.length : 0,
      plEntryCount: Array.isArray(raw?.plEntries) ? raw.plEntries.length : 0,
      cableCount: Array.isArray(raw?.cables) ? raw.cables.length : 0,
      settingsCount: settings.length,
      metadataCount: metadataMap.size,
    },
  };
}

function cleanDoc(value) {
  return omitKeys(value ?? {}, ["_id", "_creationTime"]);
}

function omitKeys(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
