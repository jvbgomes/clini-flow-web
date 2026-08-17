import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import Tooltip from '../components/Tooltip';
import { useToast } from '../hooks/useToast';
import { useDebounce } from '../hooks/useDebounce';
import { exportCSV } from '../utils/exportCSV';
import './Appointments.css';

const PAGE_SIZE = 20;

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function toDatetimeLocal(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
      <td><div className="skeleton skeleton-text" style={{ width: `${50 + (i % 4) * 12}%` }} /></td>
      <td><div className="skeleton skeleton-text" style={{ width: '75%' }} /></td>
      <td><div className="skeleton skeleton-text" style={{ width: 80, borderRadius: 12 }} /></td>
      <td><div className="skeleton skeleton-text" style={{ width: `${40 + (i % 3) * 15}%` }} /></td>
      <td></td>
    </tr>
  ));
}

const EMPTY_FORM = { patientId: '', date: '', status: 'scheduled', notes: '' };

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState({ scheduled: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState({ col: 'date', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editId, setEditId] = useState(null);
  const [formError, setFormError] = useState('');
  const [formWarning, setFormWarning] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const { addToast } = useToast();
  const searchRef = useRef(null);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({ page, limit: PAGE_SIZE, sortBy: sort.col, sortDir: sort.dir });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilter) params.set('status', statusFilter);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);

    api.get(`/appointments?${params}`).then(({ data }) => {
      if (!cancelled) {
        setAppointments(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setStatusCounts(data.statusCounts || { scheduled: 0, completed: 0, cancelled: 0 });
        setLoading(false);
      }
    }).catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [page, sort, debouncedSearch, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    api.get('/patients?limit=500').then(({ data }) => setPatients(data.data || []));
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openCreate(); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function fetchAppointments() {
    const params = new URLSearchParams({ page, limit: PAGE_SIZE, sortBy: sort.col, sortDir: sort.dir });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilter) params.set('status', statusFilter);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    const { data } = await api.get(`/appointments?${params}`);
    setAppointments(data.data);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setStatusCounts(data.statusCounts || { scheduled: 0, completed: 0, cancelled: 0 });
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
    setFormWarning('');
    setFieldErrors({});
    setModal('form');
  }

  function openEdit(appt) {
    setForm({
      patientId: String(appt.patientId),
      date: toDatetimeLocal(appt.date),
      status: appt.status,
      notes: appt.notes || '',
    });
    setEditId(appt.id);
    setFormError('');
    setFormWarning('');
    setFieldErrors({});
    setModal('form');
  }

  function closeModal() { setModal(null); setFormError(''); setFormWarning(''); setFieldErrors({}); }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (fieldErrors[name]) setFieldErrors(fe => ({ ...fe, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    setFormWarning('');
    setFieldErrors({});
    try {
      const payload = { ...form, patientId: Number(form.patientId) };
      if (editId) {
        await api.put(`/appointments/${editId}`, payload);
        addToast('Appointment updated successfully.');
      } else {
        await api.post('/appointments', payload);
        addToast('Appointment created successfully.');
      }
      await fetchAppointments();
      closeModal();
    } catch (err) {
      const data = err.response?.data;
      const status = err.response?.status;
      if (status === 409) {
        setFormWarning(data?.message || 'Scheduling conflict detected.');
      } else {
        setFormError(data?.message || 'Something went wrong.');
        if (data?.errors) {
          const fe = {};
          data.errors.forEach(e => { fe[e.field] = e.message; });
          setFieldErrors(fe);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id, newStatus) {
    setAppointments(prev =>
      prev.map(a => a.id === id ? { ...a, status: newStatus } : a)
    );
    try {
      await api.patch(`/appointments/${id}/status`, { status: newStatus });
      addToast('Status updated.');
    } catch {
      addToast('Failed to update status.', 'error');
      await fetchAppointments();
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/appointments/${id}`);
      await fetchAppointments();
      addToast('Appointment deleted.');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete.', 'error');
    } finally {
      setConfirmId(null);
    }
  }

  function clearFilters() {
    setStatusFilter('');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  function handleExportCSV() {
    const rows = appointments.map(a => ({
      Patient: a.patient?.name || '',
      'Date & Time': formatDateTime(a.date),
      Status: a.status,
      Notes: a.notes || '',
    }));
    exportCSV(rows, 'appointments.csv');
  }

  const hasFilters = statusFilter || debouncedSearch || search || dateFrom || dateTo;
  const totalAll = statusCounts.scheduled + statusCounts.completed + statusCounts.cancelled;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">{total} of {totalAll} appointment{totalAll !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportCSV} disabled={loading || total === 0}>
            Export CSV
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <IconPlus /> New Appointment
          </button>
        </div>
      </div>

      <div className="filters">
        <input
          ref={searchRef}
          type="search"
          className="search-input"
          placeholder="Search by patient… (/)"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); setLoading(true); }}
        />
        <select className="filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); setLoading(true); }}>
          <option value="">All statuses ({totalAll})</option>
          <option value="scheduled">Scheduled ({statusCounts.scheduled})</option>
          <option value="completed">Completed ({statusCounts.completed})</option>
          <option value="cancelled">Cancelled ({statusCounts.cancelled})</option>
        </select>
        <input type="date" className="form-input" style={{ width: 150 }} title="From date" value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(1); setLoading(true); }} />
        <input type="date" className="form-input" style={{ width: 150 }} title="To date" value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(1); setLoading(true); }} />
        {hasFilters && (
          <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear filters</button>
        )}
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="th-sort" onClick={() => toggleSort('patient')}>Patient <SortIcon col="patient" sort={sort} /></th>
                <th className="th-sort" onClick={() => toggleSort('date')}>Date & Time <SortIcon col="date" sort={sort} /></th>
                <th className="th-sort" onClick={() => toggleSort('status')}>Status <SortIcon col="status" sort={sort} /></th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : appointments.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state">{hasFilters ? 'No appointments match the filters.' : 'No appointments yet. Press N to create one.'}</div></td></tr>
              ) : (
                appointments.map(appt => (
                  <tr key={appt.id}>
                    <td style={{ fontWeight: 500 }}>{appt.patient?.name || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatDateTime(appt.date)}</td>
                    <td>
                      <select
                        className={`status-select status-${appt.status}`}
                        value={appt.status}
                        onChange={e => handleStatusChange(appt.id, e.target.value)}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td style={{ maxWidth: 220 }}><Tooltip text={appt.notes} /></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(appt)}>Edit</button>
                      <button className="btn btn-ghost-danger btn-sm" onClick={() => setConfirmId(appt.id)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && total > PAGE_SIZE && (
        <Pagination page={page} totalPages={totalPages} onPageChange={p => { setPage(p); setLoading(true); }} from={from} to={to} total={total} />
      )}

      {modal === 'form' && (
        <Modal
          title={editId ? 'Edit Appointment' : 'New Appointment'}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" form="appt-form" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          }
        >
          {formWarning && <div className="alert alert-warning">{formWarning}</div>}
          {formError && !Object.keys(fieldErrors).length && <div className="alert alert-error">{formError}</div>}
          <form id="appt-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Patient *</label>
              <select className={`form-input${fieldErrors.patientId ? ' field-error' : ''}`} name="patientId" value={form.patientId} onChange={handleChange} required>
                <option value="">Select a patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {fieldErrors.patientId && <span className="field-error-msg">{fieldErrors.patientId}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Date & Time *</label>
              <input className={`form-input${fieldErrors.date ? ' field-error' : ''}`} type="datetime-local" name="date" value={form.date} onChange={handleChange} required />
              {fieldErrors.date && <span className="field-error-msg">{fieldErrors.date}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" name="status" value={form.status} onChange={handleChange}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Notes</label>
              <textarea className="form-input" name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Optional notes..." style={{ resize: 'vertical' }} />
            </div>
          </form>
        </Modal>
      )}

      {confirmId && (
        <ConfirmModal
          title="Delete Appointment"
          message="Are you sure you want to delete this appointment?"
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}
