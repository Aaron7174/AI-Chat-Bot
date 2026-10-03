import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import StatsCard from '../components/StatsCard';

function Analytics() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await api.get('/employees', { params: { page: 1, limit: 10000 } });
        setEmployees(response.data.employees || []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load workforce analytics.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((employee) => (employee.status || 'ACTIVE') === 'ACTIVE').length;
    const inactive = employees.filter((employee) => (employee.status || 'ACTIVE') !== 'ACTIVE').length;
    const departments = Object.entries(
      employees.reduce((accumulator, employee) => {
        const department = employee.department || 'Unassigned';
        accumulator[department] = (accumulator[department] || 0) + 1;
        return accumulator;
      }, {}),
    ).sort((first, second) => second[1] - first[1]);

    const locations = Object.entries(
      employees.reduce((accumulator, employee) => {
        const location = employee.location || 'Unassigned';
        accumulator[location] = (accumulator[location] || 0) + 1;
        return accumulator;
      }, {}),
    ).sort((first, second) => second[1] - first[1]);

    const roles = Object.entries(
      employees.reduce((accumulator, employee) => {
        const role = employee.role || 'Unknown';
        accumulator[role] = (accumulator[role] || 0) + 1;
        return accumulator;
      }, {}),
    ).sort((first, second) => second[1] - first[1]);

    const recent = [...employees].sort((first, second) => new Date(second.joiningDate || 0) - new Date(first.joiningDate || 0)).slice(0, 5);

    return {
      total,
      active,
      inactive,
      departments,
      locations,
      roles,
      recent,
    };
  }, [employees]);

  if (loading) {
    return <div className="page-container"><div className="empty-state">Loading analytics...</div></div>;
  }

  const maxDepartmentValue = Math.max(...stats.departments.map(([, value]) => value), 1);
  const maxLocationValue = Math.max(...stats.locations.map(([, value]) => value), 1);
  const activePercentage = stats.total ? Math.round((stats.active / stats.total) * 100) : 0;

  return (
    <div className="page-container analytics-page">
      <div className="page-heading">
        <div className="analytics-heading-copy">
          <p className="eyebrow">INSIGHTS</p>
          <h2>Workforce Analytics</h2>
          <p>A clear view of your people, teams, and locations.</p>
        </div>
        <div className="analytics-updated"><span className="analytics-status-dot" /> Workforce overview</div>
      </div>

      {error && <div className="inline-notice error" role="alert">{error}</div>}

      <div className="stats-grid">
        <StatsCard label="Total Employees" value={stats.total} accent="blue" />
        <StatsCard label="Active" value={stats.active} accent="green" />
        <StatsCard label="Inactive" value={stats.inactive} accent="orange" />
        <StatsCard label="Departments" value={stats.departments.length} accent="purple" />
      </div>

      <div className="analytics-grid">
        <section className="panel analytics-panel">
          <div className="analytics-panel-heading">
            <div><span className="analytics-kicker">TEAM STRUCTURE</span><h3>Department distribution</h3></div>
            <span className="analytics-panel-total">{stats.departments.length} teams</span>
          </div>
          {stats.departments.length ? <div className="chart-list">
            {stats.departments.slice(0, 7).map(([department, count]) => (
              <div key={department} className="chart-row">
                <div className="chart-label-row">
                  <span>{department}</span>
                  <strong>{count}<small>{stats.total ? ` / ${Math.round((count / stats.total) * 100)}%` : ''}</small></strong>
                </div>
                <div className="chart-track">
                  <span className="chart-fill blue" style={{ width: `${(count / maxDepartmentValue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div> : <p className="analytics-empty">No department data available.</p>}
          {stats.departments.length > 7 && <p className="analytics-footnote">Showing top 7 departments</p>}
        </section>

        <section className="panel analytics-panel">
          <div className="analytics-panel-heading">
            <div><span className="analytics-kicker">WORKPLACE</span><h3>Location distribution</h3></div>
            <span className="analytics-panel-total">{stats.locations.length} locations</span>
          </div>
          {stats.locations.length ? <div className="chart-list">
            {stats.locations.slice(0, 7).map(([location, count]) => (
              <div key={location} className="chart-row">
                <div className="chart-label-row">
                  <span>{location}</span>
                  <strong>{count}<small>{stats.total ? ` / ${Math.round((count / stats.total) * 100)}%` : ''}</small></strong>
                </div>
                <div className="chart-track">
                  <span className="chart-fill green" style={{ width: `${(count / maxLocationValue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div> : <p className="analytics-empty">No location data available.</p>}
          {stats.locations.length > 7 && <p className="analytics-footnote">Showing top 7 locations</p>}
        </section>

        <section className="panel analytics-panel">
          <div className="analytics-panel-heading">
            <div><span className="analytics-kicker">ORGANIZATION</span><h3>Role mix</h3></div>
            <span className="analytics-panel-total">{stats.roles.length} roles</span>
          </div>
          {stats.roles.length ? <div className="metric-list">
            {stats.roles.slice(0, 8).map(([role, count]) => (
              <div key={role} className="metric-item">
                <span>{role}</span>
                <div className="metric-value"><strong>{count}</strong><span>{stats.total ? `${Math.round((count / stats.total) * 100)}%` : '0%'}</span></div>
              </div>
            ))}
          </div> : <p className="analytics-empty">No role data available.</p>}
          {stats.roles.length > 8 && <p className="analytics-footnote">Showing top 8 roles</p>}
        </section>

        <section className="panel analytics-panel">
          <div className="analytics-panel-heading">
            <div><span className="analytics-kicker">NEW TO THE TEAM</span><h3>Recent joiners</h3></div>
            <span className="analytics-panel-total">Latest 5</span>
          </div>
          {stats.recent.length ? <ul className="mini-list analytics-recent-list">
            {stats.recent.map((employee) => (
              <li key={employee.id}>
                <span className="analytics-avatar" aria-hidden="true">{(employee.name || '?').trim().charAt(0).toUpperCase()}</span>
                <span className="analytics-joiner-info">
                  <strong>{employee.name || 'Unnamed employee'}</strong>
                  <small>{employee.department || 'Unassigned'} - {employee.location || 'Location not set'}</small>
                </span>
                <time>{employee.joiningDate && !Number.isNaN(new Date(employee.joiningDate).getTime()) ? new Date(employee.joiningDate).toLocaleDateString() : 'Date n/a'}</time>
              </li>
            ))}
          </ul> : <p className="analytics-empty">No recent joiners to show.</p>}
        </section>
      </div>

      <div className="analytics-health">
        <div><span className="analytics-kicker">WORKFORCE HEALTH</span><strong>{activePercentage}% active</strong></div>
        <div className="analytics-health-track"><span style={{ width: `${activePercentage}%` }} /></div>
        <p>{stats.active} of {stats.total} employees are currently active.</p>
      </div>
    </div>
  );
}

export default Analytics;
