import { getCollection, type CollectionEntry } from 'astro:content';
import { marked } from 'marked';
import settings from '../data/settings.json';
import home from '../data/home.json';
import story from '../data/story.json';
import contact from '../data/contact.json';
import corporate from '../data/corporate.json';
import partnerships from '../data/partnerships.json';
import mapData from '../data/map.json';

export { settings, home, story, contact, corporate, partnerships, mapData };

export const md = (text?: string | null) => (text ? (marked.parse(text, { async: false }) as string) : '');

export const STAGE_ORDER = ['In Development', 'Under Construction', 'Complete'] as const;
export const isClientWork = (p: CollectionEntry<'projects'>) => p.data.assignment === 'client';
export const isCurrent = (p: CollectionEntry<'projects'>) => !isClientWork(p) && p.data.stage !== 'Complete';
export const isKingstonRoad = (p: CollectionEntry<'projects'>) => /kingston road/i.test(`${p.data.address} ${p.data.intersection}`);

/** "2026-10-30" → "Oct 30, 2026"; "2026-08" → "Aug 2026" */
export const formatMilestoneDate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  if (!m) return String(y);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, day || 1));
  return dt.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', ...(day ? { day: 'numeric' } : {}), timeZone: 'UTC' });
};
export const latestMilestone = (p: CollectionEntry<'projects'>) => p.data.milestones.at(-1);

export async function getProjects() {
  return (await getCollection('projects', (p) => !p.data.hidden)).sort((a, b) => a.data.order - b.data.order);
}

export async function getTeam() {
  return (await getCollection('team', (t) => !t.data.hidden)).sort((a, b) => a.data.order - b.data.order);
}

export async function getNews() {
  return (await getCollection('news', (n) => !n.data.draft || import.meta.env.DEV)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );
}

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export const stageTone = (s: string) => (s === 'Complete' ? 'done' : s === 'Under Construction' ? 'build' : 'soon');

export const telHref = (phone: string) => 'tel:+1' + phone.replace(/\D/g, '').replace(/^1/, '');

// ── Project brand colours ─────────────────────────────────────────────────
const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h: string) => {
  const [r, g, b] = hexToRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrastWithWhite = (h: string) => 1.05 / (lum(h) + 0.05);
const darken = (h: string, f: number) => '#' + hexToRgb(h).map((v) => Math.round(v * (1 - f)).toString(16).padStart(2, '0')).join('');
/** The project's brand colour, darkened just enough to carry white text and read as link text (WCAG AA 4.5:1). */
export const brandInk = (p: CollectionEntry<'projects'>) => {
  let c = p.data.brandColor || settings.accentColor;
  for (let i = 0; i < 20 && contrastWithWhite(c) < 4.5; i++) c = darken(c, 0.08);
  return c;
};
/** The brand colour as in the logo, for fills such as map pins. */
export const brandFill = (p: CollectionEntry<'projects'>) => p.data.brandColor || settings.accentColor;
