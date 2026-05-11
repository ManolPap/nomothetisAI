import { Link } from 'react-router-dom'
import { type ReactNode, useEffect, useState } from 'react'
import { ConsultationReportPreviewTable } from '../../field23/components/ConsultationReportPreviewTable'
import type { ConsultationReportArticleSection } from '../../field23/types'

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

interface SynthesisParts {
  i: string
  ii: string
  iii: string
}

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

function stripLeadingHeader(part: string): string {
  return part.replace(/^(?:Χώρες ΕΕ\/ΟΟΣΑ|Όργανα ΕΕ|Διεθνείς Οργανισμοί)[^\n]*\n+/, '').trimStart()
}

function parseSynthesisText(text: string): SynthesisParts {
  const normalized = text.replace(/\r\n/g, '\n')
  const iMatch = normalized.match(/i\)\s*([\s\S]*?)(?=\nii\)|$)/)
  const iiMatch = normalized.match(/ii\)\s*([\s\S]*?)(?=\niii\)|$)/)
  const iiiMatch = normalized.match(/iii\)\s*([\s\S]*?)$/)
  return {
    i: stripLeadingHeader(iMatch?.[1]?.trim() ?? ''),
    ii: stripLeadingHeader(iiMatch?.[1]?.trim() ?? ''),
    iii: stripLeadingHeader(iiiMatch?.[1]?.trim() ?? ''),
  }
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
  return { previewText, articles_section, participantsTotal }
}

function EmptySection() {
  return <p className="asr-section__empty">Δεν έχει ολοκληρωθεί ακόμα</p>
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
    return (
      <div className="asr-section__body">
        <ConsultationReportPreviewTable
          participantsTotal={data.participantsTotal}
          articles={data.articles_section}
        />
      </div>
    )
  }
  return (
    <div className="asr-section__body">
      <pre className="asr-section__pre asr-section__pre--block">{data.previewText}</pre>
    </div>
  )
}

export function AsrSynthesisPage() {
  const [field6, setField6] = useState<Field6Data | null>(() => readField6())
  const [field7, setField7] = useState<Field7Data | null>(() => readField7())
  const [field9, setField9] = useState<Field9Data | null>(() => readField9())
  const [field23, setField23] = useState<Field23Data | null>(() => readField23())

  useEffect(() => {
    const refresh6 = () => setField6(readField6())
    const refresh7 = () => setField7(readField7())
    const refresh9 = () => setField9(readField9())
    const refresh23 = () => setField23(readField23())

    window.addEventListener(FIELD6_PERSIST_EVENT, refresh6)
    window.addEventListener(FIELD7_PERSIST_EVENT, refresh7)
    window.addEventListener(FIELD9_PERSIST_EVENT, refresh9)
    window.addEventListener(FIELD23_PERSIST_EVENT, refresh23)
    window.addEventListener('storage', refresh6)
    window.addEventListener('storage', refresh7)
    window.addEventListener('storage', refresh9)
    window.addEventListener('storage', refresh23)

    return () => {
      window.removeEventListener(FIELD6_PERSIST_EVENT, refresh6)
      window.removeEventListener(FIELD7_PERSIST_EVENT, refresh7)
      window.removeEventListener(FIELD9_PERSIST_EVENT, refresh9)
      window.removeEventListener(FIELD23_PERSIST_EVENT, refresh23)
      window.removeEventListener('storage', refresh6)
      window.removeEventListener('storage', refresh7)
      window.removeEventListener('storage', refresh9)
      window.removeEventListener('storage', refresh23)
    }
  }, [])

  const sections: Array<{
    code: string
    title: string
    content: ReactNode
  }> = [
    {
      code: 'Πεδίο 6',
      title: 'Συναφείς Πρακτικές',
      content: field6 ? <Field6Section data={field6} /> : <EmptySection />,
    },
    {
      code: 'Πεδίο 7',
      title: 'Συμβατότητα με τους Στόχους Βιώσιμης Ανάπτυξης (SDGs) του ΟΗΕ',
      content: field7 ? <Field7Section data={field7} /> : <EmptySection />,
    },
    {
      code: 'Πεδίο 9',
      title: 'Ειδικότεροι στόχοι ανάλογα με τον τομέα νομοθέτησης',
      content: field9 ? <Field9Section data={field9} /> : <EmptySection />,
    },
    {
      code: 'Πεδίο 23',
      title: 'Σχόλια στο πλαίσιο της διαβούλευσης (www.opengov.gr)',
      content: field23 ? <Field23Section data={field23} /> : <EmptySection />,
    },
  ]

  return (
    <section className="asr-synthesis-page page-shell">
      <header className="page-hero">
        <p className="page-hero__eyebrow">Ανάλυση Συνεπειών Ρύθμισης</p>
        <h1 className="feature-page__title">Σύνθεση ΑΣΡ</h1>
        <p className="page-hero__subtitle">
          Συγκεντρωτική προβολή των ολοκληρωμένων πεδίων από την αιτιολογική έκθεση και την έκθεση διαβούλευσης.
        </p>
      </header>

      <div className="asr-sections">
        {sections.map((section) => (
          <article key={section.code} className="asr-section">
            <header className="asr-section__header">
              <p className="asr-section__code">{section.code}</p>
              <h2 className="asr-section__title">{section.title}</h2>
            </header>
            {section.content}
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
