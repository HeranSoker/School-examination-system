import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examService, attemptService } from '../../services/examServices';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/Loading';
import { Clock, ShieldAlert, ArrowRight, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export const StudentExamInstructions = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await examService.getExam(examId);
        setExam(res.data);
      } catch (err) {
        toast.error('Failed to load exam details');
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [examId]);

  const handleStartExam = async () => {
    if (!agreed) {
      toast.error('Please accept the rules before beginning');
      return;
    }

    setStarting(true);
    try {
      const res = await attemptService.startExam(examId);
      const attemptId = res.data.attempt_id;
      navigate(`/student/attempts/${attemptId}/take`);
    } catch (err) {
      toast.error(err.message || 'Could not start exam');
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Preparing examination rules..." />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div>
            <Badge variant="purple">{exam?.subject_name}</Badge>
            <h1 className="text-xl font-bold text-slate-100 mt-1">{exam?.title}</h1>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 font-semibold text-xs border border-indigo-500/20">
            <Clock className="w-4 h-4" />
            <span>{exam?.duration_minutes} Minutes</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-4 text-sm text-slate-300">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Important Exam Rules & Integrity Notice:</p>
              <ul className="list-disc list-inside text-xs mt-1 space-y-1 text-amber-200/80">
                <li>The server timer starts immediately upon clicking "Start Examination Now".</li>
                <li>Your answers are automatically saved periodically in real-time.</li>
                <li>If the timer expires, your test will auto-submit automatically.</li>
                <li>Do not refresh or leave the examination window during active attempt.</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-100 mb-1">Teacher Instructions:</h3>
            <p className="text-xs text-slate-400 leading-relaxed p-3 bg-slate-900/80 rounded-lg border border-slate-800">
              {exam?.instructions || 'Answer all questions carefully within the allocated duration.'}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
            <input
              type="checkbox"
              id="agree"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="agree" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
              I have read, understood, and agree to abide by all examination instructions.
            </label>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            disabled={!agreed}
            isLoading={starting}
            onClick={handleStartExam}
            icon={ArrowRight}
          >
            Start Examination Now
          </Button>
        </div>
      </Card>
    </div>
  );
};
