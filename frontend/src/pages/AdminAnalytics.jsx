import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Users,
  Copy,
  Mail,
  Calendar,
  TrendingUp,
  Eye,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Radio,
  Link as LinkIcon,
  RefreshCw,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminAnalytics({ user }) {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [view, setView] = useState("all");

  const [traffic, setTraffic] = useState(null);
  const [trafficLoading, setTrafficLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(30);

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    fetchTraffic(rangeDays);
  }, [rangeDays]);

  const fetchTeachers = async () => {
    try {
      const response = await axios.get(`${API}/admin/teachers`, { withCredentials: true });
      setTeachers(response.data);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to load teacher data");
    } finally {
      setLoadingTeachers(false);
    }
  };

  const fetchTraffic = async (days) => {
    setTrafficLoading(true);
    try {
      const response = await axios.get(`${API}/admin/analytics/traffic`, {
        params: { days },
        withCredentials: true,
      });
      setTraffic(response.data);
    } catch (error) {
      console.error("Error fetching traffic:", error);
      toast.error("Failed to load site traffic");
    } finally {
      setTrafficLoading(false);
    }
  };

  const filteredTeachers = view === "active"
    ? teachers.filter((t) => t.frequency !== "Inactive")
    : teachers;

  const copyEmailList = () => {
    const emails = filteredTeachers.map((t) => t.email).join(", ");
    navigator.clipboard.writeText(emails);
    toast.success(`Copied ${filteredTeachers.length} email addresses to clipboard!`);
  };

  const getFrequencyColor = (frequency) => {
    switch (frequency) {
      case "Very Active": return "bg-green-500/20 text-green-400 border-green-300";
      case "Active": return "bg-blue-500/20 text-blue-400 border-blue-300";
      case "Low Activity": return "bg-yellow-500/20 text-yellow-400 border-yellow-300";
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
              data-testid="analytics-back-btn"
              onClick={() => navigate("/admin-dashboard")}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-7 h-7 text-cyber-cyan" />
              <span className="text-xl font-bold text-white">Analytics</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        <Tabs defaultValue="traffic" className="w-full">
          <TabsList
            data-testid="analytics-tabs"
            className="bg-cyber-navy/60 border border-cyber-cyan/20 mb-6"
          >
            <TabsTrigger
              data-testid="tab-site-traffic"
              value="traffic"
              className="data-[state=active]:bg-cyber-cyan data-[state=active]:text-cyber-black"
            >
              <Globe className="w-4 h-4 mr-2" />
              Site Traffic
            </TabsTrigger>
            <TabsTrigger
              data-testid="tab-teacher-activity"
              value="teachers"
              className="data-[state=active]:bg-cyber-cyan data-[state=active]:text-cyber-black"
            >
              <Users className="w-4 h-4 mr-2" />
              Teacher Activity
            </TabsTrigger>
          </TabsList>

          {/* ---------- SITE TRAFFIC ---------- */}
          <TabsContent value="traffic">
            <SiteTrafficPanel
              traffic={traffic}
              loading={trafficLoading}
              rangeDays={rangeDays}
              setRangeDays={setRangeDays}
              onRefresh={() => fetchTraffic(rangeDays)}
            />
          </TabsContent>

          {/* ---------- TEACHER ACTIVITY (existing) ---------- */}
          <TabsContent value="teachers">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard label="Total Teachers" value={teachers.length} color="text-cyber-cyan" />
              <StatCard
                label="Very Active"
                value={teachers.filter((t) => t.frequency === "Very Active").length}
                color="text-green-500"
              />
              <StatCard
                label="Active"
                value={teachers.filter((t) => t.frequency === "Active" || t.frequency === "Low Activity").length}
                color="text-blue-500"
              />
              <StatCard
                label="Inactive"
                value={teachers.filter((t) => t.frequency === "Inactive").length}
                color="text-slate-400"
              />
            </div>

            <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
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
                  Active Only ({teachers.filter((t) => t.frequency !== "Inactive").length})
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

            {loadingTeachers ? (
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Teacher</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Logins</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Last Login</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">30-Day Logins</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Frequency</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Classrooms</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTeachers.map((teacher, index) => (
                          <tr key={teacher.id} className={index % 2 === 0 ? "bg-cyber-navy/60" : "bg-cyber-navy/40"}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Mail className="w-4 h-4 text-slate-500 mr-2" />
                                <div>
                                  <div className="text-sm font-medium text-white">{teacher.name || "Unnamed"}</div>
                                  <div className="text-sm text-slate-500">{teacher.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-white">{teacher.total_logins || 0}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-white flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                {formatDate(teacher.last_login)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-cyber-cyan">{teacher.recent_login_count || 0}</div>
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${color || "text-white"}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function SiteTrafficPanel({ traffic, loading, rangeDays, setRangeDays, onRefresh }) {
  if (loading && !traffic) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Loading site traffic...</p>
      </div>
    );
  }

  if (!traffic) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Globe className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400">No traffic data available yet.</p>
          <p className="text-slate-500 text-sm mt-2">
            Once visitors land on bytebattles.org, page views will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const t = traffic.totals || {};
  const deviceIcon = (d) => {
    if (d === "Mobile") return <Smartphone className="w-4 h-4" />;
    if (d === "Tablet") return <Tablet className="w-4 h-4" />;
    if (d === "Desktop") return <Monitor className="w-4 h-4" />;
    return <Globe className="w-4 h-4" />;
  };

  const maxDaily = Math.max(1, ...(traffic.daily_series || []).map((d) => d.views));

  return (
    <div data-testid="site-traffic-panel" className="space-y-6">
      {/* Header row with range selector + refresh + live indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-cyan opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyber-cyan"></span>
          </span>
          <Radio className="w-4 h-4 text-cyber-cyan" />
          <span data-testid="live-visitors-count" className="font-semibold text-white">
            {t.live_visitors || 0}
          </span>
          <span className="text-sm text-slate-400">visitor{(t.live_visitors || 0) === 1 ? "" : "s"} active right now</span>
        </div>

        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              data-testid={`range-${d}d-btn`}
              onClick={() => setRangeDays(d)}
              variant={rangeDays === d ? "default" : "outline"}
              size="sm"
              className={rangeDays === d ? "bg-cyber-cyan text-cyber-black font-bold" : ""}
            >
              Last {d}d
            </Button>
          ))}
          <Button
            data-testid="refresh-traffic-btn"
            onClick={onRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Views Today"
          value={t.views_today || 0}
          color="text-cyber-cyan"
          icon={<Eye className="w-4 h-4" />}
        />
        <StatCard
          label="Views (7d)"
          value={t.views_7d || 0}
          color="text-cyber-cyan"
          icon={<Eye className="w-4 h-4" />}
        />
        <StatCard
          label="Unique Visitors (7d)"
          value={t.unique_7d || 0}
          color="text-green-400"
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Unique Visitors (30d)"
          value={t.unique_30d || 0}
          color="text-green-400"
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Total Views (All Time)"
          value={t.all_time_views || 0}
          color="text-white"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="Unique Visitors (All Time)"
          value={t.unique_all_time || 0}
          color="text-white"
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Sessions (30d)"
          value={t.sessions_30d || 0}
          color="text-slate-200"
          icon={<Globe className="w-4 h-4" />}
        />
        <StatCard
          label="Views (30d)"
          value={t.views_30d || 0}
          color="text-slate-200"
          icon={<Eye className="w-4 h-4" />}
        />
      </div>

      {/* Daily chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyber-cyan" />
            Daily Traffic — Last {rangeDays} Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(traffic.daily_series || []).length === 0 ? (
            <p className="text-slate-500 text-center py-8">No data for this range yet.</p>
          ) : (
            <div data-testid="daily-traffic-chart" className="flex items-end gap-1 h-48 overflow-x-auto pb-2 px-2">
              {(traffic.daily_series || []).map((d) => {
                const heightPct = (d.views / maxDaily) * 100;
                const hasData = d.views > 0;
                return (
                  <div
                    key={d.date}
                    className="flex-1 min-w-[10px] flex flex-col items-center justify-end group relative h-full"
                    title={`${d.date}: ${d.views} views, ${d.unique_visitors} visitors`}
                  >
                    <div
                      className={`w-full rounded-t-sm transition-all ${
                        hasData
                          ? "bg-gradient-to-t from-cyber-cyan/60 to-fuchsia-400 shadow-[0_0_8px_rgba(0,240,255,0.5)] hover:from-cyber-cyan hover:to-fuchsia-300"
                          : "bg-cyber-cyan/10"
                      }`}
                      style={{ height: hasData ? `${Math.max(8, heightPct)}%` : "4px" }}
                    ></div>
                    <div className="absolute -top-10 hidden group-hover:block bg-cyber-navy border border-cyber-cyan/40 rounded px-2 py-1 text-xs text-white whitespace-nowrap z-10 shadow-lg">
                      <div className="font-semibold text-cyber-cyan">{d.date}</div>
                      <div>{d.views} views · {d.unique_visitors} unique</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>{(traffic.daily_series || [])[0]?.date || ""}</span>
            <span>{(traffic.daily_series || [])[traffic.daily_series.length - 1]?.date || ""}</span>
          </div>
        </CardContent>
      </Card>

      {/* Two-column: Top Referrers + Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-cyber-cyan" />
              Top Traffic Sources (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(traffic.top_referrers || []).length === 0 ? (
              <p className="text-slate-500 text-center py-8">No referrer data yet.</p>
            ) : (
              <div data-testid="top-referrers-list" className="space-y-2">
                {traffic.top_referrers.map((r) => {
                  const total = traffic.top_referrers.reduce((s, x) => s + x.views, 0) || 1;
                  const pct = Math.round((r.views / total) * 100);
                  return (
                    <div key={r.source} className="flex items-center gap-3">
                      <div className="w-32 text-sm text-white truncate">{r.source}</div>
                      <div className="flex-1 bg-cyber-navy/60 rounded h-6 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyber-cyan to-fuchsia-500 flex items-center justify-end px-2"
                          style={{ width: `${pct}%` }}
                        >
                          <span className="text-[10px] text-cyber-black font-bold">{pct}%</span>
                        </div>
                      </div>
                      <div className="w-20 text-right text-sm text-slate-300">{r.views} views</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-cyber-cyan" />
              Device Breakdown (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(traffic.device_breakdown || []).length === 0 ? (
              <p className="text-slate-500 text-center py-8">No device data yet.</p>
            ) : (
              <div data-testid="device-breakdown-list" className="space-y-3">
                {traffic.device_breakdown.map((d) => {
                  const total = traffic.device_breakdown.reduce((s, x) => s + x.views, 0) || 1;
                  const pct = Math.round((d.views / total) * 100);
                  return (
                    <div key={d.device} className="flex items-center gap-3">
                      <div className="w-32 text-sm text-white flex items-center gap-2">
                        {deviceIcon(d.device)}
                        {d.device}
                      </div>
                      <div className="flex-1 bg-cyber-navy/60 rounded h-6 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyber-cyan"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <div className="w-20 text-right text-sm text-slate-300">{pct}% · {d.views}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-cyber-cyan" />
            Top Pages (30d)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(traffic.top_pages || []).length === 0 ? (
            <p className="text-slate-500 text-center py-8 px-6">No page view data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table data-testid="top-pages-table" className="w-full">
                <thead className="bg-cyber-navy/40 border-b border-cyber-cyan/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Page</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Views</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unique Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {traffic.top_pages.map((p, idx) => (
                    <tr key={p.path} className={idx % 2 === 0 ? "bg-cyber-navy/60" : "bg-cyber-navy/40"}>
                      <td className="px-6 py-3 text-sm text-white font-mono">{p.path}</td>
                      <td className="px-6 py-3 text-sm text-cyber-cyan font-semibold">{p.views}</td>
                      <td className="px-6 py-3 text-sm text-green-400 font-semibold">{p.unique_visitors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-500 text-center pt-2">
        Admin views are excluded from these stats. Visitors are identified by an anonymous browser ID
        (no personal data collected).
      </p>
    </div>
  );
}
