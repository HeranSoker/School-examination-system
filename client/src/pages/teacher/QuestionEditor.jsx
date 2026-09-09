import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { questionService, examService } from '../../services/examServices';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/Loading';
import { Plus, Trash2, CheckCircle2, Circle, ArrowLeft, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

export const TeacherQuestionEditor = () => {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Question Form State
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('MCQ');
  const [marks, setMarks] = useState(5);
  const [options, setOptions] = useState([
    { option_text: '', is_correct: true },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ]);

  const fetchExamAndQuestions = async () => {
    try {
      const [resExam, resQ] = await Promise.all([
        examService.getExam(examId),
        questionService.getQuestions(examId),
      ]);
      setExam(resExam.data);
      setQuestions(resQ.data);
    } catch (err) {
      toast.error('Failed to load exam questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamAndQuestions();
  }, [examId]);

  const handleTypeChange = (type) => {
    setQuestionType(type);
    if (type === 'TRUE_FALSE') {
      setOptions([
        { option_text: 'True', is_correct: true },
        { option_text: 'False', is_correct: false },
      ]);
    } else if (type === 'MCQ') {
      setOptions([
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
      ]);
    } else {
      setOptions([]);
    }
  };

  const handleOptionTextChange = (index, text) => {
    const updated = [...options];
    updated[index].option_text = text;
    setOptions(updated);
  };

  const handleSetCorrectOption = (index) => {
    const updated = options.map((opt, i) => ({
      ...opt,
      is_correct: i === index,
    }));
    setOptions(updated);
  };

  const handleAddOption = () => {
    setOptions([...options, { option_text: '', is_correct: false }]);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      toast.error('Multiple Choice questions must have at least 2 options');
      return;
    }
    const updated = options.filter((_, i) => i !== index);
    if (!updated.some((o) => o.is_correct)) {
      updated[0].is_correct = true;
    }
    setOptions(updated);
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!questionText) {
      toast.error('Question text is required');
      return;
    }

    if ((questionType === 'MCQ' || questionType === 'TRUE_FALSE') && options.some((o) => !o.option_text)) {
      toast.error('All option text fields must be filled');
      return;
    }

    try {
      await questionService.createQuestion(examId, {
        question_text: questionText,
        question_type: questionType,
        marks: Number(marks),
        options: (questionType === 'MCQ' || questionType === 'TRUE_FALSE') ? options : [],
      });
      toast.success('Question added successfully!');
      setQuestionText('');
      handleTypeChange('MCQ');
      fetchExamAndQuestions();
    } catch (err) {
      toast.error(err.message || 'Failed to add question');
    }
  };

  const handleDeleteQuestion = async (id) => {
    try {
      await questionService.deleteQuestion(id);
      toast.success('Question deleted');
      fetchExamAndQuestions();
    } catch (err) {
      toast.error(err.message || 'Failed to delete question');
    }
  };

  if (loading) return <LoadingSpinner label="Loading exam question editor..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link to="/teacher/exams">
            <button className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{exam?.title}</h1>
            <p className="text-sm text-slate-400">
              {exam?.subject_name} • {exam?.duration_minutes} Mins • Total Marks: {' '}
              <span className="text-emerald-400 font-bold">{exam?.total_marks}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Add Question Form */}
        <div className="lg:col-span-1">
          <Card title="Add New Question" className="sticky top-20">
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <Select
                label="Question Type"
                options={[
                  { label: 'Multiple Choice (MCQ)', value: 'MCQ' },
                  { label: 'True / False', value: 'TRUE_FALSE' },
                  { label: 'Short Answer', value: 'SHORT_ANSWER' },
                  { label: 'Essay', value: 'ESSAY' },
                ]}
                value={questionType}
                onChange={(e) => handleTypeChange(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Question Prompt
                </label>
                <textarea
                  className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                  placeholder="Type your question statement here..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Marks Allocation"
                type="number"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                required
              />

              {/* Options Builder for MCQ & TRUE_FALSE */}
              {(questionType === 'MCQ' || questionType === 'TRUE_FALSE') && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Answer Choices & Correct Key
                    </label>
                    {questionType === 'MCQ' && (
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Option
                      </button>
                    )}
                  </div>

                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetCorrectOption(idx)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          opt.is_correct
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title="Mark as correct answer"
                      >
                        {opt.is_correct ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>
                      <input
                        className="flex-1 bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder={`Option ${idx + 1}`}
                        value={opt.option_text}
                        onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                        disabled={questionType === 'TRUE_FALSE'}
                        required
                      />
                      {questionType === 'MCQ' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full mt-4" icon={Plus}>
                Save Question
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Questions List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-200">
              Exam Questions ({questions.length})
            </h3>
            <span className="text-xs text-slate-400">Total Marks: {exam?.total_marks}</span>
          </div>

          {questions.length === 0 ? (
            <Card className="text-center py-12 text-slate-500">
              <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No questions added to this exam yet.</p>
              <p className="text-xs mt-1 text-slate-600">Use the form on the left to add questions.</p>
            </Card>
          ) : (
            questions.map((q, qIdx) => (
              <Card key={q.id} className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                        Q{qIdx + 1}
                      </span>
                      <Badge variant="purple">{q.question_type}</Badge>
                      <span className="text-xs font-semibold text-emerald-400">{q.marks} Marks</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-100">{q.question_text}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Display options if MCQ or TRUE_FALSE */}
                {q.options && q.options.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-slate-800">
                    {q.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                          opt.is_correct
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                        }`}
                      >
                        <span>{opt.option_text}</span>
                        {opt.is_correct && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
