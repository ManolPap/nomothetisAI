import { Link } from 'react-router-dom'
import { type ReactNode, useEffect, useState } from 'react'
import { useLawFiles } from '../providers/LawFilesProvider'
import { FileUploader } from '../../shared/ui/FileUploader'
import type { AnalyzeField4Response } from '../../features/field4/types'
import type { AnalyzeField29Response } from '../../features/field29/types'
import type { AnalyzeField30Response } from '../../features/field30/types'
import { Field29ResultTable } from '../../features/field29/components/Field29ResultTable'
import { Field30ResultTable } from '../../features/field30/components/Field30ResultTable'
import {
  clearField23Persisted,
  field23PersistEventName,
  readField23HomeMeta,
} from '../../features/field23/state/persist'
import {
  clearField4Persisted,
  field4PersistEventName,
  readField4HomeMeta,
} from '../../features/field4/state/persist'
import {
  clearField6Persisted,
  field6PersistEventName,
  readField6HomeMeta,
} from '../../features/field6/state/persist'
import {
  clearField7Persisted,
  field7PersistEventName,
  readField7HomeMeta,
} from '../../features/field7/state/persist'
import {
  clearField9Persisted,
  field9PersistEventName,
  readField9HomeMeta,
} from '../../features/field9/state/persist'
import {
  clearField29Persisted,
  field29PersistEventName,
  readField29HomeMeta,
} from '../../features/field29/state/persist'
import {
  clearField30Persisted,
  field30PersistEventName,
  readField30HomeMeta,
} from '../../features/field30/state/persist'

function IconPlay({ className }: { className?: string }) {
  return (
    <svg className={className} width={18} height={18} viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M8 5v14l11-7L8 5z" />
    </svg>
  )
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 6L9 17l-5-5"
      />
    </svg>
  )
}

function WorkflowCardMainRow({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: ReactNode
}) {
  return (
    <div className="workflow-card__row">
      <p className="workflow-card__summary">
        <span className="workflow-card__field">{title}</span>
        <span className="workflow-card__colon">: </span>
        <span className="workflow-card__desc">{description}</span>
      </p>
      <div className="workflow-card__cta">{action}</div>
    </div>
  )
}

function Field4WorkflowResult({ result }: { result: AnalyzeField4Response }) {
  return (
    <section className="workflow-card-result" aria-label="Αποτέλεσμα Πεδίου 4">
      <div className="field4-result__meta">
        <span>{result.filename}</span>
        <span>{result.articles_count} άρθρα</span>
      </div>
      <pre className="field4-result__text">{result.field_4_answer}</pre>
    </section>
  )
}

function Field29WorkflowResult({ result }: { result: AnalyzeField29Response }) {
  return (
    <section className="workflow-card-result" aria-label="Αποτέλεσμα Πεδίου 29">
      <div className="field29-result__meta">
        <span>{result.filename}</span>
        <span>{result.articles_count} άρθρα</span>
        <span>{result.field_29_articles_count} σχετικά με το Πεδίο 29</span>
      </div>
      <Field29ResultTable value={result.field_29_answer} rows={result.field_29_rows} />
    </section>
  )
}

function Field30WorkflowResult({ result }: { result: AnalyzeField30Response }) {
  return (
    <section className="workflow-card-result" aria-label="Αποτέλεσμα Πεδίου 30">
      <div className="field29-result__meta">
        <span>{result.filename}</span>
        <span>{result.articles_count} άρθρα</span>
        <span>{result.field_30_articles_count} σχετικά με το Πεδίο 30</span>
      </div>
      <Field30ResultTable rows={result.field_30_rows} fallbackText={result.field_30_answer} />
    </section>
  )
}

