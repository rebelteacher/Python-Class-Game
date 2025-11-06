import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Plus, LogOut, Code2, Trophy, ShoppingBag, Zap, FileText, Folder, FolderOpen, ChevronRight, ChevronDown, FileQuestion, Calendar, Award } from "lucide-react";
import RankBadge from "@/components/RankBadge";
import Leaderboard from "@/components/Leaderboard";

// Animated Pet Component
const AnimatedPet = ({ petId, shopItems }) => {
  const petItem = shopItems.pets?.find(p => p.id === petId);
  if (!petItem) return null;

  const getAnimationClass = () => {
    switch (petItem.animation) {
      case "float":
        return "animate-float";
      case "fly":
        return "animate-fly";
      case "swim":
        return "animate-swim";
      default:
        return "animate-bounce";
    }
  };

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes fly {
          0% { transform: translateX(0px) translateY(0px); }
          25% { transform: translateX(50px) translateY(-15px); }
          50% { transform: translateX(0px) translateY(0px); }
          75% { transform: translateX(-50px) translateY(-15px); }
          100% { transform: translateX(0px) translateY(0px); }
        }
        @keyframes swim {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(30px, -10px); }
          50% { transform: translate(60px, 0); }
          75% { transform: translate(30px, 10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-fly {
          animation: fly 4s ease-in-out infinite;
        }
        .animate-swim {
          animation: swim 8s ease-in-out infinite;
        }
      `}</style>
      <div 
        className={`fixed bottom-20 right-20 text-6xl ${getAnimationClass()} pointer-events-none z-50`}
        style={{ userSelect: 'none' }}
      >
        {petItem.icon}
      </div>
    </>
  );
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function StudentDashboard({ user, setUser, refreshUser }) {
  const [classrooms, setClassrooms] = useState([]);
  const [availableTests, setAvailableTests] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  const [classCode, setClassCode] = useState("");
  const [shopItems, setShopItems] = useState({ themes: [], badges: [] });
  const [userProfile, setUserProfile] = useState(user);
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Always refetch data when dashboard mounts or location changes
    console.log("Dashboard: Fetching fresh data...");
    fetchClassrooms();
    fetchTests();
    fetchShopItems();
    fetchUserProfile();
  }, [location.key]); // location.key changes on every navigation
  
  // Also update when the user prop changes (from parent)
  useEffect(() => {
    if (user) {
      setUserProfile(user);
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true,
      });
      console.log("Fetched user profile:", response.data);
      setUserProfile(response.data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchShopItems = async () => {
    try {
      const response = await axios.get(`${API}/shop`, {
        withCredentials: true,
      });
      setShopItems(response.data);
    } catch (error) {
      console.error("Error fetching shop:", error);
    }
  };

  const handlePurchase = async (itemType, itemId) => {
    try {
      const response = await axios.post(
        `${API}/shop/purchase`,
        { type: itemType, item_id: itemId },
        { withCredentials: true }
      );
      
      console.log("Purchase successful, refreshing user data...");
      toast.success("Item purchased!");
      
      // Refresh both local profile and parent user state
      await fetchUserProfile();
      if (refreshUser) {
        await refreshUser();
      }
      fetchShopItems();


  const handleCustomize = async (field, value) => {
    try {
      await axios.post(
        `${API}/profile/customize`,
        { [field]: value },
        { withCredentials: true }
      );
      await fetchUserProfile();
      if (refreshUser) await refreshUser();
      toast.success("Item equipped!");
    } catch (error) {
      console.error("Error customizing:", error);
      toast.error("Failed to equip item");
    }
  };

      
      console.log("User data refreshed after purchase");
    } catch (error) {
      console.error("Error purchasing:", error);
      toast.error(error.response?.data?.detail || "Purchase failed");
    }
  };

  const fetchClassrooms = async () => {
    try {
      console.log("📡 Fetching classrooms...");
      const response = await axios.get(`${API}/classrooms`, {
        withCredentials: true,
      });
      console.log("✅ Classrooms received:", response.data);
      console.log("Number of classrooms:", response.data.length);
      if (response.data.length > 0) {
        console.log("First classroom:", response.data[0]);
        console.log("First classroom has assignments?", !!response.data[0].assignments);
        if (response.data[0].assignments) {
          console.log("Number of assignments:", response.data[0].assignments.length);
        }
      }
      setClassrooms(response.data);
    } catch (error) {
      console.error("❌ Error fetching classrooms:", error);
      toast.error("Failed to load classrooms");
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    try {
      const response = await axios.get(`${API}/classrooms`, {
        withCredentials: true,
      });
      
      // Fetch tests from all classrooms
      const allTests = [];
      for (const classroom of response.data) {
        try {
          const testsRes = await axios.get(`${API}/mc-tests/classroom/${classroom.id}`, {
            withCredentials: true
          });
          testsRes.data.forEach(test => {
            allTests.push({ ...test, classroom_name: classroom.name, classroom_id: classroom.id });
          });
        } catch (err) {
          console.error(`Error fetching tests for classroom ${classroom.id}:`, err);
        }
      }
      setAvailableTests(allTests);
    } catch (error) {
      console.error("Error fetching tests:", error);
    }
  };

  const handleJoinClassroom = async (e) => {
    e.preventDefault();
    if (!classCode.trim()) {
      toast.error("Please enter a class code");
      return;
    }

    try {
      await axios.post(
        `${API}/classrooms/join`,
        { class_code: classCode.toUpperCase() },
        { withCredentials: true }
      );
      toast.success("Joined classroom successfully!");
      setClassCode("");
      setJoinDialogOpen(false);
      fetchClassrooms();
    } catch (error) {
      console.error("Error joining classroom:", error);
      if (error.response?.status === 404) {
        toast.error("Classroom not found. Check your class code.");
      } else if (error.response?.status === 400) {
        toast.error("You've already joined this classroom");
      } else {
        toast.error("Failed to join classroom");
      }
    }
  };

  const handleSwitchToTeacher = async () => {
    try {
      const response = await axios.post(`${API}/auth/switch-role`, {}, {
        withCredentials: true,
      });
      setUser({ ...user, role: response.data.role });
      toast.success("Switched to teacher mode");
      navigate("/teacher/dashboard");
    } catch (error) {
      console.error("Error switching role:", error);
      toast.error("Failed to switch role");
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      document.cookie = "session_token=; path=/; max-age=0";
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleCustomize = async (field, value) => {
    try {
      await axios.post(
        `${API}/profile/customize`,
        { [field]: value },
        { withCredentials: true }
      );
      await fetchUserProfile();
      if (refreshUser) await refreshUser();
      toast.success("Item equipped!");
    } catch (error) {
      console.error("Error customizing:", error);
      toast.error("Failed to equip item");
    }
  };

  const toggleChapter = (chapter) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapter)) {
        newSet.delete(chapter);
      } else {
        newSet.add(chapter);
      }
      return newSet;
    });
  };

  const toggleLesson = (chapterLesson) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapterLesson)) {
        newSet.delete(chapterLesson);
      } else {
        newSet.add(chapterLesson);
      }
      return newSet;
    });
  };

  const organizeAssignments = () => {
    const organized = {};
    console.log("Organizing assignments, classrooms:", classrooms);
    classrooms.forEach(classroom => {
      console.log(`Classroom ${classroom.name} has assignments:`, classroom.assignments);
      classroom.assignments?.forEach(assignment => {
        const chapter = assignment.chapter || "Uncategorized";
        const lesson = assignment.lesson || "Lesson 1";
        
        if (!organized[chapter]) {
          organized[chapter] = {};
        }
        if (!organized[chapter][lesson]) {
          organized[chapter][lesson] = [];
        }
        organized[chapter][lesson].push({
          ...assignment,
          classroom_name: classroom.name
        });
      });
    });
    console.log("Organized assignments:", organized);
    return organized;
  };

  const organizedAssignments = organizeAssignments();

  const getBackgroundStyle = () => {
    if (userProfile?.active_background && shopItems?.backgrounds) {
      const bg = shopItems.backgrounds.find(b => b.id === userProfile.active_background);
      if (bg) {
        return { backgroundImage: bg.preview };
      }
    }
    return {};
  };

  const getThemeNavColor = () => {
    if (userProfile?.active_theme && shopItems?.themes) {
      const theme = shopItems.themes.find(t => t.id === userProfile.active_theme);
      if (theme && theme.id !== "default") {
        return theme.color;
      }
    }
    return null; // Return null for default/no theme
  };

  return (
    <div 
      data-testid="student-dashboard" 
      className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-blue-50"
      style={getBackgroundStyle()}
    >
      {/* Animated Pet */}
      {userProfile?.active_pet && shopItems?.pets && (
        <AnimatedPet petId={userProfile.active_pet} shopItems={shopItems} />
      )}
      
      <nav 
        className="shadow-sm border-b"
        style={{ 
          backgroundColor: getThemeNavColor() || 'white',
          borderColor: getThemeNavColor() ? 'rgba(255,255,255,0.2)' : '#e5e7eb'
        }}
      >
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Code2 className={`w-7 h-7 ${getThemeNavColor() ? 'text-white' : 'text-teal-600'}`} />
            <span className={`text-xl font-bold ${getThemeNavColor() ? 'text-white' : 'text-gray-900'}`}>ByteBattles Arena</span>
            <span className={`ml-4 px-3 py-1 text-sm font-medium rounded-full ${getThemeNavColor() ? 'bg-white/20 text-white border border-white/30' : 'bg-teal-100 text-teal-700'}`}>
              Student
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`hidden sm:inline ${getThemeNavColor() ? 'text-white' : 'text-gray-700'}`}>{user.name}</span>
            <Button onClick={() => navigate("/notes")} variant="outline" size="sm" className={`gap-2 ${getThemeNavColor() ? 'border-white/30 text-white hover:bg-white/20' : ''}`}>
              <FileText className="w-4 h-4" />
              Notes
            </Button>
            <Button data-testid="logout-btn" onClick={handleLogout} variant="ghost" size="sm" className={`gap-2 ${getThemeNavColor() ? 'text-white hover:bg-white/20' : ''}`}>
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        {/* Stats Dashboard */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="md:col-span-2">
            <RankBadge rank={userProfile.rank || "Rookie"} xp={userProfile.xp || 0} />
            
            {/* Active Badges Display */}
            {userProfile?.active_badges && userProfile.active_badges.length > 0 && (
              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-500" />
                    Equipped Badges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.active_badges.map(badgeId => {
                      const badge = shopItems.badges?.find(b => b.id === badgeId);
                      return badge ? (
                        <div 
                          key={badgeId} 
                          className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-xs font-semibold shadow-md"
                          title={badge.description}
                        >
                          {badge.name}
                        </div>
                      ) : null;
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Problems Solved:</span>
                <span className="font-semibold">{userProfile.problems_solved || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Perfect Scores:</span>
                <span className="font-semibold text-yellow-600">⭐ {userProfile.perfect_scores || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Streak:</span>
                <span className="font-semibold text-orange-600">🔥 {userProfile.current_streak || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Best Streak:</span>
                <span className="font-semibold">{userProfile.best_streak || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                🪙 Coins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600 mb-3">
                {userProfile.coins || 0}
              </div>
              <Button 
                data-testid="open-shop-btn"
                onClick={() => setShopDialogOpen(true)} 
                className="w-full bg-orange-500 hover:bg-orange-600 gap-2"
                size="sm"
              >
                <ShoppingBag className="w-4 h-4" />
                Open Shop
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Section */}
        {classrooms.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Leaderboard
              </CardTitle>
              <CardDescription>
                See how you rank in your classrooms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={classrooms[0]?.id || ""}>
                <TabsList className="mb-4">
                  {classrooms.map((classroom) => (
                    <TabsTrigger key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {classrooms.map((classroom) => (
                  <TabsContent key={classroom.id} value={classroom.id}>
                    <Leaderboard classroomId={classroom.id} currentUserId={user.id} />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Classes</h1>
            <p className="text-gray-600">View your classrooms and assignments</p>
          </div>
          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="join-classroom-btn" className="bg-teal-600 hover:bg-teal-700 gap-2">
                <Plus className="w-5 h-5" />
                Join Classroom
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="join-classroom-dialog">
              <DialogHeader>
                <DialogTitle>Join Classroom</DialogTitle>
                <DialogDescription>
                  Enter the class code provided by your teacher
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleJoinClassroom} className="space-y-4">
                <div>
                  <Label htmlFor="classCode">Class Code</Label>
                  <Input
                    data-testid="class-code-input"
                    id="classCode"
                    placeholder="e.g., ABC123"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    className="mt-1 font-mono text-lg"
                    maxLength={6}
                  />
                </div>
                <Button data-testid="join-classroom-submit-btn" type="submit" className="w-full bg-teal-600 hover:bg-teal-700">
                  Join Classroom
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Available Tests Section */}
        {availableTests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Tests</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableTests.map((test) => {
                const now = new Date();
                const dueDate = test.due_date ? new Date(test.due_date) : null;
                const isOverdue = dueDate && now > dueDate;

                return (
                  <Card key={test.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{test.title}</CardTitle>
                        {isOverdue ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                            Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                            Available
                          </span>
                        )}
                      </div>
                      <CardDescription>{test.classroom_name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <FileQuestion className="w-4 h-4" />
                          <span>{test.num_questions} questions</span>
                        </div>
                        {test.time_limit_minutes > 0 && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{test.time_limit_minutes} minute time limit</span>
                          </div>
                        )}
                        {dueDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                              Due: {dueDate.toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button 
                        onClick={() => navigate(`/test/${test.id}`)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                        disabled={isOverdue}
                      >
                        {isOverdue ? "Test Closed" : "Start Test"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Assignments - Folder View */}
        {loading ? (
          <div className="text-center py-20 text-gray-600">Loading assignments...</div>
        ) : classrooms.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No classrooms yet</h3>
            <p className="text-gray-500 mb-6">Join a class to start coding!</p>
            <Button onClick={() => setJoinDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              Join Class
            </Button>
          </div>
        ) : Object.keys(organizedAssignments).length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No assignments yet</h3>
            <p className="text-gray-500">Your teacher will assign work soon</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.keys(organizedAssignments).sort().map((chapter) => {
              const isChapterExpanded = expandedChapters.has(chapter);
              const lessons = organizedAssignments[chapter];
              
              return (
                <div key={chapter} className="border rounded-lg bg-white shadow-sm">
                  {/* Chapter Folder */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleChapter(chapter)}
                  >
                    {isChapterExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                    {isChapterExpanded ? (
                      <FolderOpen className="w-6 h-6 text-blue-500" />
                    ) : (
                      <Folder className="w-6 h-6 text-blue-500" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">{chapter}</h3>
                    <span className="ml-auto text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {Object.keys(lessons).length} lesson{Object.keys(lessons).length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Lessons in Chapter */}
                  {isChapterExpanded && (
                    <div className="pl-8 pr-4 pb-4 space-y-3">
                      {Object.keys(lessons).sort().map((lesson) => {
                        const lessonKey = `${chapter}-${lesson}`;
                        const isLessonExpanded = expandedLessons.has(lessonKey);
                        const assignments = lessons[lesson];
                        
                        return (
                          <div key={lessonKey} className="border rounded-lg bg-gray-50">
                            {/* Lesson Folder */}
                            <div
                              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 transition-colors rounded-lg"
                              onClick={() => toggleLesson(lessonKey)}
                            >
                              {isLessonExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                              )}
                              {isLessonExpanded ? (
                                <FolderOpen className="w-5 h-5 text-teal-500" />
                              ) : (
                                <Folder className="w-5 h-5 text-teal-500" />
                              )}
                              <h4 className="text-md font-medium text-gray-800">{lesson}</h4>
                              <span className="ml-auto text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                                {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            {/* Assignments in Lesson */}
                            {isLessonExpanded && (
                              <div className="p-3 pt-0 space-y-2">
                                {assignments.map((assignment) => (
                                  <Card
                                    key={assignment.id}
                                    data-testid={`assignment-card-${assignment.id}`}
                                    className="hover:shadow-md transition-shadow cursor-pointer border-2 border-gray-200 hover:border-teal-300"
                                    onClick={() => navigate(`/assignment/${assignment.id}`)}
                                  >
                                    <CardHeader className="pb-3">
                                      <div className="flex justify-between items-start">
                                        <CardTitle className="text-base">{assignment.title}</CardTitle>
                                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                                          {assignment.classroom_name}
                                        </span>
                                      </div>
                                      <CardDescription className="text-sm">{assignment.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">
                                          {assignment.problem_ids?.length || 0} problems
                                        </span>
                                        {assignment.due_date && (
                                          <span className="text-orange-600 font-medium">
                                            Due: {new Date(assignment.due_date).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Shop Dialog */}
        <Dialog open={shopDialogOpen} onOpenChange={setShopDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="shop-dialog">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <ShoppingBag className="w-6 h-6" />
                Virtual Shop
              </DialogTitle>
              <DialogDescription>
                Your coins: 🪙 {userProfile.coins || 0}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="themes">
              <TabsList className="mb-4">
                <TabsTrigger value="themes">Themes</TabsTrigger>
                <TabsTrigger value="badges">Badges</TabsTrigger>
                <TabsTrigger value="backgrounds">Backgrounds</TabsTrigger>
                <TabsTrigger value="pets">Pets</TabsTrigger>
                <TabsTrigger value="frames">Frames</TabsTrigger>
              </TabsList>

              <TabsContent value="themes">
                <div className="grid md:grid-cols-2 gap-4">
                  {shopItems.themes?.map((item) => {
                    const isOwned = userProfile.owned_themes?.includes(item.id);
                    const isActive = userProfile.active_theme === item.id;
                    return (
                      <Card key={item.id} data-testid={`shop-theme-${item.id}`}>
                        <CardHeader>
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div 
                            className="w-full h-20 rounded-lg mb-3"
                            style={{ backgroundColor: item.color }}
                          />
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-lg">🪙 {item.price}</span>
                            {isOwned ? (
                              <Button
                                onClick={() => handleCustomize("active_theme", item.id)}
                                disabled={isActive}
                                size="sm"
                                className={isActive ? "bg-green-600" : ""}
                              >
                                {isActive ? "Equipped ✓" : "Equip"}
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handlePurchase("themes", item.id)}
                                disabled={(userProfile.coins || 0) < item.price}
                                size="sm"
                              >
                                Buy
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="badges">
                <div className="grid md:grid-cols-2 gap-4">
                  {shopItems.badges?.map((item) => {
                    const isOwned = userProfile.owned_badges?.includes(item.id);
                    const isEquipped = userProfile.active_badges?.includes(item.id);
                    return (
                      <Card key={item.id} data-testid={`shop-badge-${item.id}`} className={isEquipped ? "border-2 border-green-500" : ""}>
                        <CardHeader>
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                          <CardDescription>{item.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-lg">🪙 {item.price}</span>
                            {isOwned ? (
                              <Button
                                onClick={() => {
                                  if (isEquipped) {
                                    // Unequip badge
                                    const newBadges = (userProfile.active_badges || []).filter(b => b !== item.id);
                                    handleCustomize("active_badges", newBadges);
                                  } else {
                                    // Equip badge (add to array)
                                    const newBadges = [...(userProfile.active_badges || []), item.id];
                                    handleCustomize("active_badges", newBadges);
                                  }
                                }}
                                size="sm"
                                className={isEquipped ? "bg-red-600 hover:bg-red-700" : ""}
                              >
                                {isEquipped ? "Unequip" : "Equip"}
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handlePurchase("badges", item.id)}
                                disabled={(userProfile.coins || 0) < item.price}
                                size="sm"
                              >
                                Buy
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="backgrounds">
                <div className="grid md:grid-cols-2 gap-4">
                  {shopItems.backgrounds?.map((item) => {
                    const isOwned = userProfile.owned_backgrounds?.includes(item.id);
                    const isActive = userProfile.active_background === item.id;
                    return (
                      <Card key={item.id} className={isActive ? "border-2 border-green-500" : ""}>
                        <CardHeader>
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div 
                            className="w-full h-24 rounded-lg mb-3"
                            style={{ background: item.preview }}
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-indigo-600">{item.price} 🪙</span>
                            <div className="flex gap-2">
                              {isOwned ? (
                                <Button
                                  onClick={async () => {
                                    try {
                                      await axios.post(
                                        `${API}/profile/customize`,
                                        { active_background: isActive ? "" : item.id },
                                        { withCredentials: true }
                                      );
                                      await fetchUserProfile();
                                      if (refreshUser) await refreshUser();
                                      toast.success(isActive ? "Background removed" : "Background equipped!");
                                    } catch (error) {
                                      toast.error("Failed to equip");
                                    }
                                  }}
                                  size="sm"
                                  variant={isActive ? "outline" : "default"}
                                >
                                  {isActive ? "Unequip" : "Equip"}
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handlePurchase("backgrounds", item.id)}
                                  disabled={(userProfile.coins || 0) < item.price}
                                  size="sm"
                                >
                                  Buy
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="pets">
                <div className="grid md:grid-cols-2 gap-4">
                  {shopItems.pets?.map((item) => {
                    const isOwned = userProfile.owned_pets?.includes(item.id);
                    const isActive = userProfile.active_pet === item.id;
                    return (
                      <Card key={item.id} className={isActive ? "border-2 border-green-500" : ""}>
                        <CardHeader>
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-6xl text-center mb-3">
                            {item.icon}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-indigo-600">{item.price} 🪙</span>
                            <div className="flex gap-2">
                              {isOwned ? (
                                <Button
                                  onClick={async () => {
                                    try {
                                      await axios.post(
                                        `${API}/profile/customize`,
                                        { active_pet: isActive ? "" : item.id },
                                        { withCredentials: true }
                                      );
                                      await fetchUserProfile();
                                      if (refreshUser) await refreshUser();
                                      toast.success(isActive ? "Pet removed" : "Pet equipped!");
                                    } catch (error) {
                                      toast.error("Failed to equip");
                                    }
                                  }}
                                  size="sm"
                                  variant={isActive ? "outline" : "default"}
                                >
                                  {isActive ? "Unequip" : "Equip"}
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handlePurchase("pets", item.id)}
                                  disabled={(userProfile.coins || 0) < item.price}
                                  size="sm"
                                >
                                  Buy
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="frames">
                <div className="grid md:grid-cols-2 gap-4">
                  {shopItems.profile_frames?.map((item) => {
                    const isOwned = userProfile.owned_profile_frames?.includes(item.id);
                    const isActive = userProfile.active_profile_frame === item.id;
                    return (
                      <Card key={item.id} className={isActive ? "border-2 border-green-500" : ""}>
                        <CardHeader>
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-center mb-3">
                            <div 
                              className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-3xl"
                              style={{ border: item.style, backgroundImage: item.gradient ? item.gradient : undefined }}
                            >
                              👤
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-indigo-600">{item.price} 🪙</span>
                            <div className="flex gap-2">
                              {isOwned ? (
                                <Button
                                  onClick={async () => {
                                    try {
                                      await axios.post(
                                        `${API}/profile/customize`,
                                        { active_profile_frame: isActive ? "" : item.id },
                                        { withCredentials: true }
                                      );
                                      await fetchUserProfile();
                                      if (refreshUser) await refreshUser();
                                      toast.success(isActive ? "Frame removed" : "Frame equipped!");
                                    } catch (error) {
                                      toast.error("Failed to equip");
                                    }
                                  }}
                                  size="sm"
                                  variant={isActive ? "outline" : "default"}
                                >
                                  {isActive ? "Unequip" : "Equip"}
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handlePurchase("profile_frames", item.id)}
                                  disabled={(userProfile.coins || 0) < item.price}
                                  size="sm"
                                >
                                  Buy
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}