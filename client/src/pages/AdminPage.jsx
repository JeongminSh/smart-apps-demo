import { useState, useEffect } from 'react'
import { api } from '../api/index.js'

const TODAY = new Date().toISOString().slice(0, 10)

// ── Shell ────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'mitglieder', label: 'Mitglieder' },
  { key: 'kursplanung', label: 'Kursplanung' },
  { key: 'stammdaten', label: 'Stammdaten' },
]

export default function AdminPage() {
  const [tab, setTab] = useState('mitglieder')
  const s = styles
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f9fafb' }}>
      <nav style={s.nav}>
        <span style={s.logo}>FitZone Admin</span>
        {TABS.map(t => (
          <button key={t.key} style={{ ...s.navBtn, ...(tab === t.key ? s.navBtnActive : {}) }} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>
      <main>
        {tab === 'mitglieder' && <MitgliederTab />}
        {tab === 'kursplanung' && <KursplanungTab />}
        {tab === 'stammdaten' && <StammdatenTab />}
      </main>
    </div>
  )
}

// ── Mitglieder ────────────────────────────────────────────────────────────────

const EMPTY_MITGLIED = { name: '', email: '', telefon: '', geburtstag: '', tarif_id: '', start_datum: TODAY, sepa_mandat: false }

function MitgliederTab() {
  const [mitglieder, setMitglieder] = useState([])
  const [tarife, setTarife] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_MITGLIED)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { load(); api.get('/tarife').then(setTarife) }, [])
  function load() { api.get('/mitglieder').then(setMitglieder) }

  function openCreate() { setForm(EMPTY_MITGLIED); setError(''); setModal({ mode: 'create' }) }
  function openEdit(m) {
    setForm({ name: m.name, email: m.email, telefon: m.telefon ?? '', geburtstag: m.geburtstag ?? '',
      tarif_id: m.tarif_id ?? '', start_datum: m.ms_start_datum ?? TODAY,
      sepa_mandat: false, mitgliedschaft_id: m.mitgliedschaft_id ?? null })
    setError(''); setModal({ mode: 'edit', id: m.id })
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (modal.mode === 'create') {
        const { id } = await api.post('/mitglieder', { name: form.name, email: form.email, telefon: form.telefon || null, geburtstag: form.geburtstag || null })
        if (form.tarif_id) await api.post('/mitgliedschaften', { mitglied_id: id, tarif_id: Number(form.tarif_id), start_datum: form.start_datum, sepa_mandat: form.sepa_mandat ? 1 : 0, sepa_datum: form.sepa_mandat ? TODAY : null })
      } else {
        await api.put(`/mitglieder/${modal.id}`, { name: form.name, email: form.email, telefon: form.telefon || null, geburtstag: form.geburtstag || null })
        if (form.tarif_id) {
          if (form.mitgliedschaft_id) await api.put(`/mitgliedschaften/${form.mitgliedschaft_id}`, { tarif_id: Number(form.tarif_id) })
          else await api.post('/mitgliedschaften', { mitglied_id: modal.id, tarif_id: Number(form.tarif_id), start_datum: TODAY, sepa_mandat: 0 })
        }
      }
      setModal(null); load()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Mitglied "${name}" wirklich löschen?`)) return
    try { await api.delete(`/mitglieder/${id}`); load() } catch (err) { alert(err.message) }
  }

  const s = styles
  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Mitglieder</h1>
        <button style={s.btnPrimary} onClick={openCreate}>+ Neues Mitglied</button>
      </div>
      <table style={s.table}>
        <thead><tr>{['Name', 'E-Mail', 'Tarif', 'Status', 'No-Shows', 'Gesperrt bis', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
        <tbody>
          {mitglieder.length === 0 && <tr><td colSpan={7} style={s.empty}>Noch keine Mitglieder</td></tr>}
          {mitglieder.map(m => (
            <tr key={m.id} style={s.tr}>
              <td style={s.td}><strong>{m.name}</strong></td>
              <td style={s.td}>{m.email}</td>
              <td style={s.td}>{m.tarif_name ? <span style={s.tarifBadge}>{m.tarif_name} · {m.tarif_preis}€</span> : <span style={{ color: '#9ca3af' }}>—</span>}</td>
              <td style={s.td}><StatusBadge status={m.ms_status} /></td>
              <td style={s.td}>{m.no_show_zaehler}</td>
              <td style={s.td}>{m.gesperrt_bis ?? '—'}</td>
              <td style={s.td}>
                <button style={s.btnSmall} onClick={() => openEdit(m)}>Bearbeiten</button>{' '}
                <button style={{ ...s.btnSmall, ...s.btnDanger }} onClick={() => handleDelete(m.id, m.name)}>Löschen</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={s.modalBox}>
            <h2 style={s.modalTitle}>{modal.mode === 'create' ? 'Neues Mitglied anlegen' : 'Mitglied bearbeiten'}</h2>
            <form onSubmit={handleSubmit}>
              <Field label="Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
              <Field label="E-Mail *" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} required />
              <Field label="Telefon" value={form.telefon} onChange={v => setForm(f => ({ ...f, telefon: v }))} />
              <Field label="Geburtstag" type="date" value={form.geburtstag} onChange={v => setForm(f => ({ ...f, geburtstag: v }))} />
              <div style={s.field}>
                <label style={s.label}>Tarif</label>
                <select style={s.input} value={form.tarif_id} onChange={e => setForm(f => ({ ...f, tarif_id: e.target.value }))}>
                  <option value="">— kein Tarif —</option>
                  {tarife.map(t => <option key={t.id} value={t.id}>{t.name} · {t.preis}€/Monat{t.buchungen_pro_monat ? ` (max. ${t.buchungen_pro_monat})` : ' (unbegrenzt)'}</option>)}
                </select>
              </div>
              {modal.mode === 'create' && <>
                <Field label="Startdatum *" type="date" value={form.start_datum} onChange={v => setForm(f => ({ ...f, start_datum: v }))} required />
                <div style={s.field}>
                  <label style={{ ...s.label, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.sepa_mandat} onChange={e => setForm(f => ({ ...f, sepa_mandat: e.target.checked }))} />
                    SEPA-Mandat erteilt (Tablet-Unterschrift)
                  </label>
                </div>
              </>}
              {error && <p style={s.error}>{error}</p>}
              <div style={s.modalActions}>
                <button type="button" style={s.btnSecondary} onClick={() => setModal(null)}>Abbrechen</button>
                <button type="submit" style={s.btnPrimary} disabled={loading}>{loading ? 'Speichern…' : 'Speichern'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Kursplanung ───────────────────────────────────────────────────────────────

const EMPTY_TERMIN = { kurstyp_id: '', kurstyp_format: '', trainer_id: '', datum_zeit: '', kapazitaet: '', zoom_link: '' }

function KursplanungTab() {
  const [kurstermine, setKurstermine] = useState([])
  const [kurstypen, setKurstypen] = useState([])
  const [trainer, setTrainer] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_TERMIN)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [buchungsModal, setBuchungsModal] = useState(null)

  useEffect(() => { load(); api.get('/kurstypen').then(setKurstypen); api.get('/trainer').then(setTrainer) }, [])
  function load() { api.get('/kurstermine').then(setKurstermine) }

  function openCreate() { setForm(EMPTY_TERMIN); setError(''); setModal({ mode: 'create' }) }
  function openEdit(k) {
    setForm({ kurstyp_id: k.kurstyp_id, kurstyp_format: k.kurstyp_format,
      trainer_id: k.trainer_id, datum_zeit: k.datum_zeit.slice(0, 16),
      kapazitaet: k.kapazitaet, zoom_link: k.zoom_link ?? '' })
    setError(''); setModal({ mode: 'edit', id: k.id, kurstyp_name: k.kurstyp_name })
  }

  function onKurstypChange(id) {
    const kt = kurstypen.find(k => k.id === Number(id))
    setForm(f => ({ ...f, kurstyp_id: id, kurstyp_format: kt?.format ?? '', kapazitaet: kt?.standard_kapazitaet ?? '', trainer_id: '', zoom_link: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (modal.mode === 'create') {
        await api.post('/kurstermine', { kurstyp_id: Number(form.kurstyp_id), trainer_id: Number(form.trainer_id), datum_zeit: form.datum_zeit, kapazitaet: Number(form.kapazitaet), zoom_link: form.zoom_link || null })
      } else {
        await api.put(`/kurstermine/${modal.id}`, { trainer_id: Number(form.trainer_id), datum_zeit: form.datum_zeit, kapazitaet: Number(form.kapazitaet), zoom_link: form.zoom_link || null })
      }
      setModal(null); load()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function handleAbsagen(k) {
    if (!confirm(`Termin "${k.kurstyp_name}" am ${formatDt(k.datum_zeit)} wirklich absagen?`)) return
    try { await api.put(`/kurstermine/${k.id}/absagen`, {}); load() } catch (err) { alert(err.message) }
  }

  const eligibleTrainer = form.kurstyp_id
    ? trainer.filter(t => (t.kurstyp_ids ?? '').split(',').map(Number).includes(Number(form.kurstyp_id)))
    : trainer

  const s = styles
  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Kursplanung</h1>
        <button style={s.btnPrimary} onClick={openCreate}>+ Neuer Termin</button>
      </div>
      <table style={s.table}>
        <thead><tr>{['Datum / Zeit', 'Kurstyp', 'Format', 'Trainer', 'Kapazität', 'Gebucht', 'Status', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
        <tbody>
          {kurstermine.length === 0 && <tr><td colSpan={8} style={s.empty}>Noch keine Kurstermine — Stammdaten zuerst anlegen</td></tr>}
          {kurstermine.map(k => (
            <tr key={k.id} style={s.tr}>
              <td style={s.td}><strong>{formatDt(k.datum_zeit)}</strong></td>
              <td style={s.td}>{k.kurstyp_name}</td>
              <td style={s.td}><FormatBadge format={k.kurstyp_format} /></td>
              <td style={s.td}>{k.trainer_name}</td>
              <td style={s.td}>{k.kapazitaet}</td>
              <td style={s.td}>{k.buchungen_count} / {k.kapazitaet}</td>
              <td style={s.td}><StatusBadge status={k.status} /></td>
              <td style={s.td}>
                <button style={s.btnSmall} onClick={() => setBuchungsModal(k)}>Teilnehmer</button>
                {k.status === 'geplant' && <>
                  {' '}<button style={s.btnSmall} onClick={() => openEdit(k)}>Bearbeiten</button>
                  {' '}<button style={{ ...s.btnSmall, ...s.btnWarning }} onClick={() => handleAbsagen(k)}>Absagen</button>
                </>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {buchungsModal && <TeilnehmerModal kurstermin={buchungsModal} onClose={() => { setBuchungsModal(null); load() }} />}
      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={s.modalBox}>
            <h2 style={s.modalTitle}>{modal.mode === 'create' ? 'Neuer Kurstermin' : 'Kurstermin bearbeiten'}</h2>
            <form onSubmit={handleSubmit}>
              {modal.mode === 'create'
                ? <div style={s.field}>
                    <label style={s.label}>Kurstyp *</label>
                    <select style={s.input} value={form.kurstyp_id} onChange={e => onKurstypChange(e.target.value)} required>
                      <option value="">— Kurstyp wählen —</option>
                      {kurstypen.map(kt => <option key={kt.id} value={kt.id}>{kt.name} ({kt.format})</option>)}
                    </select>
                  </div>
                : <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 1rem' }}>Kurstyp: <strong>{modal.kurstyp_name}</strong></p>
              }
              <div style={s.field}>
                <label style={s.label}>Trainer *</label>
                <select style={s.input} value={form.trainer_id} onChange={e => setForm(f => ({ ...f, trainer_id: e.target.value }))} required>
                  <option value="">— Trainer wählen —</option>
                  {eligibleTrainer.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {form.kurstyp_id && eligibleTrainer.length === 0 &&
                  <p style={{ color: '#d97706', fontSize: '0.8rem', margin: '4px 0 0' }}>Kein qualifizierter Trainer — unter Stammdaten zuweisen.</p>}
              </div>
              <Field label="Datum und Uhrzeit *" type="datetime-local" value={form.datum_zeit} onChange={v => setForm(f => ({ ...f, datum_zeit: v }))} required />
              <Field label="Kapazität *" type="number" value={String(form.kapazitaet)} onChange={v => setForm(f => ({ ...f, kapazitaet: v }))} required />
              {form.kurstyp_format === 'Online' &&
                <Field label="Zoom-Link" value={form.zoom_link} onChange={v => setForm(f => ({ ...f, zoom_link: v }))} />}
              {error && <p style={s.error}>{error}</p>}
              <div style={s.modalActions}>
                <button type="button" style={s.btnSecondary} onClick={() => setModal(null)}>Abbrechen</button>
                <button type="submit" style={s.btnPrimary} disabled={loading}>{loading ? 'Speichern…' : 'Speichern'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Teilnehmerliste Modal ─────────────────────────────────────────────────────

function TeilnehmerModal({ kurstermin, onClose }) {
  const [buchungen, setBuchungen] = useState([])
  const [mitglieder, setMitglieder] = useState([])
  const [neuesMitgliedId, setNeuesMitgliedId] = useState('')
  const [buchungError, setBuchungError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    load()
    api.get('/mitglieder').then(setMitglieder)
  }, [kurstermin.id])

  function load() { api.get(`/buchungen?kurstermin_id=${kurstermin.id}`).then(setBuchungen) }

  async function handleBuchen(e) {
    e.preventDefault(); setBuchungError(''); setLoading(true)
    try {
      await api.post('/buchungen', { mitglied_id: Number(neuesMitgliedId), kurstermin_id: kurstermin.id })
      setNeuesMitgliedId(''); load()
    } catch (err) { setBuchungError(err.message) }
    finally { setLoading(false) }
  }

  async function handleStorno(id) {
    if (!confirm('Buchung stornieren?')) return
    try { await api.put(`/buchungen/${id}/stornieren`, {}); load() } catch (err) { alert(err.message) }
  }

  const bereitsGebucht = new Set(buchungen.filter(b => !b.storniert_am).map(b => b.mitglied_id))
  const buchbareMitglieder = mitglieder.filter(m => !bereitsGebucht.has(m.id))
  const aktiveCount = buchungen.filter(b => !b.storniert_am).length
  const s = styles

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modalBox, width: 640 }}>
        <h2 style={s.modalTitle}>
          {kurstermin.kurstyp_name} — {formatDt(kurstermin.datum_zeit)}
          <span style={{ fontWeight: 400, color: '#6b7280', fontSize: '0.9rem', marginLeft: 12 }}>
            {aktiveCount} / {kurstermin.kapazitaet} Plätze
          </span>
        </h2>

        <table style={s.table}>
          <thead><tr>{['Mitglied', 'Tarif', 'Gebucht am', 'Erschienen', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {buchungen.length === 0 && <tr><td colSpan={5} style={s.empty}>Noch keine Buchungen</td></tr>}
            {buchungen.map(b => (
              <tr key={b.id} style={{ ...s.tr, opacity: b.storniert_am ? 0.45 : 1 }}>
                <td style={s.td}>
                  <strong>{b.mitglied_name}</strong>
                  {b.storniert_am && <span style={{ color: '#9ca3af', fontSize: '0.8rem', marginLeft: 6 }}>(storniert)</span>}
                </td>
                <td style={s.td}>{b.tarif_name ?? '—'}</td>
                <td style={s.td}>{formatDt(b.gebucht_am)}</td>
                <td style={s.td}>
                  {b.erschienen === 1 ? '✓ erschienen' : b.erschienen === 0 ? '✗ No-Show' : '—'}
                </td>
                <td style={s.td}>
                  {!b.storniert_am && <button style={{ ...s.btnSmall, ...s.btnDanger }} onClick={() => handleStorno(b.id)}>Storno</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {kurstermin.status === 'geplant' && (
          <form onSubmit={handleBuchen} style={{ marginTop: '1.25rem', display: 'flex', gap: 8 }}>
            <select style={{ ...s.input, flex: 1 }} value={neuesMitgliedId} onChange={e => setNeuesMitgliedId(e.target.value)} required>
              <option value="">— Mitglied hinzufügen —</option>
              {buchbareMitglieder.map(m => <option key={m.id} value={m.id}>{m.name}{m.tarif_name ? ` (${m.tarif_name})` : ''}</option>)}
            </select>
            <button type="submit" style={s.btnPrimary} disabled={loading}>{loading ? '…' : 'Buchen'}</button>
          </form>
        )}
        {buchungError && <p style={s.error}>{buchungError}</p>}

        <div style={{ ...s.modalActions, marginTop: '1rem' }}>
          <button style={s.btnSecondary} onClick={onClose}>Schließen</button>
        </div>
      </div>
    </div>
  )
}

// ── Stammdaten ────────────────────────────────────────────────────────────────

function StammdatenTab() {
  const [subtab, setSubtab] = useState('kurstypen')
  const s = styles
  return (
    <div style={s.page}>
      <h1 style={{ ...s.title, marginBottom: '1.25rem' }}>Stammdaten</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        {[{ key: 'kurstypen', label: 'Kurstypen' }, { key: 'trainer', label: 'Trainer' }].map(t => (
          <button key={t.key} onClick={() => setSubtab(t.key)}
            style={{ padding: '0.4rem 0.85rem', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem', background: subtab === t.key ? '#eff6ff' : 'transparent', color: subtab === t.key ? '#1d4ed8' : '#6b7280' }}>
            {t.label}
          </button>
        ))}
      </div>
      {subtab === 'kurstypen' ? <KurstypenSection /> : <TrainerSection />}
    </div>
  )
}

function KurstypenSection() {
  const [kurstypen, setKurstypen] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', format: 'Studio', standard_kapazitaet: '' })
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])
  function load() { api.get('/kurstypen').then(setKurstypen) }

  function openCreate() { setForm({ name: '', format: 'Studio', standard_kapazitaet: '' }); setError(''); setModal({ mode: 'create' }) }
  function openEdit(k) { setForm({ name: k.name, format: k.format, standard_kapazitaet: k.standard_kapazitaet }); setError(''); setModal({ mode: 'edit', id: k.id }) }

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    try {
      const body = { name: form.name, format: form.format, standard_kapazitaet: Number(form.standard_kapazitaet) }
      if (modal.mode === 'create') await api.post('/kurstypen', body)
      else await api.put(`/kurstypen/${modal.id}`, body)
      setModal(null); load()
    } catch (err) { setError(err.message) }
  }

  const s = styles
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button style={s.btnPrimary} onClick={openCreate}>+ Kurstyp anlegen</button>
      </div>
      <table style={s.table}>
        <thead><tr>{['Name', 'Format', 'Standard-Kapazität', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
        <tbody>
          {kurstypen.length === 0 && <tr><td colSpan={4} style={s.empty}>Noch keine Kurstypen</td></tr>}
          {kurstypen.map(k => (
            <tr key={k.id} style={s.tr}>
              <td style={s.td}><strong>{k.name}</strong></td>
              <td style={s.td}><FormatBadge format={k.format} /></td>
              <td style={s.td}>{k.standard_kapazitaet}</td>
              <td style={s.td}><button style={s.btnSmall} onClick={() => openEdit(k)}>Bearbeiten</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={s.modalBox}>
            <h2 style={s.modalTitle}>{modal.mode === 'create' ? 'Kurstyp anlegen' : 'Kurstyp bearbeiten'}</h2>
            <form onSubmit={handleSubmit}>
              <Field label="Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
              <div style={s.field}>
                <label style={s.label}>Format *</label>
                <select style={s.input} value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))}>
                  <option value="Studio">Studio</option>
                  <option value="Online">Online</option>
                </select>
              </div>
              <Field label="Standard-Kapazität *" type="number" value={String(form.standard_kapazitaet)} onChange={v => setForm(f => ({ ...f, standard_kapazitaet: v }))} required />
              {error && <p style={s.error}>{error}</p>}
              <div style={s.modalActions}>
                <button type="button" style={s.btnSecondary} onClick={() => setModal(null)}>Abbrechen</button>
                <button type="submit" style={s.btnPrimary}>Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function TrainerSection() {
  const [trainer, setTrainer] = useState([])
  const [kurstypen, setKurstypen] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', anstellungsart: 'fest', kurstyp_ids: [] })
  const [error, setError] = useState('')

  useEffect(() => { load(); api.get('/kurstypen').then(setKurstypen) }, [])
  function load() { api.get('/trainer').then(setTrainer) }

  function openCreate() { setForm({ name: '', anstellungsart: 'fest', kurstyp_ids: [] }); setError(''); setModal({ mode: 'create' }) }
  function openEdit(t) {
    const ids = t.kurstyp_ids ? t.kurstyp_ids.split(',').map(Number) : []
    setForm({ name: t.name, anstellungsart: t.anstellungsart, kurstyp_ids: ids })
    setError(''); setModal({ mode: 'edit', id: t.id })
  }

  function toggleKurstyp(id) {
    setForm(f => ({ ...f, kurstyp_ids: f.kurstyp_ids.includes(id) ? f.kurstyp_ids.filter(x => x !== id) : [...f.kurstyp_ids, id] }))
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    try {
      const body = { name: form.name, anstellungsart: form.anstellungsart, kurstyp_ids: form.kurstyp_ids }
      if (modal.mode === 'create') await api.post('/trainer', body)
      else await api.put(`/trainer/${modal.id}`, body)
      setModal(null); load()
    } catch (err) { setError(err.message) }
  }

  function kurstypNamen(ids_str) {
    if (!ids_str) return '—'
    const ids = ids_str.split(',').map(Number)
    return kurstypen.filter(k => ids.includes(k.id)).map(k => k.name).join(', ') || '—'
  }

  const s = styles
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button style={s.btnPrimary} onClick={openCreate}>+ Trainer anlegen</button>
      </div>
      <table style={s.table}>
        <thead><tr>{['Name', 'Anstellungsart', 'Qualifiziert für', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
        <tbody>
          {trainer.length === 0 && <tr><td colSpan={4} style={s.empty}>Noch keine Trainer angelegt</td></tr>}
          {trainer.map(t => (
            <tr key={t.id} style={s.tr}>
              <td style={s.td}><strong>{t.name}</strong></td>
              <td style={s.td}>{t.anstellungsart}</td>
              <td style={s.td}>{kurstypNamen(t.kurstyp_ids)}</td>
              <td style={s.td}><button style={s.btnSmall} onClick={() => openEdit(t)}>Bearbeiten</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={s.modalBox}>
            <h2 style={s.modalTitle}>{modal.mode === 'create' ? 'Trainer anlegen' : 'Trainer bearbeiten'}</h2>
            <form onSubmit={handleSubmit}>
              <Field label="Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
              <div style={s.field}>
                <label style={s.label}>Anstellungsart *</label>
                <select style={s.input} value={form.anstellungsart} onChange={e => setForm(f => ({ ...f, anstellungsart: e.target.value }))}>
                  <option value="fest">Fest</option>
                  <option value="Honorar">Honorar</option>
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Qualifiziert für</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
                  {kurstypen.length === 0
                    ? <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Erst Kurstypen anlegen</span>
                    : kurstypen.map(kt => (
                        <label key={kt.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
                          <input type="checkbox" checked={form.kurstyp_ids.includes(kt.id)} onChange={() => toggleKurstyp(kt.id)} />
                          {kt.name}
                        </label>
                      ))
                  }
                </div>
              </div>
              {error && <p style={s.error}>{error}</p>}
              <div style={s.modalActions}>
                <button type="button" style={s.btnSecondary} onClick={() => setModal(null)}>Abbrechen</button>
                <button type="submit" style={s.btnPrimary}>Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ── Shared Helpers ────────────────────────────────────────────────────────────

function Field({ label, type = 'text', value, onChange, required }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <input style={styles.input} type={type} value={value} onChange={e => onChange(e.target.value)} required={required} />
    </div>
  )
}

function StatusBadge({ status }) {
  const map = { aktiv: ['#15803d', '#dcfce7'], pausiert: ['#b45309', '#fef3c7'], 'gekündigt': ['#b91c1c', '#fee2e2'], geplant: ['#1d4ed8', '#eff6ff'], abgesagt: ['#b91c1c', '#fee2e2'] }
  const [color, background] = map[status] ?? ['#6b7280', '#f3f4f6']
  return <span style={{ color, background, padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600 }}>{status ?? '—'}</span>
}

function FormatBadge({ format }) {
  const [color, background] = format === 'Online' ? ['#7c3aed', '#f5f3ff'] : ['#374151', '#f3f4f6']
  return <span style={{ color, background, padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600 }}>{format}</span>
}

function formatDt(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  nav: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', borderBottom: '1px solid #e5e7eb', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  logo: { fontWeight: 700, color: '#1d4ed8', marginRight: '1.5rem', fontSize: '1.05rem' },
  navBtn: { padding: '0.4rem 0.85rem', border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', fontWeight: 500, borderRadius: 6, fontSize: '0.9rem' },
  navBtnActive: { background: '#eff6ff', color: '#1d4ed8' },
  page: { padding: '2rem', maxWidth: 1100, margin: '0 auto' },
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
  btnWarning: { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  modalBox: { background: '#fff', borderRadius: 10, padding: '1.75rem', width: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' },
  modalTitle: { margin: '0 0 1.25rem', fontSize: '1.15rem', color: '#111827' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' },
  field: { marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: 4 },
  input: { width: '100%', padding: '0.45rem 0.65rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.9rem', boxSizing: 'border-box' },
  error: { color: '#dc2626', fontSize: '0.85rem', margin: '0.5rem 0 0' },
}
