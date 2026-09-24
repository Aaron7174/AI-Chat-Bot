import { useEffect, useState } from 'react';
import EmployeeTable from '../components/EmployeeTable';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const departments = ['All Departments', 'IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Engineering', 'Customer Support', 'Management', 'Administration', 'Security', 'Legal', 'R&D', 'Production'];
const emptyForm = { employeeId: '', name: '', email: '', phone: '', department: '', designation: '', role: '', category: 'IT', employeeType: 'IT', manager: '', joiningDate: '', location: '', status: 'ACTIVE', skills: '', salary: '' };

function Employees() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('ADMIN_EMPLOYEE_VIEW');
  const canCreate = hasPermission('ADMIN_EMPLOYEE_CREATE');
  const canEdit = hasPermission('ADMIN_EMPLOYEE_EDIT');
  const canDelete = hasPermission('ADMIN_EMPLOYEE_DELETE');
  const canExport = hasPermission('ADMIN_EMPLOYEE_EXPORT_PDF');
  const [employees, setEmployees] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', department: '', employeeType: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const loadEmployees = async (page = 1) => {
    setLoading(true);
    try {
      const response = await api.get('/employees', { params: { ...filters, page, limit: 20 } });
      setEmployees(response.data.employees || []);
      setMeta(response.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load employees.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadEmployees(1); }, [filters.search, filters.department, filters.employeeType, filters.status]);

  const changeFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  const changeForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); setError(''); };
  const openEdit = (employee) => { setEditing(employee); setForm({ ...emptyForm, ...employee, employeeId: employee.id, designation: employee.designation || employee.role, skills: (employee.skills || []).join(', ') }); setModalOpen(true); setError(''); };

  const saveEmployee = async (event) => {
    event.preventDefault();
    const payload = { ...form, skills: form.skills.split(',').map((skill) => skill.trim()).filter(Boolean), role: form.designation || form.role, salary: form.salary ? Number(form.salary) : undefined };
    try {
      if (editing) await api.put(`/employees/${editing.id}`, payload);
      else await api.post('/employees', payload);
      setNotice(editing ? 'Employee updated successfully.' : 'Employee created successfully.');
      setEditing(null); setForm(emptyForm); setModalOpen(false); await loadEmployees(meta.page);
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to save employee.'); }
  };

  const deleteEmployee = async () => {
    try {
      await api.delete(`/employees/${deleting.id}`);
      setDeleting(null); setNotice('Employee deleted successfully.'); await loadEmployees(meta.page);
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to delete employee.'); }
  };

  const exportPdf = async () => {
    try {
      const response = await api.get('/employees/export/pdf', { params: filters, responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a'); link.href = url; link.download = 'company-ai-employees.pdf'; link.click(); URL.revokeObjectURL(url);
      setNotice('Employee PDF downloaded successfully.');
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to export employees.'); }
  };

  return <div className="page-container employee-management-page">
    <div className="page-heading"><div><p className="eyebrow">DIRECTORY CONTROL</p><h2>Employee Management</h2><p>Search and manage active employees across every department.</p></div><div className="management-actions">{canExport && <button className="secondary-action" type="button" onClick={exportPdf}>Download PDF</button>}</div></div>
    {notice && <div className="inline-notice success">{notice}</div>}
    {error && <div className="inline-notice error">{error}</div>}
    <div className="filter-bar management-filter-bar"><input value={filters.search} onChange={(event) => changeFilter('search', event.target.value)} placeholder="Search ID, name, email, phone, department..." /><select value={filters.department} onChange={(event) => changeFilter('department', event.target.value)}>{departments.map((department) => <option key={department} value={department === 'All Departments' ? '' : department}>{department}</option>)}</select><select value={filters.employeeType} onChange={(event) => changeFilter('employeeType', event.target.value)}><option value="">All Types</option><option value="IT">IT</option><option value="Non-IT">Non-IT</option></select><select value={filters.status} onChange={(event) => changeFilter('status', event.target.value)}><option value="">All Status</option><option value="INACTIVE">Inactive</option><option value="ON_LEAVE">On Leave</option></select></div>
    <div className="management-summary"><strong>{meta.total || 0}</strong><span>Active employees matching filters</span></div>
    <EmployeeTable employees={employees} loading={loading} canEdit={canEdit} canDelete={canDelete} onEdit={openEdit} onDelete={setDeleting} />
    <div className="pagination"><button type="button" disabled={meta.page <= 1} onClick={() => loadEmployees(meta.page - 1)}>Previous</button><span>Page {meta.page || 1} of {meta.totalPages || 1}</span><button type="button" disabled={meta.page >= meta.totalPages} onClick={() => loadEmployees(meta.page + 1)}>Next</button></div>
    {deleting && <div className="modal-backdrop"><div className="modal-panel"><h3>Delete Employee?</h3><p>Are you sure you want to delete <strong>{deleting.name}</strong> ({deleting.id}) from {deleting.department}?</p><div className="modal-actions"><button type="button" onClick={() => setDeleting(null)}>Cancel</button><button className="danger-action" type="button" onClick={deleteEmployee}>Delete Employee</button></div></div></div>}
    {modalOpen && <EmployeeFormModal form={form} editing={editing} onChange={changeForm} onSubmit={saveEmployee} onClose={() => setModalOpen(false)} />}
  </div>;
}

function EmployeeFormModal({ form, editing, onChange, onSubmit, onClose }) {
  return <div className="modal-backdrop"><form className="modal-panel employee-form" onSubmit={onSubmit}><div className="modal-heading"><div><p className="eyebrow">COMPANY AI DIRECTORY</p><h3>{editing ? 'Edit Employee' : 'Add Employee'}</h3></div><button type="button" onClick={onClose}>Close</button></div><div className="form-grid">{[['employeeId','Employee ID'],['name','Full Name'],['email','Email'],['phone','Phone'],['department','Department'],['designation','Designation'],['manager','Manager'],['joiningDate','Joining Date'],['location','Location'],['salary','Salary']].map(([name, label]) => <label key={name}>{label}<input name={name} value={form[name] || ''} onChange={onChange} type={name === 'joiningDate' ? 'date' : name === 'salary' ? 'number' : 'text'} required={['employeeId','name','email','department','designation'].includes(name)} /></label>)}<label>Employee Type<select name="category" value={form.category} onChange={onChange}><option value="IT">IT</option><option value="Non-IT">NON_IT</option></select></label><label>Status<select name="status" value={form.status} onChange={onChange}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="ON_LEAVE">ON_LEAVE</option></select></label><label className="wide-field">Skills<input name="skills" value={form.skills || ''} onChange={onChange} placeholder="React, Node.js, SQL" /></label></div><div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-action" type="submit">{editing ? 'Save Changes' : 'Create Employee'}</button></div></form></div>;
}

export default Employees;
