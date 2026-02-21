# I-LAUGH-YOU — Architecture Plan

## Overview

A **single-page application** built with **Next.js 15** (App Router), **Three.js** (via React Three Fiber) for immersive 3D visuals, and **Firebase 11** as the backend platform. The page is a scroll-driven one-pager where 3D scenes respond to user interaction and scroll position.

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Framework** | Next.js | 15+ | SSR/SSG, App Router, API routes, build tooling |
| **UI Library** | React | 19+ | Component model, hooks, state |
| **3D Engine** | Three.js | r170+ | WebGL rendering |
| **3D React Binding** | React Three Fiber (R3F) | 9+ | Declarative Three.js in React |
| **3D Helpers** | @react-three/drei | 9+ | Pre-built R3F components (controls, loaders, effects) |
| **Post-processing** | @react-three/postprocessing | 3+ | Bloom, vignette, and other GPU effects |
| **Backend** | Firebase | 11+ | Auth, Firestore, Storage, Hosting |
| **Styling** | Tailwind CSS | 4+ | Utility-first CSS |
| **Animation** | Framer Motion | 12+ | Scroll-driven UI animations, page transitions |
| **Language** | TypeScript | 5.5+ | Full type safety |
| **Package Manager** | pnpm | 9+ | Fast, disk-efficient |

---

## Project Structure

```
g:\I-LAUGH-YOU\
├── docs/                          # Documentation (this folder)
│   └── architecture/
│       └── architecture-plan.md
├── intuitions/                    # Engineering intuitions per topic
│   └── nextjs-firebase-threejs/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx             # Root layout (fonts, metadata, providers)
│   │   ├── page.tsx               # The one-pager entry point
│   │   ├── globals.css            # Tailwind + global styles
│   │   └── api/                   # API routes (server-side Firebase ops)
│   │       └── ...
│   ├── components/
│   │   ├── three/                 # All Three.js / R3F components
│   │   │   ├── Scene.tsx          # Main 3D scene (dynamically imported, SSR off)
│   │   │   ├── Canvas.tsx  # R3F Canvas wrapper with fallback
│   │   │   ├── objects/           # Individual 3D objects/meshes
│   │   │   ├── effects/           # Post-processing effects
│   │   │   └── helpers/           # Lights, cameras, controls
│   │   ├── sections/              # One-pager HTML sections
│   │   │   ├── Hero.tsx
│   │   │   ├── About.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── Gallery.tsx
│   │   │   └── Footer.tsx
│   │   └── ui/                    # Reusable UI primitives
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── ...
│   ├── hooks/                     # Custom React hooks
│   │   ├── useScroll.ts           # Scroll position tracking
│   │   ├── useFirebase.ts         # Firebase context hooks
│   │   └── useMediaQuery.ts       # Responsive breakpoints
│   ├── lib/                       # Shared utilities & services
│   │   ├── firebase/
│   │   │   ├── client.ts          # Firebase client SDK init (singleton)
│   │   │   ├── admin.ts           # Firebase Admin SDK (server only)
│   │   │   ├── auth.ts            # Auth helpers
│   │   │   ├── firestore.ts       # Firestore CRUD abstraction
│   │   │   └── storage.ts         # Storage helpers
│   │   ├── three/
│   │   │   └── utils.ts           # Three.js utility functions (dispose, loaders)
│   │   └── env.ts                 # Environment variable validation
│   ├── providers/                 # React context providers
│   │   ├── FirebaseProvider.tsx    # Firebase auth/app context
│   │   └── ThemeProvider.tsx       # Theme context (if needed)
│   └── types/                     # Shared TypeScript types
│       ├── firebase.d.ts
│       └── three.d.ts
├── public/                        # Static assets
│   ├── models/                    # 3D models (.glb, .gltf)
│   ├── textures/                  # Textures for Three.js
│   └── images/                    # Standard images
├── .env.local                     # Local env vars (gitignored)
├── .env.example                   # Template for env vars
├── next.config.ts                 # Next.js configuration
├── tailwind.config.ts             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Dependencies & scripts
├── pnpm-lock.yaml                 # Lock file
├── firestore.rules                # Firestore security rules
├── firebase.json                  # Firebase project config
└── .firebaserc                    # Firebase project alias
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Next.js App (Client)                    │    │
│  │                                                     │    │
│  │  ┌──────────────┐  ┌────────────────────────────┐   │    │
│  │  │  HTML/CSS     │  │  Three.js / R3F Canvas     │   │    │
│  │  │  Sections     │  │  (dynamic, SSR: false)     │   │    │
│  │  │              │  │                            │   │    │
│  │  │  Hero        │  │  Scene                     │   │    │
│  │  │  About       │◄─┤  ├─ Objects               │   │    │
│  │  │  Features    │  │  ├─ Lights/Camera          │   │    │
│  │  │  Gallery     │  │  ├─ Post-processing        │   │    │
│  │  │  Footer      │  │  └─ Scroll-linked anim     │   │    │
│  │  └──────┬───────┘  └─────────────┬──────────────┘   │    │
│  │         │                        │                   │    │
│  │         └────────┬───────────────┘                   │    │
│  │                  │                                   │    │
│  │         ┌────────▼────────┐                          │    │
│  │         │  React State    │                          │    │
│  │         │  (hooks/context)│                          │    │
│  │         └────────┬────────┘                          │    │
│  └──────────────────┼──────────────────────────────────┘    │
│                     │                                       │
└─────────────────────┼───────────────────────────────────────┘
                      │
          ┌───────────▼───────────┐
          │  Next.js Server       │
          │  (API Routes /        │
          │   Server Actions)     │
          │                       │
          │  Firebase Admin SDK   │
          └───────────┬───────────┘
                      │
          ┌───────────▼───────────┐
          │      FIREBASE         │
          │                       │
          │  ┌─────────────────┐  │
          │  │  Authentication │  │
          │  └─────────────────┘  │
          │  ┌─────────────────┐  │
          │  │  Firestore      │  │
          │  └─────────────────┘  │
          │  ┌─────────────────┐  │
          │  │  Storage        │  │
          │  │  (3D assets)    │  │
          │  └─────────────────┘  │
          │  ┌─────────────────┐  │
          │  │  Hosting        │  │
          │  └─────────────────┘  │
          └───────────────────────┘
```

