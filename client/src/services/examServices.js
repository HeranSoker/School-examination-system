import api from './api';

export const examService = {
  getExams: (params) => api.get('/exams', { params }),
  getExam: (id) => api.get(`/exams/${id}`),
  createExam: (data) => api.post('/exams', data),
  updateExam: (id, data) => api.put(`/exams/${id}`, data),
  deleteExam: (id) => api.delete(`/exams/${id}`),
  publishExam: (id) => api.post(`/exams/${id}/publish`),
  unpublishExam: (id) => api.post(`/exams/${id}/unpublish`),
  getStudentExams: () => api.get('/student/exams'),
};

export const questionService = {
  getQuestions: (examId) => api.get(`/exams/${examId}/questions`),
  getStudentQuestions: (examId) => api.get(`/student/exams/${examId}/questions`),
  createQuestion: (examId, data) => api.post(`/exams/${examId}/questions`, data),
  updateQuestion: (id, data) => api.put(`/questions/${id}`, data),
  deleteQuestion: (id) => api.delete(`/questions/${id}`),
  reorderQuestions: (examId, questions) => api.post(`/exams/${examId}/questions/reorder`, { questions }),
};

export const attemptService = {
  startExam: (examId) => api.post(`/exams/${examId}/start`),
  getAttempt: (attemptId) => api.get(`/attempts/${attemptId}`),
  saveAnswer: (attemptId, data) => api.post(`/attempts/${attemptId}/answers`, data),
  submitExam: (attemptId) => api.post(`/attempts/${attemptId}/submit`),
  gradeAnswer: (answerId, data) => api.put(`/answers/${answerId}/grade`, data),
};

export const resultService = {
  getResults: (params) => api.get('/results', { params }),
  getResult: (id) => api.get(`/results/${id}`),
  getExamResults: (examId) => api.get(`/results/exam/${examId}`),
  getStudentResults: (studentId) => api.get(`/results/student/${studentId}`),
  publishResults: (data) => api.post('/results/publish', data),
};

export const analyticsService = {
  getAdminAnalytics: () => api.get('/analytics/admin'),
  getTeacherAnalytics: () => api.get('/analytics/teacher'),
  getStudentAnalytics: () => api.get('/analytics/student'),
};

export const exportService = {
  downloadExamResultsCSV: async (examId, examTitle = 'Exam') => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/export/exams/${examId}/results/csv`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to download CSV export');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${examTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_Results.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  downloadStudentsCSV: async (classId) => {
    const token = localStorage.getItem('token');
    const url = classId ? `/api/export/classes/${classId}/students/csv` : '/api/export/students/csv';
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to download Students CSV export');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `Students_Roster.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  },
};

