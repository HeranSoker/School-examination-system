import React, { useState, useEffect } from 'react';
import { analyticsService, examService } from '../../services/examServices';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/Loading';
import { FileSpreadsheet, Clock, Award, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [resAnalytics, resExams] = await Promise.all([
          analyticsService.getStudentAnalytics(),
          examService.getStudentExams(),
        ]);
        setData(resAnalytics.data);
        setExams(resExams.data);
      } catch (err) {
        console.error('Failed to load student dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSpinner label="Loading student examination portal..." />;

  const stats = [
    { label: 'Available Exams', value: data?.availableExamsCount, icon: FileSpreadsheet, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Exams Completed', value: data?.completedExamsCount, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Average Score', value: `${data?.averageScore}%`, icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Welcome */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 sm:p-8 shadow-xl glass-card">
        <h1 className="text-2xl font-bold text-slate-100">Welcome Back, Student!</h1>
        <p className="text-sm text-slate-300 mt-1 max-w-2xl">
          View your upcoming assigned tests, review previous grade performance, or begin an active examination paper.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400">{s.label}</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">{s.value ?? 0}</p>
              </div>
              <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Available Exams Section */}
      <Card title="Exams Ready To Take" subtitle="Pending assessments assigned to your class">
        {exams.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No pending active exams for your class.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between space-y-4 hover:border-indigo-500/50 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="purple">{exam.subject_name}</Badge>
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {exam.duration_minutes} Mins
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-100">{exam.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">{exam.description}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-700/60">
                  <span className="text-xs text-slate-400 font-semibold">
                    Pass: {exam.pass_marks} / {exam.total_marks} Marks
                  </span>
                  <Link to={`/student/exams/${exam.id}/instructions`}>
                    <Button variant="primary" size="sm" icon={ArrowRight}>
                      Start Exam
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
