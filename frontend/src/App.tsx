import { QueryProvider } from './app/providers/QueryProvider'
import { AppRouter } from './app/router'
import './App.css'

export default function App() {
  return (
    <QueryProvider>
      <AppRouter />
    </QueryProvider>
  )
}
