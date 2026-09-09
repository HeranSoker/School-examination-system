import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/examServices';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/Loading';
import {
  Users,
  GraduationCap,
  UserCheck,
  BookOpen,
  FileSpreadsheet,
  TrendingUp,
  Award,
  Clock,
  BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await analyticsService.getAdminAnalytics();
        setData(res.data);
      } catch (err) {
        console.error('Failed to load admin analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <LoadingSpinner label="Loading system dashboard analytics..." />;

  const statCards = [
    { label: 'Total Students', value: data?.totalStudents, icon: GraduationCap, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Active Teachers', value: data?.totalTeachers, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Total Classes', value: data?.totalClasses, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Total Subjects', value: data?.totalSubjects, icon: BookOpen, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Active Exams', value: data?.activeExams, icon: Clock, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Pass Rate', value: `${data?.passRate}%`, icon: Award, color: 'text-teal-400', bg: 'bg-teal-500/10' },
  ];

  const pieColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];
  const pieData = [
    { name: 'Active', value: data?.activeExams || 0 },
    { name: 'Completed', value: data?.completedExams || 0 },
    { name: 'Draft', value: data?.draftExams || 0 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">System Overview</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time statistics & examination management insights</p>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{stat.label}</span>
                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-100 mt-3">{stat.value ?? 0}</p>
            </Card>
          );
        })}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject Average Score Chart */}
        <Card title="Subject Performance" subtitle="Average score breakdown by subject" className="lg:col-span-2">
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.subjectPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '8px', color: '#f8fafc' }}
                  formatter={(val) => [`${Math.round(val)}%`, 'Average Score']}
                />
                <Bar dataKey="avg_score" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Exam Distribution Pie */}
        <Card title="Exam Statuses" subtitle="Distribution of system exams">
          <div className="h-72 w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '8px', color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs mt-2">
              {pieData.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pieColors[idx] }} />
                  <span className="text-slate-400">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Exams Table */}
      <Card title="Recent Examinations" subtitle="Latest created and published exams">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Instructor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.recentExams?.map((exam) => (
                <tr key={exam.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-slate-200">{exam.title}</td>
                  <td className="px-4 py-3 text-slate-400">{exam.subject_name}</td>
                  <td className="px-4 py-3 text-slate-400">{exam.teacher_name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={exam.status === 'active' ? 'success' : exam.status === 'scheduled' ? 'warning' : 'neutral'}>
                      {exam.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(exam.created_at).toLocaleDateString()}
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
