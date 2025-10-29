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
  UserX
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

  useEffect(() => {
    if (!user?.is_admin) {
      toast.error("Admin access required");
      navigate("/teacher/dashboard");
      return;
    }
    
    fetchData();
  }, [user]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button onClick={() => navigate("/teacher/dashboard")} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <div className="text-sm text-gray-600">
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

        {/* Support Contact */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Teacher Support Contact
            </CardTitle>
            <CardDescription>
              Teachers can reach out to you directly for questions and support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Support Email</p>
                <p className="text-lg font-semibold text-indigo-600">amyastapp@gmail.com</p>
              </div>
              <Button
                onClick={() => copyToClipboard("amyastapp@gmail.com")}
                variant="outline"
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Note: Built-in ticketing system will be added after the pilot program
            </p>
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
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {generatingCode ? "Generating..." : "Generate Code"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inviteCodes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No invite codes generated yet
                </p>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
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
                          <tr key={code.id} className="border-t hover:bg-gray-50">
                            <td className="p-3">
                              <span className="font-mono font-semibold">{code.code}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <a 
                                  href={signupLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 underline max-w-xs truncate block"
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
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Available
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Used
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-sm">
                              {code.used_by_name ? (
                                <div>
                                  <div className="font-medium">{code.used_by_name}</div>
                                  <div className="text-xs text-gray-500">{code.used_by_email}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-3 text-sm text-gray-600">
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
                <p className="text-gray-500 text-center py-8">
                  No teachers registered yet
                </p>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
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
                        <tr key={teacher.id} className="border-t hover:bg-gray-50">
                          <td className="p-3">
                            <div className="font-medium">{teacher.name}</div>
                            {teacher.is_admin && (
                              <span className="text-xs text-indigo-600 font-semibold">Admin</span>
                            )}
                          </td>
                          <td className="p-3 text-sm text-gray-600">{teacher.email}</td>
                          <td className="p-3 text-sm">{teacher.classroom_count}</td>
                          <td className="p-3 text-sm">{teacher.assignment_count}</td>
                          <td className="p-3 text-sm text-gray-600">
                            {new Date(teacher.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            {teacher.is_active !== false ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                <UserCheck className="w-3 h-3" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-red-700">
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
