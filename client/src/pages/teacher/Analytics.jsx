import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/examServices';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/Loading';
import { BarChart3, TrendingUp, Users, Award } from 'lucide-react';

export const TeacherAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await analyticsService.getTeacherAnalytics();
        setData(res.data);
      } catch (err) {
        console.error('Failed to load teacher analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <LoadingSpinner label="Loading faculty evaluation metrics..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Performance Analytics</h1>
        <p className="text-sm text-slate-400">Class performance and exam score statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Class Average" subtitle="Overall mean score">
          <div className="flex items-center gap-4 py-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-100">{data?.avgClassScore || 0}%</p>
              <p className="text-xs text-slate-400">Target: 75%</p>
            </div>
          </div>
        </Card>

        <Card title="Total Submissions" subtitle="Completed student exams">
          <div className="flex items-center gap-4 py-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-100">{data?.totalSubmissions || 0}</p>
              <p className="text-xs text-slate-400">Evaluated</p>
            </div>
          </div>
        </Card>

        <Card title="Total Exams" subtitle="Created assessment papers">
          <div className="flex items-center gap-4 py-4">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-100">{data?.totalExams || 0}</p>
              <p className="text-xs text-slate-400">Published or Draft</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
