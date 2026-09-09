import React, { useState, useEffect } from 'react';
import { examService } from '../../services/examServices';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Link } from 'react-router-dom';
import { PlusCircle, HelpCircle, Send, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const TeacherExams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await examService.getExams();
      setExams(res.data.exams);
    } catch (err) {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handlePublish = async (id) => {
    try {
      await examService.publishExam(id);
      toast.success('Exam published successfully!');
      fetchExams();
    } catch (err) {
      toast.error(err.message || 'Publish failed');
    }
  };

  const handleUnpublish = async (id) => {
    try {
      await examService.unpublishExam(id);
      toast.success('Exam unpublished');
      fetchExams();
    } catch (err) {
      toast.error(err.message || 'Unpublish failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await examService.deleteExam(id);
      toast.success('Exam deleted');
      fetchExams();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const columns = [
    { header: 'Title', accessor: 'title', cellClassName: 'font-semibold text-slate-100' },
    { header: 'Subject', accessor: 'subject_name' },
    { header: 'Duration', cell: (row) => `${row.duration_minutes} mins` },
    { header: 'Pass Marks', cell: (row) => `${row.pass_marks} / ${row.total_marks}` },
    {
      header: 'Status',
      cell: (row) => (
        <Badge
          variant={
            row.status === 'active'
              ? 'success'
              : row.status === 'scheduled'
              ? 'warning'
              : 'neutral'
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Link to={`/teacher/exams/${row.id}/questions`}>
            <Button variant="outline" size="sm" icon={HelpCircle}>
              Questions ({row.question_count || 0})
            </Button>
          </Link>

          {row.status === 'draft' ? (
            <Button variant="success" size="sm" icon={Send} onClick={() => handlePublish(row.id)}>
              Publish
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => handleUnpublish(row.id)}>
              Unpublish
            </Button>
          )}

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
          <h1 className="text-2xl font-bold text-slate-100">My Examinations</h1>
          <p className="text-sm text-slate-400">Author, schedule, and manage examination papers</p>
        </div>
        <Link to="/teacher/exams/create">
          <Button variant="primary" icon={PlusCircle}>
            Create New Exam
          </Button>
        </Link>
      </div>

      <Table columns={columns} data={exams} loading={loading} />
    </div>
  );
};