export function HomePage() {
  const { initialLawFile, finalLawFile, setInitialLawFile, setFinalLawFile } = useLawFiles()
  const canProceed = Boolean(initialLawFile && finalLawFile)
  const [field4Card, setField4Card] = useState(() => readField4HomeMeta())
  const [field23Card, setField23Card] = useState(() => readField23HomeMeta())
  const [field6Card, setField6Card] = useState(() => readField6HomeMeta())
  const [field7Card, setField7Card] = useState(() => readField7HomeMeta())
  const [field9Card, setField9Card] = useState(() => readField9HomeMeta())
  const [field29Card, setField29Card] = useState(() => readField29HomeMeta())
  const [field30Card, setField30Card] = useState(() => readField30HomeMeta())

  useEffect(() => {
    const refresh4 = () => setField4Card(readField4HomeMeta())
    const refresh23 = () => setField23Card(readField23HomeMeta())
    const refresh6 = () => setField6Card(readField6HomeMeta())
    const refresh7 = () => setField7Card(readField7HomeMeta())
    const refresh9 = () => setField9Card(readField9HomeMeta())
    const refresh29 = () => setField29Card(readField29HomeMeta())
    const refresh30 = () => setField30Card(readField30HomeMeta())

    window.addEventListener(field4PersistEventName(), refresh4)
    window.addEventListener('storage', refresh4)
    window.addEventListener(field23PersistEventName(), refresh23)
    window.addEventListener('storage', refresh23)
    window.addEventListener(field6PersistEventName(), refresh6)
    window.addEventListener('storage', refresh6)
    window.addEventListener(field7PersistEventName(), refresh7)
    window.addEventListener('storage', refresh7)
    window.addEventListener(field9PersistEventName(), refresh9)
    window.addEventListener('storage', refresh9)
    window.addEventListener(field29PersistEventName(), refresh29)
    window.addEventListener('storage', refresh29)
    window.addEventListener(field30PersistEventName(), refresh30)
    window.addEventListener('storage', refresh30)

    return () => {
      window.removeEventListener(field4PersistEventName(), refresh4)
      window.removeEventListener('storage', refresh4)
      window.removeEventListener(field23PersistEventName(), refresh23)
      window.removeEventListener('storage', refresh23)
      window.removeEventListener(field6PersistEventName(), refresh6)
      window.removeEventListener('storage', refresh6)
      window.removeEventListener(field7PersistEventName(), refresh7)
      window.removeEventListener('storage', refresh7)
      window.removeEventListener(field9PersistEventName(), refresh9)
      window.removeEventListener('storage', refresh9)
      window.removeEventListener(field29PersistEventName(), refresh29)
      window.removeEventListener('storage', refresh29)
      window.removeEventListener(field30PersistEventName(), refresh30)
      window.removeEventListener('storage', refresh30)
    }
  }, [])

  const canEnterField23 = canProceed || field23Card.hasSavedSession
  const hasInputFiles = Boolean(initialLawFile || finalLawFile)

  function clearInputFiles() {
    setInitialLawFile(null)
    setFinalLawFile(null)
  }

  const workflows = [
    { to: '/field4', title: 'Πεδίο 4', description: 'Νομοθετικές αναφορές.', requiresBothPdfs: false, requiresFinalPdf: true },
    { to: '/field6', title: 'Πεδίο 6', description: 'Συναφείς Πρακτικές.', requiresBothPdfs: false, requiresFinalPdf: true },
    { to: '/field7', title: 'Πεδίο 7', description: 'Αντιστοίχιση του νόμου με τους 17 Στόχους Βιώσιμης Ανάπτυξης (SDGs) του ΟΗΕ.', requiresBothPdfs: false, requiresFinalPdf: true },
    { to: '/field9', title: 'Πεδίο 9', description: 'Ειδικότεροι στόχοι ανάλογα με τον τομέα νομοθέτησης.', requiresBothPdfs: true, requiresFinalPdf: false },
    { to: '/field23', title: 'Πεδίο 23', description: 'Σχόλια στο πλαίσιο της διαβούλευσης μέσω της ηλεκτρονικής πλατφόρμας www.opengov.gr.', requiresBothPdfs: true, requiresFinalPdf: false },
    { to: '/field29', title: 'Πεδίο 29', description: 'Τροποποίηση - Αντικατάσταση - Συπλήρωση Διατάξεων', requiresBothPdfs: false, requiresFinalPdf: true },
    { to: '/field30', title: 'Πεδίο 30', description: 'Κατάργηση Διατάξεων', requiresBothPdfs: false, requiresFinalPdf: true },
  ] as const
  type Workflow = typeof workflows[number]
  type WorkflowRoute = Workflow['to']
  const workflowByRoute: Record<WorkflowRoute, Workflow> = workflows.reduce((acc, workflow) => {
    acc[workflow.to] = workflow
    return acc
  }, {} as Record<WorkflowRoute, Workflow>)

  function renderFinalPdfPersistedWorkflowCard(
    workflow: Workflow,
    card: { flowCompleted: boolean; hasSavedSession: boolean },
    clearPersisted: () => void,
    modifierClass: string,
    resultContent?: ReactNode,
  ) {
    const { to, title, description, requiresFinalPdf } = workflow
    const hasFinalPdf = Boolean(finalLawFile)
    const canEnter = !requiresFinalPdf || hasFinalPdf || card.hasSavedSession

    return (
      <article key={to} className={`workflow-card workflow-card--persisted ${modifierClass}`}>
        <WorkflowCardMainRow
          title={title}
          description={description}
          action={
            card.flowCompleted ? (
              <Link
                className={`btn btn-workflow-done-icon${!canEnter ? ' btn-disabled' : ''}`}
                to={to}
                aria-label="Ολοκληρώθηκε — άνοιγμα ροής"
                title="Ολοκληρώθηκε"
                aria-disabled={!canEnter}
                onClick={(e) => { if (!canEnter) e.preventDefault() }}
              >
                <IconCheck />
              </Link>
            ) : (
              <Link
                className={`btn btn-primary btn-workflow-start${!canEnter ? ' btn-disabled' : ''}`}
                to={to}
                aria-label={card.hasSavedSession ? 'Συνέχεια ροής' : 'Εκκίνηση ροής'}
                title={card.hasSavedSession ? 'Συνέχεια ροής' : 'Εκκίνηση ροής'}
                aria-disabled={!canEnter}
                onClick={(e) => { if (!canEnter) e.preventDefault() }}
              >
                <IconPlay />
              </Link>
            )
          }
        />
        {card.flowCompleted && (
          <>
            <div className="workflow-card__footer-actions">
              <button
                type="button"
                className="btn btn-ghost workflow-card__reset"
                onClick={clearPersisted}
              >
                Επαναφορά ροής
              </button>
            </div>
            {resultContent && <div className="workflow-card__result">{resultContent}</div>}
          </>
        )}
      </article>
    )
  }

  const sections: Array<{ code: string; title: string; routes: WorkflowRoute[] }> = [
    { code: 'A', title: 'ΑΙΤΙΟΛΟΓΙΚΗ ΕΚΘΕΣΗ', routes: ['/field4', '/field6', '/field7', '/field9'] },
    { code: 'B', title: 'ΕΚΘΕΣΗ ΤΟΥ ΑΡΘΡΟΥ 75 ΠΑΡ. 1 & 2 ΤΟΥ ΣΥΝΤΑΓΜΑΤΟΣ', routes: [] },
    { code: 'Γ', title: 'ΕΚΘΕΣΗ ΤΟΥ ΑΡΘΡΟΥ 75 ΠΑΡ. 3 ΤΟΥ ΣΥΝΤΑΓΜΑΤΟΣ', routes: [] },
    { code: 'Δ', title: 'ΕΚΘΕΣΗ ΓΕΝΙΚΩΝ ΣΥΝΕΠΕΙΩΝ', routes: [] },
    { code: 'Ε', title: 'ΕΚΘΕΣΗ ΔΙΑΒΟΥΛΕΥΣΗΣ', routes: ['/field23'] },
    { code: 'ΣΤ', title: 'ΕΚΘΕΣΗ ΝΟΜΙΜΟΤΗΤΑΣ', routes: [] },
    { code: 'Ζ', title: 'ΠΙΝΑΚΑΣ ΤΡΟΠΟΠΟΙΟΥΜΕΝΩΝ Ή ΚΑΤΑΡΓΟΥΜΕΝΩΝ ΔΙΑΤΑΞΕΩΝ', routes: ['/field29', '/field30'] },
    { code: 'Η', title: 'ΕΚΘΕΣΗ ΕΦΑΡΜΟΓΗΣ ΤΗΣ ΡΥΘΜΙΣΗΣ', routes: [] },
  ]

  function renderWorkflowCard(workflow: typeof workflows[number]) {
    const { to, title, description, requiresBothPdfs, requiresFinalPdf } = workflow
    const needsPdfs = requiresBothPdfs
    const needsFinalPdf = requiresFinalPdf

    if (to === '/field4') {
      return renderFinalPdfPersistedWorkflowCard(
        workflow,
        field4Card,
        clearField4Persisted,
        'workflow-card--field4',
        field4Card.result ? <Field4WorkflowResult result={field4Card.result} /> : undefined,
      )
    }

    if (to === '/field6') {
      const hasFinalPdf = Boolean(finalLawFile)
      const startDisabled = needsFinalPdf && !hasFinalPdf
      const canEnter = hasFinalPdf || field6Card.hasSavedSession
      return (
        <article key={to} className="workflow-card workflow-card--field6">
          <WorkflowCardMainRow
            title={title}
            description={description}
            action={
              field6Card.flowCompleted ? (
                <Link
                  className={`btn btn-workflow-done-icon${!canEnter ? ' btn-disabled' : ''}`}
                  to={to}
                  aria-label="Ολοκληρώθηκε — άνοιγμα ροής"
                  title="Ολοκληρώθηκε"
                  aria-disabled={!canEnter}
                  onClick={(e) => { if (!canEnter) e.preventDefault() }}
                >
                  <IconCheck />
                </Link>
              ) : (
                <Link
                  className={`btn btn-primary btn-workflow-start${startDisabled ? ' btn-disabled' : ''}`}
                  to={to}
                  aria-label={field6Card.hasSavedSession ? 'Συνέχιση ροής' : 'Εκκίνηση ροής'}
                  title={field6Card.hasSavedSession ? 'Συνέχιση ροής' : 'Εκκίνηση ροής'}
                  aria-disabled={startDisabled}
                  onClick={(e) => { if (startDisabled) e.preventDefault() }}
                >
                  <IconPlay />
                </Link>
              )
            }
          />
          {field6Card.flowCompleted && (
            <div className="workflow-card__footer-actions">
              <button
                type="button"
                className="btn btn-ghost workflow-card__reset"
                onClick={() => clearField6Persisted()}
              >
                Επαναφορά ροής
              </button>
            </div>
          )}
        </article>
      )
    }

    if (to === '/field7') {
      const hasFinalPdf = Boolean(finalLawFile)
      const startDisabled = needsFinalPdf && !hasFinalPdf
      const canEnter = hasFinalPdf || field7Card.hasSavedSession
      return (
        <article key={to} className="workflow-card workflow-card--field7">
          <WorkflowCardMainRow
            title={title}
            description={description}
            action={
              field7Card.flowCompleted ? (
                <Link
                  className={`btn btn-workflow-done-icon${!canEnter ? ' btn-disabled' : ''}`}
                  to={to}
                  aria-label="Ολοκληρώθηκε — άνοιγμα ροής"
                  title="Ολοκληρώθηκε"
                  aria-disabled={!canEnter}
                  onClick={(e) => { if (!canEnter) e.preventDefault() }}
                >
                  <IconCheck />
                </Link>
              ) : (
                <Link
                  className={`btn btn-primary btn-workflow-start${startDisabled ? ' btn-disabled' : ''}`}
                  to={to}
                  aria-label={field7Card.hasSavedSession ? 'Συνέχιση ροής' : 'Εκκίνηση ροής'}
                  title={field7Card.hasSavedSession ? 'Συνέχιση ροής' : 'Εκκίνηση ροής'}
                  aria-disabled={startDisabled}
                  onClick={(e) => { if (startDisabled) e.preventDefault() }}
                >
                  <IconPlay />
                </Link>
              )
            }
          />
          {field7Card.flowCompleted && (
            <div className="workflow-card__footer-actions">
              <button
                type="button"
                className="btn btn-ghost workflow-card__reset"
                onClick={() => clearField7Persisted()}
              >
                Επαναφορά ροής
              </button>
            </div>
          )}
        </article>
      )
    }

    if (to === '/field9') {
      const canEnter = canProceed || field9Card.hasSavedSession
      return (
        <article key={to} className="workflow-card workflow-card--field9">
          <WorkflowCardMainRow
            title={title}
            description={description}
            action={
              field9Card.flowCompleted ? (
                <Link
                  className={`btn btn-workflow-done-icon${!canEnter ? ' btn-disabled' : ''}`}
                  to={to}
                  aria-label="Ολοκληρώθηκε — άνοιγμα ροής"
                  title="Ολοκληρώθηκε"
                  aria-disabled={!canEnter}
                  onClick={(e) => { if (!canEnter) e.preventDefault() }}
                >
                  <IconCheck />
                </Link>
              ) : (
                <Link
                  className={`btn btn-primary btn-workflow-start${needsPdfs && !canProceed ? ' btn-disabled' : ''}`}
                  to={to}
                  aria-label={field9Card.hasSavedSession ? 'Συνέχιση ροής' : 'Εκκίνηση ροής'}
                  title={field9Card.hasSavedSession ? 'Συνέχιση ροής' : 'Εκκίνηση ροής'}
                  aria-disabled={needsPdfs && !canProceed}
                  onClick={(e) => { if (needsPdfs && !canProceed) e.preventDefault() }}
                >
                  <IconPlay />
                </Link>
              )
            }
          />
          {field9Card.flowCompleted && (
            <div className="workflow-card__footer-actions">
              <button
                type="button"
                className="btn btn-ghost workflow-card__reset"
                onClick={() => clearField9Persisted()}
              >
                Επαναφορά ροής
              </button>
            </div>
          )}
        </article>
      )
    }

    if (to === '/field23') {
      return (
        <article key={to} className="workflow-card workflow-card--field23">
          <WorkflowCardMainRow
            title={title}
            description={description}
            action={
              field23Card.flowCompleted ? (
                <Link
                  className={`btn btn-workflow-done-icon${!canEnterField23 ? ' btn-disabled' : ''}`}
                  to={to}
                  aria-label="Ολοκληρώθηκε — άνοιγμα ροής"
                  title="Ολοκληρώθηκε"
                  aria-disabled={!canEnterField23}
                  onClick={(e) => { if (!canEnterField23) e.preventDefault() }}
                >
                  <IconCheck />
                </Link>
              ) : (
                <Link
                  className={`btn btn-primary btn-workflow-start${!canEnterField23 ? ' btn-disabled' : ''}`}
                  to={to}
                  aria-label={field23Card.hasSavedSession ? 'Συνέχιση ροής' : 'Εκκίνηση ροής'}
                  title={field23Card.hasSavedSession ? 'Συνέχιση ροής' : 'Εκκίνηση ροής'}
                  aria-disabled={!canEnterField23}
                  onClick={(e) => { if (!canEnterField23) e.preventDefault() }}
                >
                  <IconPlay />
                </Link>
              )
            }
          />
          {field23Card.flowCompleted && (
            <div className="workflow-card__footer-actions">
              <button
                type="button"
                className="btn btn-ghost workflow-card__reset"
                onClick={() => clearField23Persisted()}
              >
                Επαναφορά ροής
              </button>
            </div>
          )}
        </article>
      )
    }

    if (to === '/field29') {
      return renderFinalPdfPersistedWorkflowCard(
        workflow,
        field29Card,
        clearField29Persisted,
        'workflow-card--field29',
        field29Card.result ? <Field29WorkflowResult result={field29Card.result} /> : undefined,
      )
    }

    if (to === '/field30') {
      return renderFinalPdfPersistedWorkflowCard(
        workflow,
        field30Card,
        clearField30Persisted,
        'workflow-card--field30',
        field30Card.result ? <Field30WorkflowResult result={field30Card.result} /> : undefined,
      )
    }

    const genericDisabled = (needsPdfs && !canProceed) || (needsFinalPdf && !finalLawFile)

    return (
      <article key={to} className="workflow-card">
        <WorkflowCardMainRow
          title={title}
          description={description}
          action={(
            <Link
              className={`btn btn-primary btn-workflow-start${genericDisabled ? ' btn-disabled' : ''}`}
              to={to}
              aria-label="Εκκίνηση ροής"
              title="Εκκίνηση ροής"
              aria-disabled={genericDisabled}
              onClick={(e) => { if (genericDisabled) e.preventDefault() }}
            >
              <IconPlay />
            </Link>
          )}
        />
      </article>
    )
  }

  return (
    <section className="home-page page-shell">
      <header className="page-hero">
        <p className="page-hero__eyebrow">Ελληνική Νομοθεσία και Ψηφιακή Υποστήριξη</p>
        <h1 className="feature-page__title">Ψηφιακός Βοηθός Ανάλυσης Συνεπειών Ρύθμισης</h1>
        <p className="home-page__subtitle">
          Ανεβάστε μία φορά το σχέδιο νόμου προς διαβούλευση και το σχέδιο νόμου για την αιτιολογική έκθεση. Στην συνέχεια, 
          εκκινήστε τις ροές και ο βοηθός θα σας καθοδηγήσει στην συμπλήρωση της αιτιολογικής έκθεσης.
        </p>
      </header>

      <div className="step-container">
        <div className="step-content">
          <div className="input-files-header">
            <h2 className="step-title">Επιλογή αρχείων εισόδου</h2>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={clearInputFiles}
              disabled={!hasInputFiles}
            >
              Καθαρισμός
            </button>
          </div>
          <div className="file-pair">
            <div className="file-pair__item">
              <h3>Σχέδιο νόμου προς διαβούλευση</h3>
              <FileUploader
                label="Επιλέξτε PDF σχέδιου νόμου προς διαβούλευση"
                onFile={setInitialLawFile}
                currentFile={initialLawFile}
              />
            </div>
            <div className="file-pair__item">
              <h3>Σχέδιο νόμου για την αιτιολογική έκθεση</h3>
              <FileUploader
                label="Επιλέξτε PDF σχέδιου νόμου για την αιτιολογική έκθεση"
                onFile={setFinalLawFile}
                currentFile={finalLawFile}
              />
            </div>
          </div>
        </div>
      </div>

      <section className="home-page-sections" aria-label="Ενότητες ανάλυσης συνεπειών ρύθμισης">
        {sections.map((section) => (
          <article key={section.code} className="home-page-section">
            <header className="home-page-section__header">
              <h2 className="home-page-section__title">
                <span className="home-page-section__code">{section.code}.</span>
                <span className="home-page-section__title-text">{section.title}</span>
              </h2>
            </header>
            {section.routes.length > 0 ? (
              <div className="workflow-grid" aria-label={`Ροές για την ενότητα ${section.code}`}>
                {section.routes.map((route) => renderWorkflowCard(workflowByRoute[route]))}
              </div>
            ) : (
              <p className="home-page-section__empty">
                Δεν υπάρχει ακόμα διαθέσιμη ροή για αυτή την ενότητα.
              </p>
            )}
          </article>
        ))}
      </section>

      {!canProceed && (
        <p className="hint-text" role="status">
          Απαιτούνται και τα δύο αρχεία PDF για την συμπλήρωση του πεδίου 23.
          {(field4Card.hasSavedSession ||
            field6Card.hasSavedSession ||
            field9Card.hasSavedSession ||
            field23Card.hasSavedSession ||
            field29Card.hasSavedSession ||
            field30Card.hasSavedSession) &&
            ' Μπορείτε να συνεχίσετε την αποθηκευμένη σας πρόοδο.'}
        </p>
      )}

      <div className="home-page__actions">
        <div className={`status-pill${initialLawFile ? ' status-pill--ok' : ''}`}>
          Αρχικός: {initialLawFile ? initialLawFile.name : 'Δεν έχει επιλεγεί αρχείο'}
        </div>
        <div className={`status-pill${finalLawFile ? ' status-pill--ok' : ''}`}>
          Τελικός: {finalLawFile ? finalLawFile.name : 'Δεν έχει επιλεγεί αρχείο'}
        </div>
      </div>

      <div className="home-page__asr-cta">
        <Link to="/asr-synthesis" className="btn btn-primary">
          Σύνθεση ΑΣΡ →
        </Link>
      </div>
    </section>
  )
}
