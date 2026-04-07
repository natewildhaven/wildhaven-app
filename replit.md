# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Wildhaven Collectible Cards — a digital card collection system for classrooms with teacher and student portals.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind + Framer Motion

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── wildhaven/          # React Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Wildhaven Collectible Cards

### Features
- **Student Portal** (`/`): PIN login, card collection view with owned+missing merged grid, lightbox on click, missing cards show card back + "Missing" badge; Inventory widget shows pack count + coin count; Coin Shop (SpendCoinsShop) to buy packs/mystery boxes; Figurines tab for mystery box figurine collection; BoxOpener animation when opening a box
- **Teacher Portal** (`/teacher`): Password `wildhaven123`, manage students with class assignment, award packs via class→student→pack flow, animated pack reveal, manage packs/cards with settings panel, collection matrix spreadsheet
- **Students & Classes page**: Combined at `/teacher/dashboard` with 3 tabs — Students (roster + inventory), Classes (full CRUD with colour picker + student assignment, teacher autocomplete datalist), Teachers (teachers derived from class teacher fields + localStorage extras, class reassignment via dropdown)
- **Achievements drag-and-drop**: Achievement cards use HTML5 drag API with GripVertical handle — drag and drop to reorder; saves via `POST /achievements/reorder`
- **Coin System**: Duplicate cards auto-cash for coins (rarity-based amounts). PackOpener shows DUPLICATE badge + coin amount when a flipped card is already owned. Coins accumulate on student profile. Settings (Customise page) allows configuring coin values per rarity (default: Common=1, Rare=2, Epic=4, Mythic=5, Legendary=10).
- **Mystery Boxes** (`/teacher/mystery-boxes`): CRUD for mystery boxes with figurines, rarity probabilities per box, image upload; Students buy with coins and open for a random figurine; Duplicates earn coins
- **Coin Shop** (`/teacher/shop`): Toggle packs/boxes as available in student coin shop; set individual coin prices
- **Pack Inventory overhaul**: Choice packs (`inventoryCount`) + specific named packs (`packBankTable`) shown separately in student Collection
- **Figurine Rarities** (in Customise/Settings page): Custom rarity tiers for figurines with name, colour swatch, and duplicate coin value; shared across all boxes
- **Spend Coins in Award Packs**: Teachers can open the Coin Shop overlay while awarding packs to spend a student's coins on packs (open now or save to inventory) or mystery boxes

### Card Rarities
- Common (50%), Rare (30%), Epic (15%), Mythic (4%), Legendary (1%) — no Uncommon
- Rarity colors: Common=green, Rare=blue, Epic=purple, Mythic=slate/silver, Legendary=yellow/gold
- Visual effects: Legendary has gold shimmer, Epic has purple sparkle shimmer + particles, Mythic has pulsing glow animation

### Pack Opening Flow (Teacher)
1. Click "Award Packs" button → PackAwardFlow overlay opens
2. Select class (or Unassigned) → select student → select pack image
3. Animated 3D flip reveal (PackOpener) with confetti for Legendary/Epic
4. After reveal: "Open Another Pack" returns to pack selection for same student, "Done" closes
- Server-side rarity draw → card selection → 3 cards awarded

### Class Management
- Classes table: `id`, `name`, `created_at`
- Students have nullable `class_id` FK to classes
- API routes (NOT in OpenAPI spec, direct fetch): `GET/POST/DELETE /api/classes`, `PATCH /api/students/:id/class`
- Dashboard shows class dropdown on each student card for assignment
- PackAwardFlow shows class tiles + "Unassigned" tile, can create/delete classes inline

### Database Schema
- `students`: id, name, pin, class_id (nullable FK), created_at
- `classes`: id, name, created_at
- `packs`: id, name, description, cover_image_url, card_back_image_url, common_chance, rare_chance, epic_chance, mythic_chance, legendary_chance, created_at
- `cards`: id, pack_id, card_number, name, image_url, rarity, tags (jsonb array of string type names), created_at
- `card_types`: id, name, color, sort_order
- `collection_entries`: id, student_id, card_id, awarded_at

