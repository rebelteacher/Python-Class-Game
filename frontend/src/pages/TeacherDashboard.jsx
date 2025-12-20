import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Plus, LogOut, Code2, RefreshCw, BookOpen, FileSpreadsheet, Shield, FileText, FileQuestion, Trophy, Video, Bell, Trash2, Cpu } from "lucide-react";
import WhatsNew from "@/components/WhatsNew";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function TeacherDashboard({ user, setUser }) {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  // Fun classroom name suggestions
  const classroomNameSuggestions = [
    "Python Pandemonium",
    "Code Crusaders",
    "Debug Dynasty",
    "Algorithm Avengers",
    "Syntax Squad",
    "Loop Legends",
    "Binary Brawlers",
    "Function Fighters",
    "Variable Vikings",
    "Exception Explorers"
  ];

  const getRandomSuggestion = () => {
    return classroomNameSuggestions[Math.floor(Math.random() * classroomNameSuggestions.length)];
  };

  useEffect(() => {
    fetchClassrooms();
    if (user?.is_admin) {
      fetchUnreadCount();
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${API}/admin/feedback/unread-count`, {
        withCredentials: true,
      });
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const response = await axios.get(`${API}/classrooms`, {
        withCredentials: true,
      });
      setClassrooms(response.data);
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      toast.error("Failed to load classrooms");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClassroom = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      toast.error("Please enter a classroom name");
      return;
    }

    try {
      await axios.post(
        `${API}/classrooms`,
        { name: newClassName },
        { withCredentials: true }
      );
      toast.success("Classroom created successfully!");
      setNewClassName("");
      setCreateDialogOpen(false);
      fetchClassrooms();
    } catch (error) {
      console.error("Error creating classroom:", error);
      toast.error("Failed to create classroom");
    }
  };

  const handleSwitchToStudent = async () => {
    try {
      const response = await axios.post(`${API}/auth/switch-role`, {}, {
        withCredentials: true,
      });
      
      // Open student dashboard in new window/tab
      const studentWindow = window.open('/student/dashboard', '_blank');
      
      if (studentWindow) {
        toast.success("Opening student view in new window");
        
        // Switch back to teacher role in this window after a brief delay
        // This allows the new window to load with student role
        setTimeout(async () => {
          try {
            const switchBackResponse = await axios.post(`${API}/auth/switch-role`, {}, {
              withCredentials: true,
            });
            setUser({ ...user, role: switchBackResponse.data.role });
          } catch (err) {
            console.error("Error switching back:", err);
          }
        }, 1000);
      } else {
        toast.error("Please allow pop-ups to open student view");
      }
    } catch (error) {
      console.error("Error switching role:", error);
      toast.error("Failed to switch role");
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      document.cookie = "session_token=; path=/; max-age=0";
      localStorage.removeItem("session_token");
      delete axios.defaults.headers.common['Authorization'];
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleDeleteClassroom = async (classroomId, classroomName, e) => {
    e.stopPropagation(); // Prevent card click
    
    const confirmed = window.confirm(
      `⚠️ WARNING: Are you sure you want to PERMANENTLY DELETE "${classroomName}"?\n\n` +
      `This will delete:\n` +
      `- All student data\n` +
      `- All assignments\n` +
      `- All submissions\n` +
      `- Everything associated with this classroom\n\n` +
      `This action CANNOT be undone!`
    );
    
    if (!confirmed) return;
    
    try {
      await axios.delete(`${API}/classrooms/${classroomId}`, {
        withCredentials: true,
      });
      toast.success("Classroom deleted successfully");
      fetchClassrooms(); // Refresh the list
    } catch (error) {
      console.error("Error deleting classroom:", error);
      toast.error(error.response?.data?.detail || "Failed to delete classroom");
    }
  };

  return (
    <div data-testid="teacher-dashboard" className="min-h-screen bg-gradient-to-br from-teal-50 via-orange-50 to-pink-50">
      <nav className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 shadow-lg">
        <div className="px-6 py-3">
          {/* Row 1: Branding and User Info */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center space-x-2">
              <Code2 className="w-7 h-7 text-white" />
              <span className="text-xl font-bold text-white">ByteBattles Arena</span>
              <span className="ml-4 px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full border border-white/30">
                Teacher
              </span>
            </div>
            <span className="text-lg font-medium text-white">{user.name}</span>
          </div>
          
          {/* Row 2: Essential Navigation */}
          <div className="flex items-center justify-end space-x-2 flex-wrap gap-y-2">
            {user.is_admin && (
              <Button data-testid="admin-nav-btn" onClick={() => navigate("/admin-dashboard")} variant="outline" size="sm" className="gap-2 border-white/30 text-white hover:bg-white/20 bg-white/10">
                <Shield className="w-4 h-4" />
                Admin
              </Button>
            )}
            <Button data-testid="library-nav-btn" onClick={() => navigate("/library")} variant="outline" size="sm" className="gap-2 border-white/30 text-white hover:bg-white/20 bg-white/10">
              <BookOpen className="w-4 h-4" />
              Library
            </Button>
            <Button data-testid="reports-nav-btn" onClick={() => navigate("/teacher-reports")} variant="outline" size="sm" className="gap-2 border-white/30 text-white hover:bg-white/20 bg-white/10">
              <FileSpreadsheet className="w-4 h-4" />
              Reports
            </Button>
            <WhatsNew />
            {user?.is_admin && (
              <Button 
                onClick={() => navigate("/admin/messages")} 
                variant="outline" 
                size="sm" 
                className="gap-2 border-white/30 text-white hover:bg-white/20 bg-white/10 relative"
              >
                <Bell className="w-4 h-4" />
                Messages
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            )}
            <Button data-testid="switch-role-btn" onClick={handleSwitchToStudent} variant="outline" size="sm" className="gap-2 border-white/30 text-white hover:bg-white/20 bg-white/10">
              <RefreshCw className="w-4 h-4" />
              Student View
            </Button>
            <Button data-testid="logout-btn" onClick={handleLogout} variant="outline" size="sm" className="gap-2 border-white/30 text-white hover:bg-white/20 bg-white/10">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      {/* Curriculum Cards Section */}
      <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Unit 1: Blocks */}
          <Card 
            className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-0"
            onClick={() => navigate("/blocks-curriculum")}
          >
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">🧱</div>
              <h3 className="font-bold text-lg">Unit 1</h3>
              <p className="text-purple-100 text-sm">Block-Based Coding</p>
              <p className="text-xs text-purple-200 mt-2">Visual Programming</p>
            </CardContent>
          </Card>

          {/* Unit 2: Python */}
          <Card 
            className="bg-gradient-to-br from-blue-500 to-blue-700 text-white cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-0"
            onClick={() => navigate("/python-curriculum")}
          >
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">🐍</div>
              <h3 className="font-bold text-lg">Unit 2</h3>
              <p className="text-blue-100 text-sm">Python Text</p>
              <p className="text-xs text-blue-200 mt-2">Text-Based Programming</p>
            </CardContent>
          </Card>

          {/* Unit 3: Turtle */}
          <Card 
            className="bg-gradient-to-br from-green-500 to-emerald-600 text-white cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-0"
            onClick={() => navigate("/turtle-curriculum")}
          >
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">🐢</div>
              <h3 className="font-bold text-lg">Unit 3</h3>
              <p className="text-green-100 text-sm">Turtle Graphics</p>
              <p className="text-xs text-green-200 mt-2">Visual Output</p>
            </CardContent>
          </Card>

          {/* Unit 4: Micro:bit */}
          <Card 
            className="bg-gradient-to-br from-cyan-500 to-teal-600 text-white cursor-pointer hover:shadow-xl transition-all hover:scale-105 border-0"
            onClick={() => navigate("/microbit")}
          >
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">⚡</div>
              <h3 className="font-bold text-lg">Unit 4</h3>
              <p className="text-cyan-100 text-sm">Micro:bit</p>
              <p className="text-xs text-cyan-200 mt-2">Physical Computing</p>
            </CardContent>
          </Card>
        </div>

        {/* Tools & Reports Row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Tools Section */}
          <Card className="bg-white shadow-md border border-gray-200">
            <CardHeader className="pb-3 border-b bg-gray-50">
              <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
                🛠️ Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/question-bank")} className="justify-start text-sm h-9">
                  <FileQuestion className="w-4 h-4 mr-2 text-blue-500" />
                  Question Bank
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/test-builder")} className="justify-start text-sm h-9">
                  <FileQuestion className="w-4 h-4 mr-2 text-purple-500" />
                  MC Test Builder
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/coding-tests")} className="justify-start text-sm h-9">
                  <Code2 className="w-4 h-4 mr-2 text-green-500" />
                  Coding Tests
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/skill-quiz-manager")} className="justify-start text-sm h-9">
                  <span className="mr-2">🧠</span>
                  Skill Quizzes
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/notes")} className="justify-start text-sm h-9">
                  <FileText className="w-4 h-4 mr-2 text-orange-500" />
                  Notes
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/video-library")} className="justify-start text-sm h-9">
                  <Video className="w-4 h-4 mr-2 text-red-500" />
                  Videos
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Reports Section */}
          <Card className="bg-white shadow-md border border-gray-200">
            <CardHeader className="pb-3 border-b bg-gray-50">
              <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
                📊 Reports & Competitions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/teacher-reports")} className="justify-start text-sm h-9">
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-blue-500" />
                  Student Reports
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/test-reports")} className="justify-start text-sm h-9">
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-green-500" />
                  Test Reports
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/teacher/competitions")} className="justify-start text-sm h-9">
                  <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
                  Competitions
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/teacher/challenge-pool")} className="justify-start text-sm h-9">
                  <Trophy className="w-4 h-4 mr-2 text-purple-500" />
                  Challenge Pool
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Classrooms Section - moved below curriculum cards */}
      <main className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Classrooms</h1>
            <p className="text-gray-600">Manage your classrooms and assignments</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-classroom-btn" className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 gap-2 shadow-lg">
                <Plus className="w-5 h-5" />
                Create Classroom
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="create-classroom-dialog">
              <DialogHeader>
                <DialogTitle>Create New Classroom</DialogTitle>
                <DialogDescription>
                  Enter a name for your new classroom. A unique class code will be generated.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateClassroom} className="space-y-4">
                <div>
                  <Label htmlFor="className">Classroom Name</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      data-testid="classroom-name-input"
                      id="className"
                      placeholder="e.g., Python Pandemonium"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNewClassName(getRandomSuggestion())}
                      className="whitespace-nowrap"
                    >
                      🎲 Inspire Me
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Try: {classroomNameSuggestions.slice(0, 3).join(", ")}</p>
                </div>
                <Button data-testid="create-classroom-submit-btn" type="submit" className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600">
                  Create Classroom
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div data-testid="classrooms-loading" className="text-center py-20">
            <div className="text-gray-500">Loading classrooms...</div>
          </div>
        ) : classrooms.length === 0 ? (
          <div data-testid="no-classrooms" className="text-center py-20">
            <Users className="w-16 h-16 text-teal-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No classrooms yet</h3>
            <p className="text-gray-500 mb-6">Create your first classroom to get started</p>
            <Button data-testid="create-first-classroom-btn" onClick={() => setCreateDialogOpen(true)} className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Create Classroom
            </Button>
          </div>
        ) : (
          <div data-testid="classrooms-grid" className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map((classroom, index) => {
              // Rotate through vibrant colors for each classroom card
              const colors = [
                'from-teal-500 to-cyan-500',
                'from-orange-500 to-pink-500', 
                'from-purple-500 to-pink-500',
                'from-blue-500 to-teal-500',
                'from-pink-500 to-rose-500',
                'from-cyan-500 to-blue-500'
              ];
              const borderColors = [
                'border-teal-200 hover:border-teal-400',
                'border-orange-200 hover:border-orange-400',
                'border-purple-200 hover:border-purple-400',
                'border-blue-200 hover:border-blue-400',
                'border-pink-200 hover:border-pink-400',
                'border-cyan-200 hover:border-cyan-400'
              ];
              const gradientClass = colors[index % colors.length];
              const borderClass = borderColors[index % borderColors.length];
              
              return (
                <Card
                  data-testid={`classroom-card-${classroom.id}`}
                  key={classroom.id}
                  className={`hover:shadow-2xl transition-all cursor-pointer border-2 ${borderClass} transform hover:-translate-y-1 relative group`}
                  onClick={() => navigate(`/classroom/${classroom.id}`)}
                >
                  {/* Delete Button - appears on hover */}
                  <button
                    onClick={(e) => handleDeleteClassroom(classroom.id, classroom.name, e)}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                    title="Delete Classroom"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <CardHeader className={`bg-gradient-to-r ${gradientClass} text-white rounded-t-lg`}>
                    <CardTitle className="text-xl">{classroom.name}</CardTitle>
                    <CardDescription className="text-white/90">
                      <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-mono font-semibold border border-white/30">
                        {classroom.class_code}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex items-center text-gray-700 font-medium">
                      <Users className="w-4 h-4 mr-2 text-teal-600" />
                      <span>{classroom.students?.length || 0} students</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}