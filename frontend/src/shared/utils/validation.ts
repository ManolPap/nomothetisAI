import { z } from 'zod'

export function validatePdfFile(file: File): string | null {
  const validMime = file.type === 'application/pdf'
  const validExt = file.name.toLowerCase().endsWith('.pdf')
  if (!validMime || !validExt) return 'Παρακαλώ επιλέξτε αρχείο PDF.'
  return null
}

// ── Field 6 schemas ──────────────────────────────────────────────────────────

export const LawMetadataSchema = z.object({
  title: z.string().min(1),
  law_number: z.string().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  ministry: z.string().optional(),
  fek_number: z.string().optional(),
  fek_date: z.string().optional(),
  subject: z.string().optional(),
})

export const WebSearchPayloadSchema = z.object({
  metadata: LawMetadataSchema,
  nim_text: z.string(),
})

export const EurostatPayloadSchema = z.object({
  metadata: LawMetadataSchema,
  facts_text: z.string().min(1),
})

export const SynthesizePayloadSchema = z.object({
  metadata: LawMetadataSchema,
  facts_text: z.string().min(1),
  eurostat_text: z.string().min(1),
  selected_sources: z.array(z.object({ url: z.string(), title: z.string().optional() })).min(1),
})

// ── Field 9 schemas ──────────────────────────────────────────────────────────

export const ExtractSectorPayloadSchema = z.object({
  sector: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  law_title: z.string().min(1),
})

export const SuggestIndicatorsPayloadSchema = z.object({
  sector: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  law_title: z.string().min(1),
})

export const FetchDataPayloadSchema = z.object({
  selected_indicators: z.array(z.string().min(1)).min(1),
  year: z.number().int().min(1900).max(2100),
})

// ── Field 23 schemas ─────────────────────────────────────────────────────────

export const ArticleOutSchema = z.object({
  article_number: z.string(),
  header: z.string(),
  title: z.string(),
  body: z.string(),
})

export const CompareLawsPayloadSchema = z.object({
  initial_law_articles: z.array(ArticleOutSchema).min(1),
  final_law_articles: z.array(ArticleOutSchema).min(1),
  normalize_before_diff: z.boolean(),
})

export const AttributeCommentsPayloadSchema = z.object({
  items: z.array(z.object({ item_index: z.number().int().nonnegative() })).min(1).max(30),
  model: z.string().optional(),
})
