import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Every field here mirrors a field in public/admin/config.yml.
// If you add a field to the CMS, add it here too (and vice-versa).

// The CMS can save an emptied number box as "" — treat that as "not set".
const optNum = z.preprocess((v) => (v === '' ? null : v), z.number().nullish());

const STATUSES = ['Now Pre-Leasing', 'Now Leasing', 'Under Construction', 'Coming Soon', 'In Planning', 'Complete'] as const;

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    order: z.number().default(99),
    featured: z.boolean().default(false),
    hidden: z.boolean().default(false),
    status: z.enum(STATUSES),
    type: z.string(),
    address: z.string().optional().default(''),
    neighbourhood: z.string().optional().default(''),
    intersection: z.string().optional().default(''),
    units: optNum,
    storeys: optNum,
    partners: z.array(z.string()).nullish().transform((v) => v ?? []),
    architect: z.string().nullish(),
    summary: z.string(),
    logo: z.string().nullish(),
    heroImage: z.string(),
    gallery: z
      .array(z.object({ image: z.string(), caption: z.string().nullish() }))
      .nullish()
      .transform((v) => v ?? []),
    website: z
      .object({ url: z.string().nullish(), label: z.string().nullish() })
      .nullish(),
  }),
});

const team = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/team' }),
  schema: z.object({
    name: z.string(),
    credentials: z.string().nullish(),
    role: z.string(),
    photo: z.string().nullish(),
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
    image: z.string().nullish(),
    excerpt: z.string().nullish(),
    sourceUrl: z.string().nullish(),
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

export const collections = { projects, team, news, pages };
export { STATUSES };
