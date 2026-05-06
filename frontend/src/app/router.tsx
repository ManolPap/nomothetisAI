import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { Field4Page } from '../features/field4/pages/Field4Page'
import { Field6Page } from '../features/field6/pages/Field6Page'
import { Field9Page } from '../features/field9/pages/Field9Page'
import { Field23Page } from '../features/field23/pages/Field23Page'

function Nav() {
  return (
    <nav className="app-nav" aria-label="Κύρια πλοήγηση">
      <Link to="/field4" className="app-nav__link">Πεδίο 4</Link>
      <Link to="/field6" className="app-nav__link">Πεδίο 6</Link>
      <Link to="/field9" className="app-nav__link">Πεδίο 9</Link>
      <Link to="/field23" className="app-nav__link">Πεδίο 23</Link>
    </nav>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Nav />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/field6" replace />} />
          <Route path="/field4" element={<Field4Page />} />
          <Route path="/field6" element={<Field6Page />} />
          <Route path="/field9" element={<Field9Page />} />
          <Route path="/field23" element={<Field23Page />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
