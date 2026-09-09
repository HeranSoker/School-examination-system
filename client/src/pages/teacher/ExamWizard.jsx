import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examService } from '../../services/examServices';
import { subjectService, classService } from '../../services/adminService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export const TeacherExamWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    duration_minutes: 60,
    pass_marks: 25,
    start_time: '',
    end_time: '',
    instructions: 'Read each question carefully before submitting your answer.',
    class_ids: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resSub, resClass] = await Promise.all([
          subjectService.getSubjects(),
          classService.getClasses(),
        ]);
        setSubjects(resSub.data);
        setClasses(resClass.data);
      } catch (err) {
        toast.error('Failed to load subjects or classes');
      }
    };
    fetchData();
  }, []);

  const toggleClass = (classId) => {
    setFormData((prev) => {
      const exists = prev.class_ids.includes(classId);
      return {
        ...prev,
        class_ids: exists
          ? prev.class_ids.filter((id) => id !== classId)
          : [...prev.class_ids, classId],
      };
    });
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.subject_id) {
      toast.error('Exam title and subject are required');
      return;
    }

    setLoading(true);
    try {
      const res = await examService.createExam(formData);
      toast.success('Exam created! Now add your questions.');
      navigate(`/teacher/exams/${res.data.id}/questions`);
    } catch (err) {
      toast.error(err.message || 'Creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Create New Examination</h1>
        <p className="text-sm text-slate-400">Step-by-step examination setup wizard</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        {[
          { number: 1, label: 'Basic Info' },
          { number: 2, label: 'Schedule & Rules' },
          { number: 3, label: 'Assigned Classes' },
        ].map((s) => (
          <div key={s.number} className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                step === s.number
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : step > s.number
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {step > s.number ? <Check className="w-4 h-4" /> : s.number}
            </div>
            <span
              className={`text-xs font-semibold hidden sm:inline ${
                step === s.number ? 'text-slate-100' : 'text-slate-400'
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card title="Step 1: General Details">
          <div className="space-y-4">
            <Input
              label="Exam Title"
              placeholder="e.g. Mathematics Midterm Examination"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />

            <Select
              label="Subject"
              options={subjects.map((s) => ({ label: `${s.code} - ${s.name}`, value: s.id }))}
              value={formData.subject_id}
              onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Description
              </label>
              <textarea
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
                placeholder="Overview of topics covered in this exam..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Schedule & Rules */}
      {step === 2 && (
        <Card title="Step 2: Schedule & Passing Rules">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Duration (Minutes)"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                required
              />
              <Input
                label="Pass Marks"
                type="number"
                value={formData.pass_marks}
                onChange={(e) => setFormData({ ...formData, pass_marks: Number(e.target.value) })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Time (Optional)"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
              <Input
                label="End Time (Optional)"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Student Instructions
              </label>
              <textarea
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Assigned Classes */}
      {step === 3 && (
        <Card title="Step 3: Target Classes">
          <p className="text-xs text-slate-400 mb-4">
            Select the classes eligible to take this exam:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {classes.map((c) => {
              const selected = formData.class_ids.includes(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => toggleClass(c.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selected
                      ? 'bg-emerald-600/15 border-emerald-500/50 text-slate-100'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs text-slate-500">
                      Grade {c.grade} • Section {c.section}
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                      selected
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'border-slate-600'
                    }`}
                  >
                    {selected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-4">
        {step > 1 ? (
          <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(step - 1)}>
            Previous
          </Button>
        ) : <div />}

        {step < 3 ? (
          <Button variant="primary" icon={ArrowRight} onClick={() => setStep(step + 1)}>
            Next Step
          </Button>
        ) : (
          <Button variant="success" icon={Sparkles} isLoading={loading} onClick={handleSubmit}>
            Create & Add Questions
          </Button>
        )}
      </div>
    </div>
  );
};
