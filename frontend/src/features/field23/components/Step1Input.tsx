import { type Dispatch } from 'react'
import { StepHeader } from '../../../shared/ui/StepHeader'
import { StepContainer } from '../../../shared/ui/StepContainer'
import { FileUploader } from '../../../shared/ui/FileUploader'
import type { Field23Action, Field23State } from '../state/reducer'

interface Props {
  state: Field23State
  dispatch: Dispatch<Field23Action>
}

export function Step1Input({ state, dispatch }: Props) {
  const canContinue = !!state.initialFile && !!state.finalFile

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
            onFile={(f) => dispatch({ type: 'SET_INITIAL_FILE', file: f })}
            currentFile={state.initialFile}
          />
        </div>
        <div className="file-pair__item">
          <h3>Τελικός Νόμος</h3>
          <FileUploader
            label="Επιλέξτε PDF τελικού νόμου"
            onFile={(f) => dispatch({ type: 'SET_FINAL_FILE', file: f })}
            currentFile={state.finalFile}
          />
        </div>
      </div>
    </StepContainer>
  )
}
