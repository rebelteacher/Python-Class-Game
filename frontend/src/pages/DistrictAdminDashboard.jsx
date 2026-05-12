import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building, GraduationCap, BookOpen, LogOut, School } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function DistrictAdminDashboard({ user }) {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/district-admin/dashboard`, {
        withCredentials: true
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
  const schools = dashboardData?.schools || [];
  const teachers = dashboardData?.teachers || [];

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg">
        <div className="px-6 py-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center space-x-2">
              <School className="w-7 h-7 text-white" />
              <span className="text-xl font-bold text-white">ByteBattles Arena</span>
              <span className="ml-4 px-3 py-1 bg-white/20 text-white text-sm font-medium rounded-full border border-white/30">
                District Admin
              </span>
            </div>
            <span className="text-lg font-medium text-white">{user?.name}</span>
          </div>
          <div className="flex items-center justify-end">
            <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2 border-white/30 text-white hover:bg-white/20 bg-white/10">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="p-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            {dashboardData?.district} District
          </h1>
          <p className="text-slate-400">District-wide overview and teacher management</p>
        </div>

        {/* Stats Cards */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 border-blue-200 bg-cyber-black cyber-grid-bg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Schools</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.total_schools || 0}</p>
                </div>
                <Building className="w-12 h-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Teachers</p>
                  <p className="text-3xl font-bold text-cyber-cyan">{stats.total_teachers || 0}</p>
                </div>
                <Users className="w-12 h-12 text-indigo-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Students</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.total_students || 0}</p>
                </div>
                <GraduationCap className="w-12 h-12 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-pink-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Classrooms</p>
                  <p className="text-3xl font-bold text-pink-600">{stats.total_classrooms || 0}</p>
                </div>
                <BookOpen className="w-12 h-12 text-pink-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schools List */}
        <div className="max-w-7xl mx-auto mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Schools in District</CardTitle>
            </CardHeader>
            <CardContent>
              {schools.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No schools registered yet</p>
              ) : (
                <div className="grid gap-4">
                  {schools.map((school) => (
                    <div key={school.id} className="border rounded-lg p-4 hover:bg-cyber-navy/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{school.name}</h3>
                          <p className="text-sm text-slate-400">
                            {school.teacher_count || 0} teachers • {school.student_count || 0} students
                          </p>
                        </div>
                        <Building className="w-8 h-8 text-blue-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Teachers List */}
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">All Teachers Using ByteBattles</CardTitle>
            </CardHeader>
            <CardContent>
              {teachers.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No teachers registered yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-cyber-navy/40">
                        <th className="text-left p-3 font-semibold">Name</th>
                        <th className="text-left p-3 font-semibold">Email</th>
                        <th className="text-left p-3 font-semibold">School</th>
                        <th className="text-left p-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map((teacher) => (
                        <tr key={teacher.id} className="border-b hover:bg-cyber-navy/40">
                          <td className="p-3">{teacher.name}</td>
                          <td className="p-3 text-slate-400">{teacher.email}</td>
                          <td className="p-3">{teacher.school || 'Not specified'}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DistrictAdminDashboard;