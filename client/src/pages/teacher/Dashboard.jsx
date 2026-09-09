import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/examServices';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/Loading';
import { FileSpreadsheet, CheckCircle2, Clock, BarChart3, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export const TeacherDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await analyticsService.getTeacherAnalytics();
        setData(res.data);
      } catch (err) {
        console.error('Failed to load teacher dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <LoadingSpinner label="Loading faculty dashboard..." />;

  const stats = [
    { label: 'Total Exams Created', value: data?.totalExams, icon: FileSpreadsheet, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Active Exams', value: data?.activeExams, icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Submissions Received', value: data?.totalSubmissions, icon: CheckCircle2, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Class Average', value: `${data?.avgClassScore}%`, icon: BarChart3, color: 'text-teal-400', bg: 'bg-teal-500/10' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Faculty Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your courses, examinations, and student evaluation</p>
        </div>
        <Link to="/teacher/exams/create">
          <Button variant="primary" icon={PlusCircle}>
            Create New Exam
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{s.label}</span>
                <div className={`p-2 rounded-lg ${s.bg} ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-100 mt-3">{s.value ?? 0}</p>
            </Card>
          );
        })}
      </div>

      <Card title="My Examinations" subtitle="Exams authored by you">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submissions</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.myExams?.map((exam) => (
                <tr key={exam.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-semibold text-slate-200">{exam.title}</td>
                  <td className="px-4 py-3 text-slate-400">{exam.subject_name}</td>
                  <td className="px-4 py-3 text-slate-400">{exam.duration_minutes} mins</td>
                  <td className="px-4 py-3">
                    <Badge variant={exam.status === 'active' ? 'success' : exam.status === 'scheduled' ? 'warning' : 'neutral'}>
                      {exam.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400">{exam.submission_count || 0}</td>
                  <td className="px-4 py-3">
                    <Link to={`/teacher/exams/${exam.id}/questions`}>
                      <span className="text-xs font-semibold text-indigo-400 hover:underline">
                        Questions ({exam.question_count || 0})
                      </span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
