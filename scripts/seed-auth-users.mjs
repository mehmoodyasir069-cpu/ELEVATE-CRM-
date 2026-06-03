import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const baseUrl =
  process.env.AUTH_BASE_URL ||
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";

const accounts = [
  { name: "Yasir", email: "yasir@elevatecrm.local", password: "ElevateYasir!26" },
  { name: "TL", email: "tl@elevatecrm.local", password: "ElevateTL!26" },
  { name: "Zubair", email: "zubair@elevatecrm.local", password: "ElevateZubair!26" },
  { name: "Osama", email: "osama@elevatecrm.local", password: "ElevateOsama!26" },
  { name: "Faraz", email: "faraz@elevatecrm.local", password: "ElevateFaraz!26" },
  { name: "VA", email: "va@elevatecrm.local", password: "ElevateVA!26" },
];

async function callAuth(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: baseUrl,
      Referer: `${baseUrl}/signin`,
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  return { response, data };
}

async function seedAccount(account) {
  const signUp = await callAuth("/api/auth/sign-up/email", account);

  if (!signUp.response.ok && signUp.response.status !== 422) {
    throw new Error(
      `Failed to seed ${account.email} (${signUp.response.status}): ${JSON.stringify(signUp.data ?? {})}`,
    );
  }

  const signIn = await callAuth("/api/auth/sign-in/email", {
    email: account.email,
    password: account.password,
  });

  if (!signIn.response.ok) {
    throw new Error(
      `Failed to verify ${account.email} (${signIn.response.status}): ${JSON.stringify(signIn.data ?? {})}`,
    );
  }

  const state = signUp.response.status === 422 ? "verified existing account" : "created";
  console.log(`${state}: ${account.email}`);
}

async function main() {
  console.log(`Seeding auth users against ${baseUrl}`);
  for (const account of accounts) {
    await seedAccount(account);
  }
  console.log("All six auth users are ready.");
}

main().catch((error) => {
  console.error(error?.stack ?? error?.message ?? String(error));
  process.exit(1);
});
