# Watercooler — design system & build conventions

Read this before writing any UI. Everything here is already implemented in
`src/app/globals.css` and `src/components/kit/*`. Do not invent parallel systems.

## The product

Watercooler pairs coworkers for coffee chats. The differentiator is **semantic
matching**: each profile's free text is embedded with a Hugging Face model
(`all-MiniLM-L6-v2`, 384-dim) and compared with pgvector cosine distance. The UI
must make the *reason* for a pairing legible — a bare percentage is not enough.

## Aesthetic: Vercel / Geist monochrome

Near-black on white. One accent. Hairline borders. Tight tracking. Density reads
as craft; whitespace is earned, not sprayed.

**Hard rules**

- **Monochrome by default.** `bg-foreground`, `bg-muted`, `border-border`. The
  accent (`text-brand`, `bg-brand`, `bg-brand-subtle`) appears at most **once or
  twice per screen** — reserve it for the single most important thing (a shared
  interest, a primary CTA, an unread dot). Never colour-code categories.
- **No coloured icon tiles.** The old build had `bg-blue-50 text-blue-600`
  rounded squares everywhere. That is exactly the AI-slop pattern we are
  removing. Icons are `text-muted-foreground`, 14–18px, inline.
- **No gradients, no glassmorphism, no blurred blobs, no floating cards.**
- **Borders do the work, not shadows.** Default container is `.surface`
  (`rounded-xl border border-border bg-card`) with **no** shadow. Add
  `.surface-hover` only for genuinely clickable cards.
- **Radii stay small.** `rounded-md` (6px) and `rounded-lg` (8px) for controls,
  `rounded-xl` (12px) for containers. Never `rounded-2xl`/`rounded-3xl` on cards.
- **Both themes, always.** Every screen must look deliberate in light and dark.
  Use tokens only — never a raw hex or a Tailwind palette colour like `blue-600`.

**Typography**

- `GeistSans` (`font-sans`) for everything; `GeistMono` (`font-mono`) for
  numbers, timestamps, scores, and uppercase micro-labels.
- Page titles: `text-3xl sm:text-4xl font-semibold tracking-[-0.03em]`.
- Section headings: `text-lg font-semibold tracking-[-0.02em]`.
- Body: `text-sm` (14px) — this is a tool, not a landing page. `text-base` only
  in marketing copy.
- Micro-labels: the `.label-mono` class (10px, uppercase, 0.12em tracking).
- Any number that carries meaning gets `font-mono` + `tabular`.

**Motion**

Subtle and fast. 150–250ms, `--ease-out-quint`. Fade + 4–8px translate at most.
`framer-motion` is available but prefer CSS. No looping ambient animation, no
spring bounces, no staggered card cascades longer than ~300ms total.

## Component kit — use these, don't rebuild them

| Import | Purpose |
| --- | --- |
| `@/components/kit/person-avatar` | `<PersonAvatar name src size>` — monochrome initials fallback |
| `@/components/kit/score-badge` | `<ScoreBadge score={0..1}>` — mono % + 5-segment meter |
| `@/components/kit/page-header` | `<PageHeader eyebrow title description action>` |
| `@/components/kit/empty-state` | `<EmptyState icon title description action>` — dashed border |
| `@/components/kit/interest-tag` | `<InterestTag name emoji shared>` — `shared` uses the accent |
| `@/components/kit/submit-button` | `<SubmitButton pendingText>` — `useFormStatus` spinner |
| `@/components/kit/toaster` | already mounted in the app layout; call `toast()` from `sonner` |
| `@/components/ui/*` | shadcn (base-ui) primitives: button, input, card, dialog, tabs… |

Utility classes available: `.surface`, `.surface-hover`, `.label-mono`, `.pill`,
`.bg-grid`, `.bg-lines`, `.mask-fade`, `.text-balance`, `.animate-rise`.

Semantic colour tokens: `background`, `background-subtle`, `foreground`, `card`,
`muted`, `muted-foreground`, `border`, `border-strong`, `brand`, `brand-subtle`,
`brand-border`, `success`, `warning`, `destructive` (+ `-subtle` variants),
plus a `gray-100…gray-1000` ramp.

## Stack conventions

- **Next.js 16, App Router.** Read `node_modules/next/dist/docs/` before using an
  API you're unsure about — this version has breaking changes.
- `searchParams` and `params` are **Promises**. Always `await` them.
- Middleware is `src/proxy.ts` exporting `proxy()` — the `middleware` convention
  is deprecated in this version.
- Server Components by default. `'use client'` only for interactivity.
- Mutations are Server Actions in a colocated `actions.ts` with `'use server'`.
- Data access: `createClient()` from `@/utils/supabase/server` (server) or
  `@/utils/supabase/client` (browser).
- Auth/onboarding gate: `requireProfile()` from `@/lib/session` — the `(app)`
  layout already calls it, so pages inside it can assume a complete profile.
  Use `getSession()` when you need the user without the redirect.
- Types: import from `@/lib/types`. Do not redeclare row shapes.
- Matching: `getMatches()`, `explainMatch()`, `scoreToPercent()` from
  `@/lib/matching`. After any write that changes profile text or interests, call
  `syncProfileEmbedding(userId)`.

## Schema

`supabase/migrations/0001_watercooler_core.sql` is applied and authoritative.
Tables: `profiles`, `interests`, `user_interests`, `availability_slots`,
`coffee_chats`, `chat_time_proposals`, `messages`, `notifications`.
RLS is on everywhere. `messages` only accepts inserts when the parent chat is
`accepted`. `notifications` are written by triggers — never insert them from app
code. Realtime is enabled on `messages`, `notifications`, `coffee_chats`.

RPC: `match_profiles(requester_id uuid, match_count int, min_score float)`.

## Accessibility

Real `<button>`/`<a>` elements, visible focus rings (already global), labelled
form controls, `aria-label` on icon-only buttons, and never colour alone to
convey state.
