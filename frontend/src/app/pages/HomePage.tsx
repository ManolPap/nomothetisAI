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
  clearField9Persisted,
  field9PersistEventName,
  readField9HomeMeta,
} from '../../features/field9/state/persist'

export function HomePage() {
  const { initialLawFile, finalLawFile, setInitialLawFile, setFinalLawFile } = useLawFiles()
  const canProceed = Boolean(initialLawFile && finalLawFile)
  const [field23Card, setField23Card] = useState(() => readField23HomeMeta())
  const [field6Card, setField6Card] = useState(() => readField6HomeMeta())
  const [field9Card, setField9Card] = useState(() => readField9HomeMeta())

  useEffect(() => {
    const refresh23 = () => setField23Card(readField23HomeMeta())
    const refresh6 = () => setField6Card(readField6HomeMeta())
    const refresh9 = () => setField9Card(readField9HomeMeta())

    window.addEventListener(field23PersistEventName(), refresh23)
    window.addEventListener('storage', refresh23)
    window.addEventListener(field6PersistEventName(), refresh6)
    window.addEventListener('storage', refresh6)
    window.addEventListener(field9PersistEventName(), refresh9)
    window.addEventListener('storage', refresh9)

    return () => {
      window.removeEventListener(field23PersistEventName(), refresh23)
      window.removeEventListener('storage', refresh23)
      window.removeEventListener(field6PersistEventName(), refresh6)
      window.removeEventListener('storage', refresh6)
      window.removeEventListener(field9PersistEventName(), refresh9)
      window.removeEventListener('storage', refresh9)
    }
  }, [])

  const canEnterField23 = canProceed || field23Card.hasSavedSession

  const workflows = [
    { to: '/field4', title: 'Πεδίο 4', description: 'Νομοθετικές αναφορές και ανάλυση από το ανεβασμένο κείμενο.', requiresBothPdfs: false },
    { to: '/field6', title: 'Πεδίο 6', description: 'Μεταδεδομένα, web facts, Eurostat και τελική σύνθεση κειμένου.', requiresBothPdfs: true },
    { to: '/field9', title: 'Πεδίο 9', description: 'Εξαγωγή τομέα, επιλογή δεικτών και πίνακας τιμών στόχων.', requiresBothPdfs: true },
    { to: '/field23', title: 'Πεδίο 23', description: 'Split άρθρων, σύγκριση διαφορών και προβολή attribution.', requiresBothPdfs: true },
  ] as const

  function renderWorkflowCard(workflow: typeof workflows[number]) {
    const { to, title, description, requiresBothPdfs } = workflow
    const needsPdfs = requiresBothPdfs

    if (to === '/field6') {
      const canEnter = canProceed || field6Card.hasSavedSession
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
              className={`btn btn-primary${needsPdfs && !canProceed ? ' btn-disabled' : ''}`}
              to={to}
              aria-disabled={needsPdfs && !canProceed}
              onClick={(e) => { if (needsPdfs && !canProceed) e.preventDefault() }}
            >
              {field6Card.hasSavedSession ? 'Συνέχιση ροής' : 'Εκκίνηση ροής'}
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

    return (
      <article key={to} className="workflow-card">
        <h3>{title}</h3>
        <p>{description}</p>
        <Link
          className={`btn btn-primary${needsPdfs && !canProceed ? ' btn-disabled' : ''}`}
          to={to}
          aria-disabled={needsPdfs && !canProceed}
          onClick={(e) => { if (needsPdfs && !canProceed) e.preventDefault() }}
        >
          Εκκίνηση ροής
        </Link>
      </article>
    )
  }

  return (
    <section className="home-page page-shell">
      <header className="page-hero">
        <p className="page-hero__eyebrow">Unified Human-in-the-Loop Workflow</p>
        <h1 className="feature-page__title">Κεντρικό Ανέβασμα Νόμων</h1>
        <p className="home-page__subtitle">
          Ανεβάστε μία φορά τον αρχικό και τον τελικό νόμο. Τα αρχεία επαναχρησιμοποιούνται
          με ασφαλή και προβλέψιμο τρόπο στα `field6`, `field9` και `field23`.
        </p>
      </header>

      <div className="step-container">
        <div className="step-content">
          <h2 className="step-title">1. Επιλογή αρχείων εισόδου</h2>
          <p className="step-description">
            Οι αλλαγές στα αρχεία ακυρώνουν αυτόματα downstream δεδομένα, ώστε να μην
            χρησιμοποιούνται παλιά αποτελέσματα.
          </p>
          <div className="file-pair">
            <div className="file-pair__item">
              <h3>Αρχικός Νόμος</h3>
              <FileUploader
                label="Επιλέξτε PDF αρχικού νόμου"
                onFile={setInitialLawFile}
                currentFile={initialLawFile}
              />
            </div>
            <div className="file-pair__item">
              <h3>Τελικός Νόμος</h3>
              <FileUploader
                label="Επιλέξτε PDF τελικού νόμου"
                onFile={setFinalLawFile}
                currentFile={finalLawFile}
              />
            </div>
          </div>
        </div>
      </div>

      <section className="workflow-grid" aria-label="Διαθέσιμες ροές εργασίας">
        {workflows.map((workflow) => renderWorkflowCard(workflow))}
      </section>

      {!canProceed && (
        <p className="hint-text" role="status">
          Απαιτούνται και τα δύο αρχεία PDF για τις ροές 6 και 9.
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
