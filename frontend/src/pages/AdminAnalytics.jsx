import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Activity, Copy, Mail, Calendar, TrendingUp } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminAnalytics({ user }) {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("all"); // "all" or "active"

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await axios.get(`${API}/admin/teachers`, {
        withCredentials: true,
      });
      setTeachers(response.data);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to load teacher data");
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = view === "active" 
    ? teachers.filter(t => t.frequency !== "Inactive")
    : teachers;

  const copyEmailList = () => {
    const emails = filteredTeachers.map(t => t.email).join(", ");
    navigator.clipboard.writeText(emails);
    toast.success(`Copied ${filteredTeachers.length} email addresses to clipboard!`);
  };

  const getFrequencyColor = (frequency) => {
    switch (frequency) {
      case "Very Active": return "bg-green-100 text-green-800 border-green-300";
      case "Active": return "bg-blue-100 text-blue-800 border-blue-300";
      case "Low Activity": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Inactive": return "bg-cyber-navy/30 text-slate-200 border-cyber-cyan/15";
      default: return "bg-cyber-navy/30 text-slate-200 border-cyber-cyan/15";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === "Never") return "Never";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      <nav className="bg-cyber-navy/80 backdrop-blur-xl border-b border-cyber-cyan/20">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => navigate("/admin-dashboard")}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-7 h-7 text-cyber-cyan" />
              <span className="text-xl font-bold text-white">Teacher Analytics</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Teachers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-cyber-cyan">{teachers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Very Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {teachers.filter(t => t.frequency === "Very Active").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {teachers.filter(t => t.frequency === "Active" || t.frequency === "Low Activity").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Inactive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-400">
                {teachers.filter(t => t.frequency === "Inactive").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <Button
              onClick={() => setView("all")}
              variant={view === "all" ? "default" : "outline"}
              className={view === "all" ? "bg-cyber-cyan text-cyber-black" : ""}
            >
              All Teachers ({teachers.length})
            </Button>
            <Button
              onClick={() => setView("active")}
              variant={view === "active" ? "default" : "outline"}
              className={view === "active" ? "bg-green-600" : ""}
            >
              Active Only ({teachers.filter(t => t.frequency !== "Inactive").length})
            </Button>
          </div>

          <Button
            onClick={copyEmailList}
            className="bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy {filteredTeachers.length} Email{filteredTeachers.length !== 1 ? "s" : ""}
          </Button>
        </div>

        {/* Teachers Table */}
        {loading ? (
          <div className="text-center py-20">
            <p className="text-slate-400">Loading teacher data...</p>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <Users className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No Teachers Found</h3>
              <p className="text-slate-500">
                {view === "active" ? "No active teachers yet" : "No teachers registered yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-cyber-navy/40 border-b border-cyber-cyan/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Teacher
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Total Logins
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        30-Day Logins
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Frequency
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Classrooms
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTeachers.map((teacher, index) => (
                      <tr key={teacher.id} className={index % 2 === 0 ? "bg-cyber-navy/60" : "bg-cyber-navy/40"}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 text-slate-500 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-white">
                                {teacher.name || "Unnamed"}
                              </div>
                              <div className="text-sm text-slate-500">{teacher.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-white">
                            {teacher.total_logins || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            {formatDate(teacher.last_login)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-cyber-cyan">
                            {teacher.recent_login_count || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getFrequencyColor(teacher.frequency)}`}>
                            {teacher.frequency || "Unknown"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-500" />
                            {teacher.classroom_count || 0}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
