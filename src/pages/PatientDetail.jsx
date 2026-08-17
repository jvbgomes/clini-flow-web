import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Tooltip from '../components/Tooltip';
import { useToast } from '../hooks/useToast';
import './PatientDetail.css';

const STATUS_LABELS = { scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled' };

function formatCPF(cpf) {
  if (!cpf) return '—';
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function getAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() - birth.getMonth() < 0 ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
}

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

const EMPTY_APPT = { date: '', status: 'scheduled', notes: '' };

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [apptModal, setApptModal] = useState(null);
  const [apptForm, setApptForm] = useState(EMPTY_APPT);
  const [apptEditId, setApptEditId] = useState(null);
  const [apptError, setApptError] = useState('');
  const [apptSaving, setApptSaving] = useState(false);
  const [confirmApptId, setConfirmApptId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function fetchPatient() {
    try {
      const { data } = await api.get(`/patients/${id}`);
      setPatient(data);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPatient(); }, [id]);

  async function handleStatusChange(apptId, newStatus) {
    setPatient(prev => ({
      ...prev,
      appointments: prev.appointments.map(a =>
        a.id === apptId ? { ...a, status: newStatus } : a
      ),
    }));
    try {
      await api.patch(`/appointments/${apptId}/status`, { status: newStatus });
      addToast('Status updated.');
    } catch {
      addToast('Failed to update status.', 'error');
      fetchPatient();
    }
  }

  function openCreateAppt() {
    setApptForm(EMPTY_APPT);
    setApptEditId(null);
    setApptError('');
    setApptModal('form');
  }

  function openEditAppt(appt) {
    setApptForm({ date: toDatetimeLocal(appt.date), status: appt.status, notes: appt.notes || '' });
    setApptEditId(appt.id);
    setApptError('');
    setApptModal('form');
  }

  async function handleApptSubmit(e) {
    e.preventDefault();
    setApptSaving(true);
    setApptError('');
    try {
      const payload = { ...apptForm, patientId: Number(id) };
      if (apptEditId) {
        await api.put(`/appointments/${apptEditId}`, payload);
        addToast('Appointment updated.');
      } else {
        await api.post('/appointments', payload);
        addToast('Appointment created.');
      }
      await fetchPatient();
      setApptModal(null);
    } catch (err) {
      setApptError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setApptSaving(false);
    }
  }

  async function handleApptDelete(apptId) {
    try {
      await api.delete(`/appointments/${apptId}`);
      await fetchPatient();
      addToast('Appointment deleted.');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete.', 'error');
    } finally {
      setConfirmApptId(null);
    }
  }

  async function handlePatientDelete() {
    try {
      await api.delete(`/patients/${id}`);
      addToast('Patient deleted.');
      navigate('/patients');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete.', 'error');
    } finally {
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-text" style={{ width: `${60 + (i % 3) * 15}%`, height: i === 0 ? 22 : 14 }} />
          ))}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page">
        <div className="empty-state">Patient not found. <Link to="/patients">Back to patients</Link></div>
      </div>
    );
  }

  const appointments = [...(patient.appointments || [])].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  const age = getAge(patient.birthDate);

  const counts = { scheduled: 0, completed: 0, cancelled: 0 };
  appointments.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });

  return (
    <div className="page">
      <div>
        <div className="breadcrumb">
          <Link to="/patients">Patients</Link>
          <span className="breadcrumb-sep">/</span>
          <span>{patient.name}</span>
        </div>
        <div className="page-header" style={{ marginTop: 4 }}>
          <h1 className="page-title">{patient.name}</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={openCreateAppt}>+ New Appointment</button>
            <button className="btn btn-secondary" onClick={() => navigate(`/patients`)}>←</button>
            <button className="btn btn-ghost-danger" onClick={() => setConfirmDelete(true)}>Delete Patient</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="profile-grid">
          <div className="profile-field">
            <div className="profile-field-label">Full Name</div>
            <div className="profile-field-value">{patient.name}</div>
          </div>
          <div className="profile-field">
            <div className="profile-field-label">CPF</div>
            <div className="profile-field-value" style={{ fontFamily: 'monospace' }}>{formatCPF(patient.cpf)}</div>
          </div>
          <div className="profile-field">
            <div className="profile-field-label">Phone</div>
            <div className="profile-field-value">{patient.phone || '—'}</div>
          </div>
          <div className="profile-field">
            <div className="profile-field-label">Birth Date</div>
            <div className="profile-field-value">
              {formatDate(patient.birthDate)}
              {age !== null && <span className="age-tag">{age} years old</span>}
            </div>
          </div>
          <div className="profile-field">
            <div className="profile-field-label">Total Appointments</div>
            <div className="profile-field-value">{appointments.length}</div>
          </div>
          <div className="profile-field">
            <div className="profile-field-label">Status breakdown</div>
            <div className="profile-field-value" style={{ display: 'flex', gap: 8 }}>
              <span className="badge badge-scheduled">{counts.scheduled} scheduled</span>
              <span className="badge badge-completed">{counts.completed} completed</span>
              {counts.cancelled > 0 && <span className="badge badge-cancelled">{counts.cancelled} cancelled</span>}
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="section-title" style={{ marginBottom: 12 }}>Appointment History</p>
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr><td colSpan={4}><div className="empty-state">No appointments yet.</div></td></tr>
                ) : (
                  appointments.map(appt => (
                    <tr key={appt.id}>
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
                      <td style={{ maxWidth: 240 }}><Tooltip text={appt.notes} /></td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditAppt(appt)}>Edit</button>
                        <button className="btn btn-ghost-danger btn-sm" onClick={() => setConfirmApptId(appt.id)}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {apptModal === 'form' && (
        <Modal
          title={apptEditId ? 'Edit Appointment' : 'New Appointment'}
          onClose={() => setApptModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" type="button" onClick={() => setApptModal(null)}>Cancel</button>
              <button className="btn btn-primary" form="detail-appt-form" type="submit" disabled={apptSaving}>
                {apptSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          }
        >
          {apptError && <div className="alert alert-error">{apptError}</div>}
          <form id="detail-appt-form" onSubmit={handleApptSubmit}>
            <div className="form-group">
              <label className="form-label">Date & Time *</label>
              <input className="form-input" type="datetime-local" name="date" value={apptForm.date}
                onChange={e => setApptForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={apptForm.status}
                onChange={e => setApptForm(f => ({ ...f, status: e.target.value }))}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Notes</label>
              <textarea className="form-input" value={apptForm.notes} rows={3}
                onChange={e => setApptForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..." style={{ resize: 'vertical' }} />
            </div>
          </form>
        </Modal>
      )}

      {confirmApptId && (
        <ConfirmModal
          title="Delete Appointment"
          message="Are you sure you want to delete this appointment?"
          onConfirm={() => handleApptDelete(confirmApptId)}
          onCancel={() => setConfirmApptId(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Patient"
          message={`Delete ${patient.name} and all ${appointments.length} appointment(s)? This cannot be undone.`}
          confirmLabel="Delete Patient"
          onConfirm={handlePatientDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
