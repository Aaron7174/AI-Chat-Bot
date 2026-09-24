import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';

function EmployeeDetails() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await api.get(`/employees/${id}`);
        setEmployee(response.data.employee || null);
      } catch (error) {
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  if (loading) {
    return <div className="page-container"><div className="empty-state">Loading employee details...</div></div>;
  }

  if (!employee) {
    return (
      <div className="page-container">
        <div className="empty-state">Employee not found.</div>
        <Link to="/employees" className="link-button">Go Back</Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="detail-card">
        <div className="profile-header">
          <div className="employee-avatar large">{employee.name.charAt(0).toUpperCase()}</div>
          <div>
            <h2>{employee.name}</h2>
            <p>{employee.role}</p>
          </div>
        </div>

        <div className="detail-grid">
          <div><span>Employee ID</span><strong>{employee.id}</strong></div>
          <div><span>Email</span><strong>{employee.email}</strong></div>
          <div><span>Phone</span><strong>{employee.phone}</strong></div>
          <div><span>Department</span><strong>{employee.department}</strong></div>
          <div><span>Category</span><strong>{employee.category}</strong></div>
          <div><span>Role</span><strong>{employee.role}</strong></div>
          <div><span>Location</span><strong>{employee.location}</strong></div>
          <div><span>Joining Date</span><strong>{employee.joiningDate}</strong></div>
          <div><span>Salary</span><strong>₹{employee.salary}</strong></div>
        </div>

        <div className="skills-box">
          <h3>Skills</h3>
          <div className="skill-list">
            {employee.skills.map((skill) => (
              <span key={skill} className="skill-tag">{skill}</span>
            ))}
          </div>
        </div>

        <Link to="/employees" className="back-button">Back</Link>
      </div>
    </div>
  );
}

export default EmployeeDetails;
