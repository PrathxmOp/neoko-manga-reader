#!/usr/bin/env python3
"""
Suwayomi-Server API Setup & Test Script
Adds extension repos, installs popular sources, and tests the GraphQL API.
"""
import requests
import json
import time
import sys

SUWAYOMI_URL = "http://localhost:4567/api/graphql"

def gql(query, variables=None):
    r = requests.post(SUWAYOMI_URL, json={"query": query, "variables": variables or {}}, timeout=30)
    return r.json()

def wait_for_server():
    print("⏳ Waiting for Suwayomi-Server on port 4567...")
    for i in range(30):
        try:
            r = gql("{ settings { ip port } }")
            if "data" in r:
                print("✅ Suwayomi-Server is UP!")
                return True
        except:
            pass
        time.sleep(2)
    print("❌ Server not reachable.")
    return False

def setup_extension_stores():
    print("\n📦 Adding extension stores...")

    # Official Keiyoushi extensions repository for Suwayomi / Tachiyomi / Mihon
    keiyoushi_repo = "https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json"

    mutation = 'mutation AddStore($url: String!) { addExtensionStore(input: { indexUrl: $url }) { extensionStore { name indexUrl } } }'
    r = gql(mutation, {"url": keiyoushi_repo})

    if "errors" in r and ("already exists" in str(r) or "Duplicate" in str(r)):
        print("   Store already added!")
    elif "data" in r and r["data"].get("addExtensionStore"):
        store = r["data"]["addExtensionStore"]["extensionStore"]
        print(f"   ✅ Added: {store['name']} -> {store['indexUrl']}")
    else:
        print(f"   Result: {json.dumps(r, indent=2)}")

    # Trigger fetch
    print("   🔄 Fetching extensions from repo...")
    gql('mutation { fetchExtensions(input: {}) { clientMutationId } }')
    time.sleep(3)

def list_extensions():
    print("\n📋 Listing available extensions...")
    query = '''
    {
        extensions {
            nodes {
                name
                pkgName
                versionName
                lang
                isInstalled
                isNsfw
            }
        }
    }
    '''
    r = gql(query)
    nodes = r.get("data", {}).get("extensions", {}).get("nodes", [])
    print(f"   Total: {len(nodes)}")

    english = [e for e in nodes if e.get("lang") == "en" and not e.get("isNsfw")]
    all_lang = [e for e in nodes if e.get("lang") == "all" and not e.get("isNsfw")]
    installed = [e for e in nodes if e.get("isInstalled")]

    print(f"   English (non-NSFW): {len(english)}")
    print(f"   All-lang (non-NSFW): {len(all_lang)}")
    print(f"   Installed: {len(installed)}")

    return nodes

def install_extension(pkg_name):
    """Install an extension by package name using installExternalExtension or similar."""
    # Suwayomi uses updateExtension with install action
    mutation = '''
    mutation InstallExt($pkgName: String!) {
        updateExtension(input: { id: $pkgName, patch: { install: true } }) {
            extension {
                name
                pkgName
                isInstalled
            }
        }
    }
    '''
    r = gql(mutation, {"pkgName": pkg_name})
    if "data" in r and r["data"].get("updateExtension"):
        ext = r["data"]["updateExtension"]["extension"]
        print(f"   ✅ Installed: {ext['name']}")
        return True
    else:
        print(f"   ❌ Failed: {json.dumps(r.get('errors', [{}])[0].get('message', 'Unknown error'))}")
        return False

def install_popular_extensions(nodes):
    print("\n🔧 Installing popular extensions...")

    # Popular English manga sources
    popular = [
        "eu.kanade.tachiyomi.extension.en.asurascans",
        "eu.kanade.tachiyomi.extension.en.mangafire",
        "eu.kanade.tachiyomi.extension.en.mangapark",
        "eu.kanade.tachiyomi.extension.en.comick",
        "eu.kanade.tachiyomi.extension.en.reaperscans",
        "eu.kanade.tachiyomi.extension.all.mangadex",
        "eu.kanade.tachiyomi.extension.all.comickfun",
    ]

    available_pkgs = {e["pkgName"] for e in nodes}

    for pkg in popular:
        if pkg in available_pkgs:
            print(f"\n   Installing {pkg}...")
            install_extension(pkg)
        else:
            print(f"   ⚠️  {pkg} not found in available extensions")

def list_sources():
    print("\n🌐 Listing installed sources (after installing extensions)...")
    query = '''
    {
        sources {
            nodes {
                id
                name
                lang
                isNsfw
                extension {
                    pkgName
                }
            }
        }
    }
    '''
    r = gql(query)
    nodes = r.get("data", {}).get("sources", {}).get("nodes", [])
    print(f"   Total sources available: {len(nodes)}")
    for s in sorted(nodes, key=lambda x: x["name"])[:30]:
        print(f"   - [{s['lang']:3s}] {s['name']:35s} (id: {s['id']})")
    return nodes

def test_search(source_id, query_text="One Piece"):
    print(f"\n🔍 Searching '{query_text}' on source {source_id}...")
    mutation = '''
    mutation SearchManga($sourceId: LongString!, $query: String!, $page: Int!) {
        fetchSourceManga(input: { source: $sourceId, query: $query, page: $page, type: SEARCH }) {
            mangas {
                url
                title
                thumbnailUrl
            }
            hasNextPage
        }
    }
    '''
    r = gql(mutation, {"sourceId": str(source_id), "query": query_text, "page": 1})
    if "data" in r and r["data"].get("fetchSourceManga"):
        mangas = r["data"]["fetchSourceManga"]["mangas"]
        print(f"   Found {len(mangas)} results:")
        for m in mangas[:5]:
            print(f"   - {m['title']}")
            print(f"     URL: {m['url']}")
            print(f"     Thumbnail: {m['thumbnailUrl']}")
        return mangas
    else:
        print(f"   Error: {json.dumps(r, indent=2)[:500]}")
        return []

if __name__ == "__main__":
    if not wait_for_server():
        sys.exit(1)

    setup_extension_stores()
    nodes = list_extensions()

    if len(nodes) == 0:
        print("\n❌ No extensions found. Check your internet connection and try again.")
        sys.exit(1)

    install_popular_extensions(nodes)
    sources = list_sources()

    print("\n" + "="*60)
    print("✅ Suwayomi-Server API is READY!")
    print(f"   GraphQL Endpoint: {SUWAYOMI_URL}")
    print(f"   Extensions: {len(nodes)}")
    print(f"   Sources: {len(sources)}")
    print("="*60)
