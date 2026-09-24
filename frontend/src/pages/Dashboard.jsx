import { useEffect, useMemo, useState } from 'react';
import StatsCard from '../components/StatsCard';
import api from '../services/api';

function Dashboard() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await api.get('/employees', { params: { page: 1, limit: 10000 } });
        setEmployees(response.data.employees || []);
      } catch (error) {
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const departmentCounts = useMemo(() => {
    const counts = {};
    employees.forEach((employee) => {
      counts[employee.department] = (counts[employee.department] || 0) + 1;
    });
    return counts;
  }, [employees]);

  const totalEmployees = employees.length;
  const itEmployees = employees.filter((employee) => employee.category === 'IT').length;
  const nonITEmployees = employees.filter((employee) => employee.category === 'Non-IT').length;
  const departments = Object.keys(departmentCounts).length;
  const itPercentage = totalEmployees ? ((itEmployees / totalEmployees) * 100).toFixed(1) : 0;
  const nonITPercentage = totalEmployees ? ((nonITEmployees / totalEmployees) * 100).toFixed(1) : 0;

  const recentEmployees = [...employees].sort((a, b) => new Date(b.joiningDate) - new Date(a.joiningDate)).slice(0, 5);

  if (loading) {
    return <div className="page-container"><div className="empty-state">Loading employees...</div></div>;
  }

  return (
    <div className="page-container dashboard-page">
      <div className="stats-grid">
        <StatsCard label="Total Employees" value={totalEmployees} accent="blue" />
        <StatsCard label="IT Employees" value={itEmployees} accent="purple" />
        <StatsCard label="Non-IT Employees" value={nonITEmployees} accent="green" />
        <StatsCard label="Departments" value={departments} accent="orange" />
      </div>

      <div className="dashboard-panels">
        <div className="panel">
          <h3>Employee Distribution</h3>
          <div className="percentage-row">
            <span>IT employee percentage</span>
            <strong>{itPercentage}%</strong>
          </div>
          <div className="percentage-row">
            <span>Non-IT employee percentage</span>
            <strong>{nonITPercentage}%</strong>
          </div>
          <div className="distribution-bars">
            <div className="bar-wrap">
              <div className="bar blue" style={{ width: `${itPercentage}%` }}></div>
            </div>
            <div className="bar-wrap">
              <div className="bar purple" style={{ width: `${nonITPercentage}%` }}></div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>Recent Employees</h3>
          <ul className="mini-list">
            {recentEmployees.map((employee) => (
              <li key={employee.id}>
                <span>{employee.name}</span>
                <small>{employee.department}</small>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel full-width">
          <h3>Department Distribution</h3>
          <div className="department-list">
            {Object.entries(departmentCounts).map(([department, count]) => (
              <div className="department-item" key={department}>
                <span>{department}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
