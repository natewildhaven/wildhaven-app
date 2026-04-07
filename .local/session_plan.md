# Objective
Add Mystery Boxes + Figurines, Coin Shop, and Pack Inventory overhaul to Wildhaven.

# Tasks

### T001: DB Schema – new tables & columns
- Add `coinPrice` to packsTable
- Create mysteryBoxesTable, figurineRaritiesTable, mysteryBoxRarityProbsTable, figurinesTable, studentFigurinesTable, studentBoxInventoryTable
- Update schema/index.ts
- Run db push

### T002: API Routes – mystery boxes, figurines, rarities, shop, box inventory
- POST/GET/PATCH/DELETE /mystery-boxes
- GET/POST /mystery-boxes/:id/figurines + PATCH/DELETE /figurines/:id
- GET/POST/PATCH/DELETE /figurine-rarities
- GET/POST /students/:id/box-inventory + /open
- GET /students/:id/figurines
- POST /students/:id/shop/buy-pack + /shop/buy-box
- Update packs route to include coinPrice in responses

### T003: Teacher Portal – Shop tab + Mystery Box management
- /teacher/shop page (toggle availability + set prices for packs & boxes)
- /teacher/mystery-boxes page (CRUD boxes + figurines + rarity probs per box)
- Add Shop + Mystery Boxes links to nav + App.tsx routes

### T004: Teacher Portal – Settings + AwardPacks updates
- Figurine rarity settings in Settings page (add/edit/delete rarities, coin values)
- AwardPacks: add option to spend student coins (deduct + open now or save)

### T005: Student Portal – Collection overhaul (inventory + tabs + figurines)
- Inventory: show choice packs + specific pack counts + box counts
- Cards tab + Figurines tab (silhouettes for unowned, bigger display)
- Pack Mastery bars when on cards tab, Mystery Box Mastery when on figurines tab
- Spend Coins shop modal (buy packs or boxes → open now or save)
- BoxOpener component: box top flies off → smoke → figurine revealed
