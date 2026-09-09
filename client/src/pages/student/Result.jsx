import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { resultService, attemptService } from '../../services/examServices';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/Loading';
import { Award, CheckCircle2, XCircle, ArrowLeft, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

export const StudentResult = () => {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await resultService.getResult(id);
        setResult(res.data);
      } catch (err) {
        toast.error('Failed to load exam scorecard');
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [id]);

  if (loading) return <LoadingSpinner label="Generating your examination scorecard..." />;

  const isPassed = result?.is_passed;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link to="/student/results">
          <Button variant="ghost" icon={ArrowLeft}>
            Back to My Results
          </Button>
        </Link>
        <Button variant="outline" icon={Printer} onClick={() => window.print()}>
          Print Scorecard / Certificate
        </Button>
      </div>

      {/* Main Scorecard Card */}
      <Card className="text-center p-8 space-y-6 print:border-2 print:border-slate-300 print:text-black print:bg-white print:shadow-none">
        <div className="inline-flex p-4 rounded-full bg-slate-800/80 print:bg-slate-100 mb-2">
          {isPassed ? (
            <CheckCircle2 className="w-16 h-16 text-emerald-400 print:text-emerald-600" />
          ) : (
            <XCircle className="w-16 h-16 text-rose-400 print:text-rose-600" />
          )}
        </div>

        <div>
          <Badge variant={isPassed ? 'success' : 'danger'} className="text-sm px-4 py-1">
            {isPassed ? 'PASSED EXAMINATION' : 'NEEDS IMPROVEMENT'}
          </Badge>
          <h1 className="text-2xl font-bold text-slate-100 print:text-slate-900 mt-3">{result?.exam_title}</h1>
          <p className="text-sm text-slate-400 print:text-slate-600 mt-1">{result?.subject_name}</p>
        </div>

        {/* Student & Exam Info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left text-xs bg-slate-900/60 print:bg-slate-50 p-4 rounded-xl border border-slate-800 print:border-slate-300">
          <div>
            <span className="text-slate-500 font-semibold block">Student Name:</span>
            <span className="font-bold text-slate-200 print:text-slate-900">{result?.student_name || 'Student'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block">Student Code:</span>
            <span className="font-mono font-bold text-indigo-400 print:text-indigo-700">{result?.student_code || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block">Duration:</span>
            <span className="text-slate-300 print:text-slate-700">{result?.duration_minutes ? `${result.duration_minutes} mins` : 'Standard'}</span>
          </div>
        </div>

        {/* Score Breakdown Box */}
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto p-4 bg-slate-800/50 print:bg-slate-100 rounded-2xl border border-slate-700/60 print:border-slate-300">
          <div>
            <p className="text-xs text-slate-400 print:text-slate-600 font-semibold">Marks Score</p>
            <p className="text-xl font-extrabold text-slate-100 print:text-slate-900 mt-1">
              {result?.marks_obtained} / {result?.total_marks}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 print:text-slate-600 font-semibold">Percentage</p>
            <p className="text-xl font-extrabold text-indigo-400 print:text-indigo-700 mt-1">{result?.percentage}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 print:text-slate-600 font-semibold">Grade Awarded</p>
            <p className="text-xl font-extrabold text-amber-400 print:text-amber-600 mt-1">{result?.grade}</p>
          </div>
        </div>

        <div className="text-xs text-slate-500 print:text-slate-600 pt-4 border-t border-slate-800 print:border-slate-300 flex justify-between items-center">
          <span>Official Examination Record</span>
          <span>Submitted on {new Date(result?.created_at).toLocaleString()}</span>
        </div>
      </Card>
    </div>
  );
};
