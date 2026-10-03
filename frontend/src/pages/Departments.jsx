import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DirectoryNav from '../components/DirectoryNav';
import api from '../services/api';

function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('size');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadDepartments = async () => {
      try {
        const response = await api.get('/employees/departments');
        if (active) {
          setDepartments(response.data.departments || []);
          setError('');
        }
      } catch (requestError) {
        const staleRouteResponse = requestError.response?.status === 400
          && requestError.response?.data?.message === 'Invalid employee ID. Please provide a valid positive number.';

        if (!staleRouteResponse) {
          throw requestError;
        }

        const response = await api.get('/employees', { params: { page: 1, limit: 10000 } });
        const counts = (response.data.employees || []).reduce((totals, employee) => {
          const department = String(employee.department || '').trim();
          if (department) totals.set(department, (totals.get(department) || 0) + 1);
          return totals;
        }, new Map());

        if (active) {
          setDepartments([...counts].map(([name, employeeCount]) => ({ name, employeeCount })));
          setError('');
        }
      }
    };

    loadDepartments().catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load department summaries.');
      }).finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return departments
      .filter((department) => department.name.toLowerCase().includes(query))
      .sort((first, second) => sort === 'name'
        ? first.name.localeCompare(second.name)
        : second.employeeCount - first.employeeCount);
  }, [departments, search, sort]);

  const maxCount = Math.max(...departments.map((department) => department.employeeCount), 1);
  const totalEmployees = departments.reduce((total, department) => total + department.employeeCount, 0);
  const largestDepartment = [...departments].sort((first, second) => second.employeeCount - first.employeeCount)[0];

  return (
    <div className="page-container directory-page">
      <div className="page-heading directory-heading">
        <div>
          <p className="eyebrow">ORGANIZATION</p>
          <h2>Departments</h2>
          <p>Explore team sizes and jump straight into a department’s employee directory.</p>
        </div>
        <div className="directory-total"><strong>{departments.length}</strong><span>departments</span></div>
      </div>

      <DirectoryNav />
      {error && <div className="inline-notice error" role="alert">{error}</div>}

      <div className="department-overview-strip">
        <div><span>Total people</span><strong>{totalEmployees}</strong></div>
        <div><span>Largest team</span><strong>{largestDepartment?.name || '—'}</strong></div>
        <div><span>Teams listed</span><strong>{departments.length}</strong></div>
      </div>

      <section className="directory-toolbar" aria-label="Department filters">
        <label className="directory-search">
          <span aria-hidden="true">⌕</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search departments" aria-label="Search departments" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search">×</button>}
        </label>
        <label className="directory-select"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="size">Team size</option><option value="name">Department name</option></select></label>
        <span className="department-results">{loading ? 'Loading teams…' : `${filteredDepartments.length} departments`}</span>
      </section>

      {loading ? (
        <div className="department-directory-grid">
          {Array.from({ length: 6 }, (_, index) => <div className="directory-skeleton department-skeleton" key={index} />)}
        </div>
      ) : filteredDepartments.length ? (
        <div className="department-directory-grid">
          {filteredDepartments.map((department, index) => (
            <article className="department-directory-card" key={department.name}>
              <div className="department-card-heading">
                <span className={`department-mark department-mark-${index % 5}`} aria-hidden="true">{department.name.slice(0, 1).toUpperCase()}</span>
                <span className="department-rank">TEAM {String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3>{department.name}</h3>
              <div className="department-count"><strong>{department.employeeCount}</strong><span>{department.employeeCount === 1 ? 'employee' : 'employees'}</span></div>
              <div className="department-progress" aria-label={`${Math.round((department.employeeCount / maxCount) * 100)} percent of largest team`}><span style={{ width: `${(department.employeeCount / maxCount) * 100}%` }} /></div>
              <Link className="department-browse-link" to={`/employees?department=${encodeURIComponent(department.name)}`}>Browse team <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="directory-empty">
          <span className="directory-empty-icon" aria-hidden="true">⌕</span>
          <h3>{departments.length ? 'No departments match' : 'No departments available'}</h3>
          <p>{departments.length ? 'Try a different department name.' : 'Departments will appear here when employee records are available.'}</p>
          {search && <button className="secondary-action" type="button" onClick={() => setSearch('')}>Clear search</button>}
        </div>
      )}
    </div>
  );
}

export default Departments;
