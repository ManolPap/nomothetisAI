import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useLawFiles } from '../providers/LawFilesProvider'
import { FileUploader } from '../../shared/ui/FileUploader'
import {
  clearField23Persisted,
  field23PersistEventName,
  readField23HomeMeta,
} from '../../features/field23/state/persist'
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

export function HomePage() {
  const { initialLawFile, finalLawFile, setInitialLawFile, setFinalLawFile } = useLawFiles()
  const canProceed = Boolean(initialLawFile && finalLawFile)
  const [field23Card, setField23Card] = useState(() => readField23HomeMeta())
  const [field6Card, setField6Card] = useState(() => readField6HomeMeta())
  const [field7Card, setField7Card] = useState(() => readField7HomeMeta())
  const [field9Card, setField9Card] = useState(() => readField9HomeMeta())

  useEffect(() => {
    const refresh23 = () => setField23Card(readField23HomeMeta())
    const refresh6 = () => setField6Card(readField6HomeMeta())
    const refresh7 = () => setField7Card(readField7HomeMeta())
    const refresh9 = () => setField9Card(readField9HomeMeta())

    window.addEventListener(field23PersistEventName(), refresh23)
    window.addEventListener('storage', refresh23)
    window.addEventListener(field6PersistEventName(), refresh6)
    window.addEventListener('storage', refresh6)
    window.addEventListener(field7PersistEventName(), refresh7)
    window.addEventListener('storage', refresh7)
    window.addEventListener(field9PersistEventName(), refresh9)
    window.addEventListener('storage', refresh9)

    return () => {
      window.removeEventListener(field23PersistEventName(), refresh23)
      window.removeEventListener('storage', refresh23)
      window.removeEventListener(field6PersistEventName(), refresh6)
      window.removeEventListener('storage', refresh6)
      window.removeEventListener(field7PersistEventName(), refresh7)
      window.removeEventListener('storage', refresh7)
      window.removeEventListener(field9PersistEventName(), refresh9)
      window.removeEventListener('storage', refresh9)
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
    { to: '/field7', title: 'Πεδίο 7', description: 'Αντιστοίχιση του νόμου με τους 17 Στόχους Βιώσιμης Ανάπτυξης (SDGs) του ΟΗΕ.', requiresBothPdfs: false, requiresFinalPdf: false },
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

    if (to === '/field6') {
      const hasFinalPdf = Boolean(finalLawFile)
      const startDisabled = needsFinalPdf && !hasFinalPdf
      const canEnter = hasFinalPdf || field6Card.hasSavedSession
      return (
        <article key={to} className="workflow-card workflow-card--field6">
          <h3>{title}</h3>
          <p>{description}</p>
          {field6Card.flowCompleted ? (
            <>
              <Link
                className={`btn btn-field6-home-done${!canEnter ? ' btn-disabled' : ''}`}
                to={to}
                aria-disabled={!canEnter}
                onClick={(e) => { if (!canEnter) e.preventDefault() }}
              >
                Ολοκληρώθηκε
              </Link>
              <button
                type="button"
                className="btn btn-ghost workflow-card__reset"
                onClick={() => clearField6Persisted()}
              >
                Επαναφορά ροής
              </button>
            </>
          ) : (
            <Link
              className={`btn btn-primary${startDisabled ? ' btn-disabled' : ''}`}
              to={to}
              aria-disabled={startDisabled}
              onClick={(e) => { if (startDisabled) e.preventDefault() }}
            >
              {field6Card.hasSavedSession ? 'Συνέχιση ροής' : 'Εκκίνηση ροής'}
            </Link>
          )}
        </article>
      )
    }

    if (to === '/field7') {
      const canEnter = !needsPdfs || canProceed || field7Card.hasSavedSession
      return (
        <article key={to} className="workflow-card workflow-card--field7">
          <h3>{title}</h3>
          <p>{description}</p>
          {field7Card.flowCompleted ? (
            <>
              <Link
                className={`btn btn-field7-home-done${!canEnter ? ' btn-disabled' : ''}`}
                to={to}
                aria-disabled={!canEnter}
                onClick={(e) => { if (!canEnter) e.preventDefault() }}
              >
                Ολοκληρώθηκε
              </Link>
              <button
                type="button"
                className="btn btn-ghost workflow-card__reset"
                onClick={() => clearField7Persisted()}
              >
                Επαναφορά ροής
              </button>
            </>
          ) : (
            <Link
              className={`btn btn-primary${needsPdfs && !canProceed ? ' btn-disabled' : ''}`}
              to={to}
              aria-disabled={needsPdfs && !canProceed}
              onClick={(e) => { if (needsPdfs && !canProceed) e.preventDefault() }}
            >
              {field7Card.hasSavedSession ? 'Συνέχιση ροής' : 'Εκκίνηση ροής'}
            </Link>
          )}
        </article>
      )
    }

    if (to === '/field9') {
      const canEnter = canProceed || field9Card.hasSavedSession
      return (
        <article key={to} className="workflow-card workflow-card--field9">
          <h3>{title}</h3>
          <p>{description}</p>
          {field9Card.flowCompleted ? (
            <>
              <Link
                className={`btn btn-field9-home-done${!canEnter ? ' btn-disabled' : ''}`}
                to={to}
                aria-disabled={!canEnter}
                onClick={(e) => { if (!canEnter) e.preventDefault() }}
              >
                Ολοκληρώθηκε
              </Link>
              <button
                type="button"
                className="btn btn-ghost workflow-card__reset"
                onClick={() => clearField9Persisted()}
              >
                Επαναφορά ροής
              </button>
            </>
          ) : (
            <Link
              className={`btn btn-primary${needsPdfs && !canProceed ? ' btn-disabled' : ''}`}
              to={to}
              aria-disabled={needsPdfs && !canProceed}
              onClick={(e) => { if (needsPdfs && !canProceed) e.preventDefault() }}
            >
              {field9Card.hasSavedSession ? 'Συνέχιση ροής' : 'Εκκίνηση ροής'}
            </Link>
          )}
        </article>
      )
    }

    if (to === '/field23') {
      return (
        <article key={to} className="workflow-card workflow-card--field23">
          <h3>{title}</h3>
          <p>{description}</p>
          {field23Card.flowCompleted ? (
            <>
              <Link
                className={`btn btn-field23-home-done${!canEnterField23 ? ' btn-disabled' : ''}`}
                to={to}
                aria-disabled={!canEnterField23}
                onClick={(e) => { if (!canEnterField23) e.preventDefault() }}
              >
                Ολοκληρώθηκε
              </Link>
              <button
                type="button"
                className="btn btn-ghost workflow-card__reset"
                onClick={() => clearField23Persisted()}
              >
                Επαναφορά ροής
              </button>
            </>
          ) : (
            <Link
              className={`btn btn-primary${!canEnterField23 ? ' btn-disabled' : ''}`}
              to={to}
              aria-disabled={!canEnterField23}
              onClick={(e) => { if (!canEnterField23) e.preventDefault() }}
            >
              {field23Card.hasSavedSession ? 'Συνέχιση ροής' : 'Εκκίνηση ροής'}
            </Link>
          )}
        </article>
      )
    }

    const genericDisabled = (needsPdfs && !canProceed) || (needsFinalPdf && !finalLawFile)

    return (
      <article key={to} className="workflow-card">
        <h3>{title}</h3>
        <p>{description}</p>
        <Link
          className={`btn btn-primary${genericDisabled ? ' btn-disabled' : ''}`}
          to={to}
          aria-disabled={genericDisabled}
          onClick={(e) => { if (genericDisabled) e.preventDefault() }}
        >
          Εκκίνηση ροής
        </Link>
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
              <p className="home-page-section__code">{section.code}</p>
              <h2>{section.title}</h2>
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
          {(field6Card.hasSavedSession || field9Card.hasSavedSession || field23Card.hasSavedSession) &&
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
    </section>
  )
}
