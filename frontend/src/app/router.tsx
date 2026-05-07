import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { Field4Page } from '../features/field4/pages/Field4Page'
import { Field6Page } from '../features/field6/pages/Field6Page'
import { Field7Page } from '../features/field7/pages/Field7Page'
import { Field9Page } from '../features/field9/pages/Field9Page'
import { Field23Page } from '../features/field23/pages/Field23Page'
import { HomePage } from './pages/HomePage'

function Nav() {
  return (
    <nav className="app-nav" aria-label="Κύρια πλοήγηση">
      <div className="app-nav__brand">Nomothetis AI</div>
      <div className="app-nav__links">
        <NavLink to="/" end className={({ isActive }) => `app-nav__link${isActive ? ' active' : ''}`}>
          Αρχική
        </NavLink>
      </div>
    </nav>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Nav />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/field4" element={<Field4Page />} />
          <Route path="/field6" element={<Field6Page />} />
          <Route path="/field7" element={<Field7Page />} />
          <Route path="/field9" element={<Field9Page />} />
          <Route path="/field23" element={<Field23Page />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
