import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function NonITEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await api.get('/employees/non-it');
        setEmployees(response.data.employees || []);
      } catch (error) {
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter((employee) => {
    const query = search.toLowerCase();
    return (
      employee.name.toLowerCase().includes(query) ||
      employee.role.toLowerCase().includes(query) ||
      employee.department.toLowerCase().includes(query) ||
      employee.skills.join(' ').toLowerCase().includes(query)
    );
  });

  if (loading) {
    return <div className="page-container"><div className="empty-state">Loading employees...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="filter-bar">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Non-IT employees..."
        />
      </div>

      <div className="card-grid">
        {filteredEmployees.length === 0 ? (
          <div className="empty-state">No employees match your search.</div>
        ) : (
          filteredEmployees.map((employee) => (
            <div className="profile-card" key={employee.id}>
              <h3>{employee.name}</h3>
              <p><strong>Role:</strong> {employee.role}</p>
              <p><strong>Department:</strong> {employee.department}</p>
              <p><strong>Location:</strong> {employee.location}</p>
              <p><strong>Email:</strong> {employee.email}</p>
              <Link to={`/employee/${employee.id}`} className="link-button">View Details</Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NonITEmployees;
