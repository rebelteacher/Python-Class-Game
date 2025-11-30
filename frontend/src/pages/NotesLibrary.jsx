import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { BookOpen, Plus, Search, FileText, Download, Edit, Trash2, ArrowLeft, Upload, Eye, Share2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function NotesLibrary({ user }) {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState("all"); // "mine", "shared", "all"
  const [searchTerm, setSearchTerm] = useState("");
  const [chapterFilter, setChapterFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  const [newNote, setNewNote] = useState({
    title: "",
    description: "",
    chapter: "",
    category: "",
    resource_type: "student_resource",
    is_shared: false,
    tags: [],
    file: null
  });

  useEffect(() => {
    fetchNotes();
  }, [filterType]);

  useEffect(() => {
    filterNotes();
  }, [searchTerm, chapterFilter, categoryFilter, notes]);

  const fetchNotes = async () => {
    try {
      const response = await axios.get(`${API}/notes`, {
        params: { filter: filterType },
        withCredentials: true
      });
      setNotes(response.data);
      setFilteredNotes(response.data);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to load notes library");
    } finally {
      setLoading(false);
    }
  };

  const filterNotes = () => {
    let filtered = [...notes];

    if (searchTerm) {
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (chapterFilter && chapterFilter !== "all") {
      filtered = filtered.filter(n => n.chapter === chapterFilter);
    }

    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter(n => n.category === categoryFilter);
    }

    setFilteredNotes(filtered);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Please select a PDF file");
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        toast.error("File size must be less than 25MB");
        return;
      }
      setNewNote({ ...newNote, file });
    }
  };

  const handleUploadNote = async (e) => {
    e.preventDefault();
    
    if (!newNote.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!newNote.file) {
      toast.error("Please select a PDF file");
      return;
    }

    setUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1]; // Remove data:application/pdf;base64, prefix
        
        const payload = {
          title: newNote.title,
          description: newNote.description,
          chapter: newNote.chapter,
          category: newNote.category,
          resource_type: newNote.resource_type,
          is_shared: newNote.is_shared,
          tags: newNote.tags,
          file_data: base64,
          file_size: newNote.file.size
        };

        try {
          await axios.post(`${API}/notes`, payload, {
            withCredentials: true
          });
          toast.success("Note uploaded successfully!");
          setUploadDialogOpen(false);
          setNewNote({
            title: "",
            description: "",
            chapter: "",
            category: "",
            resource_type: "student_resource",
            is_shared: false,
            tags: [],
            file: null
          });
          fetchNotes();
        } catch (error) {
          console.error("Error uploading note:", error);
          toast.error("Failed to upload note");
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(newNote.file);
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Failed to process file");
      setUploading(false);
    }
  };

  const handleViewNote = async (note) => {
    try {
      const response = await axios.get(`${API}/notes/${note.id}`, {
        withCredentials: true
      });
      console.log("Note data received:", {
        hasFileData: !!response.data.file_data,
        fileDataLength: response.data.file_data?.length,
        keys: Object.keys(response.data)
      });
      
      // Convert base64 to blob for better browser compatibility
      if (response.data.file_data) {
        try {
          const byteCharacters = atob(response.data.file_data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const blobUrl = URL.createObjectURL(blob);
          response.data.pdfBlobUrl = blobUrl;
        } catch (e) {
          console.error("Error creating blob URL:", e);
        }
      }
      
      setSelectedNote(response.data);
      setViewDialogOpen(true);
    } catch (error) {
      console.error("Error fetching note:", error);
      toast.error("Failed to load note");
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Are you sure you want to delete this note?")) {
      return;
    }

    try {
      await axios.delete(`${API}/notes/${noteId}`, {
        withCredentials: true
      });
      toast.success("Note deleted");
      fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    }
  };

  const handleToggleSharing = async (note) => {
    try {
      await axios.put(
        `${API}/notes/${note.id}`,
        { is_shared: !note.is_shared },
        { withCredentials: true }
      );
      toast.success(note.is_shared ? "Note made private" : "Note shared with community!");
      fetchNotes();
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Failed to update sharing");
    }
  };

  // Natural sort function for alphanumeric strings (e.g., "1, 2, 10" instead of "1, 10, 2")
  const naturalSort = (a, b) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  };

  const chapters = [...new Set(notes.map(n => n.chapter))].filter(Boolean).sort(naturalSort);
  const categories = [...new Set(notes.map(n => n.category))].filter(Boolean).sort(naturalSort);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button onClick={() => navigate(user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard")} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <FileText className="w-7 h-7 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">Notes Library</span>
            </div>
          </div>
          {user.role === "teacher" && (
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload PDF
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload PDF Note</DialogTitle>
                  <DialogDescription>
                    Upload educational resources for your students (Max 25MB)
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUploadNote} className="space-y-4">
                  <div>
                    <Label htmlFor="noteTitle">Title *</Label>
                    <Input
                      id="noteTitle"
                      placeholder="e.g., Chapter 1 Study Guide"
                      value={newNote.title}
                      onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="noteDescription">Description</Label>
                    <Textarea
                      id="noteDescription"
                      placeholder="What does this resource cover?"
                      value={newNote.description}
                      onChange={(e) => setNewNote({ ...newNote, description: e.target.value })}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="noteChapter">Chapter</Label>
                      <Input
                        id="noteChapter"
                        placeholder="e.g., Chapter 1"
                        value={newNote.chapter}
                        onChange={(e) => setNewNote({ ...newNote, chapter: e.target.value })}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="noteCategory">Category</Label>
                      <Input
                        id="noteCategory"
                        placeholder="e.g., Study Guide, Reference"
                        value={newNote.category}
                        onChange={(e) => setNewNote({ ...newNote, category: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="resourceType">Resource Type *</Label>
                    <Select value={newNote.resource_type} onValueChange={(val) => setNewNote({ ...newNote, resource_type: val })}>
                      <SelectTrigger id="resourceType" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student_resource">Student Resource (Study Guides, References)</SelectItem>
                        <SelectItem value="teacher_resource">Teacher Resource (Answer Keys, Solutions)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Student resources can be downloaded. Teacher resources are view-only.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="pdfFile">PDF File *</Label>
                    <Input
                      id="pdfFile"
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileSelect}
                      className="mt-1"
                    />
                    {newNote.file && (
                      <p className="text-sm text-gray-600 mt-1">
                        Selected: {newNote.file.name} ({(newNote.file.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
                    <Switch
                      id="shareNote"
                      checked={newNote.is_shared}
                      onCheckedChange={(checked) => setNewNote({ ...newNote, is_shared: checked })}
                    />
                    <Label htmlFor="shareNote" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4" />
                        <span className="font-medium">Share with Community</span>
                      </div>
                      <p className="text-xs text-gray-600">Other teachers can view and use this resource</p>
                    </Label>
                  </div>

                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={uploading}>
                    {uploading ? "Uploading..." : "Upload Note"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        {/* Filter Tabs - Teachers Only */}
        {user.role === "teacher" && (
          <Tabs value={filterType} onValueChange={setFilterType} className="mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="all">All Notes</TabsTrigger>
              <TabsTrigger value="mine">My Notes</TabsTrigger>
              <TabsTrigger value="shared">Community</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        
        {/* Student View Header */}
        {user.role === "student" && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Study Resources</h2>
            <p className="text-gray-600">Access study guides and reference materials from your teachers</p>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={chapterFilter} onValueChange={setChapterFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Chapters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chapters</SelectItem>
                {chapters.map((chapter) => (
                  <SelectItem key={chapter} value={chapter}>{chapter}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-gray-600">
            Showing {filteredNotes.length} of {notes.length} notes
          </div>
        </div>

        {/* Notes Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-600">Loading notes...</div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No notes found</h3>
            <p className="text-gray-500">Upload your first PDF note to get started</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <Card key={note.id} className="hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-wrap gap-2">
                      {note.chapter && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          📚 {note.chapter}
                        </span>
                      )}
                      {note.is_shared && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          <Share2 className="w-3 h-3 inline mr-1" />
                          Shared
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(note.file_size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  <CardTitle className="text-lg">{note.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{note.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {note.category && (
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                        {note.category}
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 pt-2">
                    By {note.creator_name}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => handleViewNote(note)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                      size="sm"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {user.id === note.creator_id && (
                      <>
                        <Button
                          onClick={() => handleToggleSharing(note)}
                          variant="outline"
                          size="sm"
                          title={note.is_shared ? "Make private" : "Share with community"}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id);
                          }}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* View PDF Dialog */}
      {selectedNote && (
        <Dialog open={viewDialogOpen} onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open && selectedNote.pdfBlobUrl) {
            URL.revokeObjectURL(selectedNote.pdfBlobUrl);
          }
        }}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
            <div className="flex items-center justify-between h-[40px] px-4 flex-shrink-0 bg-white border-b border-gray-200">
              <DialogTitle className="text-base font-semibold">{selectedNote.title}</DialogTitle>
              <div className="flex gap-2 items-center mr-20">
                <Button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedNote.pdfBlobUrl || `data:application/pdf;base64,${selectedNote.file_data}`;
                    link.download = `${selectedNote.title}.pdf`;
                    link.click();
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-1 h-7"
                >
                  <Download className="w-3 h-3" />
                  Download PDF
                </Button>
                {selectedNote.resource_type === "teacher_resource" && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded">
                    View Only
                  </span>
                )}
              </div>
            </div>
            <div className="h-[calc(100%-40px)]">
              {selectedNote.pdfBlobUrl ? (
                <embed
                  src={selectedNote.pdfBlobUrl}
                  type="application/pdf"
                  className="w-full h-full bg-gray-100"
                />
              ) : selectedNote.file_data ? (
                <object
                  data={`data:application/pdf;base64,${selectedNote.file_data}`}
                  type="application/pdf"
                  className="w-full h-full bg-gray-100"
                >
                    <div className="p-8 text-center space-y-4 flex flex-col items-center justify-center h-full">
                      <FileText className="w-16 h-16 text-gray-400" />
                      <p className="text-gray-600">
                        Unable to display PDF in browser. Please download to view.
                      </p>
                      <Button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = `data:application/pdf;base64,${selectedNote.file_data}`;
                          link.download = `${selectedNote.title}.pdf`;
                          link.click();
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                </object>
              ) : (
                <div className="p-8 text-center text-gray-500 flex items-center justify-center h-full bg-gray-100">
                  No PDF data available
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
