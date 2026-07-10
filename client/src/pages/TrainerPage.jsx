import { useEffect, useState } from 'react'
import { api } from '../api/index.js'

const STORAGE_KEY = 'fitzone_trainer_id'

export default function TrainerPage() {
  const [trainerId, setTrainerId] = useState(() => localStorage.getItem(STORAGE_KEY))

  function handleSelect(id) {
    localStorage.setItem(STORAGE_KEY, id)
    setTrainerId(String(id))
  }

  function handleSwitch() {
    localStorage.removeItem(STORAGE_KEY)
    setTrainerId(null)
  }

  return trainerId
    ? <TrainerDashboard trainerId={Number(trainerId)} onSwitch={handleSwitch} />
    : <TrainerAuswahl onSelect={handleSelect} />
}

// ── Trainer-Auswahl ("Login" ohne Passwort, v1 kennt kein Auth-System) ─────────

function TrainerAuswahl({ onSelect }) {
  const [trainer, setTrainer] = useState([])

  useEffect(() => { api.get('/trainer').then(setTrainer) }, [])

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Wer bist du?</h1>
        <p style={s.subtitle}>Wähle deinen Namen, um deine Termine zu sehen.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {trainer.map(t => (
            <button key={t.id} style={s.trainerBtn} onClick={() => onSelect(t.id)}>{t.name}</button>
          ))}
          {trainer.length === 0 && <p style={{ color: '#9ca3af' }}>Keine Trainer angelegt.</p>}
        </div>
      </div>
    </div>
  )
}

// ── Dashboard ───────────────────────────────────────────────────────────────

function TrainerDashboard({ trainerId, onSwitch }) {
  const [trainer, setTrainer] = useState(null)
  const [kurstermine, setKurstermine] = useState([])
  const [aktiv, setAktiv] = useState(null)

  useEffect(() => {
    api.get('/trainer').then(rows => setTrainer(rows.find(t => t.id === trainerId) ?? null))
    load()
  }, [trainerId])

  function load() { api.get(`/trainer/${trainerId}/kurstermine`).then(setKurstermine) }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f9fafb' }}>
      <nav style={s.nav}>
        <span style={s.logo}>FitZone Trainer</span>
        <span style={{ color: '#374151', fontWeight: 600 }}>{trainer?.name}</span>
        <button style={s.switchBtn} onClick={onSwitch}>Wechseln</button>
      </nav>
      <main style={s.main}>
        <h1 style={s.pageTitle}>Meine Termine</h1>
        <table style={s.table}>
          <thead><tr>{['Datum', 'Kurs', 'Format', 'Teilnehmer', 'Status', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {kurstermine.length === 0 && <tr><td colSpan={6} style={s.empty}>Keine Termine</td></tr>}
            {kurstermine.map(k => (
              <tr key={k.id} style={s.tr}>
                <td style={s.td}>{formatDt(k.datum_zeit)}</td>
                <td style={s.td}><strong>{k.kurstyp_name}</strong></td>
                <td style={s.td}>{k.kurstyp_format}</td>
                <td style={s.td}>{k.buchungen_count} / {k.kapazitaet}</td>
                <td style={s.td}><StatusBadge status={k.status} /></td>
                <td style={s.td}>
                  {k.status === 'geplant' && <button style={s.btnSmall} onClick={() => setAktiv(k)}>Teilnehmerliste</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
      {aktiv && <TeilnehmerPanel trainerId={trainerId} kurstermin={aktiv} onClose={() => { setAktiv(null); load() }} />}
    </div>
  )
}

// ── Teilnehmerliste + Check-in ──────────────────────────────────────────────

function TeilnehmerPanel({ trainerId, kurstermin, onClose }) {
  const [teilnehmer, setTeilnehmer] = useState([])

  useEffect(() => { load() }, [])
  function load() { api.get(`/trainer/${trainerId}/kurstermine/${kurstermin.id}/teilnehmer`).then(setTeilnehmer) }

  async function handleCheckin(id) {
    try { await api.put(`/buchungen/${id}/checkin`, {}); load() } catch (err) { alert(err.message) }
  }

  async function handleNoShow(id) {
    if (!confirm('Als No-Show markieren?')) return
    try { await api.put(`/buchungen/${id}/no-show`, {}); load() } catch (err) { alert(err.message) }
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modalBox}>
        <h2 style={s.modalTitle}>{kurstermin.kurstyp_name} — {formatDt(kurstermin.datum_zeit)}</h2>
        <table style={s.table}>
          <thead><tr>{['Mitglied', 'Status', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {teilnehmer.length === 0 && <tr><td colSpan={3} style={s.empty}>Noch keine Buchungen</td></tr>}
            {teilnehmer.map(t => (
              <tr key={t.id} style={{ ...s.tr, opacity: t.storniert_am ? 0.45 : 1 }}>
                <td style={s.td}>
                  {t.mitglied_name}
                  {t.storniert_am && <span style={{ color: '#9ca3af', fontSize: '0.8rem', marginLeft: 6 }}>(storniert)</span>}
                </td>
                <td style={s.td}>{t.erschienen === 1 ? '✓ erschienen' : t.erschienen === 0 ? '✗ No-Show' : '—'}</td>
                <td style={s.td}>
                  {!t.storniert_am && t.erschienen === null && <>
                    <button style={s.btnSmall} onClick={() => handleCheckin(t.id)}>Check-in</button>{' '}
                    <button style={{ ...s.btnSmall, ...s.btnDanger }} onClick={() => handleNoShow(t.id)}>No-Show</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button style={s.btnSecondary} onClick={onClose}>Schließen</button>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = { geplant: ['#1d4ed8', '#eff6ff'], abgesagt: ['#b91c1c', '#fee2e2'] }
  const [color, background] = map[status] ?? ['#6b7280', '#f3f4f6']
  return <span style={{ color, background, padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600 }}>{status}</span>
}

function formatDt(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: '2rem', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif' },
  card: { background: '#fff', borderRadius: 14, padding: '2.5rem', width: '100%', maxWidth: 420, boxShadow: '0 10px 40px rgba(0,0,0,0.08)' },
  title: { margin: '0 0 0.5rem', fontSize: '1.5rem', color: '#111827' },
  subtitle: { margin: '0 0 1.5rem', color: '#6b7280', fontSize: '0.95rem' },
  trainerBtn: { padding: '0.85rem', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '1.05rem', color: '#111827', textAlign: 'left' },
  nav: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 2rem', borderBottom: '1px solid #e5e7eb', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  logo: { fontWeight: 700, color: '#1d4ed8', marginRight: 'auto', fontSize: '1.05rem' },
  switchBtn: { padding: '0.35rem 0.75rem', background: '#f9fafb', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' },
  main: { padding: '2rem', maxWidth: 1000, margin: '0 auto' },
  pageTitle: { margin: '0 0 1.25rem', fontSize: '1.4rem', color: '#111827' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  th: { textAlign: 'left', padding: '0.6rem 0.75rem', borderBottom: '2px solid #e5e7eb', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '0.65rem 0.75rem', color: '#111827', verticalAlign: 'middle' },
  empty: { padding: '2rem', textAlign: 'center', color: '#9ca3af' },
  btnSmall: { padding: '0.25rem 0.65rem', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' },
  btnDanger: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
  btnSecondary: { padding: '0.5rem 1rem', background: '#f9fafb', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  modalBox: { background: '#fff', borderRadius: 10, padding: '1.75rem', width: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', fontFamily: 'system-ui, sans-serif' },
  modalTitle: { margin: '0 0 1.25rem', fontSize: '1.15rem', color: '#111827' },
}
