import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Video, Upload, Play, Edit, Trash2, Plus, Folder, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";
import ResizableVideoPlayer from "@/components/ResizableVideoPlayer";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function VideoLibrary({ user }) {
  const navigate = useNavigate();
  const [chapters, setChapters] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});
  
  const [newVideo, setNewVideo] = useState({
    title: "",
    chapter: "",
    description: "",
    file: null
  });
  
  const [editingVideo, setEditingVideo] = useState({
    id: "",
    title: "",
    chapter: "",
    description: ""
  });

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await axios.get(`${API}/video-library`, {
        withCredentials: true,
      });
      setChapters(response.data.chapters);
    } catch (error) {
      console.error("Error fetching videos:", error);
      toast.error("Failed to load video library");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!newVideo.title || !newVideo.chapter || !newVideo.file) {
      toast.error("Please fill in all required fields");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("video", newVideo.file);
      formData.append("title", newVideo.title);
      formData.append("chapter", newVideo.chapter);
      if (newVideo.description) {
        formData.append("description", newVideo.description);
      }

      await axios.post(
        `${API}/video-library`,
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success("Video uploaded successfully!");
      setUploadDialogOpen(false);
      setNewVideo({ title: "", chapter: "", description: "", file: null });
      fetchVideos();
    } catch (error) {
      console.error("Error uploading video:", error);
      toast.error(error.response?.data?.detail || "Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async () => {
    try {
      await axios.put(
        `${API}/video-library/${editingVideo.id}`,
        {
          title: editingVideo.title,
          chapter: editingVideo.chapter,
          description: editingVideo.description
        },
        { withCredentials: true }
      );

      toast.success("Video updated successfully!");
      setEditDialogOpen(false);
      fetchVideos();
    } catch (error) {
      console.error("Error updating video:", error);
      toast.error("Failed to update video");
    }
  };

  const handleDelete = async (videoId) => {
    if (!window.confirm("Are you sure you want to delete this video? This cannot be undone.")) {
      return;
    }

    try {
      await axios.delete(`${API}/video-library/${videoId}`, {
        withCredentials: true,
      });

      toast.success("Video deleted successfully!");
      fetchVideos();
    } catch (error) {
      console.error("Error deleting video:", error);
      toast.error("Failed to delete video");
    }
  };

  const openEditDialog = (video) => {
    setEditingVideo({
      id: video.id,
      title: video.title,
      chapter: video.chapter,
      description: video.description || ""
    });
    setEditDialogOpen(true);
  };

  const playVideo = (video) => {
    setPlayingVideo(video);
  };

  const toggleFolder = (chapterName) => {
    setExpandedFolders(prev => ({
      ...prev,
      [chapterName]: !prev[chapterName]
    }));
  };

  const sortedChapterNames = Object.keys(chapters).sort();

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      <nav className="bg-cyber-navy/80 backdrop-blur-xl border-b border-cyber-cyan/20">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => navigate(user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard")}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <Video className="w-7 h-7 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">Video Library</span>
            </div>
          </div>
          
          {user.is_admin && (
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Plus className="w-4 h-4" />
              Upload Video
            </Button>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        {loading ? (
          <div className="text-center py-20">
            <p className="text-gray-600">Loading videos...</p>
          </div>
        ) : sortedChapterNames.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Videos Yet</h3>
              <p className="text-gray-500">
                {user.is_admin ? "Upload your first video to get started!" : "Videos will appear here once uploaded by admins."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedChapterNames.map((chapterName) => {
              const isExpanded = expandedFolders[chapterName];
              const videoCount = chapters[chapterName].length;

              return (
                <Card key={chapterName} className="overflow-hidden">
                  {/* Folder Header - Clickable */}
                  <div
                    onClick={() => toggleFolder(chapterName)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <FolderOpen className="w-6 h-6 text-purple-600" />
                      ) : (
                        <Folder className="w-6 h-6 text-purple-600" />
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{chapterName}</h3>
                        <p className="text-sm text-gray-600">{videoCount} video{videoCount !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </div>

                  {/* Folder Content - Collapsible */}
                  {isExpanded && (
                    <CardContent className="pt-0 pb-4">
                      <div className="space-y-3">
                        {chapters[chapterName].map((video) => (
                          <div
                            key={video.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <Video className="w-5 h-5 text-purple-600" />
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{video.title}</h4>
                                {video.description && (
                                  <p className="text-sm text-gray-600 line-clamp-1">{video.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => playVideo(video)}
                                className="bg-purple-600 hover:bg-purple-700 gap-2"
                                size="sm"
                              >
                                <Play className="w-4 h-4" />
                                Watch
                              </Button>

                              {user.is_admin && (
                                <>
                                  <Button
                                    onClick={() => openEditDialog(video)}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    onClick={() => handleDelete(video.id)}
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="video-title">Video Title *</Label>
              <Input
                id="video-title"
                value={newVideo.title}
                onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                placeholder="e.g., Understanding Variables"
              />
            </div>
            
            <div>
              <Label htmlFor="video-chapter">Chapter *</Label>
              <Input
                id="video-chapter"
                value={newVideo.chapter}
                onChange={(e) => setNewVideo({ ...newVideo, chapter: e.target.value })}
                placeholder="e.g., Chapter 1: Variables"
              />
            </div>
            
            <div>
              <Label htmlFor="video-description">Description (Optional)</Label>
              <Textarea
                id="video-description"
                value={newVideo.description}
                onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                placeholder="Brief description of the video content..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="video-file">Video File * (MP4, WEBM, MOV)</Label>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => setNewVideo({ ...newVideo, file: e.target.files?.[0] || null })}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 mt-1"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setUploadDialogOpen(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Video Title</Label>
              <Input
                id="edit-title"
                value={editingVideo.title}
                onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-chapter">Chapter</Label>
              <Input
                id="edit-chapter"
                value={editingVideo.chapter}
                onChange={(e) => setEditingVideo({ ...editingVideo, chapter: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editingVideo.description}
                onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                rows={3}
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setEditDialogOpen(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Player */}
      {playingVideo && (
        <ResizableVideoPlayer
          videoUrl={`${API}/video-library/${playingVideo.id}/stream`}
          onClose={() => setPlayingVideo(null)}
        />
      )}
    </div>
  );
}
