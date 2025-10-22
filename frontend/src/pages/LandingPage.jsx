import { useNavigate } from "react-router-dom";
import { Code2, Users, BookOpen, CheckCircle, GraduationCap, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const REDIRECT_URL = window.location.origin + "/student/dashboard";
const AUTH_URL = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(REDIRECT_URL)}`;

export default function LandingPage() {
  const navigate = useNavigate();
  
  const handleStudentLogin = () => {
    window.location.href = AUTH_URL;
  };

  const handleTeacherLogin = () => {
    navigate("/teacher-login");
  };

  return (
    <div data-testid="landing-page" className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Code2 className="w-8 h-8 text-indigo-600" />
          <span className="text-2xl font-bold text-gray-900">ByteBattles Arena</span>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            onClick={handleTeacherLogin} 
            variant="outline"
            className="gap-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50"
          >
            <GraduationCap className="w-4 h-4" />
            Teacher Login
          </Button>
          <Button 
            data-testid="nav-login-btn" 
            onClick={handleStudentLogin} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            <UserCircle className="w-4 h-4" />
            Student Login
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
            Where Code
            <br />
            <span className="text-indigo-600">Meets Competition</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            The ultimate coding education platform with gamification, team battles, and AI-powered grading. Make learning Python an epic adventure!
          </p>

          <Button data-testid="hero-get-started-btn" onClick={handleLogin} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all">
            Get Started Free
          </Button>

          <div className="mt-20 grid md:grid-cols-3 gap-8">
            <div data-testid="feature-classrooms" className="bg-white p-8 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Users className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Easy Classrooms</h3>
              <p className="text-gray-600">Create classrooms with unique codes. Students join instantly and start coding.</p>
            </div>

            <div data-testid="feature-assignments" className="bg-white p-8 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <BookOpen className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Python Assignments</h3>
              <p className="text-gray-600">Create coding challenges with starter code and multiple test cases.</p>
            </div>

            <div data-testid="feature-ai-grading" className="bg-white p-8 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <CheckCircle className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Grading</h3>
              <p className="text-gray-600">Automatic grading with AI-powered partial credit and detailed feedback.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}