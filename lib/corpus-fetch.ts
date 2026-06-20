// Turn user-supplied links (YouTube / LinkedIn / articles) into a CITED corpus the persona
// distiller can quote from. SERVER-ONLY (does outbound fetches). Best-effort and defensive: every
// source is independent, a failure on one never sinks the rest, and the caller gets a per-link log
// so the UI can show what was actually read. Articles read best; YouTube uses captions (then the
// description) and LinkedIn uses the public preview tags — both degrade honestly when blocked.

import type { CorpusSegment } from './persona';

export type FetchLog = {
  url: string;
  kind: 'youtube' | 'linkedin' | 'article';
  ok: boolean;
  chars: number;
  note: string;
};

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function get(url: string, headers: Record<string, string> = {}, ms = 9000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', ...headers },
    });
  } finally {
    clearTimeout(timer);
  }
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'", '#x2F': '/',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z0-9#]+);/gi, (m, name) => ENTITIES[name] ?? ENTITIES[name.toLowerCase()] ?? m);
}

/** Strip an HTML document down to readable prose, capped so one source can't dominate the corpus. */
function htmlToText(html: string, cap = 9000): string {
  const cleaned = html
    .replace(/<(script|style|noscript|svg|head|nav|footer|form)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(p|br|div|li|h[1-6]|section|article)[^>]*>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(cleaned)
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
    .slice(0, cap);
}

function metaTitle(html: string): string | undefined {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og) return decodeEntities(og[1]).trim();
  const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return t ? decodeEntities(t[1]).trim() : undefined;
}

function metaDescription(html: string): string | undefined {
  const m =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  return m ? decodeEntities(m[1]).trim() : undefined;
}

function classify(url: string): FetchLog['kind'] {
  const h = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  })();
  if (/(youtube\.com|youtu\.be)/.test(h)) return 'youtube';
  if (/linkedin\.com/.test(h)) return 'linkedin';
  return 'article';
}

function youtubeId(url: string): string | undefined {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || undefined;
    return u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
  } catch {
    return undefined;
  }
}

// YouTube: pull the auto/uploaded caption track out of the watch page, then fetch the timedtext
// XML and flatten it. Falls back to title + description when captions are unavailable/blocked.
async function readYouTube(url: string): Promise<{ seg?: CorpusSegment; note: string }> {
  const id = youtubeId(url);
  if (!id) return { note: 'could not parse video id' };
  const res = await get(`https://www.youtube.com/watch?v=${id}&hl=en`);
  if (!res.ok) return { note: `watch page ${res.status}` };
  const html = await res.text();
  const title = metaTitle(html) ?? `YouTube ${id}`;

  let transcript = '';
  const track = html.match(/"captionTracks":(\[.*?\])/);
  if (track) {
    try {
      const tracks = JSON.parse(track[1].replace(/\\u0026/g, '&')) as { baseUrl?: string; languageCode?: string }[];
      const pick = tracks.find((t) => t.languageCode?.startsWith('en')) ?? tracks[0];
      if (pick?.baseUrl) {
        const cap = await get(pick.baseUrl);
        if (cap.ok) {
          const xml = await cap.text();
          transcript = decodeEntities(xml.replace(/<[^>]+>/g, ' '))
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 9000);
        }
      }
    } catch {
      /* fall through to description */
    }
  }

  const body = transcript || metaDescription(html) || '';
  if (!body) return { note: 'no captions or description found' };
  return {
    seg: { text: body, sourceUrl: url, sourceName: `${title} (YouTube)` },
    note: transcript ? 'transcript' : 'description only (no captions)',
  };
}

// LinkedIn: posts/profiles are login-walled and the site answers bots with HTTP 999. Best-effort:
// take the public preview LinkedIn exposes to crawlers (og:title/description) plus any readable
// body. When that's all login wall, say so plainly rather than pretending we read the post.
async function readLinkedIn(url: string): Promise<{ seg?: CorpusSegment; note: string }> {
  const res = await get(url, { Accept: 'text/html' });
  if (!res.ok) {
    const wall = res.status === 999 ? ' (LinkedIn blocks automated reads — needs login)' : '';
    return { note: `${res.status}${wall}` };
  }
  const html = await res.text();
  const title = metaTitle(html);
  const desc = metaDescription(html);
  const body = htmlToText(html, 6000);
  const text = [desc, body.length > (desc?.length ?? 0) ? body : '']
    .filter((s): s is string => !!s)
    .join('\n\n')
    .trim();
  if (text.length < 200) {
    return { note: 'only a preview was public — full post needs login' };
  }
  return {
    seg: { text, sourceUrl: url, sourceName: title ?? 'LinkedIn' },
    note: body.length > 200 ? 'ok' : 'preview only',
  };
}

async function readArticle(url: string): Promise<{ seg?: CorpusSegment; note: string }> {
  const res = await get(url);
  if (!res.ok) return { note: `${res.status}` };
  const html = await res.text();
  const text = htmlToText(html);
  if (text.length < 200) return { note: 'too little readable text (paywall/JS-only?)' };
  return { seg: { text, sourceUrl: url, sourceName: metaTitle(html) ?? new URL(url).hostname }, note: 'ok' };
}

/** Read every link into a cited corpus, in parallel, with a per-link log. Failures are logged, not thrown. */
export async function fetchCorpus(links: string[]): Promise<{ segments: CorpusSegment[]; log: FetchLog[] }> {
  const urls = [...new Set(links.map((l) => l.trim()).filter(Boolean))].slice(0, 12);
  const results = await Promise.all(
    urls.map(async (url): Promise<{ seg?: CorpusSegment; log: FetchLog }> => {
      const kind = classify(url);
      try {
        const { seg, note } =
          kind === 'youtube'
            ? await readYouTube(url)
            : kind === 'linkedin'
              ? await readLinkedIn(url)
              : await readArticle(url);
        return { seg, log: { url, kind, ok: !!seg, chars: seg?.text.length ?? 0, note } };
      } catch (e) {
        const note = e instanceof Error && e.name === 'AbortError' ? 'timed out' : 'fetch failed';
        return { log: { url, kind, ok: false, chars: 0, note } };
      }
    }),
  );
  return {
    segments: results.flatMap((r) => (r.seg ? [r.seg] : [])),
    log: results.map((r) => r.log),
  };
}
