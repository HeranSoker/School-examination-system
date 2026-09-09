import React, { useState, useEffect } from 'react';
import { examService } from '../../services/examServices';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminExams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await examService.getExams({ page, search, status: statusFilter, limit: 10 });
      setExams(res.data.exams);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [page, search, statusFilter]);

  const columns = [
    { header: 'Title', accessor: 'title', cellClassName: 'font-semibold text-slate-100' },
    { header: 'Subject', accessor: 'subject_name' },
    { header: 'Instructor', accessor: 'teacher_name' },
    { header: 'Duration', cell: (row) => `${row.duration_minutes} mins` },
    { header: 'Total Marks', accessor: 'total_marks', cellClassName: 'font-bold text-indigo-400' },
    {
      header: 'Status',
      cell: (row) => (
        <Badge
          variant={
            row.status === 'active'
              ? 'success'
              : row.status === 'scheduled'
              ? 'warning'
              : row.status === 'completed'
              ? 'info'
              : 'neutral'
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Start - End Time',
      cell: (row) =>
        row.start_time ? (
          <span className="text-xs text-slate-400">
            {new Date(row.start_time).toLocaleDateString()} - {new Date(row.end_time).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-slate-500">Unscheduled</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">All Examinations</h1>
        <p className="text-sm text-slate-400">Comprehensive overview of all system examinations</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search exams by title or instructor..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={[
              { label: 'All Statuses', value: '' },
              { label: 'Draft', value: 'draft' },
              { label: 'Scheduled', value: 'scheduled' },
              { label: 'Active', value: 'active' },
              { label: 'Completed', value: 'completed' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder=""
          />
        </div>
      </div>

      <Table columns={columns} data={exams} loading={loading} />

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
