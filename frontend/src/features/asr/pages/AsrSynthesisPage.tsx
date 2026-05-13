import { Link } from 'react-router-dom'
import { type ReactNode, useEffect, useState } from 'react'
import { ConsultationReportPreviewTable } from '../../field23/components/ConsultationReportPreviewTable'
import type { ConsultationReportArticleSection } from '../../field23/types'
import { initialField23ReportDraft, type Field23ReportDraft, type Field23ReportPreviewCells } from '../../field23/state/reducer'
import type { AnalyzeField4Response } from '../../field4/types'
import type { AnalyzeField29Response } from '../../field29/types'
import type { AnalyzeField30Response } from '../../field30/types'
import { Field4ResultTable } from '../../field4/components/Field4ResultTable'
import { Field29ResultTable } from '../../field29/components/Field29ResultTable'
import { Field30ResultTable } from '../../field30/components/Field30ResultTable'
import { field4PersistEventName, readField4HomeMeta } from '../../field4/state/persist'
import { field29PersistEventName, readField29HomeMeta } from '../../field29/state/persist'
import { field30PersistEventName, readField30HomeMeta } from '../../field30/state/persist'
import { parseSynthesisText } from '../../field6/utils'

const FIELD6_STORAGE_KEY = 'nomothetis-field6-session-v1'
const FIELD7_STORAGE_KEY = 'nomothetis-field7-session-v1'
const FIELD9_STORAGE_KEY = 'nomothetis-field9-session-v1'
const FIELD23_STORAGE_KEY = 'nomothetis-field23-session-v1'

const FIELD6_PERSIST_EVENT = 'field6-persist-changed'
const FIELD7_PERSIST_EVENT = 'field7-persist-changed'
const FIELD9_PERSIST_EVENT = 'field9-persist-changed'
const FIELD23_PERSIST_EVENT = 'field23-persist-changed'

const ALL_SDGS = [
  { id: 1, title: 'Μηδενική Φτώχεια', color: '#E5243B' },
  { id: 2, title: 'Μηδενική Πείνα', color: '#DDA63A' },
  { id: 3, title: 'Καλή Υγεία και Ευημερία', color: '#4C9F38' },
  { id: 4, title: 'Ποιοτική Εκπαίδευση', color: '#C5192D' },
  { id: 5, title: 'Ισότητα των Φύλων', color: '#FF3A21' },
  { id: 6, title: 'Καθαρό Νερό και Αποχέτευση', color: '#26BDE2' },
  { id: 7, title: 'Φθηνή και Καθαρή Ενέργεια', color: '#FCC30B' },
  { id: 8, title: 'Αξιοπρεπής Εργασία και Οικονομική Ανάπτυξη', color: '#A21942' },
  { id: 9, title: 'Βιομηχανία, Καινοτομία και Υποδομές', color: '#FD6925' },
  { id: 10, title: 'Λιγότερες Ανισότητες', color: '#DD1367' },
  { id: 11, title: 'Βιώσιμες Πόλεις και Κοινότητες', color: '#FD9D24' },
  { id: 12, title: 'Υπεύθυνη Κατανάλωση και Παραγωγή', color: '#BF8B2E' },
  { id: 13, title: 'Δράση για το Κλίμα', color: '#3F7E44' },
  { id: 14, title: 'Ζωή στο Νερό', color: '#0A97D9' },
  { id: 15, title: 'Ζωή στη Στεριά', color: '#56C02B' },
  { id: 16, title: 'Ειρήνη, Δικαιοσύνη και Ισχυροί Θεσμοί', color: '#00689D' },
  { id: 17, title: 'Συνεργασία για τους Στόχους', color: '#19486A' },
] as const

