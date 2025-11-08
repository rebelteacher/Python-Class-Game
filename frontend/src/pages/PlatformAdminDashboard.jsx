import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, Users, Building, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function PlatformAdminDashboard({ user }) {
  const navigate = useNavigate();
  const [pendingSchoolAdmins, setPendingSchoolAdmins] = useState([]);
  const [pendingDistrictAdmins, setPendingDistrictAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const [schoolResponse, districtResponse] = await Promise.all([
        axios.get(`${API}/admin/pending-school-admins`, { withCredentials: true }),
        axios.get(`${API}/admin/pending-district-admins`, { withCredentials: true })
      ]);
      
      setPendingSchoolAdmins(schoolResponse.data);
      setPendingDistrictAdmins(districtResponse.data);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      toast.error('Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSchoolAdmin = async (userId) => {
    try {
      await axios.post(`${API}/admin/approve-school-admin/${userId}`, {}, { withCredentials: true });
      toast.success('School admin approved!');
      fetchPendingRequests();
    } catch (error) {
      console.error('Error approving school admin:', error);
      toast.error('Failed to approve school admin');
    }
  };

  const handleRejectSchoolAdmin = async (userId) => {
    try {
      await axios.post(`${API}/admin/reject-school-admin/${userId}`, {}, { withCredentials: true });
      toast.success('School admin request rejected');
      fetchPendingRequests();
    } catch (error) {
      console.error('Error rejecting school admin:', error);
      toast.error('Failed to reject school admin');
    }
  };

  const handleApproveDistrictAdmin = async (userId) => {
    try {
      await axios.post(`${API}/admin/approve-district-admin/${userId}`, {}, { withCredentials: true });
      toast.success('District admin approved!');
      fetchPendingRequests();
    } catch (error) {
      console.error('Error approving district admin:', error);
      toast.error('Failed to approve district admin');
    }
  };

  const handleRejectDistrictAdmin = async (userId) => {
    try {
      await axios.post(`${API}/admin/reject-district-admin/${userId}`, {}, { withCredentials: true });
      toast.success('District admin request rejected');
      fetchPendingRequests();
    } catch (error) {
      console.error('Error rejecting district admin:', error);
      toast.error('Failed to reject district admin');
    }
  };

  const handleBackToAdmin = () => {
    navigate('/admin-dashboard');
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 flex items-center justify-center">
        <p className="text-gray-600">Loading pending requests...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 shadow-lg">
        <div className="px-6 py-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-7 h-7 text-white" />
              <span className="text-xl font-bold text-white">ByteBattles Arena</span>
              <span className="ml-4 px-3 py-1 bg-white/20 text-white text-sm font-medium rounded-full border border-white/30">
                Platform Admin
              </span>
            </div>
            <span className="text-lg font-medium text-white">{user?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <Button onClick={handleBackToAdmin} variant="outline" size="sm" className="gap-2 border-white/30 text-white hover:bg-white/20 bg-white/10">
              <ArrowLeft className="w-4 h-4" />
              Back to Admin Dashboard
            </Button>
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Admin Approval Center
          </h1>
          <p className="text-gray-600">Review and approve pending school and district administrator requests</p>
        </div>

        {/* Summary Stats */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending School Admins</p>
                  <p className="text-3xl font-bold text-purple-600">{pendingSchoolAdmins.length}</p>
                </div>
                <Building className="w-12 h-12 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-pink-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending District Admins</p>
                  <p className="text-3xl font-bold text-pink-600">{pendingDistrictAdmins.length}</p>
                </div>
                <Users className="w-12 h-12 text-pink-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending School Admins */}
        <div className="max-w-7xl mx-auto mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Building className="w-6 h-6" />
                Pending School Administrator Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingSchoolAdmins.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No pending school admin requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingSchoolAdmins.map((admin) => (
                    <div key={admin.id} className="border rounded-lg p-5 hover:bg-purple-50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900">{admin.name}</h3>
                          <p className="text-sm text-gray-600 mb-1">{admin.email}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="outline" className="bg-blue-50">
                              {admin.job_title}
                            </Badge>
                            <Badge variant="outline" className="bg-green-50">
                              {admin.school}
                            </Badge>
                            <Badge variant="outline" className="bg-purple-50">
                              {admin.district}
                            </Badge>
                          </div>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          Pending
                        </Badge>
                      </div>
                      <div className="flex gap-3 mt-4 pt-4 border-t">
                        <Button 
                          onClick={() => handleApproveSchoolAdmin(admin.id)}
                          className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button 
                          onClick={() => handleRejectSchoolAdmin(admin.id)}
                          variant="outline"
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pending District Admins */}
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="w-6 h-6" />
                Pending District Administrator Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingDistrictAdmins.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No pending district admin requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingDistrictAdmins.map((admin) => (
                    <div key={admin.id} className="border rounded-lg p-5 hover:bg-pink-50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900">{admin.name}</h3>
                          <p className="text-sm text-gray-600 mb-1">{admin.email}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="outline" className="bg-blue-50">
                              {admin.job_title}
                            </Badge>
                            <Badge variant="outline" className="bg-pink-50">
                              {admin.district}
                            </Badge>
                          </div>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          Pending
                        </Badge>
                      </div>
                      <div className="flex gap-3 mt-4 pt-4 border-t">
                        <Button 
                          onClick={() => handleApproveDistrictAdmin(admin.id)}
                          className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button 
                          onClick={() => handleRejectDistrictAdmin(admin.id)}
                          variant="outline"
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
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

export default PlatformAdminDashboard;
