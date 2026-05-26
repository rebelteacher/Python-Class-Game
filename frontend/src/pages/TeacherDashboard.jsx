import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Plus, LogOut, Code2, RefreshCw, BookOpen, FileSpreadsheet, Shield, FileText, FileQuestion, Trophy, Video, Bell, Trash2, Cpu, Archive, ArchiveRestore } from "lucide-react";
import WhatsNew from "@/components/WhatsNew";
import CyberRain from "@/components/CyberRain";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function TeacherDashboard({ user, setUser }) {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
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

  const fetchClassrooms = async (includeArchived = false) => {
    try {
      const response = await axios.get(`${API}/classrooms?include_archived=${includeArchived}`, {
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

  const handleArchiveClassroom = async (classroomId, classroomName, isArchived, e) => {
    e.stopPropagation();
    const action = isArchived ? "unarchive" : "archive";
    if (!window.confirm(`${isArchived ? "Unarchive" : "Archive"} "${classroomName}"?${!isArchived ? "\n\nArchived classrooms are hidden from the main view but all data is preserved." : ""}`)) return;
    
    try {
      await axios.put(`${API}/classrooms/${classroomId}/${action}`, {}, {
        withCredentials: true,
      });
      toast.success(`Classroom ${isArchived ? "unarchived" : "archived"} successfully`);
      fetchClassrooms(showArchived);
    } catch (error) {
      console.error(`Error ${action} classroom:`, error);
      toast.error(`Failed to ${action} classroom`);
    }
  };

  const toggleShowArchived = () => {
    const newVal = !showArchived;
    setShowArchived(newVal);
    fetchClassrooms(newVal);
  };



  return (
    <div data-testid="teacher-dashboard" className="min-h-screen bg-cyber-black cyber-grid-bg flex relative overflow-hidden">
      <CyberRain density={25} speed={0.8} />
      {/* Left Sidebar */}
      <aside className="w-48 bg-cyber-navy/90 backdrop-blur-xl min-h-screen flex flex-col py-4 px-3 border-r border-cyber-cyan/20 relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6 px-2">
          <Code2 className="w-6 h-6 text-cyber-cyan drop-shadow-[0_0_6px_rgba(0,240,255,0.8)]" />
          <span className="text-sm font-orbitron font-bold text-white tracking-wider">ByteBattles</span>
        </div>
        
        {/* Nav Links */}
        <nav className="flex-1 space-y-1">
          {user.is_admin && (
            <Button 
              data-testid="admin-nav-btn" 
              onClick={() => navigate("/admin-dashboard")} 
              variant="ghost"
              className="w-full justify-start gap-2 text-slate-300 hover:bg-cyber-cyan/10 hover:text-cyber-cyan text-sm font-chakra rounded-none"
            >
              <Shield className="w-4 h-4 text-yellow-400" />
              Admin
            </Button>
          )}
          <Button 
            data-testid="lesson-plans-nav-btn" 
            onClick={() => navigate("/lesson-plans")} 
            variant="ghost"
            className="w-full justify-start gap-2 text-slate-300 hover:bg-cyber-cyan/10 hover:text-cyber-cyan text-sm font-chakra rounded-none"
          >
            <FileText className="w-4 h-4" />
            Lesson Plans
          </Button>
          <Button 
            data-testid="reports-nav-btn" 
            onClick={() => navigate("/teacher-reports")} 
            variant="ghost"
            className="w-full justify-start gap-2 text-slate-300 hover:bg-cyber-cyan/10 hover:text-cyber-cyan text-sm font-chakra rounded-none"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Reports
          </Button>
          {user?.is_admin && (
            <Button 
              onClick={() => navigate("/admin/messages")} 
              variant="ghost"
              className="w-full justify-start gap-2 text-slate-300 hover:bg-cyber-cyan/10 hover:text-cyber-cyan text-sm font-chakra rounded-none relative"
            >
              <Bell className="w-4 h-4" />
              Messages
              {unreadCount > 0 && (
                <span className="ml-auto bg-cyber-pink text-white text-xs rounded-none w-5 h-5 flex items-center justify-center shadow-[0_0_8px_rgba(255,0,170,0.5)]">
                  {unreadCount}
                </span>
              )}
            </Button>
          )}
          
          <div className="border-t border-cyber-cyan/10 my-3"></div>
          
          <Button 
            data-testid="switch-role-btn" 
            onClick={handleSwitchToStudent} 
            variant="ghost"
            className="w-full justify-start gap-2 text-slate-300 hover:bg-cyber-cyan/10 hover:text-cyber-cyan text-sm font-chakra rounded-none"
          >
            <RefreshCw className="w-4 h-4" />
            Student View
          </Button>
        </nav>
        
        {/* Bottom - User & Logout */}
        <div className="border-t border-cyber-cyan/10 pt-3 mt-auto">
          <div className="px-2 mb-2">
            <p className="text-slate-500 text-xs font-chakra">Logged in as</p>
            <p className="text-white text-sm font-medium truncate font-chakra">{user.name}</p>
          </div>
          <Button 
            data-testid="logout-btn" 
            onClick={handleLogout} 
            variant="ghost"
            className="w-full justify-start gap-2 text-cyber-red hover:bg-cyber-red/10 hover:text-cyber-red text-sm font-chakra rounded-none"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto relative z-10">
        {/* Header */}
        <header className="bg-cyber-navy/80 backdrop-blur-xl border-b border-cyber-cyan/20 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-orbitron text-white uppercase tracking-wider heading-glow-cyan">Teacher Dashboard</h1>
              <p className="text-slate-400 text-sm font-chakra">Manage your classes and curriculum</p>
            </div>
            <div className="flex items-center gap-3">
              <WhatsNew />
              <span className="px-3 py-1 bg-cyber-cyan/10 text-cyber-cyan text-xs font-orbitron uppercase tracking-widest border border-cyber-cyan/30 rounded-none">
                Teacher
              </span>
            </div>
          </div>
        </header>

        {/* Curriculum Cards Section */}
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Unit 1: Blocks */}
            <Card 
              className="bg-cyber-navy/60 border border-purple-500/30 text-white cursor-pointer hover:border-purple-500/80 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all duration-300 rounded-none"
              onClick={() => navigate("/blocks-curriculum")}
            >
            <CardContent className="p-6 text-center">
              <div className="text-3xl mb-2">🧱</div>
              <h3 className="font-orbitron font-bold text-sm uppercase tracking-wider">Unit 1</h3>
              <p className="text-purple-300 text-xs font-chakra mt-1">Block-Based Coding</p>
              <p className="text-xs text-slate-500 mt-1 font-chakra">Visual Programming</p>
            </CardContent>
          </Card>

          {/* Unit 2: Turtle */}
          <Card 
            className="bg-cyber-navy/60 border border-cyber-lime/30 text-white cursor-pointer hover:border-cyber-lime/80 hover:shadow-[0_0_15px_rgba(57,255,20,0.3)] transition-all duration-300 rounded-none"
            onClick={() => navigate("/turtle-curriculum")}
          >
            <CardContent className="p-6 text-center">
              <div className="text-3xl mb-2">🐢</div>
              <h3 className="font-orbitron font-bold text-sm uppercase tracking-wider">Unit 2</h3>
              <p className="text-cyber-lime/80 text-xs font-chakra mt-1">Turtle Graphics</p>
              <p className="text-xs text-slate-500 mt-1 font-chakra">Visual Output</p>
            </CardContent>
          </Card>

          {/* Unit 3: Python */}
          <Card 
            className="bg-cyber-navy/60 border border-blue-500/30 text-white cursor-pointer hover:border-blue-500/80 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 rounded-none"
            onClick={() => navigate("/python-curriculum")}
          >
            <CardContent className="p-6 text-center">
              <div className="text-3xl mb-2">🐍</div>
              <h3 className="font-orbitron font-bold text-sm uppercase tracking-wider">Unit 3</h3>
              <p className="text-blue-300 text-xs font-chakra mt-1">Python Text</p>
              <p className="text-xs text-slate-500 mt-1 font-chakra">Text-Based Programming</p>
            </CardContent>
          </Card>

          {/* Unit 4: Micro:bit */}
          <Card 
            className="bg-cyber-navy/60 border border-cyber-cyan/30 text-white cursor-pointer hover:border-cyber-cyan/80 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300 rounded-none"
            onClick={() => navigate("/microbit")}
          >
            <CardContent className="p-6 text-center">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="font-orbitron font-bold text-sm uppercase tracking-wider">Unit 4</h3>
              <p className="text-cyber-cyan/80 text-xs font-chakra mt-1">Micro:bit</p>
              <p className="text-xs text-slate-500 mt-1 font-chakra">Physical Computing</p>
            </CardContent>
          </Card>
        </div>

        {/* Tools & Reports Row */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          {/* Reports Section */}
          <Card className="bg-cyber-navy/50 border border-cyber-pink/20 rounded-none">
            <CardHeader className="pb-3 border-b border-cyber-pink/10">
              <CardTitle className="text-sm font-orbitron text-cyber-pink flex items-center gap-2 uppercase tracking-wider">
                Reports & Competitions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-4 gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/teacher-reports")} className="justify-start text-sm h-9 bg-transparent border-slate-700 text-slate-300 hover:border-cyber-cyan/50 hover:text-cyber-cyan rounded-none font-chakra">
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-cyber-cyan" />
                  Student Reports
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/test-reports")} className="justify-start text-sm h-9 bg-transparent border-slate-700 text-slate-300 hover:border-cyber-lime/50 hover:text-cyber-lime rounded-none font-chakra">
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-cyber-lime" />
                  Test Reports
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/teacher/competitions")} className="justify-start text-sm h-9 bg-transparent border-slate-700 text-slate-300 hover:border-yellow-400/50 hover:text-yellow-400 rounded-none font-chakra">
                  <Trophy className="w-4 h-4 mr-2 text-yellow-400" />
                  Competitions
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/teacher/challenge-pool")} className="justify-start text-sm h-9 bg-transparent border-slate-700 text-slate-300 hover:border-purple-400/50 hover:text-purple-400 rounded-none font-chakra">
                  <Trophy className="w-4 h-4 mr-2 text-purple-400" />
                  Challenge Pool
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Classrooms Section */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-orbitron text-white uppercase tracking-wider mb-1 heading-glow-cyan">My Classrooms</h1>
              <p className="text-slate-400 font-chakra text-sm">Manage your classrooms and assignments</p>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleShowArchived}
                  className={`gap-2 font-chakra text-xs rounded-none ${
                    showArchived ? 'text-yellow-400 border border-yellow-400/30 bg-yellow-400/10' : 'text-slate-500 border border-slate-700'
                  }`}
                >
                  <Archive className="w-4 h-4" />
                  {showArchived ? "Hide Archived" : "Show Archived"}
                </Button>
                <DialogTrigger asChild>
                  <Button data-testid="create-classroom-btn" className="bg-cyber-pink text-white hover:shadow-[0_0_20px_rgba(255,0,170,0.5)] gap-2 font-orbitron text-xs uppercase tracking-widest rounded-none border border-cyber-pink transition-all duration-300">
                    <Plus className="w-5 h-5" />
                    Create Classroom
                  </Button>
                </DialogTrigger>
              </div>
              <DialogContent data-testid="create-classroom-dialog" className="bg-cyber-navy border border-cyber-cyan/30 rounded-none">
                <DialogHeader>
                  <DialogTitle className="font-orbitron text-cyber-cyan uppercase tracking-wider">Create New Classroom</DialogTitle>
                  <DialogDescription className="text-slate-400 font-chakra">
                    Enter a name for your new classroom. A unique class code will be generated.
                  </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateClassroom} className="space-y-4">
                <div>
                  <Label htmlFor="className" className="text-slate-300 font-chakra">Classroom Name</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      data-testid="classroom-name-input"
                      id="className"
                      placeholder="e.g., Python Pandemonium"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="flex-1 bg-cyber-black/50 border-cyber-cyan/30 text-white placeholder:text-slate-600 focus:border-cyber-cyan rounded-none font-chakra"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNewClassName(getRandomSuggestion())}
                      className="whitespace-nowrap border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan/10 rounded-none font-chakra"
                    >
                      Inspire Me
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-chakra">Try: {classroomNameSuggestions.slice(0, 3).join(", ")}</p>
                </div>
                <Button data-testid="create-classroom-submit-btn" type="submit" className="w-full bg-cyber-cyan text-cyber-black font-orbitron uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] rounded-none border border-cyber-cyan transition-all duration-300 font-bold">
                  Create Classroom
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div data-testid="classrooms-loading" className="text-center py-20">
            <div className="text-slate-500 font-chakra">Loading classrooms...</div>
          </div>
        ) : classrooms.length === 0 ? (
          <div data-testid="no-classrooms" className="text-center py-20">
            <Users className="w-16 h-16 text-cyber-cyan/40 mx-auto mb-4" />
            <h3 className="text-xl font-orbitron text-white mb-2 uppercase tracking-wider">No classrooms yet</h3>
            <p className="text-slate-500 mb-6 font-chakra">Create your first classroom to get started</p>
            <Button data-testid="create-first-classroom-btn" onClick={() => setCreateDialogOpen(true)} className="bg-cyber-pink text-white hover:shadow-[0_0_20px_rgba(255,0,170,0.5)] font-orbitron text-xs uppercase tracking-widest rounded-none border border-cyber-pink transition-all duration-300">
              <Plus className="w-4 h-4 mr-2" />
              Create Classroom
            </Button>
          </div>
        ) : (
          <div data-testid="classrooms-grid" className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map((classroom, index) => {
              const neonColors = [
                { border: 'border-cyber-cyan/30 hover:border-cyber-cyan/80', glow: 'hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]', accent: 'text-cyber-cyan', bg: 'bg-cyber-cyan/10' },
                { border: 'border-cyber-pink/30 hover:border-cyber-pink/80', glow: 'hover:shadow-[0_0_15px_rgba(255,0,170,0.3)]', accent: 'text-cyber-pink', bg: 'bg-cyber-pink/10' },
                { border: 'border-purple-500/30 hover:border-purple-500/80', glow: 'hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]', accent: 'text-purple-400', bg: 'bg-purple-500/100/10' },
                { border: 'border-blue-500/30 hover:border-blue-500/80', glow: 'hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]', accent: 'text-blue-400', bg: 'bg-blue-500/100/10' },
                { border: 'border-cyber-lime/30 hover:border-cyber-lime/80', glow: 'hover:shadow-[0_0_15px_rgba(57,255,20,0.3)]', accent: 'text-cyber-lime', bg: 'bg-cyber-lime/10' },
                { border: 'border-orange-500/30 hover:border-orange-500/80', glow: 'hover:shadow-[0_0_15px_rgba(249,115,22,0.3)]', accent: 'text-orange-400', bg: 'bg-orange-500/100/10' },
              ];
              const neon = neonColors[index % neonColors.length];
              
              return (
                <Card
                  data-testid={`classroom-card-${classroom.id}`}
                  key={classroom.id}
                  className={`bg-cyber-navy/60 backdrop-blur-sm ${neon.border} ${neon.glow} transition-all duration-500 cursor-pointer rounded-none relative group`}
                  onClick={() => navigate(`/classroom/${classroom.id}`)}
                >
                  {/* Delete Button - appears on hover */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={(e) => handleArchiveClassroom(classroom.id, classroom.name, classroom.is_archived, e)}
                      className={`p-2 rounded-none transition-all ${
                        classroom.is_archived
                          ? 'bg-cyber-lime/80 text-white hover:bg-cyber-lime hover:shadow-[0_0_10px_rgba(57,255,20,0.5)]'
                          : 'bg-yellow-500/80 text-white hover:bg-yellow-500 hover:shadow-[0_0_10px_rgba(234,179,8,0.5)]'
                      }`}
                      title={classroom.is_archived ? "Unarchive Classroom" : "Archive Classroom"}
                    >
                      {classroom.is_archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => handleDeleteClassroom(classroom.id, classroom.name, e)}
                      className="p-2 bg-cyber-red/80 text-white rounded-none hover:bg-cyber-red hover:shadow-[0_0_10px_rgba(255,51,102,0.5)]"
                      title="Delete Classroom"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <CardHeader className={`${neon.bg} border-b border-white/5 ${classroom.is_archived ? 'opacity-60' : ''}`}>
                    <CardTitle className={`text-lg font-orbitron ${neon.accent} uppercase tracking-wider`}>
                      {classroom.is_archived && <Archive className="w-4 h-4 inline mr-2 text-yellow-400" />}
                      {classroom.name}
                    </CardTitle>
                    <CardDescription>
                      <span className={`inline-block px-3 py-1 ${neon.bg} ${neon.accent} rounded-none text-xs font-fira font-semibold border ${neon.border.split(' ')[0]}`}>
                        {classroom.class_code}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex items-center text-slate-400 font-chakra text-sm">
                      <Users className={`w-4 h-4 mr-2 ${neon.accent}`} />
                      <span>{classroom.students?.length || 0} students</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        </div>
        </div>
      </div>
    </div>
  );
}