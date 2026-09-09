import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Layouts
import { AdminLayout } from './layouts/AdminLayout';
import { TeacherLayout } from './layouts/TeacherLayout';
import { StudentLayout } from './layouts/StudentLayout';

// Auth Pages
import { Login } from './pages/auth/Login';

// Admin Pages
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminUsers } from './pages/admin/Users';
import { AdminStudents } from './pages/admin/Students';
import { AdminTeachers } from './pages/admin/Teachers';
import { AdminClasses } from './pages/admin/Classes';
import { AdminSubjects } from './pages/admin/Subjects';
import { AdminExams } from './pages/admin/Exams';
import { AdminResults } from './pages/admin/Results';

// Teacher Pages
import { TeacherDashboard } from './pages/teacher/Dashboard';
import { TeacherExams } from './pages/teacher/Exams';
import { TeacherExamWizard } from './pages/teacher/ExamWizard';
import { TeacherQuestionEditor } from './pages/teacher/QuestionEditor';
import { TeacherResults } from './pages/teacher/Results';
import { TeacherAnalytics } from './pages/teacher/Analytics';

// Student Pages
import { StudentDashboard } from './pages/student/Dashboard';
import { StudentAvailableExams } from './pages/student/AvailableExams';
import { StudentExamInstructions } from './pages/student/ExamInstructions';
import { StudentTakeExam } from './pages/student/TakeExam';
import { StudentResult } from './pages/student/Result';
import { StudentHistory } from './pages/student/History';

// Protected Route Wrapper
const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span>Verifying security credentials...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }

  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="teachers" element={<AdminTeachers />} />
            <Route path="classes" element={<AdminClasses />} />
            <Route path="subjects" element={<AdminSubjects />} />
            <Route path="exams" element={<AdminExams />} />
            <Route path="results" element={<AdminResults />} />
          </Route>

          {/* Teacher Routes */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/teacher/dashboard" replace />} />
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="exams" element={<TeacherExams />} />
            <Route path="exams/create" element={<TeacherExamWizard />} />
            <Route path="exams/:examId/questions" element={<TeacherQuestionEditor />} />
            <Route path="results" element={<TeacherResults />} />
            <Route path="analytics" element={<TeacherAnalytics />} />
          </Route>

          {/* Student Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/student/dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="exams" element={<StudentAvailableExams />} />
            <Route path="exams/:examId/instructions" element={<StudentExamInstructions />} />
            <Route path="attempts/:attemptId/take" element={<StudentTakeExam />} />
            <Route path="results" element={<StudentHistory />} />
            <Route path="results/:id" element={<StudentResult />} />
            <Route path="history" element={<StudentHistory />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
