import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

// Infer the app URL from Vercel env vars when APP_URL isn't explicitly set.
// This prevents emails from leaking localhost links in production deployments.
// Priority: VERCEL_PROJECT_PRODUCTION_URL (stable prod domain, e.g. custom domain)
//        → VERCEL_URL (per-deployment URL, used for previews)
//        → localhost:3000 (local dev)
const inferredAppUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

export const env = createEnv({
  /**
   * Server-side environment variables schema
   * These are only available on the server
   */
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
    RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
    APP_URL: z.string().url('APP_URL must be a valid URL').default(inferredAppUrl),
    VAPID_PRIVATE_KEY: z.string().min(1, 'VAPID_PRIVATE_KEY is required'),
    VAPID_SUBJECT: z.string().min(1, 'VAPID_SUBJECT is required'),
    // Agent integration — bordados-perrino-agent talks to this platform via /api/agent/*
    // and we push HMAC-signed status-change webhooks to it. Keys must be ≥32 chars
    // because they are the only thing standing between the agent boundary and a
    // service-role Supabase client.
    AGENT_API_KEY: z.string().min(32, 'AGENT_API_KEY must be at least 32 characters'),
    AGENT_WEBHOOK_SECRET: z.string().min(32, 'AGENT_WEBHOOK_SECRET must be at least 32 characters'),
    AGENT_WEBHOOK_URL: z.string().url('AGENT_WEBHOOK_URL must be a valid URL'),
  },

  /**
   * Client-side environment variables schema
   * These are exposed to the browser (NEXT_PUBLIC_ prefix)
   */
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1, 'NEXT_PUBLIC_VAPID_PUBLIC_KEY is required'),
  },

  /**
   * Runtime environment variables
   * Map env vars to the schema defined above
   */
  runtimeEnv: {
    // Server
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    APP_URL: process.env.APP_URL,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
    AGENT_API_KEY: process.env.AGENT_API_KEY,
    AGENT_WEBHOOK_SECRET: process.env.AGENT_WEBHOOK_SECRET,
    AGENT_WEBHOOK_URL: process.env.AGENT_WEBHOOK_URL,
    // Client
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  },

  /**
   * Skip validation in edge runtime or during build
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Makes it so that empty strings are treated as undefined
   */
  emptyStringAsUndefined: true,
});

export type Env = typeof env;
