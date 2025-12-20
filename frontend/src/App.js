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
import ChallengeArena from "./pages/ChallengeArena";
import ChallengeResults from "./pages/ChallengeResults";
import ChallengePool from "./pages/ChallengePool";
import SchoolAdminSignup from "./pages/SchoolAdminSignup";
import DistrictAdminSignup from "./pages/DistrictAdminSignup";
import SchoolAdminDashboard from "./pages/SchoolAdminDashboard";
import DistrictAdminDashboard from "./pages/DistrictAdminDashboard";
import PlatformAdminDashboard from "./pages/PlatformAdminDashboard";
import StudentSandbox from "./pages/StudentSandbox";
import VideoLibrary from "./pages/VideoLibrary";
import AdminMessages from "./pages/AdminMessages";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import CodingTestCreate from "./pages/CodingTestCreate";
import CodingTestList from "./pages/CodingTestList";
import MyTests from "./pages/MyTests";
import CodingTestTaking from "./pages/CodingTestTaking";
import CodingTestResult from "./pages/CodingTestResult";
import CodingTestSubmissions from "./pages/CodingTestSubmissions";
import TurtleGraphics from "./pages/TurtleGraphics";
import TurtleCurriculum from "./pages/TurtleCurriculum";
import TurtleTeaching from "./pages/TurtleTeaching";
import MicrobitCurriculum from "./pages/MicrobitCurriculum";
import MicrobitTeaching from "./pages/MicrobitTeaching";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Set up axios interceptor to always include the session token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("session_token");
  if (token && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

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

          // Store session token in both cookie and localStorage for reliability
          const maxAge = 7 * 24 * 60 * 60; // 7 days
          document.cookie = `session_token=${response.data.session_token}; path=/; max-age=${maxAge}; secure; samesite=lax`;
          localStorage.setItem("session_token", response.data.session_token);
          
          // Set default axios header for Authorization
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.session_token}`;
          
          // Clear hash first
          window.location.hash = "";
          
          // Set user and loading state
          setUser(response.data);
          setLoading(false); // Important: Set loading to false after successful OAuth
          
          // Use setTimeout to ensure state updates are processed before navigation
          setTimeout(() => {
            // Redirect based on role
            if (response.data.role === "teacher") {
              navigate("/teacher/dashboard", { replace: true });
            } else if (response.data.role === "school_admin") {
              navigate("/school-admin/dashboard", { replace: true });
            } else if (response.data.role === "district_admin") {
              navigate("/district-admin/dashboard", { replace: true });
            } else {
              navigate("/student/dashboard", { replace: true });
            }
          }, 100);
        } catch (error) {
          console.error("Auth error:", error);
          toast.error("Authentication failed");
          setLoading(false);
        }
      } else {
        try {
          // Try to restore session from localStorage
          const storedToken = localStorage.getItem("session_token");
          if (storedToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          }
          
          const response = await axios.get(`${API}/auth/me`, {
            withCredentials: true,
          });
          setUser(response.data);
        } catch (error) {
          console.log("Not authenticated");
          // Clear any stale tokens
          localStorage.removeItem("session_token");
          delete axios.defaults.headers.common['Authorization'];
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
      // Ensure Authorization header is set
      const storedToken = localStorage.getItem("session_token");
      if (storedToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
      
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

// Helper function to get dashboard route based on role
function getDashboardRoute(role) {
  switch (role) {
    case "teacher":
      return "/teacher/dashboard";
    case "school_admin":
      return "/school-admin/dashboard";
    case "district_admin":
      return "/district-admin/dashboard";
    case "student":
    default:
      return "/student/dashboard";
  }
}

function ProtectedRoute({ children, user, requiredRole }) {
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={getDashboardRoute(user.role)} replace />;
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
              <Route path="/" element={user ? <Navigate to={getDashboardRoute(user.role)} replace /> : <LandingPage />} />
              
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
                path="/student/sandbox"
                element={
                  <ProtectedRoute user={user} requiredRole="student">
                    <StudentSandbox user={user} />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/turtle"
                element={
                  <ProtectedRoute user={user}>
                    <TurtleGraphics user={user} />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/microbit"
                element={
                  <ProtectedRoute user={user}>
                    <MicrobitCurriculum user={user} />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/turtle-curriculum"
                element={
                  <ProtectedRoute user={user}>
                    <TurtleCurriculum user={user} />
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
                path="/video-library"
                element={
                  <ProtectedRoute user={user}>
                    <VideoLibrary user={user} />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/admin/messages"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <AdminMessages user={user} />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <AdminAnalytics user={user} />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/admin/announcements"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <AdminAnnouncements user={user} />
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

              <Route
                path="/test/:testId/results"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <TestReports user={user} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/coding-tests/create"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <CodingTestCreate user={user} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/coding-tests"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <CodingTestList user={user} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/my-tests"
                element={
                  <ProtectedRoute user={user} requiredRole="student">
                    <MyTests user={user} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/coding-test/:testId"
                element={
                  <ProtectedRoute user={user} requiredRole="student">
                    <CodingTestTaking user={user} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/coding-test-result/:testId"
                element={
                  <ProtectedRoute user={user} requiredRole="student">
                    <CodingTestResult user={user} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/coding-tests/:testId/submissions"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <CodingTestSubmissions user={user} />
                  </ProtectedRoute>
                }
              />


              <Route path="/teacher-login" element={<TeacherLogin />} />
              <Route path="/teacher-signup" element={<TeacherSignup />} />
              <Route path="/school-admin-signup" element={<SchoolAdminSignup />} />
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
                path="/teacher/challenge-pool"
                element={
                  <ProtectedRoute user={user} requiredRole="teacher">
                    <ChallengePool user={user} />
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

              <Route
                path="/student/challenge/:challengeId/arena"
                element={
                  <ProtectedRoute user={user} requiredRole="student">
                    <ChallengeArena user={user} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/challenge/:challengeId/results"
                element={
                  <ProtectedRoute user={user} requiredRole="student">
                    <ChallengeResults user={user} />
                  </ProtectedRoute>
                }
              />

              {/* Admin Signup Routes */}
              <Route path="/signup/school-admin" element={<SchoolAdminSignup />} />
              <Route path="/signup/district-admin" element={<DistrictAdminSignup />} />

              {/* School Admin Routes */}
              <Route
                path="/school-admin/dashboard"
                element={
                  <ProtectedRoute user={user} requiredRole="school_admin">
                    <SchoolAdminDashboard user={user} />
                  </ProtectedRoute>
                }
              />

              {/* District Admin Routes */}
              <Route
                path="/district-admin/dashboard"
                element={
                  <ProtectedRoute user={user} requiredRole="district_admin">
                    <DistrictAdminDashboard user={user} />
                  </ProtectedRoute>
                }
              />

              {/* Platform Admin Routes */}
              <Route
                path="/platform-admin/dashboard"
                element={
                  <ProtectedRoute user={user}>
                    <PlatformAdminDashboard user={user} />
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