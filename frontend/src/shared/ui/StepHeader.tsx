interface StepHeaderProps {
  title: string
  stepNumber: number
  totalSteps: number
  description?: string
}

export function StepHeader({ title, stepNumber, totalSteps, description }: StepHeaderProps) {
  const progress = Math.round((stepNumber / totalSteps) * 100)

  return (
    <div className="step-header">
      <p className="step-counter" aria-label={`Βήμα ${stepNumber} από ${totalSteps}`}>
        Βήμα {stepNumber} / {totalSteps}
      </p>
      <h2 className="step-title">{title}</h2>
      {description && <p className="step-description">{description}</p>}
      <div className="step-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span className="step-progress__bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
