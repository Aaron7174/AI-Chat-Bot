import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import EmployeeTable from '../components/EmployeeTable';
import DirectoryNav from '../components/DirectoryNav';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const departments = ['All Departments', 'IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Engineering', 'Customer Support', 'Management', 'Administration', 'Security', 'Legal', 'R&D', 'Production'];
const emptyForm = { employeeId: '', name: '', email: '', phone: '', department: '', designation: '', role: '', category: 'IT', employeeType: 'IT', manager: '', joiningDate: '', location: '', status: 'ACTIVE', skills: '', salary: '' };

function Employees({ isAdminManagement = false }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('ADMIN_EMPLOYEE_EDIT');
  const canDelete = hasPermission('ADMIN_EMPLOYEE_DELETE');
  const canExport = hasPermission('ADMIN_EMPLOYEE_EXPORT_PDF');
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', status: '' });
  const departmentFilter = searchParams.get('department') || '';
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const loadEmployees = useCallback(async (page = 1) => {
    try {
      const response = await api.get('/employees', { params: { ...filters, department: departmentFilter, page, limit: 20 } });
      setEmployees(response.data.employees || []);
      setMeta(response.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load employees.');
    } finally { setLoading(false); }
  }, [departmentFilter, filters]);

  useEffect(() => {
    let active = true;
    api.get('/employees', { params: { ...filters, department: departmentFilter, page: 1, limit: 20 } })
      .then((response) => {
        if (!active) return;
        setEmployees(response.data.employees || []);
        setMeta(response.data);
        setError('');
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load employees.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [departmentFilter, filters]);

  const changeFilter = (field, value) => {
    setLoading(true);
    setFilters((current) => ({ ...current, [field]: value }));
  };
  const clearFilters = () => {
    setLoading(true);
    setFilters({ search: '', status: '' });
    setSearchParams({});
  };
  const changeForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
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
      const response = await api.get('/employees/export/pdf', { params: { ...filters, department: departmentFilter }, responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a'); link.href = url; link.download = 'company-ai-employees.pdf'; link.click(); URL.revokeObjectURL(url);
      setNotice('Employee PDF downloaded successfully.');
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to export employees.'); }
  };

  return <div className="page-container employee-management-page directory-page">
    <div className="page-heading directory-heading"><div><p className="eyebrow">{isAdminManagement ? 'ADMINISTRATION' : 'PEOPLE DIRECTORY'}</p><h2>{isAdminManagement ? 'Admin Management' : 'All Employees'}</h2><p>{isAdminManagement ? 'Manage employee records and directory permissions.' : 'Search, filter, and browse employees across every department.'}</p></div><div className="management-actions">{canExport && <button className="secondary-action" type="button" onClick={exportPdf}>Download PDF</button>}</div></div>
    <DirectoryNav />
    {notice && <div className="inline-notice success">{notice}</div>}
    {error && <div className="inline-notice error" role="alert">{error}</div>}
    <div className="directory-toolbar all-employees-toolbar">
      <label className="directory-search"><span aria-hidden="true">⌕</span><input value={filters.search} onChange={(event) => changeFilter('search', event.target.value)} placeholder="Search name, ID, email, or role" aria-label="Search employees" />{filters.search && <button type="button" onClick={() => changeFilter('search', '')} aria-label="Clear search">×</button>}</label>
      <label className="directory-select"><span>Department</span><select value={departmentFilter} onChange={(event) => { setLoading(true); setSearchParams(event.target.value ? { department: event.target.value } : {}); }}>{departments.map((department) => <option key={department} value={department === 'All Departments' ? '' : department}>{department}</option>)}</select></label>
      <label className="directory-select"><span>Status</span><select value={filters.status} onChange={(event) => changeFilter('status', event.target.value)}><option value="">Any status</option><option value="ACTIVE">Active</option><option value="ON_LEAVE">On leave</option><option value="INACTIVE">Inactive</option><option value="TERMINATED">Terminated</option></select></label>
      {(filters.search || departmentFilter || filters.status) && <button className="directory-reset" type="button" onClick={clearFilters}>Clear filters</button>}
    </div>
    <div className="directory-results-line"><span>{loading ? 'Updating directory…' : `Showing ${employees.length} of ${meta.total || 0} employees`}</span><span>20 per page</span></div>
    <EmployeeTable employees={employees} loading={loading} canEdit={isAdminManagement && canEdit} canDelete={isAdminManagement && canDelete} onEdit={openEdit} onDelete={setDeleting} />
    <div className="directory-pagination"><button type="button" disabled={meta.page <= 1 || loading} onClick={() => { setLoading(true); loadEmployees(meta.page - 1); }}>← Previous</button><span>Page <strong>{meta.page || 1}</strong> of {meta.totalPages || 1}</span><button type="button" disabled={meta.page >= meta.totalPages || loading} onClick={() => { setLoading(true); loadEmployees(meta.page + 1); }}>Next →</button></div>
    {deleting && <div className="modal-backdrop"><div className="modal-panel"><h3>Delete Employee?</h3><p>Are you sure you want to delete <strong>{deleting.name}</strong> ({deleting.id}) from {deleting.department}?</p><div className="modal-actions"><button type="button" onClick={() => setDeleting(null)}>Cancel</button><button className="danger-action" type="button" onClick={deleteEmployee}>Delete Employee</button></div></div></div>}
    {modalOpen && <EmployeeFormModal form={form} editing={editing} onChange={changeForm} onSubmit={saveEmployee} onClose={() => setModalOpen(false)} />}
  </div>;
}

function EmployeeFormModal({ form, editing, onChange, onSubmit, onClose }) {
  return <div className="modal-backdrop"><form className="modal-panel employee-form" onSubmit={onSubmit}><div className="modal-heading"><div><p className="eyebrow">COMPANY AI DIRECTORY</p><h3>{editing ? 'Edit Employee' : 'Add Employee'}</h3></div><button type="button" onClick={onClose}>Close</button></div><div className="form-grid">{[['employeeId','Employee ID'],['name','Full Name'],['email','Email'],['phone','Phone'],['department','Department'],['designation','Designation'],['manager','Manager'],['joiningDate','Joining Date'],['location','Location'],['salary','Salary']].map(([name, label]) => <label key={name}>{label}<input name={name} value={form[name] || ''} onChange={onChange} type={name === 'joiningDate' ? 'date' : name === 'salary' ? 'number' : 'text'} required={['employeeId','name','email','department','designation'].includes(name)} /></label>)}<label>Employee Type<select name="category" value={form.category} onChange={onChange}><option value="IT">IT</option><option value="Non-IT">NON_IT</option></select></label><label>Status<select name="status" value={form.status} onChange={onChange}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="ON_LEAVE">ON_LEAVE</option></select></label><label className="wide-field">Skills<input name="skills" value={form.skills || ''} onChange={onChange} placeholder="React, Node.js, SQL" /></label></div><div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary-action" type="submit">{editing ? 'Save Changes' : 'Create Employee'}</button></div></form></div>;
}

export default Employees;
