# System Architecture - NEOKO Manga Reader

This document provides a technical breakdown of the NEOKO architecture, state management, storage keys, caching system, and Suwayomi API communication.

---

## 🏛️ Architecture Overview

```
                          ┌──────────────────────────┐
                          │    React UI Application  │
                          │   (Pages, Components)    │
                          └─────────────┬────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
  ┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
  │   Suwayomi API    │      │    AniList API    │      │  Storage & Cache  │
  │ (GraphQL / REST)  │      │     (GraphQL)     │      │ (LocalStorage +   │
  │                   │      │                   │      │   Memory Cache)   │
  └───────────────────┘      └───────────────────┘      └───────────────────┘
```

---

## 🔌 API Integration

### 1. Suwayomi Server (`suwayomiApi.ts`)
- **Server Address**: Default `http://localhost:4567/api/v1/graphql` (configurable via `SERVER_URL_KEY` in `storage.ts`).
- **Key Operations**:
  - `getSources`: Fetches installed extensions with status and NSFW flags.
  - `fetchSourceManga`: Runs `fetchSourceManga` GraphQL mutation for search or popular/latest lists.
  - `searchMultiSource`: Aggregates manga across enabled extension sources with batched concurrency and caching.
  - `getMangaDetails`: Retrieves title details and chapter lists.
  - `getChapterPages`: Fetches image URLs for a chapter.

### 2. AniList Integration (`anilistApi.ts`)
- Used for metadata resolution, public ratings, cover art fallbacks, and user tracking synchronization (`AniList OAuth`).

---

## 💾 State Persistence & Storage (`storage.ts`)

| Key Name | Description |
| :--- | :--- |
| `neoko_bookmarks_v2` | Stores user's saved library items with category (`Reading`, `Plan to Read`, `Completed`, `Favorite`). |
| `neoko_history_v2` | Chronological list of read manga and last read chapter timestamp. |
| `neoko_read_chapters` | Set of completed chapter IDs for visual read checkmarks. |
| `neoko_content_settings_v1` | Content filter preferences (`contentRating`: `sfw` \| `18+`, language list). |
| `neoko_reader_settings` | Reader configuration (reading mode, layout, preloading, background color). |

---

## ⚡ Cache Layer (`cacheManager.ts`)

- **In-Memory + LocalStorage**: Micro-cache with TTL (Time To Live).
- **Default TTL**:
  - Source list: 30 minutes.
  - Multi-source search: 15 minutes.
  - Manga details & chapters: 10 minutes.
  - AniList metadata: 60 minutes.
