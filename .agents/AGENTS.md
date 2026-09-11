# AI Agent Guidelines & Project Instructions (NEOKO Manga Reader)

Welcome to the **NEOKO Manga Reader** codebase! This document provides essential instructions, rules, architectural conventions, and guidelines for AI agents working on this project.

---

## 📌 Core Conventions & Rules

### 1. Branch Management
- **`dev` Branch**: ALL active development, new features, and bug fixes MUST be committed on the `dev` branch.
- **`main` Branch**: Reserved exclusively for verified, stable releases. DO NOT commit unverified code directly to `main`.

### 2. Suwayomi API Integration (`src/services/suwayomiApi.ts`)
- **GraphQL Endpoint**: Interacts with Suwayomi Server (Tachiyomi Web) at `http://localhost:4567/api/v1/graphql` or user-configured server URL in `storage.ts`.
- **Parallel Requests & Timeouts**:
  - NEVER fire 20+ concurrent un-batched requests to Suwayomi server. Always batch queries in chunks (max 8-10 in parallel) to prevent server thread pool exhaustion.
  - Extension search requests use a 6,000ms timeout (`timeoutMs = 6000`). Fast catalog browses use 3,500ms.
- **Caching**:
  - Always check `getCachedData` before firing live GraphQL queries unless `forceRefresh = true` is explicitly requested by the user.
  - Do NOT pass `forceRefresh = true` by default in UI modal handlers; allow fast cached responses first.

### 3. Multi-Source Search & Title Deduplication
- **Catalog Browsing**: Deduplicate results strictly by title (`normTitle`) so the discovery feed does not show duplicate cards for the same manga.
- **Title Searches & Change Source Modal**: Key deduplication by `${m.sourceId}_${normTitle}` so results from EVERY active extension source (MangaDex, Asura, Flame, ComicK, Bato, Manganato, etc.) are preserved and displayed.

### 4. Extension Classification & Content Ratings (`src/config/extensionRules.ts`)
- SFW/Normal vs 18+/Adult classification is governed by `src/config/extensionRules.ts`.
- Always respect `getContentFilterSettings()`. Never bypass content rating filters unless `ignoreRatingFilter = true` is explicitly specified for administrative/resolution helpers.

### 5. UI & Styling Rules
- **Vanilla CSS + Tailwind CSS**: Standardized color palette uses dark glassmorphism (`#161327`, `#120f23`, `#2b2746`, `#9d86e9`).
- **Lucide Icons**: Use `lucide-react` icons. Ensure all interactive buttons have `cursor-pointer` and hover/active states.
- **Scroll Lock**: Use `useBodyScrollLock` whenever opening full-screen modals to prevent background page scrolling.

---

## 🛠️ Key Project File Map

| File Path | Description & Responsibility |
| :--- | :--- |
| [suwayomiApi.ts](file:///home/prathxm/Development/manga/src/services/suwayomiApi.ts) | Core API client for Suwayomi server (fetching sources, manga details, chapter lists, search, updates). |
| [MangaDetailPage.tsx](file:///home/prathxm/Development/manga/src/pages/MangaDetailPage.tsx) | Manga detail page (chapters, AniList rating, Change Source modal, bookmarking, tracker sync). |
| [ReaderPage.tsx](file:///home/prathxm/Development/manga/src/pages/ReaderPage.tsx) | Reader view (Webtoon vertical, Paged, Double-page, keyboard shortcuts, preloading, progress saving). |
| [extensionRules.ts](file:///home/prathxm/Development/manga/src/config/extensionRules.ts) | Centralized classification of 18+ vs SFW extensions. |
| [storage.ts](file:///home/prathxm/Development/manga/src/services/storage.ts) | LocalStorage state persistence (library bookmarks, history, settings, read chapter IDs). |
| [cacheManager.ts](file:///home/prathxm/Development/manga/src/services/cacheManager.ts) | Memory + LocalStorage cache layer with TTL support. |

---

## 🧪 Verification Standard

Before declaring any task complete:
1. Ensure code compiles cleanly with `npm run build` (or `tsc --noEmit`).
2. Verify no runtime console errors or missing null checks occur when dereferencing properties.
