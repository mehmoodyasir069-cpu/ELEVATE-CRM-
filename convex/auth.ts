import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;
const authSecret =
  process.env.BETTER_AUTH_SECRET ?? "elevate-crm-better-auth-secret-2026-06-03";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: siteUrl,
    secret: authSecret,
    trustedOrigins: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:8766",
      "http://127.0.0.1:8766",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://*.netlify.app",
      "https://*.convex.site",
      siteUrl,
    ],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [convex({ authConfig })],
  });