function readJson(key: string): unknown {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

interface Field4Data {
  result: AnalyzeField4Response
}

function readField4(): Field4Data | null {
  const result = readField4HomeMeta().result
  return result ? { result } : null
}

interface Field6Data {
  synthesisText: string
}

function readField6(): Field6Data | null {
  const data = readJson(FIELD6_STORAGE_KEY) as { synthesisText?: unknown } | null
  if (!data || typeof data !== 'object') return null
  const synthesisText = typeof data.synthesisText === 'string' ? data.synthesisText : ''
  if (!synthesisText.trim()) return null
  return { synthesisText }
}

interface Field7Match {
  sdg_id: number
  sdg_title?: string
}

interface Field7Data {
  acceptedIds: Set<number>
}

function readField7(): Field7Data | null {
  const data = readJson(FIELD7_STORAGE_KEY) as
    | { matches?: unknown; decisions?: unknown }
    | null
  if (!data || typeof data !== 'object') return null
  const matches = Array.isArray(data.matches) ? (data.matches as Field7Match[]) : []
  const decisions =
    data.decisions && typeof data.decisions === 'object'
      ? (data.decisions as Record<string, string>)
      : {}
  const accepted = matches.filter((m) => decisions[String(m.sdg_id)] === 'accepted')
  if (accepted.length === 0) return null
  return { acceptedIds: new Set(accepted.map((m) => m.sdg_id)) }
}

interface Field9YearValue {
  year: number
  value: number | null
}

interface Field9Indicator {
  dataset_id: string
  indicator_name: string
  values: Field9YearValue[]
}

interface Field9Data {
  indicators: Field9Indicator[]
  targetValues: Record<string, string>
  fiveYearRange: number[]
  referenceYear: number | null
}

function readField9(): Field9Data | null {
  const data = readJson(FIELD9_STORAGE_KEY) as
    | {
        indicators?: unknown
        targetValues?: unknown
        fiveYearRange?: unknown
        referenceYear?: unknown
      }
    | null
  if (!data || typeof data !== 'object') return null
  const indicators = Array.isArray(data.indicators)
    ? (data.indicators as Field9Indicator[])
    : []
  if (indicators.length === 0) return null
  const targetValues =
    data.targetValues && typeof data.targetValues === 'object'
      ? (data.targetValues as Record<string, string>)
      : {}
  const fiveYearRange = Array.isArray(data.fiveYearRange)
    ? (data.fiveYearRange as number[])
    : []
  const referenceYear =
    typeof data.referenceYear === 'number' ? data.referenceYear : null
  return { indicators, targetValues, fiveYearRange, referenceYear }
}

interface Field23Data {
  previewText: string
  articles_section: ConsultationReportArticleSection[]
  participantsTotal: number
  previewCells: Field23ReportPreviewCells
}

function reviveField23PreviewCells(raw: unknown): Field23ReportPreviewCells {
  const base: Field23ReportPreviewCells = { participants: null, adopted: null, not_adopted: null }
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  return {
    participants: typeof o.participants === 'string' ? o.participants : null,
    adopted: typeof o.adopted === 'string' ? o.adopted : null,
    not_adopted: typeof o.not_adopted === 'string' ? o.not_adopted : null,
  }
}

function reviveField23Articles(raw: unknown): ConsultationReportArticleSection[] {
  if (!Array.isArray(raw)) return []
  const out: ConsultationReportArticleSection[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    out.push({
      article_number:
        typeof r.article_number === 'string' ? r.article_number : String(r.article_number ?? ''),
      article_title: typeof r.article_title === 'string' ? r.article_title : '',
      comment_count: typeof r.comment_count === 'number' ? r.comment_count : 0,
      adopted_count: typeof r.adopted_count === 'number' ? r.adopted_count : 0,
      not_adopted_count: typeof r.not_adopted_count === 'number' ? r.not_adopted_count : 0,
      adopted_summary: typeof r.adopted_summary === 'string' ? r.adopted_summary : '',
      not_adopted_summary: typeof r.not_adopted_summary === 'string' ? r.not_adopted_summary : '',
    })
  }
  return out
}

function readField23(): Field23Data | null {
  const data = readJson(FIELD23_STORAGE_KEY) as
    | {
        reportDraft?: {
          final_preview_text?: unknown
          articles_section?: unknown
          totals?: { participants_total?: unknown }
          previewCells?: unknown
        } | null
      }
    | null
  if (!data || typeof data !== 'object') return null
  const draft = data.reportDraft && typeof data.reportDraft === 'object' ? data.reportDraft : null
  const previewText =
    draft && typeof draft.final_preview_text === 'string' ? draft.final_preview_text : ''
  const articles_section = reviveField23Articles(draft?.articles_section)
  const participantsTotal =
    draft?.totals &&
    typeof draft.totals === 'object' &&
    typeof draft.totals.participants_total === 'number'
      ? draft.totals.participants_total
      : 0
  if (!previewText.trim() && articles_section.length === 0) return null
  const previewCells = reviveField23PreviewCells(draft?.previewCells)
  return { previewText, articles_section, participantsTotal, previewCells }
}

interface Field29Data {
  result: AnalyzeField29Response
}

function readField29(): Field29Data | null {
  const result = readField29HomeMeta().result
  return result ? { result } : null
}

interface Field30Data {
  result: AnalyzeField30Response
}

function readField30(): Field30Data | null {
  const result = readField30HomeMeta().result
  return result ? { result } : null
}

function EmptySection() {
  return <p className="asr-section__empty">Δεν έχει ολοκληρωθεί ακόμα</p>
}

function Field4Section({ data }: { data: Field4Data }) {
  const { result } = data
  return (
    <div className="asr-section__body">
      <Field4ResultTable answer={result.field_4_answer} />
    </div>
  )
}

function Field6Section({ data }: { data: Field6Data }) {
  const parts = parseSynthesisText(data.synthesisText)
  return (
    <div className="asr-section__body">
      <table className="field6-synthesis-table">
        <tbody>
          <tr>
            <td className="field6-synthesis-table__label">
              i) σε άλλη/ες χώρα/ες της Ε.Ε. ή του ΟΟΣΑ:
            </td>
            <td>
              <pre className="asr-section__pre">{parts.i || '—'}</pre>
            </td>
          </tr>
          <tr>
            <td className="field6-synthesis-table__label">ii) σε όργανα της Ε.Ε.:</td>
            <td>
              <pre className="asr-section__pre">{parts.ii || '—'}</pre>
            </td>
          </tr>
          <tr>
            <td className="field6-synthesis-table__label">iii) σε διεθνείς οργανισμούς:</td>
            <td>
              <pre className="asr-section__pre">{parts.iii || '—'}</pre>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Field7Section({ data }: { data: Field7Data }) {
  return (
    <div className="asr-section__body">
      <div className="field7-template">
        <h3 className="field7-template__heading">
          7. Συμβατότητα με τους Στόχους Βιώσιμης Ανάπτυξης (SDGs)
        </h3>
        <div className="field7-sdg-grid" aria-label="SDG συμβατότητα">
          {ALL_SDGS.map(({ id, title, color }) => {
            const isAccepted = data.acceptedIds.has(id)
            return (
              <div
                key={id}
                className={`field7-sdg-grid__item ${isAccepted ? 'field7-sdg-grid__item--checked' : ''}`}
              >
                <span className="field7-sdg-grid__checkbox" aria-hidden="true">
                  {isAccepted ? '☑' : '□'}
                </span>
                <div className="field7-sdg-grid__badge" style={{ backgroundColor: color }}>
                  <span className="field7-sdg-grid__number">{id}</span>
                  <span className="field7-sdg-grid__title">{title}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Field9Section({ data }: { data: Field9Data }) {
  return (
    <div className="asr-section__body">
      <div className="table-wrapper">
        {(data.referenceYear != null || data.fiveYearRange.length > 0) && (
          <p className="table-meta">
            {data.referenceYear != null && (
              <>
                Έτος αναφοράς: <strong>{data.referenceYear}</strong>
              </>
            )}
            {data.referenceYear != null && data.fiveYearRange.length > 0 && ' | '}
            {data.fiveYearRange.length > 0 && (
              <>
                Εύρος 5ετίας: <strong>{data.fiveYearRange.join(', ')}</strong>
              </>
            )}
          </p>
        )}
        <table className="data-table">
          <thead>
            <tr>
              <th>Δείκτης</th>
              {data.fiveYearRange.map((y) => (
                <th key={y}>{y}</th>
              ))}
              <th>Πρόσφατα</th>
              <th>Στόχος 3ετίας</th>
            </tr>
          </thead>
          <tbody>
            {data.indicators.map((ind) => (
              <tr key={ind.dataset_id}>
                <td>{ind.indicator_name}</td>
                {data.fiveYearRange.map((y) => {
                  const entry = ind.values.find((v) => v.year === y)
                  return (
                    <td key={y}>
                      {entry == null || entry.value == null ? '—' : `${entry.value}%`}
                    </td>
                  )
                })}
                <td>
                  {(() => {
                    const entry = ind.values.find((v) => v.year === data.referenceYear)
                    return entry == null || entry.value == null ? '—' : `${entry.value}%`
                  })()}
                </td>
                <td>{data.targetValues[ind.dataset_id] ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Field23Section({ data }: { data: Field23Data }) {
  if (data.articles_section.length > 0) {
    const draft: Field23ReportDraft = {
      ...initialField23ReportDraft,
      totals: {
        ...initialField23ReportDraft.totals,
        participants_total: data.participantsTotal,
      },
      articles_section: data.articles_section,
      final_preview_text: data.previewText,
      previewCells: data.previewCells,
    }
    return (
      <div className="asr-section__body">
        <ConsultationReportPreviewTable draft={draft} readOnly />
      </div>
    )
  }
  return (
    <div className="asr-section__body">
      <pre className="asr-section__pre asr-section__pre--block">{data.previewText}</pre>
    </div>
  )
}

function Field29Section({ data }: { data: Field29Data }) {
  const { result } = data
  const totalArticles = result.total_articles ?? result.articles_count ?? 0
  return (
    <div className="asr-section__body">
      <div className="field29-result__meta">
        <span>{result.filename}</span>
        <span>{totalArticles} άρθρα</span>
        <span>{result.field_29_articles_count} σχετικά με το Πεδίο 29</span>
      </div>
      <Field29ResultTable
        rows={result.rows}
        legacyRows={result.field_29_rows}
        fallbackText={result.field_29_answer}
      />
    </div>
  )
}

function Field30Section({ data }: { data: Field30Data }) {
  const { result } = data
  return (
    <div className="asr-section__body">
      <div className="field29-result__meta">
        <span>{result.filename}</span>
        <span>{result.articles_count} άρθρα</span>
        <span>{result.field_30_articles_count} σχετικά με το Πεδίο 30</span>
      </div>
      <Field30ResultTable rows={result.field_30_rows} fallbackText={result.field_30_answer} />
    </div>
  )
}

/** Ίδια λογική ομαδοποίησης με την αρχική (ενότητες Α–Η και πεδία). */
type FieldSlot = 'field4' | 'field6' | 'field7' | 'field9' | 'field23' | 'field29' | 'field30'

type AsrChapterField = { slot: FieldSlot; label: string; description: string }

const ASR_CHAPTERS: Array<{ code: string; title: string; fields: AsrChapterField[] }> = [
  {
    code: 'A',
    title: 'ΑΙΤΙΟΛΟΓΙΚΗ ΕΚΘΕΣΗ',
    fields: [
      { slot: 'field4', label: 'Πεδίο 4', description: 'Νομοθετικές αναφορές.' },
      { slot: 'field6', label: 'Πεδίο 6', description: 'Συναφείς Πρακτικές.' },
      {
        slot: 'field7',
        label: 'Πεδίο 7',
        description: 'Αντιστοίχιση του νόμου με τους 17 Στόχους Βιώσιμης Ανάπτυξης (SDGs) του ΟΗΕ.',
      },
      { slot: 'field9', label: 'Πεδίο 9', description: 'Ειδικότεροι στόχοι ανάλογα με τον τομέα νομοθέτησης.' },
    ],
  },
  {
    code: 'B',
    title: 'ΕΚΘΕΣΗ ΤΟΥ ΑΡΘΡΟΥ 75 ΠΑΡ. 1 & 2 ΤΟΥ ΣΥΝΤΑΓΜΑΤΟΣ',
    fields: [],
  },
  {
    code: 'Γ',
    title: 'ΕΚΘΕΣΗ ΤΟΥ ΑΡΘΡΟΥ 75 ΠΑΡ. 3 ΤΟΥ ΣΥΝΤΑΓΜΑΤΟΣ',
    fields: [],
  },
  {
    code: 'Δ',
    title: 'ΕΚΘΕΣΗ ΓΕΝΙΚΩΝ ΣΥΝΕΠΕΙΩΝ',
    fields: [],
  },
  {
    code: 'Ε',
    title: 'ΕΚΘΕΣΗ ΔΙΑΒΟΥΛΕΥΣΗΣ',
    fields: [
      {
        slot: 'field23',
        label: 'Πεδίο 23',
        description: 'Σχόλια στο πλαίσιο της διαβούλευσης μέσω της ηλεκτρονικής πλατφόρμας www.opengov.gr.',
      },
    ],
  },
  {
    code: 'ΣΤ',
    title: 'ΕΚΘΕΣΗ ΝΟΜΙΜΟΤΗΤΑΣ',
    fields: [],
  },
  {
    code: 'Ζ',
    title: 'ΠΙΝΑΚΑΣ ΤΡΟΠΟΠΟΙΟΥΜΕΝΩΝ Ή ΚΑΤΑΡΓΟΥΜΕΝΩΝ ΔΙΑΤΑΞΕΩΝ',
    fields: [
      {
        slot: 'field29',
        label: 'Πεδίο 29',
        description: 'Τροποποίηση - Αντικατάσταση - Συπλήρωση Διατάξεων',
      },
      { slot: 'field30', label: 'Πεδίο 30', description: 'Κατάργηση Διατάξεων' },
    ],
  },
  {
    code: 'Η',
    title: 'ΕΚΘΕΣΗ ΕΦΑΡΜΟΓΗΣ ΤΗΣ ΡΥΘΜΙΣΗΣ',
    fields: [],
  },
]

function asrFieldHeadingText(description: string): string {
  return description.replace(/\.\s*$/, '')
}

function FieldSlotContent({
  slot,
  field4,
  field6,
  field7,
  field9,
  field23,
  field29,
  field30,
}: {
  slot: FieldSlot
  field4: Field4Data | null
  field6: Field6Data | null
  field7: Field7Data | null
  field9: Field9Data | null
  field23: Field23Data | null
  field29: Field29Data | null
  field30: Field30Data | null
}): ReactNode {
  switch (slot) {
    case 'field4':
      return field4 ? <Field4Section data={field4} /> : <EmptySection />
    case 'field6':
      return field6 ? <Field6Section data={field6} /> : <EmptySection />
    case 'field7':
      return field7 ? <Field7Section data={field7} /> : <EmptySection />
    case 'field9':
      return field9 ? <Field9Section data={field9} /> : <EmptySection />
    case 'field23':
      return field23 ? <Field23Section data={field23} /> : <EmptySection />
    case 'field29':
      return field29 ? <Field29Section data={field29} /> : <EmptySection />
    case 'field30':
      return field30 ? <Field30Section data={field30} /> : <EmptySection />
  }
}

export function AsrSynthesisPage() {
  const [field4, setField4] = useState<Field4Data | null>(() => readField4())
  const [field6, setField6] = useState<Field6Data | null>(() => readField6())
  const [field7, setField7] = useState<Field7Data | null>(() => readField7())
  const [field9, setField9] = useState<Field9Data | null>(() => readField9())
  const [field23, setField23] = useState<Field23Data | null>(() => readField23())
  const [field29, setField29] = useState<Field29Data | null>(() => readField29())
  const [field30, setField30] = useState<Field30Data | null>(() => readField30())

  useEffect(() => {
    const refresh4 = () => setField4(readField4())
    const refresh6 = () => setField6(readField6())
    const refresh7 = () => setField7(readField7())
    const refresh9 = () => setField9(readField9())
    const refresh23 = () => setField23(readField23())
    const refresh29 = () => setField29(readField29())
    const refresh30 = () => setField30(readField30())

    window.addEventListener(field4PersistEventName(), refresh4)
    window.addEventListener(FIELD6_PERSIST_EVENT, refresh6)
    window.addEventListener(FIELD7_PERSIST_EVENT, refresh7)
    window.addEventListener(FIELD9_PERSIST_EVENT, refresh9)
    window.addEventListener(FIELD23_PERSIST_EVENT, refresh23)
    window.addEventListener(field29PersistEventName(), refresh29)
    window.addEventListener(field30PersistEventName(), refresh30)
    window.addEventListener('storage', refresh4)
    window.addEventListener('storage', refresh6)
    window.addEventListener('storage', refresh7)
    window.addEventListener('storage', refresh9)
    window.addEventListener('storage', refresh23)
    window.addEventListener('storage', refresh29)
    window.addEventListener('storage', refresh30)

    return () => {
      window.removeEventListener(field4PersistEventName(), refresh4)
      window.removeEventListener(FIELD6_PERSIST_EVENT, refresh6)
      window.removeEventListener(FIELD7_PERSIST_EVENT, refresh7)
      window.removeEventListener(FIELD9_PERSIST_EVENT, refresh9)
      window.removeEventListener(FIELD23_PERSIST_EVENT, refresh23)
      window.removeEventListener(field29PersistEventName(), refresh29)
      window.removeEventListener(field30PersistEventName(), refresh30)
      window.removeEventListener('storage', refresh4)
      window.removeEventListener('storage', refresh6)
      window.removeEventListener('storage', refresh7)
      window.removeEventListener('storage', refresh9)
      window.removeEventListener('storage', refresh23)
      window.removeEventListener('storage', refresh29)
      window.removeEventListener('storage', refresh30)
    }
  }, [])

  return (
    <section className="asr-synthesis-page page-shell">
      <header className="page-hero">
        <p className="page-hero__eyebrow">Ανάλυση Συνεπειών Ρύθμισης</p>
        <h1 className="feature-page__title">Σύνθεση ΑΣΡ</h1>
        <p className="page-hero__subtitle">
          Συγκεντρωτική προβολή των ολοκληρωμένων πεδίων από την αιτιολογική έκθεση και την έκθεση διαβούλευσης.
        </p>
      </header>

      <div className="asr-chapters" aria-label="Ενότητες σύνθεσης ΑΣΡ">
        {ASR_CHAPTERS.map((chapter) => (
          <article key={chapter.code} className="asr-chapter">
            <header className="asr-chapter__header">
              <h2 className="asr-chapter__title">
                <span className="asr-chapter__code">{chapter.code}.</span>
                <span className="asr-chapter__title-text">{chapter.title}</span>
              </h2>
            </header>
            {chapter.fields.length === 0 ? (
              <p className="asr-chapter__empty">
                Δεν υπάρχει ολοκληρωμένο περιεχόμενο για αυτή την ενότητα.
              </p>
            ) : (
              <div className="asr-chapter__fields">
                {chapter.fields.map((f) => {
                  const hideHeader =
                    (f.slot === 'field23' && field23 != null) ||
                    (f.slot === 'field4' && field4 != null)
                  return (
                    <section key={f.slot} className="asr-field-block" aria-label={f.label}>
                      {!hideHeader ? (
                        <header className="asr-field-block__header">
                          <h3 className="asr-field-block__title">
                            <span className="asr-field-block__code">{f.label}.</span>
                            <span className="asr-field-block__title-text">
                              {asrFieldHeadingText(f.description)}
                            </span>
                          </h3>
                        </header>
                      ) : null}
                      <FieldSlotContent
                        slot={f.slot}
                        field4={field4}
                        field6={field6}
                        field7={field7}
                        field9={field9}
                        field23={field23}
                        field29={field29}
                        field30={field30}
                      />
                    </section>
                  )
                })}
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="asr-synthesis-page__actions">
        <Link to="/" className="btn btn-secondary">
          ← Επιστροφή στην αρχική
        </Link>
      </div>
    </section>
  )
}
