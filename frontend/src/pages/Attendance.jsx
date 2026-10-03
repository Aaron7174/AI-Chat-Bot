import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const statuses = [
  'PRESENT',
  'LATE',
  'HALF_DAY',
  'WORK_FROM_HOME',
  'ON_LEAVE',
  'HOLIDAY',
  'WEEK_OFF',
  'MISSED_CHECKOUT',
  'CORRECTION_PENDING',
  'MISSING_ATTENDANCE',
];

const todayInIndia = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const displayTime = (timestamp, timeZone = 'Asia/Kolkata') => timestamp
  ? new Intl.DateTimeFormat('en-IN', { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp))
  : '—';

const displayMinutes = (minutes = 0) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;

function Attendance() {
  const { hasPermission, user } = useAuth();
  const canManage = hasPermission('VIEW_ATTENDANCE');
  const canReview = hasPermission('REVIEW_ATTENDANCE_CORRECTIONS');
  const canConfigure = hasPermission('MANAGE_ATTENDANCE_POLICY');
  const canViewOwn = user?.role === 'EMPLOYEE' && hasPermission('VIEW_OWN_ATTENDANCE');

  const [date, setDate] = useState(todayInIndia);
  const [month, setMonth] = useState(todayInIndia().slice(0, 7));
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [register, setRegister] = useState(null);
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState(null);
  const [corrections, setCorrections] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [companyTimeZone, setCompanyTimeZone] = useState('Asia/Kolkata');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({ requestedCheckIn: '', requestedCheckOut: '', reason: '' });
  const [correctionDate, setCorrectionDate] = useState(todayInIndia);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const registerRequestId = useRef(0);
  const ownRequestId = useRef(0);

  const loadRegister = useCallback(async () => {
    if (!canManage) return;
    const requestId = ++registerRequestId.current;
    try {
      const response = await api.get('/attendance', {
        params: { date, search, department, status, page, limit: 20 },
      });
      if (requestId === registerRequestId.current) {
        setRegister(response.data);
        setCompanyTimeZone(response.data.policy.timezone);
        setError('');
      }
    } catch (requestError) {
      if (requestId === registerRequestId.current) {
        setError(requestError.response?.data?.message || 'Unable to connect to the attendance service. Please try again.');
      }
    } finally {
      if (requestId === registerRequestId.current) setLoading(false);
    }
  }, [canManage, date, search, department, status, page]);

  const loadOwnAttendance = useCallback(async () => {
    if (!canViewOwn) return;
    const requestId = ++ownRequestId.current;
    try {
      const [todayResponse, historyResponse] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/attendance/me/history', { params: { month, limit: 100 } }),
      ]);
      if (requestId === ownRequestId.current) {
        setToday(todayResponse.data);
        setHistory(historyResponse.data);
        setCompanyTimeZone(todayResponse.data.policy.timezone);
        setCorrectionDate((currentDate) => currentDate === todayInIndia() ? todayResponse.data.date : currentDate);
        setError('');
      }
    } catch (requestError) {
      if (requestId === ownRequestId.current) {
        setError(requestError.response?.data?.message || 'Unable to connect to the attendance service. Please try again.');
      }
    } finally {
      if (requestId === ownRequestId.current) setLoading(false);
    }
  }, [canViewOwn, month]);

  const loadCorrections = useCallback(async () => {
    if (!canReview) return;
    try {
      const response = await api.get('/attendance/corrections', { params: { status: 'PENDING', limit: 50 } });
      setCorrections(response.data.records);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load correction requests.');
    }
  }, [canReview]);

  useEffect(() => {
    if (canManage) loadRegister();
  }, [canManage, loadRegister]);

  useEffect(() => {
    if (canViewOwn) loadOwnAttendance();
  }, [canViewOwn, loadOwnAttendance]);

  useEffect(() => {
    loadCorrections();
  }, [loadCorrections]);

  const employeeAttendance = today?.attendance;
  const recentHistory = useMemo(() => history?.records || [], [history]);

  const runAttendanceAction = async (action) => {
    setActionLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await api.post(`/attendance/${action}`);
      setNotice(response.data.message);
      await loadOwnAttendance();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to connect to the attendance service. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const submitCorrection = async (event) => {
    event.preventDefault();
    setActionLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await api.post('/attendance/correction', {
        date: correctionDate,
        requestedCheckIn: correctionForm.requestedCheckIn ? `${correctionDate}T${correctionForm.requestedCheckIn}` : '',
        requestedCheckOut: correctionForm.requestedCheckOut ? `${correctionDate}T${correctionForm.requestedCheckOut}` : '',
        reason: correctionForm.reason,
      });
      setNotice(response.data.message);
      setCorrectionForm({ requestedCheckIn: '', requestedCheckOut: '', reason: '' });
      await loadOwnAttendance();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit the correction request.');
    } finally {
      setActionLoading(false);
    }
  };

  const reviewCorrection = async (record, decision) => {
    const rejectionReason = decision === 'reject'
      ? window.prompt('Enter the reason for rejecting this correction request:')
      : '';
    if (decision === 'reject' && rejectionReason === null) return;
    setActionLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await api.put(`/attendance/corrections/${record._id}/${decision}`, {
        reason: rejectionReason || undefined,
      });
      setNotice(response.data.message);
      await Promise.all([loadCorrections(), loadRegister()]);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to review this correction.');
    } finally {
      setActionLoading(false);
    }
  };

  const exportCsv = async () => {
    try {
      const response = await api.get('/attendance/reports.csv', {
        params: { date, search, department, status },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance-${date}.csv`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to export the attendance report.');
    }
  };

  const savePolicy = async (event) => {
    event.preventDefault();
    try {
      const response = await api.put('/attendance/policy', policy);
      setPolicy(response.data.policy);
      setCompanyTimeZone(response.data.policy.timezone);
      setNotice('Attendance policy updated.');
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save attendance policy.');
    }
  };

  if (!canManage && !canViewOwn) return <Navigate to="/" replace />;

  return (
    <div className="attendance-page">
      <header className="attendance-page-header">
        <div>
          <span className="attendance-eyebrow">PEOPLE OPERATIONS</span>
          <h1>Attendance</h1>
          <p>{canManage ? 'Live register linked to active employee records.' : 'Your workday and attendance history.'}</p>
        </div>
        {canManage && (
          <button className="attendance-secondary-button" type="button" onClick={() => { setLoading(true); loadRegister(); }} disabled={loading}>
            Refresh register
          </button>
        )}
      </header>

      {error && <div className="attendance-alert error" role="alert">{error}</div>}
      {notice && <div className="attendance-alert success" role="status">{notice}</div>}

      {canViewOwn && (
        <section className="attendance-own-panel">
          <div className="attendance-own-heading">
            <div>
              <span className="attendance-eyebrow">TODAY · {today?.date || todayInIndia()}</span>
              <h2>Hello, {today?.employee?.name || 'there'}</h2>
              <p>{today?.employee?.department || 'Your attendance overview'}</p>
            </div>
            <div className={`attendance-own-status ${employeeAttendance?.status || 'NOT_CHECKED_IN'}`}>
              <span />
              {employeeAttendance?.status?.replaceAll('_', ' ') || 'NOT CHECKED IN'}
            </div>
          </div>
          <div className="attendance-own-metrics">
            <div><span>Check in</span><strong>{displayTime(employeeAttendance?.checkIn, today?.policy?.timezone)}</strong></div>
            <div><span>Check out</span><strong>{displayTime(employeeAttendance?.checkOut, today?.policy?.timezone)}</strong></div>
            <div><span>Worked</span><strong>{displayMinutes(employeeAttendance?.workingMinutes)}</strong></div>
            <div><span>Late</span><strong>{employeeAttendance?.lateMinutes || 0} min</strong></div>
          </div>
          <div className="attendance-own-actions">
            <button
              className="attendance-primary-button"
              type="button"
              disabled={actionLoading || Boolean(employeeAttendance)}
              onClick={() => runAttendanceAction('check-in')}
            >
              {actionLoading ? 'Working…' : employeeAttendance?.checkIn ? 'Checked in' : employeeAttendance?.correctionStatus === 'PENDING' ? 'Correction pending' : employeeAttendance ? 'Attendance recorded' : 'Check in'}
            </button>
            <button
              className="attendance-secondary-button"
              type="button"
              disabled={actionLoading || !employeeAttendance?.checkIn || Boolean(employeeAttendance?.checkOut)}
              onClick={() => runAttendanceAction('check-out')}
            >
              {employeeAttendance?.checkOut ? 'Checked out' : 'Check out'}
            </button>
            {today?.policy?.allowSelfServiceWfh && !employeeAttendance?.checkIn && (
              <button
                className="attendance-secondary-button"
                type="button"
                disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    const response = await api.post('/attendance/check-in', { workMode: 'WFH' });
                    setNotice(response.data.message);
                    await loadOwnAttendance();
                  } catch (requestError) {
                    setError(requestError.response?.data?.message || 'Unable to record work-from-home attendance.');
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                Check in from home
              </button>
            )}
            <span>Server time is recorded in {today?.policy?.timezone || 'Asia/Kolkata'}.</span>
          </div>
        </section>
      )}

      {canManage && (
        <>
          <div className="attendance-count-grid">
            {[
              ['Active employees', register?.counts?.totalEmployees ?? '—'],
              ['Present', (register?.counts?.PRESENT || 0) + (register?.counts?.LATE || 0) + (register?.counts?.WORK_FROM_HOME || 0)],
              ['Absent / unresolved', register?.counts?.MISSING_ATTENDANCE || 0],
              ['On leave', register?.counts?.ON_LEAVE || 0],
              ['Late', register?.counts?.LATE || 0],
              ['WFH', register?.counts?.WORK_FROM_HOME || 0],
            ].map(([label, value]) => <div className="attendance-count-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}
          </div>

          <section className="attendance-register-panel">
            <div className="attendance-section-heading">
              <div><span className="attendance-eyebrow">EMPLOYEE-SYNCHRONIZED</span><h2>Daily register</h2></div>
              <button className="attendance-secondary-button" type="button" onClick={exportCsv}>Export CSV</button>
            </div>
            <div className="attendance-filters">
              <label>Date<input type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); }} /></label>
              <label>Employee<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Name, ID, email" /></label>
              <label>Department<input value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }} placeholder="All departments" /></label>
              <label>Status
                <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
                  <option value="">All statuses</option>
                  {statuses.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}
                </select>
              </label>
            </div>
            <div className="attendance-table-wrap">
              <table className="attendance-table">
                <thead><tr><th>Employee</th><th>Department</th><th>Date</th><th>Check in</th><th>Check out</th><th>Worked</th><th>Late</th><th>Overtime</th><th>Status</th><th>Details</th></tr></thead>
                <tbody>
                  {register?.records?.map((record) => (
                    <tr key={record._id || record.employee.id}>
                      <td><strong>{record.employee.name}</strong><small>{record.employee.employeeId}</small></td>
                      <td>{record.employee.department || '—'}</td>
                      <td>{record.date}</td>
                      <td>{displayTime(record.checkIn, register?.policy?.timezone)}</td>
                      <td>{displayTime(record.checkOut, register?.policy?.timezone)}</td>
                      <td>{record.status === 'MISSED_CHECKOUT' ? 'Pending checkout' : displayMinutes(record.workingMinutes)}</td>
                      <td>{record.lateMinutes || 0}m</td>
                      <td>{displayMinutes(record.overtimeMinutes)}</td>
                      <td><span className={`attendance-status ${record.status}`}>{record.status.replaceAll('_', ' ')}</span></td>
                      <td><button type="button" className="attendance-text-button" onClick={() => setSelectedRecord(selectedRecord?._id === record._id ? null : record)}>View</button></td>
                    </tr>
                  ))}
                  {!loading && !register?.records?.length && <tr><td colSpan="10" className="attendance-empty">No attendance records match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            {selectedRecord && (
              <div className="attendance-details">
                <div><strong>{selectedRecord.employee.name} · {selectedRecord.date}</strong><button type="button" className="attendance-text-button" onClick={() => setSelectedRecord(null)}>Close</button></div>
                <p>Employee ID: {selectedRecord.employee.employeeId} · Department: {selectedRecord.employee.department || '—'} · Status: {selectedRecord.status.replaceAll('_', ' ')}</p>
                <p>Scheduled: {selectedRecord.scheduledStartTime || register?.policy?.startTime || '—'}–{selectedRecord.scheduledEndTime || register?.policy?.endTime || '—'} · Worked: {displayMinutes(selectedRecord.workingMinutes)} · Late: {selectedRecord.lateMinutes || 0}m · Early checkout: {selectedRecord.earlyCheckoutMinutes || 0}m · Overtime: {displayMinutes(selectedRecord.overtimeMinutes)}</p>
                <p>{selectedRecord.derived ? `This is a derived calendar state${selectedRecord.holidayName ? ` (${selectedRecord.holidayName})` : ''}, not a stored attendance record.` : `Work mode: ${selectedRecord.workMode || 'ONSITE'} · Source: ${selectedRecord.checkInSource || '—'} · Correction: ${selectedRecord.correctionStatus || 'NONE'}${selectedRecord.notes ? ` · Notes: ${selectedRecord.notes}` : ''}`}</p>
                {selectedRecord.auditEvents?.length
                  ? selectedRecord.auditEvents.map((event, index) => <small key={`${event.action}-${index}`}>{event.action.replaceAll('_', ' ')} by {event.actorName} · {displayTime(event.timestamp, register?.policy?.timezone)}{event.reason ? ` · ${event.reason}` : ''}</small>)
                  : <small>No stored audit events for this derived attendance state.</small>}
              </div>
            )}
            <div className="attendance-pagination">
              <span>Page {register?.page || 1} of {register?.totalPages || 1} · {register?.total || 0} employees</span>
              <div>
                <button type="button" className="attendance-secondary-button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Previous</button>
                <button type="button" className="attendance-secondary-button" disabled={page >= (register?.totalPages || 1) || loading} onClick={() => setPage((current) => current + 1)}>Next</button>
              </div>
            </div>
          </section>

          {canReview && (
            <section className="attendance-register-panel">
              <div className="attendance-section-heading"><div><span className="attendance-eyebrow">HR REVIEW</span><h2>Correction requests</h2></div></div>
              {corrections.length ? corrections.map((record) => (
                <div className="attendance-correction-row" key={record._id}>
                  <div>
                    <strong>{record.employee?.name || 'Employee'} · {record.date}</strong>
                    <p>{record.correctionReason}</p>
                    <small>Requested check-in: {displayTime(record.requestedCheckIn, companyTimeZone)} · Requested check-out: {displayTime(record.requestedCheckOut, companyTimeZone)}</small>
                  </div>
                  <div className="attendance-correction-actions">
                    <button className="attendance-primary-button" type="button" disabled={actionLoading} onClick={() => reviewCorrection(record, 'approve')}>Approve</button>
                    <button className="attendance-secondary-button" type="button" disabled={actionLoading} onClick={() => reviewCorrection(record, 'reject')}>Reject</button>
                  </div>
                </div>
              )) : <p className="attendance-empty">There are no pending correction requests.</p>}
            </section>
          )}

          {canConfigure && policy && (
            <details className="attendance-policy-panel" onToggle={(event) => {
              if (event.currentTarget.open && !policy) {
                api.get('/attendance/policy')
                  .then((response) => {
                    setPolicy(response.data.policy);
                    setCompanyTimeZone(response.data.policy.timezone);
                  })
                  .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load attendance policy.'));
              }
            }}>
              <summary>Company attendance policy</summary>
              <form onSubmit={savePolicy} className="attendance-policy-form">
                <label>Timezone<input value={policy.timezone} onChange={(event) => setPolicy({ ...policy, timezone: event.target.value })} /></label>
                <label>Start<input type="time" value={policy.startTime} onChange={(event) => setPolicy({ ...policy, startTime: event.target.value })} /></label>
                <label>End<input type="time" value={policy.endTime} onChange={(event) => setPolicy({ ...policy, endTime: event.target.value })} /></label>
                <label>Break (minutes)<input type="number" min="0" max="240" value={policy.breakDurationMinutes} onChange={(event) => setPolicy({ ...policy, breakDurationMinutes: Number(event.target.value) })} /></label>
                <label>Late threshold (minutes)<input type="number" min="0" max="240" value={policy.lateThresholdMinutes} onChange={(event) => setPolicy({ ...policy, lateThresholdMinutes: Number(event.target.value) })} /></label>
                <label>Half-day threshold (minutes)<input type="number" min="0" max="1440" value={policy.halfDayThresholdMinutes} onChange={(event) => setPolicy({ ...policy, halfDayThresholdMinutes: Number(event.target.value) })} /></label>
                <fieldset><legend>Working days</legend>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => <label key={day}><input type="checkbox" checked={policy.workingDays.includes(index)} onChange={(event) => setPolicy({ ...policy, workingDays: event.target.checked ? [...policy.workingDays, index].sort() : policy.workingDays.filter((item) => item !== index) })} />{day}</label>)}</fieldset>
                <label className="attendance-checkbox"><input type="checkbox" checked={policy.allowSelfServiceWfh} onChange={(event) => setPolicy({ ...policy, allowSelfServiceWfh: event.target.checked })} />Allow self-service WFH check-in</label>
                <button className="attendance-primary-button" type="submit">Save policy</button>
                <div className="attendance-holiday-editor">
                  <strong>Company holidays</strong>
                  {policy.holidays.map((holiday, index) => (
                    <div className="attendance-holiday-row" key={`${holiday.date}-${index}`}>
                      <input aria-label="Holiday date" type="date" value={holiday.date} onChange={(event) => setPolicy({ ...policy, holidays: policy.holidays.map((item, itemIndex) => itemIndex === index ? { ...item, date: event.target.value } : item) })} />
                      <input aria-label="Holiday name" value={holiday.name} placeholder="Holiday name" onChange={(event) => setPolicy({ ...policy, holidays: policy.holidays.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} />
                      <button type="button" className="attendance-text-button" onClick={() => setPolicy({ ...policy, holidays: policy.holidays.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button>
                    </div>
                  ))}
                  <button type="button" className="attendance-secondary-button" onClick={() => setPolicy({ ...policy, holidays: [...policy.holidays, { date: '', name: '' }] })}>Add holiday</button>
                </div>
                <p>Missing attendance is shown as unresolved and is never automatically marked absent.</p>
              </form>
            </details>
          )}
        </>
      )}

      {canViewOwn && (
        <section className="attendance-register-panel attendance-history-panel">
          <div className="attendance-section-heading">
            <div><span className="attendance-eyebrow">YOUR RECORDS</span><h2>Monthly history</h2></div>
            <label className="attendance-month-filter">Month<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
          </div>
          <div className="attendance-month-summary">
            <div><span>Attendance</span><strong>{history?.attendancePercentage ?? '—'}%</strong></div>
            <div><span>Working days</span><strong>{history?.workingDays ?? '—'}</strong></div>
            <div><span>Present-equivalent days</span><strong>{history?.presentEquivalentDays ?? '—'}</strong></div>
          </div>
          {recentHistory.map((record) => (
            <div className="attendance-history-row" key={record._id}>
              <span>{record.date}</span><span className={`attendance-status ${record.status}`}>{record.status.replaceAll('_', ' ')}</span>
              <span>{displayTime(record.checkIn, today?.policy?.timezone)} — {displayTime(record.checkOut, today?.policy?.timezone)}</span>
              <span>{displayMinutes(record.workingMinutes)}</span>
            </div>
          ))}
          {!recentHistory.length && <p className="attendance-empty">No stored records for this month. Non-working days and holidays are excluded from attendance percentage.</p>}
          <details className="attendance-correction-form">
            <summary>Request an attendance correction</summary>
            <form onSubmit={submitCorrection}>
              <label>Attendance date<input type="date" required value={correctionDate} onChange={(event) => setCorrectionDate(event.target.value)} /></label>
              <label>Requested check-in (company time)<input type="time" value={correctionForm.requestedCheckIn} onChange={(event) => setCorrectionForm({ ...correctionForm, requestedCheckIn: event.target.value })} /></label>
              <label>Requested check-out (company time)<input type="time" value={correctionForm.requestedCheckOut} onChange={(event) => setCorrectionForm({ ...correctionForm, requestedCheckOut: event.target.value })} /></label>
              <label>Reason<textarea minLength="5" maxLength="500" required value={correctionForm.reason} onChange={(event) => setCorrectionForm({ ...correctionForm, reason: event.target.value })} /></label>
              <button className="attendance-primary-button" type="submit" disabled={actionLoading}>Submit for HR review</button>
            </form>
          </details>
        </section>
      )}
    </div>
  );
}

export default Attendance;
