import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import LandingPage from "./pages/LandingPage";
import TeacherLogin from "./pages/TeacherLogin";
import TeacherSignup from "./pages/TeacherSignup";
import AdminAccountFix from "./pages/AdminAccountFix";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import ClassroomPage from "./pages/ClassroomPage";
import AssignmentPage from "./pages/AssignmentPage.jsx";
import AssignmentLibrary from "./pages/AssignmentLibrary";
import NotesLibrary from "./pages/NotesLibrary";
import QuestionBank from "./pages/QuestionBank";
import TestBuilder from "./pages/TestBuilder";
import TestTaking from "./pages/TestTaking";
import ImportAssignment from "./pages/ImportAssignment";
import TeacherPractice from "./pages/TeacherPractice";
import SecretRoleSwitch from "./pages/SecretRoleSwitch";
import TeacherReports from "./pages/TeacherReports";
import TestReports from "./pages/TestReports";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAddCoins from "./pages/AdminAddCoins";
import CompetitionManagement from "./pages/CompetitionManagement";
import CompetitionView from "./pages/CompetitionView";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function AuthHandler({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuth = async () => {
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);

      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        try {
          const response = await axios.post(`${API}/auth/session`, {
            session_id: sessionId,
          });

          document.cookie = `session_token=${response.data.session_token}; path=/; max-age=${7 * 24 * 60 * 60}; secure; samesite=none`;
          
          setUser(response.data);
          window.location.hash = "";
          
          if (response.data.role === "teacher") {
            navigate("/teacher/dashboard");
          } else {
            navigate("/student/dashboard");
          }
        } catch (error) {
          console.error("Auth error:", error);
          toast.error("Authentication failed");
          setLoading(false);
        }
      } else {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            withCredentials: true,
          });
          setUser(response.data);
        } catch (error) {
          console.log("Not authenticated");
        } finally {
          setLoading(false);
        }
      }
    };

    handleAuth();
  }, [navigate]);

  // Function to refresh user data (for updates like purchases)
  const refreshUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true,
      });
      setUser(response.data);
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  if (loading) {
    return (
      <div data-testid="loading-screen" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return children({ user, setUser, refreshUser });
}

function ProtectedRoute({ children, user, requiredRole }) {
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard"} replace />;
  }

  return children;
}

function App() {
  return (
    <div className="App">
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <AuthHandler>
          {({ user, setUser, refreshUser }) => (
            <Routes>
              <Route path="/" element={user ? <Navigate to={user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard"} replace /> : <LandingPage />} />
              
              <Route
                path="/teacher/dashboard"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <TeacherDashboard user={user} setUser={setUser} />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute user={user} requiredRole="student">
                    <StudentDashboard user={user} setUser={setUser} refreshUser={refreshUser} />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/classroom/:classroomId"
                element={
                  <ProtectedRoute user={user}>
                    <ClassroomPage user={user} setUser={setUser} />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/assignment/:assignmentId"
                element={
                  <ProtectedRoute user={user}>
                    <AssignmentPage user={user} setUser={setUser} />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/library"
                element={
                  <ProtectedRoute user={user}>
                    <AssignmentLibrary user={user} />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/notes"
                element={
                  <ProtectedRoute user={user}>
                    <NotesLibrary user={user} />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/question-bank"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <QuestionBank user={user} />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/test-builder"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <TestBuilder user={user} />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/test/:testId"
                element={
                  <ProtectedRoute user={user} requiredRole="student">
                    <TestTaking user={user} />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/library/import/:assignmentId"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <ImportAssignment user={user} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/teacher-practice/:problemId"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <TeacherPractice user={user} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/secret-admin-role-switch"
                element={<SecretRoleSwitch />}
              />

              <Route
                path="/teacher-reports"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <TeacherReports user={user} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/test-reports"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <TestReports user={user} />
                  </ProtectedRoute>
                }
              />

              <Route path="/teacher-login" element={<TeacherLogin />} />
              <Route path="/teacher-signup" element={<TeacherSignup />} />
              <Route path="/emergency-fix" element={<AdminAccountFix />} />

              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <AdminDashboard user={user} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin-add-coins"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <AdminAddCoins user={user} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/teacher/competitions"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <CompetitionManagement user={user} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/teacher/competition/:competitionId"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <CompetitionView user={user} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/competition/:competitionId"
                element={
                  <ProtectedRoute user={user} requiredRole="student">
                    <CompetitionView user={user} />
                  </ProtectedRoute>
                }
              />
            </Routes>
          )}
        </AuthHandler>
      </BrowserRouter>
    </div>
  );
}

export default App;