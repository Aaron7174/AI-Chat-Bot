import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function Departments() {
  const [departmentEmployees, setDepartmentEmployees] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await api.get('/employees', { params: { page: 1, limit: 10000 } });
        const data = (response.data.employees || []).reduce((groups, employee) => {
          if (!groups[employee.department]) groups[employee.department] = [];
          groups[employee.department].push(employee);
          return groups;
        }, {});
        setDepartmentEmployees(data);
      } catch (error) {
        setDepartmentEmployees({});
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  const query = search.toLowerCase();
  const filteredDepartments = Object.keys(departmentEmployees).filter((department) => (
    department.toLowerCase().includes(query) ||
    departmentEmployees[department]?.some((employee) => (
      employee.name.toLowerCase().includes(query) || employee.role.toLowerCase().includes(query)
    ))
  ));

  if (loading) {
    return <div className="page-container"><div className="empty-state">Loading departments...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="filter-bar">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search departments or employees..."
        />
      </div>

      <div className="department-grid">
        {filteredDepartments.map((department) => (
          <div className="department-panel" key={department}>
            <h3>{department}</h3>
            {departmentEmployees[department]?.length ? (
              <ul>
                {departmentEmployees[department].slice(0, 5).map((employee) => (
                  <li key={employee.id}>
                    <Link to={`/employee/${employee.id}`}>{employee.name}</Link>
                    <span>{employee.role}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-text">No employees found.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Departments;
