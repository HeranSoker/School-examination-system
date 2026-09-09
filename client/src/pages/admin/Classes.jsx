import React, { useState, useEffect } from 'react';
import { classService } from '../../services/adminService';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminClasses = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    section: '',
    academic_year: '2026-2027',
  });

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await classService.getClasses();
      setClasses(res.data);
    } catch (err) {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleOpenModal = (c = null) => {
    if (c) {
      setSelectedClass(c);
      setFormData({
        name: c.name,
        grade: c.grade,
        section: c.section,
        academic_year: c.academic_year,
      });
    } else {
      setSelectedClass(null);
      setFormData({
        name: '',
        grade: '',
        section: '',
        academic_year: '2026-2027',
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedClass) {
        await classService.updateClass(selectedClass.id, formData);
        toast.success('Class updated');
      } else {
        await classService.createClass(formData);
        toast.success('Class created');
      }
      setModalOpen(false);
      fetchClasses();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await classService.deleteClass(id);
      toast.success('Class deleted');
      fetchClasses();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const columns = [
    { header: 'Class Name', accessor: 'name', cellClassName: 'font-semibold text-slate-100' },
    { header: 'Grade Level', accessor: 'grade', cell: (row) => <Badge variant="neutral">Grade {row.grade}</Badge> },
    { header: 'Section', accessor: 'section', cellClassName: 'font-mono text-slate-300 font-bold' },
    { header: 'Academic Year', accessor: 'academic_year' },
    { header: 'Enrolled Students', accessor: 'student_count', cellClassName: 'font-semibold text-indigo-400' },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(row)}>
            <Edit2 className="w-4 h-4 text-indigo-400" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
            <Trash2 className="w-4 h-4 text-rose-400" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Classes & Sections</h1>
          <p className="text-sm text-slate-400">Organize students into academic grades and sections</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => handleOpenModal()}>
          Create New Class
        </Button>
      </div>

      <Table columns={columns} data={classes} loading={loading} />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedClass ? 'Edit Class Details' : 'Create New Class'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Class Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Grade 10 - Section A"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Grade"
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              placeholder="e.g. 10"
              required
            />
            <Input
              label="Section"
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              placeholder="e.g. A"
              required
            />
          </div>
          <Input
            label="Academic Year"
            value={formData.academic_year}
            onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {selectedClass ? 'Save Changes' : 'Create Class'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
