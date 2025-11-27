import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Sparkles, Plus, Trash2, Eye, EyeOff, Calendar } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminAnnouncements({ user }) {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: ""
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get(`${API}/admin/announcements`, {
        withCredentials: true,
      });
      setAnnouncements(response.data.announcements || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast.error("Please fill in both title and content");
      return;
    }

    setCreating(true);
    try {
      await axios.post(
        `${API}/admin/announcements`,
        newAnnouncement,
        { withCredentials: true }
      );
      toast.success("Announcement created!");
      setCreateDialogOpen(false);
      setNewAnnouncement({ title: "", content: "" });
      fetchAnnouncements();
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error("Failed to create announcement");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (announcementId) => {
    try {
      const response = await axios.put(
        `${API}/admin/announcements/${announcementId}/toggle`,
        {},
        { withCredentials: true }
      );
      toast.success(response.data.is_active ? "Announcement activated" : "Announcement hidden");
      fetchAnnouncements();
    } catch (error) {
      console.error("Error toggling announcement:", error);
      toast.error("Failed to toggle announcement");
    }
  };

  const handleDelete = async (announcementId) => {
    if (!window.confirm("Are you sure you want to delete this announcement? This cannot be undone.")) {
      return;
    }

    try {
      await axios.delete(`${API}/admin/announcements/${announcementId}`, {
        withCredentials: true,
      });
      toast.success("Announcement deleted");
      fetchAnnouncements();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
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
              <Sparkles className="w-7 h-7 text-purple-600" />
              <span className="text-xl font-bold text-gray-900">Manage Announcements</span>
            </div>
          </div>

          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            New Announcement
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> Teachers see active announcements in the "What's New" button on their dashboard. Use this to notify them about new features, content, or important updates!
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-gray-600">Loading announcements...</p>
          </div>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Announcements Yet</h3>
              <p className="text-gray-500 mb-4">Create your first announcement to notify teachers!</p>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 gap-2"
              >
                <Plus className="w-4 h-4" />
                Create First Announcement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className={announcement.is_active ? "border-l-4 border-l-purple-500" : "border-l-4 border-l-gray-300 opacity-60"}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{announcement.title}</CardTitle>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${announcement.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {announcement.is_active ? "Active" : "Hidden"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(announcement.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-800 whitespace-pre-wrap">{announcement.content}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleToggle(announcement.id)}
                        size="sm"
                        variant="outline"
                        className="gap-2"
                      >
                        {announcement.is_active ? (
                          <>
                            <EyeOff className="w-4 h-4" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            Show
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={() => handleDelete(announcement.id)}
                        size="sm"
                        variant="outline"
                        className="gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="announcement-title">Title *</Label>
              <Input
                id="announcement-title"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                placeholder="e.g., New Video Library Feature!"
              />
            </div>

            <div>
              <Label htmlFor="announcement-content">Content *</Label>
              <Textarea
                id="announcement-content"
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                placeholder="Describe what's new in detail..."
                rows={8}
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                📢 <strong>Note:</strong> This announcement will be immediately visible to all teachers in the "What's New" button on their dashboard.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => {
                  setCreateDialogOpen(false);
                  setNewAnnouncement({ title: "", content: "" });
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {creating ? "Creating..." : "Create Announcement"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
