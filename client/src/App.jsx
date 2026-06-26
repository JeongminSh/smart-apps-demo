import { Routes, Route } from 'react-router-dom'
import AdminPage from './pages/AdminPage.jsx'
import TrainerPage from './pages/TrainerPage.jsx'
import MitgliedPage from './pages/MitgliedPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminPage />} />
      <Route path="/trainer/*" element={<TrainerPage />} />
      <Route path="/*" element={<MitgliedPage />} />
    </Routes>
  )
}
