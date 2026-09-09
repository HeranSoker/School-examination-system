import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptService, questionService } from '../../services/examServices';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/Loading';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Clock, Save, Send, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const StudentTakeExam = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { question_id: { selected_option_id, answer_text } }
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState('Saved'); // 'Saved' | 'Saving...' | 'Error'

  // Server-controlled Timer
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const timerRef = useRef(null);

  // Submit Dialog
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load Attempt and Questions
  const loadExamData = async () => {
    try {
      const resAttempt = await attemptService.getAttempt(attemptId);
      const attemptData = resAttempt.data;
      setAttempt(attemptData);

      // Populate existing saved answers
      const savedMap = {};
      if (attemptData.answers) {
        attemptData.answers.forEach((ans) => {
          savedMap[ans.question_id] = {
            selected_option_id: ans.selected_option_id,
            answer_text: ans.answer_text,
          };
        });
      }
      setAnswers(savedMap);

      // Calculate time remaining based on server expires_at
      const expiresAt = new Date(attemptData.expires_at).getTime();
      const now = new Date().getTime();
      const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(remainingSeconds);

      // Load questions
      const resQ = await questionService.getStudentQuestions(attemptData.exam_id);
      setQuestions(resQ.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load exam attempt');
      navigate('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExamData();
  }, [attemptId]);

  // Handle Submission
  const handleSubmitExam = async (isAuto = false) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await attemptService.submitExam(attemptId);
      toast.success(isAuto ? 'Time expired! Exam auto-submitted.' : 'Exam submitted successfully!');
      navigate(`/student/results/${res.data.id || attemptId}`);
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
      setConfirmSubmitOpen(false);
    }
  };

  // Timer Tick Interval & Visibility Re-sync
  useEffect(() => {
    if (loading || !attempt) return;

    const syncTimeWithServer = () => {
      if (!attempt?.expires_at) return;
      const expiresAt = new Date(attempt.expires_at).getTime();
      const now = new Date().getTime();
      const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(remainingSeconds);
      if (remainingSeconds <= 0) {
        handleSubmitExam(true);
      }
    };

    // Re-sync on tab switch / window focus
    window.addEventListener('focus', syncTimeWithServer);
    document.addEventListener('visibilitychange', syncTimeWithServer);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmitExam(true); // Auto-submit when time expires!
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      window.removeEventListener('focus', syncTimeWithServer);
      document.removeEventListener('visibilitychange', syncTimeWithServer);
    };
  }, [loading, attempt]);

  // Auto-Save Answer
  const saveAnswerToServer = async (questionId, optionId, textValue) => {
    setSavingStatus('Saving...');
    try {
      await attemptService.saveAnswer(attemptId, {
        question_id: questionId,
        selected_option_id: optionId || null,
        answer_text: textValue || null,
      });
      setSavingStatus('Saved');
    } catch (err) {
      setSavingStatus('Error');
    }
  };

  const handleSelectOption = (questionId, optionId) => {
    const currentText = answers[questionId]?.answer_text || '';
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { selected_option_id: optionId, answer_text: currentText },
    }));
    saveAnswerToServer(questionId, optionId, currentText);
  };

  const handleTextChange = (questionId, text) => {
    const currentOption = answers[questionId]?.selected_option_id || null;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { selected_option_id: currentOption, answer_text: text },
    }));
    saveAnswerToServer(questionId, currentOption, text);
  };

  // Format Time Remaining (HH:MM:SS)
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) return <LoadingSpinner label="Entering secure exam mode..." />;

  const currentQ = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k]?.selected_option_id || answers[k]?.answer_text?.trim()
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Authoritative Exam Control Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div>
          <h1 className="text-sm font-bold text-slate-100 truncate">{attempt?.exam_title}</h1>
          <p className="text-[10px] text-indigo-400 font-semibold">{attempt?.subject_name}</p>
        </div>

        {/* Real-time Server Clock */}
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold text-sm sm:text-base ${
            timeLeft < 300
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{formatTime(timeLeft)}</span>
        </div>

        {/* Auto-Save Indicator & Submit */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            {savingStatus}
          </span>
          <Button
            variant="danger"
            size="sm"
            icon={Send}
            onClick={() => setConfirmSubmitOpen(true)}
          >
            Submit Exam
          </Button>
        </div>
      </header>

      {/* Main Examination View */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Columns: Active Question Area */}
        <div className="lg:col-span-3 flex flex-col justify-between space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl glass-card space-y-6">
            {/* Question Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <Badge variant="purple">{currentQ?.question_type}</Badge>
              </div>
              <span className="text-xs font-semibold text-emerald-400">
                {currentQ?.marks} Marks
              </span>
            </div>

            {/* Question Text */}
            <div className="text-base font-semibold text-slate-100 leading-relaxed">
              {currentQ?.question_text}
            </div>

            {/* Answers Section */}
            {(currentQ?.question_type === 'MCQ' || currentQ?.question_type === 'TRUE_FALSE') && (
              <div className="space-y-3 pt-2">
                {currentQ?.options?.map((opt) => {
                  const selected = answers[currentQ.id]?.selected_option_id === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(currentQ.id, opt.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        selected
                          ? 'bg-indigo-600/20 border-indigo-500 text-slate-100 font-semibold shadow-lg shadow-indigo-600/10'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-sm">{opt.option_text}</span>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          selected
                            ? 'border-indigo-500 bg-indigo-600 text-white'
                            : 'border-slate-600'
                        }`}
                      >
                        {selected && <CheckCircle className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {(currentQ?.question_type === 'SHORT_ANSWER' || currentQ?.question_type === 'ESSAY') && (
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Your Answer:
                </label>
                <textarea
                  className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={currentQ?.question_type === 'ESSAY' ? 8 : 4}
                  placeholder="Type your explanation or response..."
                  value={answers[currentQ?.id]?.answer_text || ''}
                  onChange={(e) => handleTextChange(currentQ.id, e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Question Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="secondary"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(currentIndex - 1)}
              icon={ChevronLeft}
            >
              Previous Question
            </Button>

            {!isLastQuestion ? (
              <Button
                variant="primary"
                onClick={() => setCurrentIndex(currentIndex + 1)}
              >
                Next Question <ChevronRight className="w-4 h-4 ml-1 inline" />
              </Button>
            ) : (
              <Button
                variant="danger"
                icon={Send}
                onClick={() => setConfirmSubmitOpen(true)}
              >
                Submit Exam
              </Button>
            )}
          </div>
        </div>

        {/* Right 1 Column: Question Palette & Progress Navigator */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl glass-card space-y-4 sticky top-20">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3">
              Question Navigator
            </h3>

            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Answered: <strong className="text-indigo-400">{answeredCount}</strong> / {questions.length}</span>
              <span>Remaining: <strong className="text-amber-400">{questions.length - answeredCount}</strong></span>
            </div>

            {/* Grid Palette Buttons */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered =
                  answers[q.id]?.selected_option_id ||
                  answers[q.id]?.answer_text?.trim();

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-lg font-bold text-xs transition-all flex items-center justify-center cursor-pointer ${
                      isCurrent
                        ? 'ring-2 ring-indigo-500 bg-indigo-600 text-white shadow-md'
                        : isAnswered
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2 text-[11px]">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="w-3 h-3 rounded bg-indigo-600 ring-2 ring-indigo-500" />
                <span>Current Question</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="w-3 h-3 rounded bg-slate-800" />
                <span>Unanswered</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        onConfirm={() => handleSubmitExam(false)}
        title="Submit Examination"
        message={`You have answered ${answeredCount} of ${questions.length} questions. Are you sure you want to submit your examination paper now?`}
        confirmText="Yes, Submit Exam"
        cancelText="Return to Exam"
        variant="danger"
        isLoading={submitting}
      />
    </div>
  );
};
