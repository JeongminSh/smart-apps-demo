import { useState, useEffect } from 'react'
import { api } from '../api/index.js'

const TODAY = new Date().toISOString().slice(0, 10)

const EMPTY_FORM = {
  name: '',
  email: '',
  telefon: '',
  geburtstag: '',
  tarif_id: '',
  start_datum: TODAY,
  sepa_mandat: false,
}

export default function AdminPage() {
  const [mitglieder, setMitglieder] = useState([])
  const [tarife, setTarife] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    load()
    api.get('/tarife').then(setTarife)
  }, [])

  function load() {
    api.get('/mitglieder').then(setMitglieder)
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setError('')
    setModal({ mode: 'create' })
  }

  function openEdit(m) {
    setForm({
      name: m.name,
      email: m.email,
      telefon: m.telefon ?? '',
      geburtstag: m.geburtstag ?? '',
      tarif_id: m.tarif_id ?? '',
      start_datum: m.ms_start_datum ?? TODAY,
      sepa_mandat: false,
      mitgliedschaft_id: m.mitgliedschaft_id ?? null,
    })
    setError('')
    setModal({ mode: 'edit', id: m.id })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (modal.mode === 'create') {
        const { id } = await api.post('/mitglieder', {
          name: form.name,
          email: form.email,
          telefon: form.telefon || null,
          geburtstag: form.geburtstag || null,
        })
        if (form.tarif_id) {
          await api.post('/mitgliedschaften', {
            mitglied_id: id,
            tarif_id: Number(form.tarif_id),
            start_datum: form.start_datum,
            sepa_mandat: form.sepa_mandat ? 1 : 0,
            sepa_datum: form.sepa_mandat ? TODAY : null,
          })
        }
      } else {
        await api.put(`/mitglieder/${modal.id}`, {
          name: form.name,
          email: form.email,
          telefon: form.telefon || null,
          geburtstag: form.geburtstag || null,
        })
        if (form.tarif_id) {
          if (form.mitgliedschaft_id) {
            await api.put(`/mitgliedschaften/${form.mitgliedschaft_id}`, {
              tarif_id: Number(form.tarif_id),
            })
          } else {
            await api.post('/mitgliedschaften', {
              mitglied_id: modal.id,
              tarif_id: Number(form.tarif_id),
              start_datum: TODAY,
              sepa_mandat: 0,
            })
          }
        }
      }
      setModal(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Mitglied "${name}" wirklich löschen?`)) return
    try {
      await api.delete(`/mitglieder/${id}`)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  const s = styles
  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Mitgliederverwaltung</h1>
        <button style={s.btnPrimary} onClick={openCreate}>+ Neues Mitglied</button>
      </div>

      <table style={s.table}>
        <thead>
          <tr>
            {['Name', 'E-Mail', 'Tarif', 'Status', 'No-Shows', 'Gesperrt bis', ''].map(h => (
              <th key={h} style={s.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mitglieder.length === 0 && (
            <tr><td colSpan={7} style={s.empty}>Noch keine Mitglieder vorhanden</td></tr>
          )}
          {mitglieder.map(m => (
            <tr key={m.id} style={s.tr}>
              <td style={s.td}><strong>{m.name}</strong></td>
              <td style={s.td}>{m.email}</td>
              <td style={s.td}>
                {m.tarif_name
                  ? <span style={s.tarifBadge}>{m.tarif_name} · {m.tarif_preis}€</span>
                  : <span style={{ color: '#9ca3af' }}>—</span>}
              </td>
              <td style={s.td}><StatusBadge status={m.ms_status} /></td>
              <td style={s.td}>{m.no_show_zaehler}</td>
              <td style={s.td}>{m.gesperrt_bis ?? '—'}</td>
              <td style={s.td}>
                <button style={s.btnSmall} onClick={() => openEdit(m)}>Bearbeiten</button>
                {' '}
                <button style={{ ...s.btnSmall, ...s.btnDanger }} onClick={() => handleDelete(m.id, m.name)}>Löschen</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={s.modalBox}>
            <h2 style={s.modalTitle}>
              {modal.mode === 'create' ? 'Neues Mitglied anlegen' : 'Mitglied bearbeiten'}
            </h2>
            <form onSubmit={handleSubmit}>
              <Field label="Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
              <Field label="E-Mail *" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} required />
              <Field label="Telefon" value={form.telefon} onChange={v => setForm(f => ({ ...f, telefon: v }))} />
              <Field label="Geburtstag" type="date" value={form.geburtstag} onChange={v => setForm(f => ({ ...f, geburtstag: v }))} />

              <div style={s.field}>
                <label style={s.label}>Tarif</label>
                <select
                  style={s.input}
                  value={form.tarif_id}
                  onChange={e => setForm(f => ({ ...f, tarif_id: e.target.value }))}
                >
                  <option value="">— kein Tarif —</option>
                  {tarife.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.preis}€/Monat
                      {t.buchungen_pro_monat ? ` (max. ${t.buchungen_pro_monat} Buchungen)` : ' (unbegrenzt)'}
                    </option>
                  ))}
                </select>
              </div>

              {modal.mode === 'create' && (
                <>
                  <Field
                    label="Startdatum *"
                    type="date"
                    value={form.start_datum}
                    onChange={v => setForm(f => ({ ...f, start_datum: v }))}
                    required
                  />
                  <div style={s.field}>
                    <label style={{ ...s.label, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.sepa_mandat}
                        onChange={e => setForm(f => ({ ...f, sepa_mandat: e.target.checked }))}
                      />
                      SEPA-Mandat erteilt (Tablet-Unterschrift)
                    </label>
                  </div>
                </>
              )}

              {error && <p style={s.error}>{error}</p>}

              <div style={s.modalActions}>
                <button type="button" style={s.btnSecondary} onClick={() => setModal(null)}>
                  Abbrechen
                </button>
                <button type="submit" style={s.btnPrimary} disabled={loading}>
                  {loading ? 'Speichern…' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, required }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
      />
    </div>
  )
}

function StatusBadge({ status }) {
  const colors = {
    aktiv: { color: '#15803d', background: '#dcfce7' },
    pausiert: { color: '#b45309', background: '#fef3c7' },
    'gekündigt': { color: '#b91c1c', background: '#fee2e2' },
  }
  const c = colors[status] ?? { color: '#6b7280', background: '#f3f4f6' }
  return (
    <span style={{ ...c, padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600 }}>
      {status ?? '—'}
    </span>
  )
}

const styles = {
  page: { padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { margin: 0, fontSize: '1.5rem', color: '#111827' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  th: { textAlign: 'left', padding: '0.6rem 0.75rem', borderBottom: '2px solid #e5e7eb', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '0.65rem 0.75rem', color: '#111827', verticalAlign: 'middle' },
  empty: { padding: '3rem', textAlign: 'center', color: '#9ca3af' },
  tarifBadge: { background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600 },
  btnPrimary: { padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' },
  btnSecondary: { padding: '0.5rem 1rem', background: '#f9fafb', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' },
  btnSmall: { padding: '0.25rem 0.65rem', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' },
  btnDanger: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  modalBox: { background: '#fff', borderRadius: 10, padding: '1.75rem', width: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' },
  modalTitle: { margin: '0 0 1.25rem', fontSize: '1.15rem', color: '#111827' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' },
  field: { marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: 4 },
  input: { width: '100%', padding: '0.45rem 0.65rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' },
  error: { color: '#dc2626', fontSize: '0.85rem', margin: '0.5rem 0 0' },
}
