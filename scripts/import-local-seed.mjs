import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const sourcePath = path.resolve("../data.js");
const outDir = path.resolve(".convex/import");

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Local CRM seed not found at ${sourcePath}`);
}

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(sourcePath, "utf8"), sandbox);
const seed = sandbox.window.ELEVATE_SEED;

fs.mkdirSync(outDir, { recursive: true });

function writeJsonLines(name, rows) {
  const file = path.join(outDir, `${name}.jsonl`);
  fs.writeFileSync(file, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
  return file;
}

const files = {
  clients: writeJsonLines("clients", seed.clients.map(({ id, ...client }) => ({ externalId: id, ...client }))),
  leads: writeJsonLines("leads", seed.leads.map(({ id, ...lead }) => ({ externalId: id, ...lead }))),
  settings: writeJsonLines("settings", [
    { key: "teams", values: ["Hamad Khan", "Umar Malik", "Jahanzaib", "Faheem Farooqi", "Pindi Team", "Yasir Team"] },
    { key: "assistants", values: ["Faizan", "Hamad M", "Salman Ali", "Asad Abbas", "Asad", "Moeez", "Zahid", "Farman", "Arslan", "Anees", "Abbas", "Yasir"] },
    { key: "partners", values: ["Osama", "Faraz"] },
  ]),
  metadata: writeJsonLines("metadata", [
    { key: "source", value: seed.source },
    { key: "generatedAt", value: seed.generatedAt },
  ]),
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
