import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Users, 
  BookOpen, 
  FileText, 
  Activity, 
  Key, 
  Copy, 
  CheckCircle,
  Mail,
  Calendar,
  UserCheck,
  UserX,
  Coins,
  MessageCircle,
  Bell,
  FileQuestion,
  Code2,
  Cpu,
  Video
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminDashboard({ user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [inviteCodes, setInviteCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.is_admin) {
      toast.error("Admin access required");
      navigate("/teacher/dashboard");
      return;
    }
    
    fetchData();
    fetchUnreadCount();
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

  const fetchData = async () => {
    try {
      const [statsRes, teachersRes, codesRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { withCredentials: true }),
        axios.get(`${API}/admin/teachers`, { withCredentials: true }),
        axios.get(`${API}/admin/invite-codes`, { withCredentials: true })
      ]);

      setStats(statsRes.data);
      setTeachers(teachersRes.data);
      setInviteCodes(codesRes.data);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const generateInviteCode = async () => {
    setGeneratingCode(true);
    try {
      const response = await axios.post(
        `${API}/admin/invite-codes/generate`,
        {},
        { withCredentials: true }
      );

      setInviteCodes([response.data, ...inviteCodes]);
      toast.success("Invite code generated!");
    } catch (error) {
      console.error("Error generating invite code:", error);
      toast.error("Failed to generate invite code");
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const toggleTeacherActive = async (teacherId) => {
    try {
      await axios.put(
        `${API}/admin/teachers/${teacherId}/toggle-active`,
        {},
        { withCredentials: true }
      );

      // Refresh teachers list
      const teachersRes = await axios.get(`${API}/admin/teachers`, { withCredentials: true });
      setTeachers(teachersRes.data);
      
      toast.success("Teacher status updated");
    } catch (error) {
      console.error("Error toggling teacher status:", error);
      toast.error("Failed to update teacher status");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-navy/40 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-navy/40">
      {/* Header */}
      <nav className="bg-cyber-navy/80 backdrop-blur-xl border-b border-cyber-cyan/20">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button onClick={() => navigate("/teacher/dashboard")} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <div className="text-sm text-slate-400">
            {user?.name} (Admin)
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_teachers || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_students || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Classrooms</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_classrooms || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_assignments || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_submissions || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users (7d)</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.active_users_7d || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Teacher Analytics & Announcements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-2 border-purple-500/30 bg-cyber-navy/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Teacher Analytics
              </CardTitle>
              <CardDescription>
                Login statistics and activity patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-slate-300">
                  Track teacher engagement, login frequency, and get email lists for communication.
                </p>
                <Button
                  onClick={() => navigate("/admin/analytics")}
                  className="bg-purple-600 hover:bg-purple-700 gap-2 w-full"
                >
                  <Activity className="w-4 h-4" />
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-cyber-cyan" />
                Announcements
              </CardTitle>
              <CardDescription>
                Notify teachers about new content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-slate-300">
                  Create announcements that appear in the "What's New" button on teacher dashboards.
                </p>
                <Button
                  onClick={() => navigate("/admin/announcements")}
                  className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold gap-2 w-full"
                >
                  <MessageCircle className="w-4 h-4" />
                  Manage Announcements
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tools */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Admin Tools
            </CardTitle>
            <CardDescription>
              Student account management and support tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => navigate("/admin-add-coins")}
                className="bg-green-600 hover:bg-green-700"
              >
                <Coins className="w-4 h-4 mr-2" />
                Add Coins to Student
              </Button>
              <Button
                onClick={() => navigate("/platform-admin/dashboard")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Approve Admin Requests
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content Tools */}
        <Card className="mb-8 bg-cyber-navy/50 border border-cyber-cyan/20 rounded-none">
          <CardHeader className="pb-3 border-b border-cyber-cyan/10">
            <CardTitle className="text-sm font-orbitron text-cyber-cyan flex items-center gap-2 uppercase tracking-wider">
              Content & Assessment Tools
            </CardTitle>
            <CardDescription className="text-slate-500 font-chakra">
              Problem library, test builders, and content management
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate("/library")} className="justify-start text-sm h-10 bg-transparent border-slate-700 text-slate-300 hover:border-cyber-cyan/50 hover:text-cyber-cyan rounded-none font-chakra">
                <BookOpen className="w-4 h-4 mr-2 text-cyber-cyan" />
                Assignment Library
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/question-bank")} className="justify-start text-sm h-10 bg-transparent border-slate-700 text-slate-300 hover:border-cyber-cyan/50 hover:text-cyber-cyan rounded-none font-chakra">
                <FileQuestion className="w-4 h-4 mr-2 text-cyber-cyan" />
                Question Bank
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/test-builder")} className="justify-start text-sm h-10 bg-transparent border-slate-700 text-slate-300 hover:border-cyber-pink/50 hover:text-cyber-pink rounded-none font-chakra">
                <FileQuestion className="w-4 h-4 mr-2 text-cyber-pink" />
                MC Test Builder
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/coding-tests")} className="justify-start text-sm h-10 bg-transparent border-slate-700 text-slate-300 hover:border-cyber-lime/50 hover:text-cyber-lime rounded-none font-chakra">
                <Code2 className="w-4 h-4 mr-2 text-cyber-lime" />
                Coding Tests
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/skill-quiz-manager")} className="justify-start text-sm h-10 bg-transparent border-slate-700 text-slate-300 hover:border-purple-400/50 hover:text-purple-400 rounded-none font-chakra">
                <Cpu className="w-4 h-4 mr-2 text-purple-400" />
                Skill Quizzes
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/notes")} className="justify-start text-sm h-10 bg-transparent border-slate-700 text-slate-300 hover:border-orange-400/50 hover:text-orange-400 rounded-none font-chakra">
                <FileText className="w-4 h-4 mr-2 text-orange-400" />
                Notes
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/video-library")} className="justify-start text-sm h-10 bg-transparent border-slate-700 text-slate-300 hover:border-red-400/50 hover:text-red-400 rounded-none font-chakra">
                <Video className="w-4 h-4 mr-2 text-red-400" />
                Videos
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Support Contact */}
        <Card className="mb-8 border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-cyber-cyan" />
              Teacher Support & Feedback
            </CardTitle>
            <CardDescription>
              Manage all messages and questions from your community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-cyber-navy/60 border border-indigo-200 rounded-lg">
                <p className="text-sm text-slate-300 mb-3">
                  ✅ <strong>Feedback System Active!</strong> Teachers and users can now contact you through the built-in messaging system.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate("/admin/messages")}
                    className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    View All Messages
                  </Button>
                  {unreadCount > 0 && (
                    <div className="px-4 py-2 bg-red-500/20 border border-red-300 rounded-lg flex items-center gap-2">
                      <Bell className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-semibold text-red-400">{unreadCount} Unread</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg">
                <p className="text-sm text-blue-400">
                  💡 <strong>How it works:</strong> Users click "Contact Us" on the landing page or send feedback. You get notifications here and can reply directly from your admin dashboard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invite Codes */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Invite Codes
                </CardTitle>
                <CardDescription>
                  Generate single-use codes for teacher registration
                </CardDescription>
              </div>
              <Button
                onClick={generateInviteCode}
                disabled={generatingCode}
                className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold"
              >
                {generatingCode ? "Generating..." : "Generate Code"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inviteCodes.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  No invite codes generated yet
                </p>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-cyber-navy/40">
                      <tr>
                        <th className="text-left p-3 text-sm font-semibold">Code</th>
                        <th className="text-left p-3 text-sm font-semibold">Signup Link</th>
                        <th className="text-left p-3 text-sm font-semibold">Status</th>
                        <th className="text-left p-3 text-sm font-semibold">Used By</th>
                        <th className="text-left p-3 text-sm font-semibold">Created</th>
                        <th className="text-left p-3 text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inviteCodes.map((code) => {
                        const signupLink = `${window.location.origin}/teacher-signup?code=${code.code}`;
                        return (
                          <tr key={code.id} className="border-t hover:bg-cyber-navy/40">
                            <td className="p-3">
                              <span className="font-mono font-semibold">{code.code}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <a 
                                  href={signupLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-400 underline max-w-xs truncate block"
                                  title={signupLink}
                                >
                                  {signupLink}
                                </a>
                                <Button
                                  onClick={() => copyToClipboard(signupLink)}
                                  variant="ghost"
                                  size="sm"
                                  title="Copy signup link"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                            <td className="p-3">
                              {code.is_active ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                                  Available
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyber-navy/30 text-slate-200">
                                  Used
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-sm">
                              {code.used_by_name ? (
                                <div>
                                  <div className="font-medium">{code.used_by_name}</div>
                                  <div className="text-xs text-slate-500">{code.used_by_email}</div>
                                </div>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                            <td className="p-3 text-sm text-slate-400">
                              {new Date(code.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <Button
                                onClick={() => copyToClipboard(code.code)}
                                variant="ghost"
                                size="sm"
                                title="Copy code only"
                              >
                                <Key className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Teachers Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Teacher Management
            </CardTitle>
            <CardDescription>
              View and manage teacher accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teachers.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  No teachers registered yet
                </p>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-cyber-navy/40">
                      <tr>
                        <th className="text-left p-3 text-sm font-semibold">Name</th>
                        <th className="text-left p-3 text-sm font-semibold">Email</th>
                        <th className="text-left p-3 text-sm font-semibold">Classrooms</th>
                        <th className="text-left p-3 text-sm font-semibold">Assignments</th>
                        <th className="text-left p-3 text-sm font-semibold">Joined</th>
                        <th className="text-left p-3 text-sm font-semibold">Status</th>
                        <th className="text-left p-3 text-sm font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map((teacher) => (
                        <tr key={teacher.id} className="border-t hover:bg-cyber-navy/40">
                          <td className="p-3">
                            <div className="font-medium">{teacher.name}</div>
                            {teacher.is_admin && (
                              <span className="text-xs text-cyber-cyan font-semibold">Admin</span>
                            )}
                          </td>
                          <td className="p-3 text-sm text-slate-400">{teacher.email}</td>
                          <td className="p-3 text-sm">{teacher.classroom_count}</td>
                          <td className="p-3 text-sm">{teacher.assignment_count}</td>
                          <td className="p-3 text-sm text-slate-400">
                            {new Date(teacher.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            {teacher.is_active !== false ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-400">
                                <UserCheck className="w-3 h-3" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-red-400">
                                <UserX className="w-3 h-3" />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {!teacher.is_admin && (
                              <Button
                                onClick={() => toggleTeacherActive(teacher.id)}
                                variant="ghost"
                                size="sm"
                              >
                                {teacher.is_active !== false ? "Deactivate" : "Activate"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
