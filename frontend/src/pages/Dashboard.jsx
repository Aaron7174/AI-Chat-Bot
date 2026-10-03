import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatsCard from '../components/StatsCard';
import api from '../services/api';

const formatDate = (value) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Date not listed';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
};

const getStatus = (employee) => String(employee.employmentStatus || employee.status || 'ACTIVE').toUpperCase();

function Dashboard() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await api.get('/employees', { params: { page: 1, limit: 10000 } });
        setEmployees(response.data.employees || []);
        setError('');
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load workforce information. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const summary = useMemo(() => {
    const departments = new Map();
    const locations = new Map();
    const statuses = new Map();
    let itCount = 0;
    let nonItCount = 0;
    let otherCategoryCount = 0;
    let newJoiners = 0;
    const recentCutoff = new Date();
    recentCutoff.setDate(recentCutoff.getDate() - 30);

    employees.forEach((employee) => {
      const department = employee.department?.trim() || 'Unassigned';
      const location = employee.location?.trim() || 'Not specified';
      const status = getStatus(employee);
      departments.set(department, (departments.get(department) || 0) + 1);
      locations.set(location, (locations.get(location) || 0) + 1);
      statuses.set(status, (statuses.get(status) || 0) + 1);
      const category = String(employee.category || employee.employeeType || '').toLowerCase().replaceAll(' ', '');
      if (category === 'it') itCount += 1;
      else if (category === 'non-it' || category === 'nonit') nonItCount += 1;
      else otherCategoryCount += 1;

      const joiningDate = employee.joiningDate ? new Date(employee.joiningDate) : null;
      if (joiningDate && !Number.isNaN(joiningDate.getTime()) && joiningDate >= recentCutoff && joiningDate <= new Date()) {
        newJoiners += 1;
      }
    });

    const departmentRows = [...departments.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name));
    const locationRows = [...locations.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name));
    const statusRows = [...statuses.entries()].sort(([first], [second]) => first.localeCompare(second));
    const total = employees.length;

    return {
      total,
      active: statuses.get('ACTIVE') || 0,
      onLeave: statuses.get('ON_LEAVE') || 0,
      inactive: (statuses.get('INACTIVE') || 0) + (statuses.get('TERMINATED') || 0),
      itCount,
      nonItCount,
      otherCategoryCount,
      newJoiners,
      departmentRows,
      locationRows,
      statusRows,
      topDepartment: departmentRows[0] || null,
      topLocation: locationRows[0] || null,
      itPercent: total ? (itCount / total) * 100 : 0,
      nonItPercent: total ? (nonItCount / total) * 100 : 0,
      activePercent: total ? (statuses.get('ACTIVE') || 0) / total * 100 : 0,
    };
  }, [employees]);

  const recentEmployees = useMemo(() => [...employees]
    .filter((employee) => employee.joiningDate && !Number.isNaN(new Date(employee.joiningDate).getTime()))
    .sort((first, second) => new Date(second.joiningDate) - new Date(first.joiningDate))
    .slice(0, 5), [employees]);

  if (loading) {
    return <div className="page-container"><div className="empty-state">Loading workforce insights...</div></div>;
  }

  if (error) {
    return (
      <div className="page-container dashboard-page">
        <div className="dashboard-error" role="alert">
          <span className="dashboard-eyebrow">WORKFORCE OVERVIEW</span>
          <h1>Dashboard data unavailable</h1>
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-eyebrow"><i /> WORKFORCE OVERVIEW</span>
          <h1>Your people,<br /><span>in clear focus.</span></h1>
          <p>A live snapshot of the employee directory, teams, and where your workforce is based.</p>
          <div className="dashboard-hero-actions">
            <Link to="/employees">Explore directory <span aria-hidden="true">↗</span></Link>
            <Link to="/chat">Ask the assistant <span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <div className="dashboard-hero-visual" aria-label={`${summary.total} employees across ${summary.departmentRows.length} departments`}>
          <div className="dashboard-orbit dashboard-orbit-one" />
          <div className="dashboard-orbit dashboard-orbit-two" />
          <span className="dashboard-hero-label">TEAM DIRECTORY</span>
          <strong>{summary.total}</strong>
          <span className="dashboard-hero-caption">people building together</span>
          <div className="dashboard-hero-foot"><span>{summary.departmentRows.length} teams</span><span>{summary.locationRows.length} locations</span></div>
        </div>
      </section>

      <div className="dashboard-section-heading">
        <div><span className="dashboard-eyebrow">AT A GLANCE</span><h2>Workforce pulse</h2></div>
        <span className="dashboard-as-of">Directory snapshot · {formatDate(new Date())}</span>
      </div>

      <div className="dashboard-stats-grid">
        <StatsCard label="Active employees" value={summary.active} accent="blue" />
        <StatsCard label="Departments" value={summary.departmentRows.length} accent="purple" />
        <StatsCard label="Joined in last 30 days" value={summary.newJoiners} accent="green" />
        <StatsCard label="Currently on leave" value={summary.onLeave} accent="orange" />
      </div>

      <div className="dashboard-insights-grid">
        <section className="dashboard-panel workforce-mix-panel">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-eyebrow">TEAM COMPOSITION</span><h2>People mix</h2></div>
            <span className="dashboard-panel-note">{summary.total} total</span>
          </div>
          <div className="workforce-mix-content">
            <div
              className="workforce-donut"
              style={{
                '--it-share': `${summary.itPercent}%`,
                '--non-it-end': `${summary.itPercent + summary.nonItPercent}%`,
              }}
            >
              <div><strong>{summary.total ? Math.round(summary.itPercent) : 0}%</strong><span>IT team</span></div>
            </div>
            <div className="workforce-legend">
              <div><i className="legend-it" /><span>IT employees</span><strong>{summary.itCount}</strong></div>
              <div><i className="legend-non-it" /><span>Non-IT employees</span><strong>{summary.nonItCount}</strong></div>
              {summary.otherCategoryCount > 0 && <div><i className="legend-other" /><span>Other / unspecified</span><strong>{summary.otherCategoryCount}</strong></div>}
              <p>Share of the current employee directory by team category.</p>
            </div>
          </div>
          <div className="workforce-active-track" aria-label={`${Math.round(summary.activePercent)} percent active`}>
            <span style={{ width: `${summary.activePercent}%` }} />
          </div>
          <div className="workforce-active-caption"><span>Active workforce</span><strong>{Math.round(summary.activePercent)}%</strong></div>
        </section>

        <section className="dashboard-panel department-insight-panel">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-eyebrow">TEAM MAP</span><h2>Department footprint</h2></div>
            <Link to="/departments">All teams <span aria-hidden="true">→</span></Link>
          </div>
          {summary.departmentRows.length ? (
            <div className="dashboard-department-list">
              {summary.departmentRows.slice(0, 6).map((department, index) => (
                <div className="dashboard-department-row" key={department.name}>
                  <div className="dashboard-department-label"><span>{department.name}</span><strong>{department.count}</strong></div>
                  <div className="dashboard-department-track"><span className={`team-color-${index % 5}`} style={{ width: `${summary.total ? department.count / summary.total * 100 : 0}%` }} /></div>
                </div>
              ))}
              {summary.departmentRows.length > 6 && <p className="dashboard-more-note">+ {summary.departmentRows.length - 6} more departments</p>}
            </div>
          ) : <p className="dashboard-empty">Department information has not been added yet.</p>}
        </section>

        <section className="dashboard-panel location-insight-panel">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-eyebrow">WHERE WE WORK</span><h2>Location footprint</h2></div>
          </div>
          {summary.locationRows.length ? (
            <div className="dashboard-location-list">
              {summary.locationRows.slice(0, 4).map((location, index) => (
                <div className="dashboard-location-row" key={location.name}>
                  <span className="dashboard-location-index">0{index + 1}</span>
                  <span className="dashboard-location-name">{location.name}</span>
                  <div className="dashboard-location-track"><span style={{ width: `${summary.total ? location.count / summary.total * 100 : 0}%` }} /></div>
                  <strong>{location.count}</strong>
                </div>
              ))}
              {summary.locationRows.length > 4 && <p className="dashboard-more-note">Across {summary.locationRows.length} listed locations</p>}
            </div>
          ) : <p className="dashboard-empty">Location information has not been added yet.</p>}
        </section>

        <section className="dashboard-panel recent-people-panel">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-eyebrow">NEWEST TEAMMATES</span><h2>Recent joiners</h2></div>
            <Link to="/employees">Directory <span aria-hidden="true">→</span></Link>
          </div>
          {recentEmployees.length ? (
            <div className="dashboard-recent-list">
              {recentEmployees.map((employee, index) => (
                <Link className="dashboard-recent-person" key={employee.id} to={`/employee/${employee.id}`}>
                  <span className={`dashboard-person-avatar avatar-tone-${index % 5}`}>{(employee.name || '?').slice(0, 1).toUpperCase()}</span>
                  <span className="dashboard-person-copy"><strong>{employee.name || 'Unnamed employee'}</strong><small>{employee.designation || employee.role || employee.department || 'Team member'}</small></span>
                  <time>{formatDate(employee.joiningDate)}</time>
                </Link>
              ))}
            </div>
          ) : <p className="dashboard-empty">No joining dates are available in the directory.</p>}
        </section>
      </div>

      <section className="dashboard-status-strip">
        <div className="dashboard-status-intro"><span className="dashboard-eyebrow">DIRECTORY STATUS</span><strong>Workforce snapshot</strong><small>Based on employee records</small></div>
        {summary.statusRows.length ? summary.statusRows.map(([status, count]) => (
          <div className="dashboard-status-item" key={status}><span className={`status-led status-${status.toLowerCase()}`} /><span>{status.replaceAll('_', ' ').toLowerCase()}</span><strong>{count}</strong></div>
        )) : <span className="dashboard-empty">No employee status information available.</span>}
        {summary.inactive > 0 && <span className="dashboard-inactive-note">{summary.inactive} inactive or terminated</span>}
      </section>
    </div>
  );
}

export default Dashboard;
