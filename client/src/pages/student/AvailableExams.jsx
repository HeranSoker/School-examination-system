import React, { useState, useEffect } from 'react';
import { examService } from '../../services/examServices';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/Loading';
import { Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export const StudentAvailableExams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await examService.getStudentExams();
        setExams(res.data);
      } catch (err) {
        toast.error('Failed to load available exams');
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  if (loading) return <LoadingSpinner label="Checking exam schedule..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Available Examinations</h1>
        <p className="text-sm text-slate-400">All tests scheduled for your academic class</p>
      </div>

      {exams.length === 0 ? (
        <Card className="text-center py-12 text-slate-500">
          <p>No exams currently active or scheduled for your class.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => (
            <Card key={exam.id} className="flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="purple">{exam.subject_name}</Badge>
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {exam.duration_minutes} Mins
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-100">{exam.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{exam.description}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <span className="text-xs text-slate-400 font-semibold">
                  Pass Mark: {exam.pass_marks} / {exam.total_marks}
                </span>
                <Link to={`/student/exams/${exam.id}/instructions`}>
                  <Button variant="primary" size="sm" icon={ArrowRight}>
                    Take Exam
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
