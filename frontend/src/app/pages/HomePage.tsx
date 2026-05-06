import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useLawFiles } from '../providers/LawFilesProvider'
import { FileUploader } from '../../shared/ui/FileUploader'
import {
  clearField23Persisted,
  field23PersistEventName,
  readField23HomeMeta,
} from '../../features/field23/state/persist'

export function HomePage() {
  const { initialLawFile, finalLawFile, setInitialLawFile, setFinalLawFile } = useLawFiles()
  const canProceed = Boolean(initialLawFile && finalLawFile)
  const [field23Card, setField23Card] = useState(() => readField23HomeMeta())

  useEffect(() => {
    const refresh = () => setField23Card(readField23HomeMeta())
    const ev = field23PersistEventName()
    window.addEventListener(ev, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(ev, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const canEnterField23 = canProceed || field23Card.hasSavedSession

  const workflows = [
    { to: '/field4', title: 'Πεδίο 4', description: 'Νομοθετικές αναφορές και ανάλυση από το ανεβασμένο κείμενο.', requiresBothPdfs: false },
    { to: '/field6', title: 'Πεδίο 6', description: 'Μεταδεδομένα, web facts, Eurostat και τελική σύνθεση κειμένου.', requiresBothPdfs: true },
    { to: '/field9', title: 'Πεδίο 9', description: 'Εξαγωγή τομέα, επιλογή δεικτών και πίνακας τιμών στόχων.', requiresBothPdfs: true },
    { to: '/field23', title: 'Πεδίο 23', description: 'Split άρθρων, σύγκριση διαφορών και προβολή attribution.', requiresBothPdfs: true },
  ] as const

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
        {workflows.map((workflow) => {
          const isField23 = workflow.to === '/field23'
          const needsPdfs = workflow.requiresBothPdfs
          const canStart = isField23 ? canEnterField23 : needsPdfs ? canProceed : true
          if (!isField23) {
            return (
              <article key={workflow.to} className="workflow-card">
                <h3>{workflow.title}</h3>
                <p>{workflow.description}</p>
                <Link
                  className={`btn btn-primary${needsPdfs && !canProceed ? ' btn-disabled' : ''}`}
                  to={workflow.to}
                  aria-disabled={needsPdfs && !canProceed}
                  onClick={(e) => {
                    if (needsPdfs && !canProceed) e.preventDefault()
                  }}
                >
                  Εκκίνηση ροής
                </Link>
              </article>
            )
          }
          return (
            <article key={workflow.to} className="workflow-card workflow-card--field23">
              <h3>{workflow.title}</h3>
              <p>{workflow.description}</p>
              {field23Card.flowCompleted ? (
                <>
                  <Link
                    className={`btn btn-field23-home-done${!canStart ? ' btn-disabled' : ''}`}
                    to={workflow.to}
                    aria-disabled={!canStart}
                    onClick={(e) => {
                      if (!canStart) e.preventDefault()
                    }}
                  >
                    Ολοκληρώθηκε
                  </Link>
                  <button
                    type="button"
                    className="btn btn-ghost workflow-card__reset"
                    onClick={() => {
                      clearField23Persisted()
                    }}
                  >
                    Επαναφορά ροής
                  </button>
                </>
              ) : (
                <Link
                  className={`btn btn-primary${!canStart ? ' btn-disabled' : ''}`}
                  to={workflow.to}
                  aria-disabled={!canStart}
                  onClick={(e) => {
                    if (!canStart) e.preventDefault()
                  }}
                >
                  {field23Card.hasSavedSession ? 'Συνέχιση ροής' : 'Εκκίνηση ροής'}
                </Link>
              )}
            </article>
          )
        })}
      </section>

      {!canProceed && (
        <p className="hint-text" role="status">
          Απαιτούνται και τα δύο αρχεία PDF για τις ροές 6 και 9.
          {field23Card.hasSavedSession && ' Για το Πεδίο 23 μπορείτε να συνεχίσετε την αποθηκευμένη σας πρόοδο.'}
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
