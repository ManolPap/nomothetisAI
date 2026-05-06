import { Link } from 'react-router-dom'
import { useLawFiles } from '../providers/LawFilesProvider'
import { FileUploader } from '../../shared/ui/FileUploader'

export function HomePage() {
  const { initialLawFile, finalLawFile, setInitialLawFile, setFinalLawFile } = useLawFiles()
  const canProceed = Boolean(initialLawFile && finalLawFile)
  const workflows = [
    { to: '/field6', title: 'Πεδίο 6', description: 'Μεταδεδομένα, web facts, Eurostat και τελική σύνθεση κειμένου.' },
    { to: '/field9', title: 'Πεδίο 9', description: 'Εξαγωγή τομέα, επιλογή δεικτών και πίνακας τιμών στόχων.' },
    { to: '/field23', title: 'Πεδίο 23', description: 'Split άρθρων, σύγκριση διαφορών και προβολή attribution.' },
  ]

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
        {workflows.map((workflow) => (
          <article key={workflow.to} className="workflow-card">
            <h3>{workflow.title}</h3>
            <p>{workflow.description}</p>
            <Link
              className={`btn btn-primary${!canProceed ? ' btn-disabled' : ''}`}
              to={workflow.to}
              aria-disabled={!canProceed}
              onClick={(e) => {
                if (!canProceed) e.preventDefault()
              }}
            >
              Εκκίνηση ροής
            </Link>
          </article>
        ))}
      </section>

      {!canProceed && (
        <p className="hint-text" role="status">
          Απαιτούνται και τα δύο αρχεία PDF για να ενεργοποιηθούν οι ροές.
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