---

## Key Architectural Decisions

### 1. One-Pager with Sections
The entire app is a single `page.tsx`. Content is divided into semantic `<section>` components that stack vertically. The Three.js canvas is either:
- **Option A:** A full-viewport fixed background behind all sections (parallax style)
- **Option B:** Embedded within specific sections (e.g., Hero only)

Decision pending — see `intuitions/nextjs-firebase-threejs/curiosity.md`.

### 2. Three.js via React Three Fiber
R3F is chosen over vanilla Three.js because:
- Declarative scene graph fits React mental model
- Automatic disposal of Three.js objects on unmount
- HMR-safe (no orphaned renderers)
- Rich ecosystem (`@react-three/drei`, `@react-three/postprocessing`)

### 3. Firebase Client vs Server Split
| Operation | Where | SDK |
|---|---|---|
| Auth (login/signup) | Client | Firebase Client SDK |
| Firestore reads (public) | Client | Firebase Client SDK |
| Firestore writes (protected) | Server (API route) | Firebase Admin SDK |
| Storage uploads | Client (signed URL) or Server | Either |
| Security rule enforcement | Firebase | Firestore Rules |

### 4. SSR Strategy
- **Root layout + page shell:** SSR/SSG (fast first paint, SEO metadata)
- **Three.js canvas:** Client-only via `next/dynamic` with `{ ssr: false }`
- **Firebase-dependent UI:** Client-side with loading states

### 5. Performance Budget
| Metric | Target |
|---|---|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Total Blocking Time | < 200ms |
| JS bundle (first load) | < 150KB gzipped |
| Three.js chunk (lazy) | < 200KB gzipped |
| Frame rate (desktop) | 60fps |
| Frame rate (mobile) | 30fps+ |

### 6. Scroll-Driven Animation
Scroll position is tracked via a custom `useScroll` hook (or Framer Motion's `useScroll`). Normalized scroll progress (0→1) is passed to the Three.js scene via a shared ref or Zustand store, driving camera movement, object transforms, and material changes without causing React re-renders.

---

## Data Flow

```
User Interaction (scroll, click, form submit)
        │
        ▼
React Event Handler / useScroll hook
        │
        ├──► Three.js scene update (via ref, no re-render)
        │
        └──► Firebase command (auth, write, upload)
                │
                ▼
        API Route / Server Action (if protected)
                │
                ▼
        Firebase (Firestore / Auth / Storage)
                │
                ▼
        Response → React state update → UI re-render
```

---

## Environment Variables

```bash
# .env.local (client-safe, prefixed with NEXT_PUBLIC_)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Server-only (no prefix — never exposed to client)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

Source: `src/lib/env.ts` validates all variables at build time.

---

## Deployment

- **Hosting:** Firebase Hosting (or Vercel for Next.js-native deployment)
- **Build:** `next build` → static export or Node.js server depending on features used
- **CI/CD:** GitHub Actions → build → deploy to Firebase/Vercel

---

## Source Files

| File | Purpose |
|---|---|
| `src/app/page.tsx` | One-pager entry, composes all sections |
| `src/components/three/Scene.tsx` | Main R3F scene |
| `src/lib/firebase/client.ts` | Firebase client singleton |
| `src/lib/firebase/admin.ts` | Firebase Admin singleton (server) |
| `src/lib/env.ts` | Env var validation |
| `firestore.rules` | Firestore security rules |

---

Last updated: 2026-02-14
