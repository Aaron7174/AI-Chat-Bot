import { Link } from 'react-router-dom';

function EmployeeTable({ employees, loading, canEdit = false, canDelete = false, centerActions = false, onEdit, onDelete }) {
  if (loading) {
    return <div className="empty-state">Loading employees...</div>;
  }

  if (!employees || employees.length === 0) {
    return <div className="empty-state">No employees found.</div>;
  }

  return (
    <div className="table-wrapper">
      <table className={`employee-table${centerActions ? ' admin-actions-centered' : ''}`}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Department</th>
            <th>Category</th>
            <th>Role</th>
            <th>Status</th>
            <th>Email</th>
            <th>Location</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id}>
              <td>{employee.id}</td>
              <td>{employee.name}</td>
              <td>{employee.department}</td>
              <td>{employee.category}</td>
              <td>{employee.designation || employee.role}</td>
              <td><span className={`employee-status-pill ${(employee.status || 'ACTIVE').toLowerCase().replace('_', '-')}`}>{(employee.status || 'ACTIVE').replace('_', ' ')}</span></td>
              <td>{employee.email}</td>
              <td>{employee.location}</td>
              <td>
                <div className="table-actions">
                  <Link to={`/employee/${employee.id}`} className="table-link">
                    View
                  </Link>
                  {canEdit && <button className="table-action" type="button" onClick={() => onEdit(employee)}>Edit</button>}
                  {canDelete && <button className="table-action danger-text" type="button" onClick={() => onDelete(employee)}>Delete</button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EmployeeTable;
