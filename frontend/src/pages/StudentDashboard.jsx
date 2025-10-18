import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Plus, LogOut, Code2, RefreshCw, Trophy, ShoppingBag, Zap } from "lucide-react";
import RankBadge from "@/components/RankBadge";
import Leaderboard from "@/components/Leaderboard";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function StudentDashboard({ user, setUser }) {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  const [classCode, setClassCode] = useState("");
  const [shopItems, setShopItems] = useState({ themes: [], badges: [] });
  const [userProfile, setUserProfile] = useState(user);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClassrooms();
    fetchShopItems();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true,
      });
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
      toast.success("Item purchased!");
      fetchUserProfile();
      fetchShopItems();
    } catch (error) {
      console.error("Error purchasing:", error);
      toast.error(error.response?.data?.detail || "Purchase failed");
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

  return (
    <div data-testid="student-dashboard" className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-blue-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Code2 className="w-7 h-7 text-teal-600" />
            <span className="text-xl font-bold text-gray-900">CodeClass</span>
            <span className="ml-4 px-3 py-1 bg-teal-100 text-teal-700 text-sm font-medium rounded-full">
              Student
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-gray-700 hidden sm:inline">{user.name}</span>
            <Button data-testid="switch-to-teacher-btn" onClick={handleSwitchToTeacher} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Switch to Teacher
            </Button>
            <Button data-testid="logout-btn" onClick={handleLogout} variant="ghost" size="sm" className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
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

        {loading ? (
          <div data-testid="classrooms-loading" className="text-center py-20">
            <div className="text-gray-500">Loading classrooms...</div>
          </div>
        ) : classrooms.length === 0 ? (
          <div data-testid="no-classrooms" className="text-center py-20">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No classrooms yet</h3>
            <p className="text-gray-500 mb-6">Join a classroom using the class code from your teacher</p>
            <Button data-testid="join-first-classroom-btn" onClick={() => setJoinDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              Join Classroom
            </Button>
          </div>
        ) : (
          <div data-testid="classrooms-grid" className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map((classroom) => (
              <Card
                data-testid={`classroom-card-${classroom.id}`}
                key={classroom.id}
                className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-gray-100"
                onClick={() => navigate(`/classroom/${classroom.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-xl">{classroom.name}</CardTitle>
                  <CardDescription>
                    <span className="inline-block px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-mono font-semibold">
                      {classroom.class_code}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-gray-600 text-sm">
                    Click to view assignments
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}