### Key API Routes
- `GET/POST /api/students` — list/create students
- `POST /api/students/verify-pin` — student login
- `GET/POST /api/packs` — list/create packs
- `POST /api/packs/:packId/open` — open a pack for a student (body: `{studentId}`)
- `GET/POST/DELETE /api/cards` — list/create/delete cards
- `PATCH /api/cards/:id` — update card
- `GET /api/collections/:studentId` — student's full collection with progress
- `POST /api/uploads/card-image` — upload card images → Cloudflare R2 (or local disk fallback)
- `POST /api/uploads/image` — general image upload (figurines, pack covers, etc.)
- `POST /api/uploads/audio` — audio upload (box open sounds, etc.)
- `GET /api/uploads/r2/*key` — proxy-streams a file from R2 by its storage key
- `GET /api/uploads/:filename` — serve locally-stored fallback images

**Image storage**: Cloudflare R2 (`wildhaven` bucket) via `s3Storage.ts`. No public URL configured — files are proxied through `/api/uploads/r2/<key>`. Env vars: `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_FORCE_PATH_STYLE` (non-secret); `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (Replit secrets). Falls back to local ephemeral disk if R2 is unavailable.
- `GET /api/admin/overview` — matrix of all students × cards
- `POST /api/admin/batch-update` — bulk update collection entries
- `GET/POST/DELETE /api/classes` — class management
- `PATCH /api/students/:id/class` — assign student to class
- `GET /api/backups` — list up to 10 saved backups (id, label, createdAt)
- `POST /api/backups` — create backup snapshot now; prunes oldest to keep max 10
- `POST /api/backups/:id/restore` — restore all student data from a snapshot
- `DELETE /api/backups/:id` — delete a backup

**Daily Backup System**: `node-cron` in `src/index.ts` schedules `createBackup()` at 02:00 AM each day. Snapshot includes: `students`, `collection_entries`, `student_figurines`, `pack_bank`, `student_box_inventory`, `student_achievements`. Restore upserts students and wipes+re-inserts their linked data in a transaction; students not in the snapshot are untouched. UI is in Settings → Backups tab.

### CSV Features
- **Collection Matrix**: Upload CSV (Student, [card numbers as headers]) or Export CSV
- **Pack Detail Cards**: Import CSV (columns: #, Name, Rarity) to populate Add Cards table

### Important Patterns
- Admin + Classes routes are NOT in OpenAPI spec — frontend uses direct `fetch()` with `import.meta.env.BASE_URL.replace(/\/$/, "") + "/api"`
- Pack settings (cover/back image, pull rates) stored on pack row, saved via `PATCH /api/packs/:id`
- Student card display: no card name/number shown (unless embedded in image)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes: `students`, `packs`, `cards`, `collections`, `uploads`, `admin`, `classes`.

- Depends on: `@workspace/db`, `@workspace/api-zod`, `multer`

### `artifacts/wildhaven` (`@workspace/wildhaven`)

React + Vite frontend with Tailwind, Framer Motion, Lucide, react-confetti.
- Student portal: PIN login → collection view (merged owned+missing sorted grid)
- Teacher portal: password-protected, student management with class assignment, pack award flow overlay

Key components:
- `PackAwardFlow`: class → student → pack selection overlay (creates classes, assigns packs)
- `PackOpener`: animated pack reveal with confetti, supports "Open Another Pack"
- `CollectibleCard`: flip animation (pack opener), rarity effects (shimmer, sparkle, glow)
- `StudentCard`: gallery display, Legendary shimmer, Epic sparkle, Mythic glow pulse
- `MissingCard`: card back + Missing badge + "???"
- `CardLightbox`: full-screen card detail on click

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

Run migrations: `pnpm --filter @workspace/db run push`

### `lib/api-spec` (`@workspace/api-spec`)

Run codegen: `pnpm --filter @workspace/api-spec run codegen`
