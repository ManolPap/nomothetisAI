import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface LawFilesContextValue {
  initialLawFile: File | null
  finalLawFile: File | null
  setInitialLawFile: (file: File | null) => void
  setFinalLawFile: (file: File | null) => void
}

const LawFilesContext = createContext<LawFilesContextValue | null>(null)

export function LawFilesProvider({ children }: { children: ReactNode }) {
  const [initialLawFile, setInitialLawFile] = useState<File | null>(null)
  const [finalLawFile, setFinalLawFile] = useState<File | null>(null)

  const value = useMemo(
    () => ({ initialLawFile, finalLawFile, setInitialLawFile, setFinalLawFile }),
    [initialLawFile, finalLawFile],
  )

  return <LawFilesContext.Provider value={value}>{children}</LawFilesContext.Provider>
}

export function useLawFiles() {
  const ctx = useContext(LawFilesContext)
  if (!ctx) {
    throw new Error('useLawFiles must be used within LawFilesProvider')
  }
  return ctx
}
