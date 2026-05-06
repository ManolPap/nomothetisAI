import { QueryProvider } from './app/providers/QueryProvider'
import { LawFilesProvider } from './app/providers/LawFilesProvider'
import { AppRouter } from './app/router'
import './App.css'

export default function App() {
  return (
    <QueryProvider>
      <LawFilesProvider>
        <AppRouter />
      </LawFilesProvider>
    </QueryProvider>
  )
}
