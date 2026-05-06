import { useState, useRef } from 'react'
import { validatePdfFile } from '../utils/validation'

interface FileUploaderProps {
  onFile: (file: File) => void
  accept?: string
  disabled?: boolean
  label: string
  currentFile?: File | null
  error?: string | null
}

export function FileUploader({
  onFile,
  accept = '.pdf,application/pdf',
  disabled = false,
  label,
  currentFile,
  error,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  function applyFile(file: File) {
    const validationError = validatePdfFile(file)
    if (validationError) {
      setLocalError(validationError)
      return
    }
    setLocalError(null)
    onFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    applyFile(file)
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (!file) return
    applyFile(file)
  }

  const inputId = `file-upload-${label.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div className="file-uploader">
      <label
        htmlFor={inputId}
        className={`file-uploader__label${disabled ? ' file-uploader__label--disabled' : ''}${localError || error ? ' file-uploader__label--error' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) inputRef.current?.click()
        }}
      >
        <span className="file-uploader__icon" aria-hidden="true">📄</span>
        <span className="file-uploader__text">
          {currentFile ? currentFile.name : label}
        </span>
        <span className="file-uploader__hint">PDF — σύρτε ή κλικ για επιλογή</span>
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={handleChange}
        className="file-uploader__input"
        aria-label={label}
        aria-invalid={Boolean(localError || error)}
      />
      {(error || localError) && (
        <p className="file-uploader__error" role="alert">
          {error ?? localError}
        </p>
      )}
    </div>
  )
}
