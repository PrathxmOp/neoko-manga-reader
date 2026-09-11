// Utility for fail-safe manga cover image fallback and placeholder SVG generation

export const DEFAULT_MANGA_COVER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450" fill="none">
  <rect width="300" height="450" fill="#161327"/>
  <rect x="15" y="15" width="270" height="420" rx="12" stroke="#2b2746" stroke-width="2" stroke-dasharray="6 6"/>
  <path d="M110 180H190M110 210H190M110 240H150" stroke="#7c779b" stroke-width="3" stroke-linecap="round"/>
  <circle cx="150" cy="130" r="28" fill="#2b2746" stroke="#9d86e9" stroke-width="2"/>
  <path d="M142 120L158 130L142 140V120Z" fill="#9d86e9"/>
  <text x="150" y="320" text-anchor="middle" fill="#9d86e9" font-family="sans-serif" font-size="16" font-weight="bold">NEOKO</text>
  <text x="150" y="345" text-anchor="middle" fill="#7c779b" font-family="sans-serif" font-size="12">Cover Unavailable</text>
</svg>
`)}`;

export function getValidCoverUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return DEFAULT_MANGA_COVER;
  }
  return url;
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.currentTarget;
  if (target.src !== DEFAULT_MANGA_COVER) {
    target.src = DEFAULT_MANGA_COVER;
  }
}
