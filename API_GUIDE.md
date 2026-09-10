# 📖 Suwayomi GraphQL API Guide for Manga Reader Web App

Yeh guide aapko Suwayomi-Server ki GraphQL API ko apne frontend (React / Next.js / Vite / Vanilla JS) se integrate karne ke liye poori jankari deti hai.

---

## 🚀 1. Server Configuration & Endpoints

| Resource | URL |
| :--- | :--- |
| **Server Base URL** | `http://localhost:4567` |
| **GraphQL API** | `http://localhost:4567/api/graphql` |
| **Web UI (Admin panel)** | `http://localhost:4567` |

> ⚠️ **Note:** Frontend se request bhejte waqt GraphQL **POST** request honi chahiye jisme header `Content-Type: application/json` set hona chahiye.

---

## 🛠️ 2. Core API Workflow (Manga Web App Flow)

1. **Sources List Karo** (MangaDex, Asura Scans, etc.)
2. **Manga Search / Browse Karo** (Source ID se search query chalao)
3. **Manga Info & Chapter List Fetch Karo** (`fetchMangaAndChapters` trigger karke)
4. **Chapter Pages Load Karo** (`fetchChapterPages` trigger karke)
5. **Images Display Karo** (Server relative URL ko absolute URL me convert karke)

---

## 📝 3. API Queries & Code Examples (JavaScript / Fetch)

### Helper Function: GraphQL Request Runner
```javascript
const GRAPHQL_URL = 'http://localhost:4567/api/graphql';

async function queryGraphQL(query, variables = {}) {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (json.errors) {
    console.error('GraphQL Error:', json.errors);
  }
  return json.data;
}
```

---

### Step 1: Installed Sources List Karna (Get Sources)
Kaun-kaun se active sources installed hain unki list nikalne ke liye:

```graphql
query GetSources {
  sources {
    id
    name
    lang
    iconUrl
    supportsLatest
  }
}
```
**Example Source IDs (Pre-installed):**
- **MangaDex (EN):** `"2499283573021220255"`
- **Asura Scans:** `"6247824327199706550"`

---

### Step 2: Manga Search / Browse Karna (Fetch Source Manga)
Kisi source par manga search ya popular/latest list pane ke liye:

```graphql
mutation SearchManga($sourceId: LongString!, $query: String, $page: Int!) {
  fetchSourceManga(
    input: {
      source: $sourceId
      query: $query
      page: $page
      type: SEARCH
    }
  ) {
    hasNextPage
    mangas {
      id
      title
      thumbnailUrl
      url
    }
  }
}
```
*Variables Example:*
```json
{
  "sourceId": "2499283573021220255",
  "query": "Solo Leveling",
  "page": 1
}
```

---

### Step 3: Manga Details & Chapter List Fetch Karna
Jab user kisi manga par click kare, uske full details (description, genres, status) aur chapter list lene ke liye:

```graphql
mutation GetMangaDetails($mangaId: Int!) {
  fetchMangaAndChapters(
    input: {
      id: $mangaId
      fetchManga: true
      fetchChapters: true
    }
  ) {
    manga {
      id
      title
      author
      artist
      description
      genre
      status
      thumbnailUrl
      chapters {
        nodes {
          id
          name
          chapterNumber
          uploadDate
          scanlator
        }
      }
    }
  }
}
```
*Variables Example:*
```json
{
  "mangaId": 1
}
```

---

### Step 4: Chapter Pages (Images) Load Karna
Jab user koi chapter padhna chahe, to us chapter ke saare image URLs lene ke liye:

```graphql
mutation GetChapterPages($chapterId: Int!) {
  fetchChapterPages(input: { chapterId: $chapterId }) {
    pages
  }
}
```
*Variables Example:*
```json
{
  "chapterId": 12
}
```
**Response Format:**
`pages` field ek string array deta hai URLs ki, jaise:
`["/api/v1/manga/1/chapter/12/page/0", "/api/v1/manga/1/chapter/12/page/1", ...]`

---

### 🖼️ 5. Image & Thumbnail URLs Handle Karna

Suwayomi API relative image URLs return karta hai (e.g. `/api/v1/manga/1/thumbnail`).
Frontend par render karte waqt server URL prepend karein:

```javascript
function getImageUrl(relativePath) {
  if (!relativePath) return '/placeholder.jpg';
  if (relativePath.startsWith('http')) return relativePath;
  return `http://localhost:4567${relativePath}`;
}

// Usage in JSX / HTML:
// <img src={getImageUrl(manga.thumbnailUrl)} alt={manga.title} />
```

---

## 🧩 6. Extension Management (Extra Extensions Install Karna)

Agar user naye sources add karna chahe:

### Available Extensions Search Karna:
```graphql
query GetExtensions {
  extensions {
    pkgName
    name
    lang
    isInstalled
    isNsfw
  }
}
```

### New Extension Install Karna:
```graphql
mutation InstallExtension($pkgName: String!) {
  updateExtension(input: { id: $pkgName, patch: { install: true } }) {
    extension {
      name
      isInstalled
    }
  }
}
```

---

## ⚡ Complete Frontend Integration Example (Vanilla JS)

```javascript
// Manga Search & Display Example
async function searchAndDisplay(queryText) {
  const MANGADEX_ID = "2499283573021220255";
  
  const searchMutation = `
    mutation Search($source: LongString!, $query: String!) {
      fetchSourceManga(input: { source: $source, query: $query, page: 1, type: SEARCH }) {
        mangas {
          id
          title
          thumbnailUrl
        }
      }
    }
  `;

  const data = await queryGraphQL(searchMutation, { source: MANGADEX_ID, query: queryText });
  const mangas = data.fetchSourceManga.mangas;

  console.log("Found Manga:", mangas);
  
  mangas.forEach(manga => {
    console.log(`Title: ${manga.title}`);
    console.log(`Thumbnail: http://localhost:4567${manga.thumbnailUrl}`);
  });
}
```

---

## 🎯 Next Steps

1. Aap apna **UI Design / Figma / Wireframe / Tech Stack** pass karein.
2. Hum is API document ke base par responsive aur high-performance **Manga Reader Web App** build karenge!
