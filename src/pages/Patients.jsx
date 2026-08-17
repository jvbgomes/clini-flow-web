import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import { useToast } from '../hooks/useToast';
import { useDebounce } from '../hooks/useDebounce';
import { exportCSV } from '../utils/exportCSV';

const PAGE_SIZE = 20;

function formatCPF(cpf) {
  if (!cpf) return '';
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatBirthDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SortIcon({ col, sort }) {
  if (sort.col !== col) return <span className="sort-icon">⇅</span>;
  return <span className="sort-icon active">{sort.dir === 'asc' ? '↑' : '↓'}</span>;
}

function SkeletonRows() {
  return Array.from({ length: 8 }).map((_, i) => (
    <tr key={i}>
      <td><div className="skeleton skeleton-text" style={{ width: `${55 + (i % 4) * 10}%` }} /></td>
      <td><div className="skeleton skeleton-text" style={{ width: '80%' }} /></td>
      <td><div className="skeleton skeleton-text" style={{ width: '60%' }} /></td>
      <td><div className="skeleton skeleton-text" style={{ width: '50%' }} /></td>
      <td style={{ textAlign: 'center' }}><div className="skeleton" style={{ width: 24, height: 24, borderRadius: '50%', margin: '0 auto' }} /></td>
      <td></td>
    </tr>
  ));
}

const EMPTY_FORM = { name: '', cpf: '', phone: '', birthDate: '' };

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState({ col: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editId, setEditId] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const { addToast } = useToast();
  const searchRef = useRef(null);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({
      page,
      limit: PAGE_SIZE,
      sortBy: sort.col,
      sortDir: sort.dir,
    });
    if (debouncedSearch) params.set('search', debouncedSearch);

    api.get(`/patients?${params}`).then(({ data }) => {
      if (!cancelled) {
        setPatients(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setLoading(false);
      }
    }).catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [page, sort, debouncedSearch]);

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openCreate(); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function fetchPatients() {
    const params = new URLSearchParams({ page, limit: PAGE_SIZE, sortBy: sort.col, sortDir: sort.dir });
    if (debouncedSearch) params.set('search', debouncedSearch);
    const { data } = await api.get(`/patients?${params}`);
    setPatients(data.data);
    setTotal(data.total);
    setTotalPages(data.totalPages);
  }

  function toggleSort(col) {
    setSort(s => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }));
    setPage(1);
    setLoading(true);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setFormError('');
    setFieldErrors({});
    setModal('form');
  }

  function openEdit(patient) {
    setForm({
      name: patient.name,
      cpf: patient.cpf,
      phone: patient.phone || '',
      birthDate: patient.birthDate || '',
    });
    setEditId(patient.id);
    setFormError('');
    setFieldErrors({});
    setModal('form');
  }

  function closeModal() { setModal(null); setFormError(''); setFieldErrors({}); }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (fieldErrors[name]) setFieldErrors(fe => ({ ...fe, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    setFieldErrors({});
    try {
      if (editId) {
        await api.put(`/patients/${editId}`, form);
        addToast('Patient updated successfully.');
      } else {
        await api.post('/patients', form);
        addToast('Patient created successfully.');
      }
      await fetchPatients();
      closeModal();
    } catch (err) {
      const data = err.response?.data;
      setFormError(data?.message || 'Something went wrong.');
      if (data?.errors) {
        const fe = {};
        data.errors.forEach(e => { fe[e.field] = e.message; });
        setFieldErrors(fe);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/patients/${id}`);
      await fetchPatients();
      addToast('Patient deleted.');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete.', 'error');
    } finally {
      setConfirmId(null);
    }
  }

  function handleExportCSV() {
    const rows = patients.map(p => ({
      Name: p.name,
      CPF: formatCPF(p.cpf),
      Phone: p.phone || '',
      'Birth Date': formatBirthDate(p.birthDate),
      Appointments: p.appointmentCount ?? 0,
    }));
    exportCSV(rows, 'patients.csv');
  }

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">
            {total} patient{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportCSV} disabled={loading || total === 0}>
            Export CSV
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <IconPlus /> New Patient
          </button>
        </div>
      </div>

      <div className="filters">
        <input
          ref={searchRef}
          type="search"
          className="search-input"
          placeholder="Search by name or CPF… (/)"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); setLoading(true); }}
        />
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="th-sort" onClick={() => toggleSort('name')}>
                  Name <SortIcon col="name" sort={sort} />
                </th>
                <th className="th-sort" onClick={() => toggleSort('cpf')}>
                  CPF <SortIcon col="cpf" sort={sort} />
                </th>
                <th>Phone</th>
                <th className="th-sort" onClick={() => toggleSort('birthDate')}>
                  Birth Date <SortIcon col="birthDate" sort={sort} />
                </th>
                <th className="th-sort" onClick={() => toggleSort('appointments')} style={{ textAlign: 'center' }}>
                  Appts <SortIcon col="appointments" sort={sort} />
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : patients.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state">{debouncedSearch ? 'No patients match your search.' : 'No patients yet. Press N to create one.'}</div></td></tr>
              ) : (
                patients.map(patient => (
                  <tr key={patient.id}>
                    <td style={{ fontWeight: 500 }}>
                      <Link to={`/patients/${patient.id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                        {patient.name}
                      </Link>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{formatCPF(patient.cpf)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{patient.phone || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatBirthDate(patient.birthDate)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, borderRadius: '50%',
                        background: patient.appointmentCount ? 'var(--primary)' : 'var(--border)',
                        color: patient.appointmentCount ? '#fff' : 'var(--text-muted)',
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {patient.appointmentCount ?? 0}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(patient)}>Edit</button>
                      <button className="btn btn-ghost-danger btn-sm" onClick={() => setConfirmId(patient.id)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && total > PAGE_SIZE && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={p => { setPage(p); setLoading(true); }}
          from={from}
          to={to}
          total={total}
        />
      )}

      {modal === 'form' && (
        <Modal
          title={editId ? 'Edit Patient' : 'New Patient'}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" form="patient-form" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          }
        >
          {formError && !Object.keys(fieldErrors).length && <div className="alert alert-error">{formError}</div>}
          <form id="patient-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className={`form-input${fieldErrors.name ? ' field-error' : ''}`} name="name" value={form.name} onChange={handleChange} placeholder="Jane Doe" required />
              {fieldErrors.name && <span className="field-error-msg">{fieldErrors.name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">CPF *</label>
              <input className={`form-input${fieldErrors.cpf ? ' field-error' : ''}`} name="cpf" value={form.cpf} onChange={handleChange} placeholder="00000000000" required />
              {fieldErrors.cpf && <span className="field-error-msg">{fieldErrors.cpf}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className={`form-input${fieldErrors.phone ? ' field-error' : ''}`} name="phone" value={form.phone} onChange={handleChange} placeholder="(00) 00000-0000" />
              {fieldErrors.phone && <span className="field-error-msg">{fieldErrors.phone}</span>}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Birth Date</label>
              <input className={`form-input${fieldErrors.birthDate ? ' field-error' : ''}`} type="date" name="birthDate" value={form.birthDate} onChange={handleChange} />
              {fieldErrors.birthDate && <span className="field-error-msg">{fieldErrors.birthDate}</span>}
            </div>
          </form>
        </Modal>
      )}

      {confirmId && (
        <ConfirmModal
          title="Delete Patient"
          message="Are you sure you want to delete this patient? This action cannot be undone."
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}
