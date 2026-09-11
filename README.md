# NEOKO Manga Reader 📖✨

NEOKO is a modern, high-performance, feature-packed Manga, Manhwa, and Manhua reader web application built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**. It connects to a **Suwayomi Server (Tachiyomi for Web)** GraphQL API to aggregate chapters and titles from dozens of extension sources, complemented by **AniList API** integration for ratings, metadata, and tracking.

---

## 🚀 Features

- **Multi-Source Aggregation**: Search and read titles across 25+ extension sources (MangaDex, Asura, Flame, ComicK, Bato, Manganato, Weeb Central, etc.).
- **Dynamic Change Source**: Switch between extension sources on any title with custom title search, smart fallbacks, and real-time per-source result deduplication.
- **Advanced Manga Reader**:
  - Webtoon (vertical scroll) mode, Single-page, and Double-page view modes.
  - Image quality selection, page preloading, custom background themes, and keyboard shortcuts.
  - Automatic progress tracking and chapter history saving.
- **AniList & Tracker Sync**: Auto-bind and sync reading progress with AniList accounts.
- **Personal Library & Collections**: Organize titles into Reading, Plan to Read, Completed, and Favorite categories with custom tags.
- **Content Filter Control**: Toggle between SFW (Normal) and 18+ content ratings with customizable language filters.
- **Interactive Dashboard & Stats**: Real-time stats page detailing chapters read, time spent, active sources, and collection breakdowns.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, React Router v6
- **Styling**: Tailwind CSS, Vanilla CSS, Lucide React Icons
- **APIs**: Suwayomi Server GraphQL & REST API, AniList GraphQL API
- **State & Storage**: LocalStorage, Custom React Contexts (Toast, Theme), Custom Caching Layer

---

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Suwayomi-Server running locally (default: `http://localhost:4567`) or remote URL configured in Settings.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/manga-stream-reader.git
   cd manga-stream-reader
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

---

## 🌿 Branching Strategy

- `main`: **Stable production branch**. Only thoroughly tested and verified code should be merged here.
- `dev`: **Active development branch**. All new features, bug fixes, and experiments should be committed/branched off `dev`.

---

## 📁 Project Structure

```
manga/
├── .agents/              # AI Agent Guidelines & Architecture documentation
├── src/
│   ├── components/       # Reusable UI components (Navbar, BottomDock, Modals, Cards)
│   ├── config/           # Centralized extension rules & SFW/18+ classifications
│   ├── contexts/         # React Contexts (ToastContext, etc.)
│   ├── hooks/            # Custom React hooks (useBodyScrollLock, useSwipeGesture, etc.)
│   ├── pages/            # Main Application Views (Discover, Detail, Reader, Library, etc.)
│   ├── services/         # API Clients & Storage (suwayomiApi, anilistApi, storage, cacheManager)
│   ├── types/            # TypeScript interfaces & type definitions
│   └── utils/            # Helper utilities (mangaType classifier, formatting)
└── package.json
```
