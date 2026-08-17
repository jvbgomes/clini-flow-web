import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../services/api';
import './Dashboard.css';

const PIE_COLORS = { scheduled: '#3b82f6', completed: '#16a34a', cancelled: '#dc2626' };
const PIE_LABELS = { scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled' };

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StatSkeleton() {
  return (
    <div className="stat-card">
      <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8, marginBottom: 14 }} />
      <div className="skeleton skeleton-text" style={{ width: '40%', height: 28, marginBottom: 8 }} />
      <div className="skeleton skeleton-text" style={{ width: '60%' }} />
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats').then(({ data }) => {
      setStats(data);
    }).finally(() => setLoading(false));
  }, []);

  const pieData = stats
    ? [
        { name: PIE_LABELS.scheduled, value: stats.scheduledCount, color: PIE_COLORS.scheduled },
        { name: PIE_LABELS.completed, value: stats.completedCount, color: PIE_COLORS.completed },
        { name: PIE_LABELS.cancelled, value: stats.cancelledCount, color: PIE_COLORS.cancelled },
      ].filter(d => d.value > 0)
    : [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of the clinic</p>
        </div>
      </div>

      <div className="stats-grid">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-icon stat-icon-blue"><IconUsers /></div>
              <div className="stat-value">{stats?.totalPatients ?? 0}</div>
              <div className="stat-label">Total Patients</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-orange"><IconCalendar /></div>
              <div className="stat-value">{stats?.todayCount ?? 0}</div>
              <div className="stat-label">Appointments Today</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-slate"><IconClock /></div>
              <div className="stat-value">{stats?.scheduledCount ?? 0}</div>
              <div className="stat-label">Scheduled</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-green"><IconCheck /></div>
              <div className="stat-value">{stats?.completedCount ?? 0}</div>
              <div className="stat-label">Completed</div>
            </div>
          </>
        )}
      </div>

      <div className="charts-grid">
        <div className="card chart-card">
          <div className="chart-header">
            <p className="section-title">Monthly Appointments</p>
            <span className="chart-subtitle">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.monthlyData || []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}
                labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                itemStyle={{ color: 'var(--text-muted)' }}
              />
              <Bar dataKey="count" name="Appointments" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <div className="chart-header">
            <p className="section-title">Status Distribution</p>
            <span className="chart-subtitle">All time</span>
          </div>
          {pieData.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 16px' }}>No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}
                  itemStyle={{ color: 'var(--text-muted)' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p className="section-title">Upcoming Appointments</p>
          <Link to="/appointments" style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none' }}>View all →</Link>
        </div>
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td><div className="skeleton skeleton-text" style={{ width: '70%' }} /></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '80%' }} /></td>
                      <td><div className="skeleton skeleton-text" style={{ width: 70, borderRadius: 12 }} /></td>
                      <td><div className="skeleton skeleton-text" style={{ width: '50%' }} /></td>
                    </tr>
                  ))
                ) : (stats?.upcomingAppointments || []).length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">No upcoming appointments this week.</div>
                    </td>
                  </tr>
                ) : (
                  (stats.upcomingAppointments).map(appt => (
                    <tr key={appt.id}>
                      <td style={{ fontWeight: 500 }}>{appt.patient?.name || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{formatDateTime(appt.date)}</td>
                      <td><span className={`badge badge-${appt.status}`}>{appt.status}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{appt.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
