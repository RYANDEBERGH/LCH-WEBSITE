import { getCollection, type CollectionEntry } from 'astro:content';
import { marked } from 'marked';
import settings from '../data/settings.json';
import home from '../data/home.json';
import story from '../data/story.json';
import contact from '../data/contact.json';
import corporate from '../data/corporate.json';

export { settings, home, story, contact, corporate };

export const md = (text?: string | null) => (text ? (marked.parse(text, { async: false }) as string) : '');

export const CURRENT_STATUSES = ['Now Pre-Leasing', 'Now Leasing', 'Under Construction', 'Coming Soon', 'In Planning'];
export const isCurrent = (p: CollectionEntry<'projects'>) => CURRENT_STATUSES.includes(p.data.status);

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

export const statusTone = (s: string) =>
  s === 'Complete' ? 'done' : s.startsWith('Now') ? 'live' : s === 'Under Construction' ? 'build' : 'soon';

export const telHref = (phone: string) => 'tel:+1' + phone.replace(/\D/g, '').replace(/^1/, '');
