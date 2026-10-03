import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DirectoryNav from '../components/DirectoryNav';
import api from '../services/api';

function EmployeeCategoryPage({ category }) {
  const isIT = category === 'IT';
  const [employees, setEmployees] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [searchInput, setSearchInput] = useState('');
  const search = useDeferredValue(searchInput.trim());
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/employees', { params: { employeeType: category, search, status, page, limit: 12 } })
      .then((response) => {
        if (!active) return;
        setEmployees(response.data.employees || []);
        setMeta(response.data);
        setError('');
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.response?.data?.message || `Unable to load ${category} employees.`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [category, search, status, page]);

  const sortedEmployees = useMemo(() => [...employees].sort((first, second) => {
    if (sort === 'department') return (first.department || '').localeCompare(second.department || '');
    if (sort === 'role') return (first.designation || first.role || '').localeCompare(second.designation || second.role || '');
    return (first.name || '').localeCompare(second.name || '');
  }), [employees, sort]);

  const changeSearch = (value) => {
    setSearchInput(value);
    setPage(1);
    setLoading(true);
  };

  const clearFilters = () => {
    setSearchInput('');
    setStatus('');
    setSort('name');
    setPage(1);
    setLoading(true);
  };

  return (
    <div className="page-container directory-page">
      <div className="page-heading directory-heading">
        <div>
          <p className="eyebrow">PEOPLE DIRECTORY</p>
          <h2>{isIT ? 'IT Employees' : 'Non-IT Employees'}</h2>
          <p>{isIT ? 'Find technical teammates by name, skills, or role.' : 'Browse business and operations teammates by name, team, or role.'}</p>
        </div>
        <div className="directory-total">
          <strong>{meta.total}</strong>
          <span>{isIT ? 'IT teammates' : 'Non-IT teammates'}</span>
        </div>
      </div>

      <DirectoryNav />

      {error && <div className="inline-notice error" role="alert">{error}</div>}

      <section className="directory-toolbar" aria-label="Employee filters">
        <label className="directory-search">
          <span aria-hidden="true">⌕</span>
          <input value={searchInput} onChange={(event) => changeSearch(event.target.value)} placeholder={`Search ${isIT ? 'IT' : 'Non-IT'} employees`} aria-label="Search employees" />
          {searchInput && <button type="button" onClick={() => changeSearch('')} aria-label="Clear search">×</button>}
        </label>
        <label className="directory-select">
          <span>Status</span>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); setLoading(true); }}>
            <option value="">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On leave</option>
            <option value="INACTIVE">Inactive</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </label>
        <label className="directory-select">
          <span>Sort by</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="name">Name</option>
            <option value="department">Department</option>
            <option value="role">Role</option>
          </select>
        </label>
        {(search || status) && <button className="directory-reset" type="button" onClick={clearFilters}>Clear filters</button>}
      </section>

      <div className="directory-results-line">
        <span>{loading ? 'Updating results…' : `Showing ${employees.length} of ${meta.total} employees`}</span>
        {status && <span className="directory-filter-chip">{status.replace('_', ' ')}</span>}
      </div>

      {loading ? (
        <div className="directory-card-grid" aria-label="Loading employees">
          {Array.from({ length: 6 }, (_, index) => <div className="directory-skeleton" key={index} />)}
        </div>
      ) : sortedEmployees.length ? (
        <div className="directory-card-grid">
          {sortedEmployees.map((employee) => (
            <article className="directory-employee-card" key={employee.id}>
              <div className="directory-card-top">
                <span className="directory-avatar" aria-hidden="true">{(employee.name || '?').trim().charAt(0).toUpperCase()}</span>
                <span className={`employee-status-pill ${(employee.status || 'ACTIVE').toLowerCase().replace('_', '-')}`}>{(employee.status || 'ACTIVE').replace('_', ' ')}</span>
              </div>
              <h3>{employee.name || 'Unnamed employee'}</h3>
              <p className="directory-role">{employee.designation || employee.role || 'Role not specified'}</p>
              <div className="directory-employee-meta">
                <span><i aria-hidden="true">⌂</i>{employee.department || 'Unassigned department'}</span>
                <span><i aria-hidden="true">◎</i>{employee.location || 'Location not set'}</span>
              </div>
              {employee.skills?.length > 0 && (
                <div className="directory-skills">
                  {employee.skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>)}
                  {employee.skills.length > 3 && <span>+{employee.skills.length - 3}</span>}
                </div>
              )}
              <Link to={`/employee/${employee.id}`} className="directory-view-link">View profile <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="directory-empty">
          <span className="directory-empty-icon" aria-hidden="true">⌕</span>
          <h3>No matching employees</h3>
          <p>Try another search or clear the selected filters.</p>
          {(search || status) && <button className="secondary-action" type="button" onClick={clearFilters}>Clear filters</button>}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="directory-pagination">
          <button type="button" disabled={page <= 1 || loading} onClick={() => { setPage((current) => current - 1); setLoading(true); }}>← Previous</button>
          <span>Page <strong>{meta.page}</strong> of {meta.totalPages}</span>
          <button type="button" disabled={page >= meta.totalPages || loading} onClick={() => { setPage((current) => current + 1); setLoading(true); }}>Next →</button>
        </div>
      )}
    </div>
  );
}

export default EmployeeCategoryPage;
