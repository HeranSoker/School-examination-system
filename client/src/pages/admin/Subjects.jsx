import React, { useState, useEffect } from 'react';
import { subjectService } from '../../services/adminService';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await subjectService.getSubjects();
      setSubjects(res.data);
    } catch (err) {
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleOpenModal = (sub = null) => {
    if (sub) {
      setSelectedSubject(sub);
      setFormData({
        name: sub.name,
        code: sub.code,
        description: sub.description || '',
      });
    } else {
      setSelectedSubject(null);
      setFormData({
        name: '',
        code: '',
        description: '',
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedSubject) {
        await subjectService.updateSubject(selectedSubject.id, formData);
        toast.success('Subject updated');
      } else {
        await subjectService.createSubject(formData);
        toast.success('Subject created');
      }
      setModalOpen(false);
      fetchSubjects();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await subjectService.deleteSubject(id);
      toast.success('Subject deleted');
      fetchSubjects();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const columns = [
    { header: 'Subject Code', accessor: 'code', cellClassName: 'font-mono text-amber-400 font-bold' },
    { header: 'Subject Name', accessor: 'name', cellClassName: 'font-semibold text-slate-100' },
    { header: 'Description', accessor: 'description', cell: (row) => row.description || 'No description' },
    { header: 'Exams Count', accessor: 'exam_count', cellClassName: 'font-semibold text-slate-200' },
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
          <h1 className="text-2xl font-bold text-slate-100">Subjects & Curriculum</h1>
          <p className="text-sm text-slate-400">Manage academic subjects and exam categories</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => handleOpenModal()}>
          Add New Subject
        </Button>
      </div>

      <Table columns={columns} data={subjects} loading={loading} />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedSubject ? 'Edit Subject Details' : 'Add New Subject'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Subject Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Computer Science"
            required
          />
          <Input
            label="Subject Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="e.g. CS101"
            required
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Description
            </label>
            <textarea
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief course overview..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {selectedSubject ? 'Save Changes' : 'Create Subject'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
