import React, { useState, useEffect } from 'react';
import { resultService, attemptService, examService, exportService } from '../../services/examServices';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { CheckCircle2, Edit3, Send, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export const TeacherResults = () => {
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Manual Grading Modal State
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [attemptAnswers, setAttemptAnswers] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  const handleExportCSV = async () => {
    if (!selectedExamId) return;
    setExporting(true);
    try {
      const selectedExam = exams.find((e) => String(e.id) === String(selectedExamId));
      await exportService.downloadExamResultsCSV(selectedExamId, selectedExam?.title || 'Exam');
      toast.success('Exam results CSV downloaded successfully');
    } catch (err) {
      toast.error('Failed to export CSV: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const fetchExams = async () => {
    try {
      const res = await examService.getExams();
      setExams(res.data.exams);
      if (res.data.exams.length > 0) {
        setSelectedExamId(res.data.exams[0].id);
      }
    } catch (err) {
      toast.error('Failed to load exams');
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchResults = async (examId) => {
    if (!examId) return;
    setLoading(true);
    try {
      const res = await resultService.getExamResults(examId);
      setResults(res.data);
    } catch (err) {
      toast.error('Failed to load exam submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchResults(selectedExamId);
    }
  }, [selectedExamId]);

  const handleOpenGradeModal = async (resultRow) => {
    setSelectedAttempt(resultRow);
    try {
      const res = await attemptService.getAttempt(resultRow.attempt_id);
      setAttemptAnswers(res.data.answers || []);
      setGradeModalOpen(true);
    } catch (err) {
      toast.error('Failed to load attempt details');
    }
  };

  const handlePublishResults = async () => {
    try {
      await resultService.publishResults({ exam_id: selectedExamId });
      toast.success('Results published to student view!');
      fetchResults(selectedExamId);
    } catch (err) {
      toast.error(err.message || 'Publishing failed');
    }
  };

  const columns = [
    { header: 'Student Code', accessor: 'student_code', cellClassName: 'font-mono text-purple-400 font-bold' },
    { header: 'Student Name', accessor: 'student_name', cellClassName: 'font-semibold text-slate-100' },
    { header: 'Submitted At', cell: (row) => new Date(row.submitted_at).toLocaleString() },
    { header: 'Score', cell: (row) => `${row.marks_obtained} / ${row.total_marks}`, cellClassName: 'font-bold text-slate-200' },
    { header: 'Percentage', cell: (row) => `${row.percentage}%`, cellClassName: 'font-semibold text-indigo-400' },
    { header: 'Grade', accessor: 'grade', cellClassName: 'font-extrabold text-amber-400' },
    {
      header: 'Evaluation Status',
      cell: (row) => (
        <Badge variant={row.is_published ? 'success' : 'warning'}>
          {row.is_published ? 'Published' : 'Pending Publish'}
        </Badge>
      ),
    },
    {
      header: 'Action',
      cell: (row) => (
        <Button variant="outline" size="sm" icon={Edit3} onClick={() => handleOpenGradeModal(row)}>
          Review / Grade
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Submissions & Grading</h1>
          <p className="text-sm text-slate-400">Review student responses and publish final grades</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={Download}
            onClick={handleExportCSV}
            disabled={exporting || !selectedExamId || results.length === 0}
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button variant="success" icon={Send} onClick={handlePublishResults}>
            Publish All Grades
          </Button>
        </div>
      </div>

      {/* Select Exam Filter */}
      <div className="w-full sm:w-80">
        <Select
          label="Select Examination"
          options={exams.map((e) => ({ label: e.title, value: e.id }))}
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
        />
      </div>

      <Table columns={columns} data={results} loading={loading} />

      {/* Grade Review Modal */}
      <Modal
        isOpen={gradeModalOpen}
        onClose={() => setGradeModalOpen(false)}
        title={`Review Attempt: ${selectedAttempt?.student_name}`}
        subtitle={`Exam: ${selectedAttempt?.exam_title}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {attemptAnswers.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No recorded answers found for this attempt.</p>
          ) : (
            attemptAnswers.map((ans, idx) => (
              <div key={idx} className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-indigo-400">Question #{idx + 1}</span>
                </div>
                <p className="text-xs text-slate-300 font-medium">{ans.question_text || 'Subjective Question'}</p>
                <div className="p-3 bg-slate-900 rounded-lg text-xs text-slate-200 border border-slate-800">
                  <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Student Answer:</span>
                  {ans.answer_text || ans.selected_option_text || <span className="italic text-slate-500">No answer provided</span>}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
          <div className="text-xs text-slate-400">
            Total Score: <span className="font-bold text-emerald-400">{selectedAttempt?.marks_obtained}</span> / {selectedAttempt?.total_marks}
          </div>
          <Button variant="primary" onClick={() => setGradeModalOpen(false)}>
            Done
          </Button>
        </div>
      </Modal>
    </div>
  );
};
