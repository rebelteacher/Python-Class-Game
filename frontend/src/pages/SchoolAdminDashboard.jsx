import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, GraduationCap, LogOut, School, Eye, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function SchoolAdminDashboard({ user }) {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherClassrooms, setTeacherClassrooms] = useState([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/school-admin/dashboard`, {
        withCredentials: true
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherClassrooms = async (teacherId) => {
    setLoadingClassrooms(true);
    try {
      const response = await axios.get(`${API}/school-admin/teacher/${teacherId}/classrooms`, {
        withCredentials: true
      });
      setTeacherClassrooms(response.data);
    } catch (error) {
      console.error('Error fetching teacher classrooms:', error);
      toast.error('Failed to load teacher classrooms');
    } finally {
      setLoadingClassrooms(false);
    }
  };

  const handleViewTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    fetchTeacherClassrooms(teacher.id);
  };

  const handleBackToTeachers = () => {
    setSelectedTeacher(null);
    setTeacherClassrooms([]);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid-bg flex items-center justify-center">
        <p className="text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const teachers = dashboardData?.teachers || [];

  // If viewing a specific teacher's classrooms
  if (selectedTeacher) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid-bg">
        {/* Navigation */}
        <nav className="bg-gradient-to-r from-green-600 via-teal-600 to-blue-600 shadow-lg">
          <div className="px-6 py-3">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center space-x-2">
                <School className="w-7 h-7 text-white" />
                <span className="text-xl font-bold text-white">ByteBattles Arena</span>
                <span className="ml-4 px-3 py-1 bg-cyber-navy/60/20 text-white text-sm font-medium rounded-full border border-white/30">
                  School Admin
                </span>
              </div>
              <span className="text-lg font-medium text-white">{user?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <Button onClick={handleBackToTeachers} variant="outline" size="sm" className="gap-2 border-white/30 text-white hover:bg-cyber-navy/60/20 bg-cyber-navy/60/10">
                ← Back to Teachers
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2 border-white/30 text-white hover:bg-cyber-navy/60/20 bg-cyber-navy/60/10">
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </nav>

        <div className="p-8">
          {/* Teacher Info */}
          <div className="max-w-7xl mx-auto mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-2">
              {selectedTeacher.name}'s Classrooms
            </h1>
            <p className="text-slate-400">View-only access to teacher's classrooms and assignments</p>
          </div>

          {/* Classrooms */}
          <div className="max-w-7xl mx-auto">
            {loadingClassrooms ? (
              <div className="text-center py-12">
                <p className="text-slate-400">Loading classrooms...</p>
              </div>
            ) : teacherClassrooms.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <p className="text-slate-500 text-center">No classrooms found for this teacher</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teacherClassrooms.map((classroom) => (
                  <Card key={classroom.id} className="border-2 border-teal-200 hover:shadow-lg transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-teal-50 to-blue-50">
                      <CardTitle className="text-xl">{classroom.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">Students:</span>
                          <span className="font-semibold text-cyber-cyan">{classroom.students?.length || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">Join Code:</span>
                          <code className="px-2 py-1 bg-cyber-navy/30 rounded text-xs font-mono">{classroom.join_code}</code>
                        </div>
                        {classroom.students && classroom.students.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-xs text-slate-500 mb-2">Students:</p>
                            <div className="space-y-1">
                              {classroom.students.slice(0, 5).map((student) => (
                                <div key={student.id} className="text-xs text-slate-300 flex items-center gap-2">
                                  <GraduationCap className="w-3 h-3" />
                                  {student.name}
                                </div>
                              ))}
                              {classroom.students.length > 5 && (
                                <p className="text-xs text-slate-500">+{classroom.students.length - 5} more</p>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="mt-4 pt-4 border-t">
                          <span className="inline-flex items-center gap-2 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                            <Eye className="w-3 h-3" />
                            View-Only Access
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-green-600 via-teal-600 to-blue-600 shadow-lg">
        <div className="px-6 py-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center space-x-2">
              <School className="w-7 h-7 text-white" />
              <span className="text-xl font-bold text-white">ByteBattles Arena</span>
              <span className="ml-4 px-3 py-1 bg-cyber-navy/60/20 text-white text-sm font-medium rounded-full border border-white/30">
                School Admin
              </span>
            </div>
            <span className="text-lg font-medium text-white">{user?.name}</span>
          </div>
          <div className="flex items-center justify-end">
            <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2 border-white/30 text-white hover:bg-cyber-navy/60/20 bg-cyber-navy/60/10">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="p-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-2">
            {stats.school_name}
          </h1>
          <p className="text-slate-400">School-wide overview and teacher management</p>
        </div>

        {/* Stats Cards */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Teachers</p>
                  <p className="text-3xl font-bold text-green-600">{stats.total_teachers || 0}</p>
                </div>
                <Users className="w-12 h-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-teal-200 bg-cyber-black cyber-grid-bg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Classrooms</p>
                  <p className="text-3xl font-bold text-cyber-cyan">{stats.total_classrooms || 0}</p>
                </div>
                <BookOpen className="w-12 h-12 text-teal-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 bg-cyber-black cyber-grid-bg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Students</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.total_students || 0}</p>
                </div>
                <GraduationCap className="w-12 h-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teachers List */}
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Teachers at {stats.school_name}</CardTitle>
            </CardHeader>
            <CardContent>
              {teachers.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No teachers registered yet</p>
              ) : (
                <div className="grid gap-4">
                  {teachers.map((teacher) => (
                    <div key={teacher.id} className="border rounded-lg p-4 hover:bg-teal-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{teacher.name}</h3>
                          <p className="text-sm text-slate-400">{teacher.email}</p>
                        </div>
                        <Button 
                          onClick={() => handleViewTeacher(teacher)} 
                          size="sm" 
                          className="gap-2 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600"
                        >
                          <Eye className="w-4 h-4" />
                          View Classrooms
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default SchoolAdminDashboard;
