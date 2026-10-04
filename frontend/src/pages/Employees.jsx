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
  const canCreate = hasPermission('ADMIN_EMPLOYEE_CREATE');
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
  const [saving, setSaving] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState(false);

  const loadEmployees = useCallback(async (page = 1, selectedFilters = filters, selectedDepartment = departmentFilter) => {
    setLoading(true);
    try {
      const response = await api.get('/employees', { params: { ...selectedFilters, department: selectedDepartment, page, limit: 20 } });
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
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setNotice('');
    setModalOpen(true);
  };
  const openEdit = (employee) => {
    setEditing(employee);
    setForm({
      ...emptyForm,
      ...employee,
      employeeId: employee.employeeId || employee.id,
      designation: employee.designation || employee.role,
      joiningDate: employee.joiningDate ? String(employee.joiningDate).slice(0, 10) : '',
      skills: (employee.skills || []).join(', '),
    });
    setModalOpen(true);
    setError('');
    setNotice('');
  };
  const closeForm = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setError('');
  };

  const saveEmployee = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      ...form,
      skills: form.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
      role: form.designation || form.role,
      salary: form.salary ? Number(form.salary) : undefined,
    };
    try {
      const response = editing
        ? await api.put(`/employees/${editing.id}`, payload)
        : await api.post('/employees', payload);
      setNotice(response.data.message || (editing ? 'Employee updated successfully.' : 'Employee created successfully.'));
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      if (editing) {
        await loadEmployees(meta.page);
      } else {
        const defaultFilters = { search: '', status: '' };
        setFilters(defaultFilters);
        setSearchParams({});
        await loadEmployees(1, defaultFilters, '');
      }
    } catch (requestError) {
      const validationDetails = Object.values(requestError.response?.data?.errors || {}).join(' ');
      setError([requestError.response?.data?.message, validationDetails].filter(Boolean).join(' ') || 'Unable to save employee.');
    } finally {
      setSaving(false);
    }
  };

  const deleteEmployee = async () => {
    if (!deleting || deletingEmployee) return;
    setDeletingEmployee(true);
    setError('');
    setNotice('');
    try {
      const response = await api.delete(`/employees/${deleting.id}`);
      setDeleting(null);
      setNotice(response.data.message || 'Employee deleted successfully.');
      const lastPage = Math.max(1, Math.ceil((meta.total - 1) / 20));
      await loadEmployees(Math.min(meta.page, lastPage));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete employee.');
    } finally {
      setDeletingEmployee(false);
    }
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
    <div className="page-heading directory-heading"><div><p className="eyebrow">{isAdminManagement ? 'ADMINISTRATION' : 'PEOPLE DIRECTORY'}</p><h2>{isAdminManagement ? 'Admin Management' : 'All Employees'}</h2><p>{isAdminManagement ? 'Manage employee records and directory permissions.' : 'Search, filter, and browse employees across every department.'}</p></div><div className="management-actions">{isAdminManagement && canCreate && <button className="primary-action" type="button" onClick={openCreate}>＋ Add Employee</button>}{canExport && <button className="secondary-action" type="button" onClick={exportPdf}>Download PDF</button>}</div></div>
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
    <EmployeeTable employees={employees} loading={loading} canEdit={isAdminManagement && canEdit} canDelete={isAdminManagement && canDelete} centerActions={isAdminManagement} onEdit={openEdit} onDelete={setDeleting} />
    <div className="directory-pagination"><button type="button" disabled={meta.page <= 1 || loading} onClick={() => { setLoading(true); loadEmployees(meta.page - 1); }}>← Previous</button><span>Page <strong>{meta.page || 1}</strong> of {meta.totalPages || 1}</span><button type="button" disabled={meta.page >= meta.totalPages || loading} onClick={() => { setLoading(true); loadEmployees(meta.page + 1); }}>Next →</button></div>
    {deleting && <div className="modal-backdrop"><div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="delete-employee-title"><h3 id="delete-employee-title">Delete Employee?</h3><p>Are you sure you want to delete <strong>{deleting.name}</strong> ({deleting.id}) from {deleting.department}? This will remove the employee from active records.</p>{error && <div className="inline-notice error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" disabled={deletingEmployee} onClick={() => setDeleting(null)}>Cancel</button><button className="danger-action" type="button" onClick={deleteEmployee} disabled={deletingEmployee}>{deletingEmployee ? 'Deleting…' : 'Delete Employee'}</button></div></div></div>}
    {modalOpen && <EmployeeFormModal form={form} editing={editing} error={error} saving={saving} onChange={changeForm} onSubmit={saveEmployee} onClose={closeForm} />}
  </div>;
}

function EmployeeFormModal({ form, editing, error, saving, onChange, onSubmit, onClose }) {
  return <div className="modal-backdrop"><form className="modal-panel employee-form" onSubmit={onSubmit}><div className="modal-heading"><div><p className="eyebrow">EMPLOYEE DIRECTORY</p><h3>{editing ? 'Edit Employee' : 'Add Employee'}</h3></div><button type="button" onClick={onClose} disabled={saving}>Close</button></div>{error && <div className="inline-notice error" role="alert">{error}</div>}<div className="form-grid">{[['employeeId','Employee ID'],['name','Full Name'],['email','Email'],['phone','Phone'],['department','Department'],['designation','Designation'],['manager','Manager'],['joiningDate','Joining Date'],['location','Location'],['salary','Salary']].map(([name, label]) => <label key={name}>{label}<input name={name} value={form[name] || ''} onChange={onChange} type={name === 'joiningDate' ? 'date' : name === 'salary' ? 'number' : name === 'email' ? 'email' : 'text'} min={name === 'salary' ? '0' : undefined} required={['employeeId','name','email','department','designation'].includes(name)} /></label>)}<label>Employee Type<select name="category" value={form.category} onChange={onChange} required><option value="IT">IT</option><option value="Non-IT">Non-IT</option></select></label><label>Status<select name="status" value={form.status} onChange={onChange}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ON_LEAVE">On leave</option></select></label><label className="wide-field">Skills<input name="skills" value={form.skills || ''} onChange={onChange} placeholder="React, Node.js, SQL" /></label></div><div className="modal-actions"><button type="button" onClick={onClose} disabled={saving}>Cancel</button><button className="primary-action" type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Employee'}</button></div></form></div>;
}

export default Employees;
