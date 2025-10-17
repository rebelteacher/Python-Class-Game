import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Plus, LogOut, Code2, RefreshCw } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function TeacherDashboard({ user, setUser }) {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchClassrooms();
  }, []);

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
      setUser({ ...user, role: response.data.role });
      toast.success("Switched to student mode");
      navigate("/student/dashboard");
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
    <div data-testid="teacher-dashboard" className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Code2 className="w-7 h-7 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">CodeClass</span>
            <span className="ml-4 px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
              Teacher
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-gray-700 hidden sm:inline">{user.name}</span>
            <Button data-testid="switch-role-btn" onClick={handleSwitchToStudent} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Switch to Student
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Classrooms</h1>
            <p className="text-gray-600">Manage your classrooms and assignments</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-classroom-btn" className="bg-indigo-600 hover:bg-indigo-700 gap-2">
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
                  <Input
                    data-testid="classroom-name-input"
                    id="className"
                    placeholder="e.g., Python 101"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button data-testid="create-classroom-submit-btn" type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
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
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No classrooms yet</h3>
            <p className="text-gray-500 mb-6">Create your first classroom to get started</p>
            <Button data-testid="create-first-classroom-btn" onClick={() => setCreateDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Classroom
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
                    <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-mono font-semibold">
                      {classroom.class_code}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{classroom.students?.length || 0} students</span>
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