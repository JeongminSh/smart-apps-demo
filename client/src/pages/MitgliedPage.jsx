import { useEffect, useState } from 'react'
import { api } from '../api/index.js'

const EMPTY = { name: '', email: '', telefon: '', geburtstag: '', tarif_id: '', sepa_mandat: false }

export default function MitgliedPage() {
  const [tarife, setTarife] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(null)

  useEffect(() => { api.get('/tarife').then(setTarife) }, [])

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await api.post('/onboarding', {
        name: form.name,
        email: form.email,
        telefon: form.telefon || null,
        geburtstag: form.geburtstag || null,
        tarif_id: Number(form.tarif_id),
        sepa_mandat: form.sepa_mandat,
      })
      setDone({ name: form.name, email: form.email })
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  if (done) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <h1 style={s.title}>Willkommen bei FitZone, {done.name}! 🎉</h1>
          <p style={s.text}>Dein Zugang ist ab sofort aktiv — du kannst direkt Kurse buchen.</p>
          <p style={s.text}>Eine Bestätigung wurde an <strong>{done.email}</strong> gesendet.</p>
          <button style={s.btnPrimary} onClick={() => { setDone(null); setForm(EMPTY) }}>Neue Registrierung</button>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Willkommen bei FitZone</h1>
        <p style={s.subtitle}>Registriere dich direkt hier am Tablet — dein Zugang ist danach sofort aktiv.</p>
        <form onSubmit={handleSubmit}>
          <Field label="Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
          <Field label="E-Mail *" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} required />
          <Field label="Telefon" value={form.telefon} onChange={v => setForm(f => ({ ...f, telefon: v }))} />
          <Field label="Geburtstag" type="date" value={form.geburtstag} onChange={v => setForm(f => ({ ...f, geburtstag: v }))} />

          <div style={s.field}>
            <label style={s.label}>Tarif *</label>
            <select style={s.input} value={form.tarif_id} onChange={e => setForm(f => ({ ...f, tarif_id: e.target.value }))} required>
              <option value="">— Tarif wählen —</option>
              {tarife.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.preis}€/Monat{t.buchungen_pro_monat ? ` (max. ${t.buchungen_pro_monat} Buchungen)` : ' (unbegrenzt)'}
                </option>
              ))}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.sepaLabel}>
              <input type="checkbox" checked={form.sepa_mandat} onChange={e => setForm(f => ({ ...f, sepa_mandat: e.target.checked }))} required />
              <span>Ich erteile FitZone hiermit ein SEPA-Lastschriftmandat für den monatlichen Mitgliedsbeitrag (digitale Unterschrift am Tablet). *</span>
            </label>
          </div>

          {error && <p style={s.error}>{error}</p>}
          <button type="submit" style={s.btnPrimary} disabled={loading}>{loading ? 'Wird registriert…' : 'Jetzt registrieren'}</button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, required }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      <input style={s.input} type={type} value={value} onChange={e => onChange(e.target.value)} required={required} />
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: '2rem', boxSizing: 'border-box' },
  card: { background: '#fff', borderRadius: 14, padding: '2.5rem', width: '100%', maxWidth: 480, boxShadow: '0 10px 40px rgba(0,0,0,0.08)' },
  title: { margin: '0 0 0.5rem', fontSize: '1.6rem', color: '#111827' },
  subtitle: { margin: '0 0 1.75rem', color: '#6b7280', fontSize: '0.95rem' },
  text: { color: '#374151', fontSize: '1rem', lineHeight: 1.5 },
  field: { marginBottom: '1.1rem' },
  label: { display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#374151', marginBottom: 5 },
  sepaLabel: { display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.85rem', color: '#374151', cursor: 'pointer', lineHeight: 1.4 },
  input: { width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '1rem', boxSizing: 'border-box' },
  btnPrimary: { width: '100%', padding: '0.85rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '1.05rem', marginTop: '0.5rem' },
  error: { color: '#dc2626', fontSize: '0.85rem', margin: '0 0 0.75rem' },
}
