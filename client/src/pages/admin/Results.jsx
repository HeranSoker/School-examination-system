import React, { useState, useEffect } from 'react';
import { resultService } from '../../services/examServices';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { Printer, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminResults = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await resultService.getResults({ page, limit: 10 });
      const dataList = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setResults(dataList);
      setPagination(res.data?.pagination || { pages: 1, total: dataList.length, limit: 10 });
    } catch (err) {
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [page]);

  const exportCSV = () => {
    if (results.length === 0) return;
    const headers = ['Student ID', 'Student Name', 'Exam Title', 'Marks Obtained', 'Total Marks', 'Percentage', 'Grade', 'Status'];
    const rows = results.map(r => [
      r.student_code,
      `"${r.student_name}"`,
      `"${r.exam_title}"`,
      r.marks_obtained,
      r.total_marks,
      `${r.percentage}%`,
      r.grade,
      r.is_passed ? 'PASSED' : 'FAILED'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `system_exam_results_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    { header: 'Student ID', accessor: 'student_code', cellClassName: 'font-mono text-purple-400 font-bold' },
    { header: 'Student Name', accessor: 'student_name', cellClassName: 'font-semibold text-slate-100' },
    { header: 'Exam Title', accessor: 'exam_title' },
    { header: 'Score', cell: (row) => `${row.marks_obtained} / ${row.total_marks}`, cellClassName: 'font-bold text-slate-200' },
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Grade Reports</h1>
          <p className="text-sm text-slate-400">System-wide examination results and performance analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Printer} onClick={() => window.print()}>
            Print Report
          </Button>
          <Button variant="primary" icon={Download} onClick={exportCSV}>
            Export CSV
          </Button>
        </div>
      </div>

      <Table columns={columns} data={results} loading={loading} />

      <Pagination
        page={page}
        pages={pagination.pages || 1}
        total={pagination.total || 0}
        limit={pagination.limit || 10}
        onPageChange={setPage}
      />
    </div>
  );
};
