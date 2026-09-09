import React, { useState, useEffect } from 'react';
import { studentService, classService } from '../../services/adminService';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { UserPlus, Search, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    class_id: '',
    status: 'active',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resStudents, resClasses] = await Promise.all([
        studentService.getStudents({ page, search, class_id: classFilter, limit: 10 }),
        classService.getClasses(),
      ]);
      setStudents(resStudents.data.students);
      setPagination(resStudents.data.pagination);
      setClasses(resClasses.data);
    } catch (err) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search, classFilter]);

  const handleOpenModal = (student = null) => {
    if (student) {
      setSelectedStudent(student);
      setFormData({
        full_name: student.full_name,
        username: student.username,
        email: student.email,
        password: '',
        class_id: student.class_id || '',
        status: student.status,
      });
    } else {
      setSelectedStudent(null);
      setFormData({
        full_name: '',
        username: '',
        email: '',
        password: '',
        class_id: '',
        status: 'active',
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedStudent) {
        await studentService.updateStudent(selectedStudent.id, formData);
        toast.success('Student record updated');
      } else {
        await studentService.createStudent(formData);
        toast.success('Student enrolled successfully');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const columns = [
    { header: 'Student ID', accessor: 'student_id', cellClassName: 'font-mono text-indigo-400 font-bold' },
    { header: 'Full Name', accessor: 'full_name', cellClassName: 'font-semibold text-slate-100' },
    { header: 'Email', accessor: 'email' },
    {
      header: 'Assigned Class',
      cell: (row) => row.class_name ? <Badge variant="purple">{row.class_name}</Badge> : <span className="text-slate-500">Unassigned</span>,
    },
    {
      header: 'Status',
      cell: (row) => <Badge variant={row.status === 'active' ? 'success' : 'danger'}>{row.status}</Badge>,
    },
    {
      header: 'Action',
      cell: (row) => (
        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(row)}>
          <Edit2 className="w-4 h-4 text-indigo-400" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Student Directory</h1>
          <p className="text-sm text-slate-400">Manage enrolled students and class assignments</p>
        </div>
        <Button variant="primary" icon={UserPlus} onClick={() => handleOpenModal()}>
          Enroll Student
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by student name or student ID..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            options={[
              { label: 'All Classes', value: '' },
              ...classes.map((c) => ({ label: c.name, value: c.id })),
            ]}
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            placeholder=""
          />
        </div>
      </div>

      <Table columns={columns} data={students} loading={loading} />

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
        title={selectedStudent ? 'Edit Student Details' : 'Enroll New Student'}
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
            label={selectedStudent ? 'New Password (Leave blank to keep current)' : 'Password'}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!selectedStudent}
          />
          <Select
            label="Class Assignment"
            options={classes.map((c) => ({ label: c.name, value: c.id }))}
            value={formData.class_id}
            onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {selectedStudent ? 'Save Changes' : 'Enroll Student'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
