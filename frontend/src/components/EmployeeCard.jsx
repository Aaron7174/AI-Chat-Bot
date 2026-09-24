import { Link } from 'react-router-dom';

function EmployeeCard({ employee }) {
  if (!employee) {
    return null;
  }

  return (
    <div className="employee-card">
      <div className="employee-avatar">{employee.name.charAt(0).toUpperCase()}</div>
      <div className="employee-card-body">
        <h4>{employee.name}</h4>
        <p>{employee.role}</p>
        <p>{employee.department}</p>
        <p>{employee.location}</p>
      </div>
      <Link to={`/employee/${employee.id}`} className="link-button">
        View
      </Link>
    </div>
  );
}

export default EmployeeCard;
