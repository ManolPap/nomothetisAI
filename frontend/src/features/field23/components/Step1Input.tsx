import { type Dispatch, useEffect } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { FileUploader } from '../../../shared/ui/FileUploader'
import { useLawFiles } from '../../../app/providers/LawFilesProvider'
import type { Field23Action, Field23State } from '../state/reducer'

interface Props {
  state: Field23State
  dispatch: Dispatch<Field23Action>
}

export function Step1Input({ state, dispatch }: Props) {
  const { initialLawFile, finalLawFile, setInitialLawFile, setFinalLawFile } = useLawFiles()
  const canContinue = !!state.initialFile && !!state.finalFile

  useEffect(() => {
    if (initialLawFile && (!state.initialFile || state.initialFile.name !== initialLawFile.name || state.initialFile.size !== initialLawFile.size || state.initialFile.lastModified !== initialLawFile.lastModified)) {
      dispatch({ type: 'SET_INITIAL_FILE', file: initialLawFile })
    }
    if (finalLawFile && (!state.finalFile || state.finalFile.name !== finalLawFile.name || state.finalFile.size !== finalLawFile.size || state.finalFile.lastModified !== finalLawFile.lastModified)) {
      dispatch({ type: 'SET_FINAL_FILE', file: finalLawFile })
    }
  }, [dispatch, finalLawFile, initialLawFile, state.finalFile, state.initialFile])

  return (
    <StepContainer
      onNext={() => dispatch({ type: 'GO_TO_STEP', step: 2 })}
      nextDisabled={!canContinue}
    >
      <StepHeader
        title="Επιλογή Αρχείων Νόμων"
        stepNumber={1}
        totalSteps={4}
        description="Ανεβάστε τον αρχικό και τον τελικό νόμο σε PDF."
      />

      <div className="file-pair">
        <div className="file-pair__item">
          <h3>Αρχικός Νόμος</h3>
          <FileUploader
            label="Επιλέξτε PDF αρχικού νόμου"
            onFile={(f) => {
              setInitialLawFile(f)
              dispatch({ type: 'SET_INITIAL_FILE', file: f })
            }}
            currentFile={state.initialFile}
          />
        </div>
        <div className="file-pair__item">
          <h3>Τελικός Νόμος</h3>
          <FileUploader
            label="Επιλέξτε PDF τελικού νόμου"
            onFile={(f) => {
              setFinalLawFile(f)
              dispatch({ type: 'SET_FINAL_FILE', file: f })
            }}
            currentFile={state.finalFile}
          />
        </div>
      </div>
    </StepContainer>
  )
}
