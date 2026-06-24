// YouTube watch/share URLs (youtube.com/watch?v=ID, youtu.be/ID) set X-Frame-Options
// and refuse to be framed. The player only allows embedding via youtube.com/embed/ID.
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be']);

// /embed/ accepts `start` (integer seconds), not the watch-page `t` value which may carry units (e.g. 596s, 1h2m3s).
const toStartSeconds = (timestamp: string): string | null => {
  const [, hours, minutes, seconds] = timestamp.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/) ?? [];
  const total = (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
  return total > 0 ? String(total) : null;
};

const extractVideoId = (parsed: URL): string | null => {
  if (parsed.hostname.endsWith('youtu.be')) return parsed.pathname.slice(1).split('/')[0] || null;
  if (parsed.pathname.startsWith('/watch')) return parsed.searchParams.get('v');
  return null;
};

export const normalizeYouTubeUrl = (url: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (!YOUTUBE_HOSTS.has(parsed.hostname)) return url;
  if (parsed.pathname.startsWith('/embed/')) return url;

  const videoId = extractVideoId(parsed);
  if (!videoId) return url;

  const embed = new URL(`https://www.youtube.com/embed/${videoId}`);
  const timestamp = parsed.searchParams.get('start') || parsed.searchParams.get('t');
  const start = timestamp ? toStartSeconds(timestamp) : null;
  if (start) embed.searchParams.set('start', start);

  return embed.toString();
};
