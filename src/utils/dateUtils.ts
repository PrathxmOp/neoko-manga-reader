/**
 * Formats a timestamp or date input into a human-readable relative time string (e.g., '12m ago', '3h ago', '2d ago').
 */
export function formatTimeAgo(dateInput?: string | number | Date): string {
  if (!dateInput) return 'Recently';

  const timestamp = typeof dateInput === 'number'
    ? dateInput
    : typeof dateInput === 'string' && !isNaN(Number(dateInput))
    ? Number(dateInput)
    : new Date(dateInput).getTime();

  if (isNaN(timestamp) || timestamp <= 0) return 'Recently';

  const now = Date.now();
  const diffMs = now - timestamp;

  if (diffMs < 0) return 'Just now';

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${diffYears}y ago`;
}
