import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Every field here mirrors a field in public/admin/config.yml.
// If you add a field to the CMS, add it here too (and vice-versa).

// The CMS can save an emptied number box as "" — treat that as "not set".
const optNum = z.preprocess((v) => (v === '' ? null : v), z.number().nullish());

// Construction stage and leasing are tracked separately: a building can be under construction and pre-leasing at once.
const STAGES = ['In Development', 'Under Construction', 'Complete'] as const;
const LEASING = ['', 'Now Pre-Leasing', 'Now Leasing', 'Join the Waitlist', 'Fully Leased', 'Memberships Available'] as const;
// Milestone dates can be a full date (2026-10-30), a month (2026-08) or a year (2023) — whatever was actually reported.
const milestoneDate = z.union([z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/), z.date().transform((d) => d.toISOString().slice(0, 10))]);

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    order: z.number().default(99),
    featured: z.boolean().default(false),
    hidden: z.boolean().default(false),
    // 'development' = LCH's own project; 'client' = selected client work (development/construction management for an owner, lender or receiver)
    assignment: z.enum(['development', 'client']).default('development'),
    roleLabel: z.string().nullish(),
    client: z.string().nullish(),
    years: z.string().nullish(),
    // optional framing for the home page tile, e.g. "--tile-h: 135%; --tile-top: -40%; --tile-x: 38%"
    tileCrop: z.string().nullish(),
    delivery: z.string().nullish(),
    // public construction-updates site (schedule, photos, sign-up), usually run by Elevate
    construction: z.object({ url: z.string(), label: z.string().nullish() }).nullish(),
    // target construction phases (from the construction schedule), shown under "Under Construction"
    schedule: z.array(z.object({ name: z.string(), start: z.string(), end: z.string() })).default([]),
    // true for places LCH owns and runs after completion (e.g. Merge Spaces)
    operating: z.boolean().default(false),
    approach: z.string().nullish(),
    stage: z.enum(STAGES).nullish(),
    type: z.string(),
    address: z.string().optional().default(''),
    neighbourhood: z.string().optional().default(''),
    intersection: z.string().optional().default(''),
    units: optNum,
    storeys: optNum,
    partners: z.array(z.string()).nullish().transform((v) => v ?? []),
    architect: z.string().nullish(),
    summary: z.string(),
    brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
    logo: z.string().nullish(),
    heroImage: z.string().nullish(),
    gallery: z
      .array(z.object({ image: z.string(), caption: z.string().nullish() }))
      .nullish()
      .transform((v) => v ?? []),
    website: z
      .object({ url: z.string().nullish(), label: z.string().nullish() })
      .nullish(),
    leasing: z
      .object({ status: z.enum(LEASING).nullish(), url: z.string().nullish(), label: z.string().nullish() })
      .nullish(),
    lat: optNum,
    lng: optNum,
    milestones: z
      .array(
        z.object({
          date: milestoneDate,
          label: z.string(),
          source: z.string().nullish(),
          sourceUrl: z.string().nullish(),
        }),
      )
      .nullish()
      .transform((v) => (v ?? []).slice().sort((a, b) => a.date.localeCompare(b.date))),
  }),
});

const team = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/team' }),
  schema: z.object({
    name: z.string(),
    credentials: z.string().nullish(),
    role: z.string(),
    photo: z.string().nullish(),
    linkedin: z.string().nullish(),
    // Which team page tabs this person appears under
    companies: z.array(z.enum(['lch', 'elevate'])).default(['lch']),
    order: z.number().default(99),
    hidden: z.boolean().default(false),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    topic: z.string().default('Company News'),
    project: z.string().nullish(),
    projects: z.array(z.string()).default([]),
    image: z.string().nullish(),
    excerpt: z.string().nullish(),
    sourceUrl: z.string().nullish(),
    publisher: z.string().nullish(),
    imageFit: z.enum(['cover', 'contain']).nullish(),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().nullish(),
  }),
});

// Curated social posts: paste a post's link, pick the account, add an image and short excerpt.
const social = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/social' }),
  schema: z.object({
    account: z.string(),
    network: z.enum(['linkedin', 'instagram', 'facebook']),
    date: z.coerce.date(),
    url: z.string(),
    project: z.string().nullish(),
    text: z.string().nullish(),
    image: z.string().nullish(),
    hidden: z.boolean().default(false),
    embed: z.boolean().default(true),
  }),
});

export const collections = { projects, team, news, pages, social };
export { STAGES, LEASING };
