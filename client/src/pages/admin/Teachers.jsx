import React, { useState, useEffect } from 'react';
import { teacherService } from '../../services/adminService';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { UserPlus, Search, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    department: '',
    status: 'active',
  });

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await teacherService.getTeachers({ page, search, limit: 10 });
      setTeachers(res.data.teachers);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [page, search]);

  const handleOpenModal = (teacher = null) => {
    if (teacher) {
      setSelectedTeacher(teacher);
      setFormData({
        full_name: teacher.full_name,
        username: teacher.username,
        email: teacher.email,
        password: '',
        department: teacher.department || '',
        status: teacher.status,
      });
    } else {
      setSelectedTeacher(null);
      setFormData({
        full_name: '',
        username: '',
        email: '',
        password: '',
        department: '',
        status: 'active',
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedTeacher) {
        await teacherService.updateTeacher(selectedTeacher.id, formData);
        toast.success('Teacher record updated');
      } else {
        await teacherService.createTeacher(formData);
        toast.success('Teacher added successfully');
      }
      setModalOpen(false);
      fetchTeachers();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const columns = [
    { header: 'Employee ID', accessor: 'employee_id', cellClassName: 'font-mono text-emerald-400 font-bold' },
    { header: 'Full Name', accessor: 'full_name', cellClassName: 'font-semibold text-slate-100' },
    { header: 'Email', accessor: 'email' },
    { header: 'Department', accessor: 'department', cell: (row) => row.department || 'General' },
    { header: 'Created Exams', accessor: 'exam_count', cellClassName: 'font-semibold text-slate-200' },
    {
      header: 'Status',
      cell: (row) => <Badge variant={row.status === 'active' ? 'success' : 'danger'}>{row.status}</Badge>,
    },
    {
      header: 'Action',
      cell: (row) => (
        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(row)}>
          <Edit2 className="w-4 h-4 text-emerald-400" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Faculty & Teachers</h1>
          <p className="text-sm text-slate-400">Manage teaching staff accounts and departments</p>
        </div>
        <Button variant="primary" icon={UserPlus} onClick={() => handleOpenModal()}>
          Add New Teacher
        </Button>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search teachers by name, ID or email..."
          icon={Search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Table columns={columns} data={teachers} loading={loading} />

      <Pagination
        page={page}
        pages={pagination.pages || 1}
        total={pagination.total || 0}
        limit={pagination.limit || 10}
        onPageChange={setPage}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedTeacher ? 'Edit Teacher Details' : 'Register New Teacher'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />
          <Input
            label="Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            label="Department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder="e.g. Mathematics, Science"
          />
          <Input
            label={selectedTeacher ? 'New Password (Optional)' : 'Password'}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!selectedTeacher}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {selectedTeacher ? 'Save Changes' : 'Register Teacher'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
