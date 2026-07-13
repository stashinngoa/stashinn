# StashInn Stage 1 — Batch C: Auth System Walkthrough

I have successfully completed Batch C, implementing the Supabase authentication layer and Next.js middleware for role-based routing.

## 1. Shared Supabase Clients (`@stashinn/lib`)
I installed `@supabase/ssr` and built robust wrappers in the shared library for reusability across all apps:
- `createBrowserClient`: For client-side React components.
- `createServerClient`: For Server Actions (`login`/`signup`) and Server Components, using Next.js `cookies()`.
- `updateSession`: The core session refresh utility used in the Next.js middleware.

> [!TIP]
> By hoisting the `@supabase/ssr` logic strictly into `@stashinn/lib/supabase`, we circumvent type conflicts and centralize our authentication logic cleanly.

## 2. Next.js Role-based Middleware
Each app now runs its own specialized `middleware.ts`.
It intercepts traffic, updates the JWT token explicitly via `updateSession()`, and strictly checks the `role` field from the Supabase profile against the current application:
- **Customer App**: Secures `/dashboard`. Enforces `role === 'customer'`.
- **Partner App**: Secures `/dashboard`. Enforces `role === 'partner'`.
- **Admin App**: Secures `/dashboard`. Enforces `role === 'admin'`.

If roles mismatch, the user is forwarded to a customized `/403` visual "Access Denied" page. 

## 3. Login & Signup Pages
I have scaffolded out the initial Authentication pages natively using **Next.js Server Actions**:
- Form submissions map to `action={login}` or `action={signup}`.
- Submissions hit Supabase Auth, securely grab the cookie token, and redirect to `/dashboard`.
- The Admin app is strictly restricted to **Login Only** (no signup) for security reasons.

## 4. Database Trigger 
I added `20250412000004_auth_triggers.sql` to your Supabase schema! 
- When an account is created via `auth.users`, a Postgres Trigger securely captures the Event and automatically provisions the `public.users` row linking the generated UUID, role, and email to ensure standard normalized relational access is possible!

> [!IMPORTANT]
> **Push the Auth Triggers!**
> Please run `npx supabase db push` from the root of `stashinn-portal` to push the new Auth Trigger migration into your remote database!
