import React, { useState, useEffect } from 'react';
import { resultService } from '../../services/examServices';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { Award, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export const StudentHistory = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        const res = await resultService.getStudentResults(user.id);
        setResults(res.data);
      } catch (err) {
        toast.error('Failed to load exam history');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const columns = [
    { header: 'Exam Title', accessor: 'exam_title', cellClassName: 'font-semibold text-slate-100' },
    { header: 'Subject', accessor: 'subject_name' },
    { header: 'Date Taken', cell: (row) => new Date(row.created_at).toLocaleDateString() },
    { header: 'Score', cell: (row) => `${row.marks_obtained ?? row.obtained_marks ?? 0} / ${row.total_marks}`, cellClassName: 'font-bold text-slate-200' },
    { header: 'Percentage', cell: (row) => `${row.percentage}%`, cellClassName: 'font-semibold text-indigo-400' },
    { header: 'Grade', accessor: 'grade', cellClassName: 'font-extrabold text-amber-400' },
    {
      header: 'Result',
      cell: (row) => (
        <Badge variant={row.is_passed ? 'success' : 'danger'}>
          {row.is_passed ? 'PASSED' : 'FAILED'}
        </Badge>
      ),
    },
    {
      header: 'Scorecard',
      cell: (row) => (
        <Link to={`/student/results/${row.id}`}>
          <Button variant="ghost" size="sm" icon={Eye}>
            View
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">My Exam History & Results</h1>
        <p className="text-sm text-slate-400">Archived grades and scorecard history</p>
      </div>

      <Table columns={columns} data={results} loading={loading} />
    </div>
  );
};
