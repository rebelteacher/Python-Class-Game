import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Plus, Search, Filter, Code2, ArrowLeft, Download, Edit, Folder, FolderOpen, ChevronRight, ChevronDown, Trash2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AssignmentLibrary({ user }) {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [filteredProblems, setFilteredProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [chapterFilter, setChapterFilter] = useState("all");
  
  // Multi-select mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [assignmentBuilderOpen, setAssignmentBuilderOpen] = useState(false);
  
  // Folder view
  const [viewMode, setViewMode] = useState("folders"); // "folders" or "grid"
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  
  // Edit mode
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  
  const [newProblem, setNewProblem] = useState({
    title: "",
    description: "",
    starter_code: "",
    solution_code: "",
    expected_output: "",
    category: "",
    difficulty: "Easy",
    chapter: "",
    lesson: "",
    problem_type: "Independent Practice",
    resources_link: "",
    csta_standard: ""
  });

  useEffect(() => {
    fetchProblems();
  }, []);

  useEffect(() => {
    filterProblems();
  }, [searchTerm, categoryFilter, difficultyFilter, chapterFilter, problems]);

  const fetchProblems = async () => {
    try {
      const response = await axios.get(`${API}/problems`, {
        withCredentials: true,
      });
      setProblems(response.data);
      setFilteredProblems(response.data);
    } catch (error) {
      console.error("Error fetching library:", error);
      toast.error("Failed to load problem library");
    } finally {
      setLoading(false);
    }
  };

  const filterProblems = () => {
    let filtered = [...problems];

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    if (difficultyFilter && difficultyFilter !== "all") {
      filtered = filtered.filter(p => p.difficulty === difficultyFilter);
    }

    if (chapterFilter && chapterFilter !== "all") {
      filtered = filtered.filter(p => p.chapter === chapterFilter);
    }

    setFilteredProblems(filtered);
  };

  const handleCreateProblem = async (e) => {
    e.preventDefault();
    
    if (!newProblem.title.trim() || !newProblem.solution_code.trim()) {
      toast.error("Please fill in title and solution code");
      return;
    }

    try {
      await axios.post(
        `${API}/problems`,
        newProblem,
        { withCredentials: true }
      );
      toast.success("Problem added to library!");
      setCreateDialogOpen(false);
      setNewProblem({
        title: "",
        description: "",
        starter_code: "",
        solution_code: "",
        expected_output: "",
        category: "",
        difficulty: "Easy",
        chapter: "",
        lesson: "",
        problem_type: "Independent Practice",
        resources_link: "",
        csta_standard: ""
      });
      fetchProblems();
    } catch (error) {
      console.error("Error creating problem:", error);
      toast.error("Failed to create problem");
    }
  };

  const handleEditProblem = async (e) => {
    e.preventDefault();
    
    if (!editingProblem.title.trim() || !editingProblem.solution_code.trim()) {
      toast.error("Please fill in title and solution code");
      return;
    }

    try {
      await axios.put(
        `${API}/problems/${editingProblem.id}`,
        {
          title: editingProblem.title,
          description: editingProblem.description,
          starter_code: editingProblem.starter_code,
          solution_code: editingProblem.solution_code,
          expected_output: editingProblem.expected_output,
          category: editingProblem.category,
          difficulty: editingProblem.difficulty,
          chapter: editingProblem.chapter || "",
          lesson: editingProblem.lesson || "",
          problem_type: editingProblem.problem_type,
          resources_link: editingProblem.resources_link,
          csta_standard: editingProblem.csta_standard
        },
        { withCredentials: true }
      );
      toast.success("Problem updated!");
      setEditDialogOpen(false);
      setEditingProblem(null);
      fetchProblems();
    } catch (error) {
      console.error("Error updating problem:", error);
      toast.error("Failed to update problem");
    }
  };

  const handleDeleteProblem = async (problemId, problemTitle) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${problemTitle}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      await axios.delete(`${API}/problems/${problemId}`, {
        withCredentials: true
      });
      toast.success("Problem deleted successfully!");
      fetchProblems();
    } catch (error) {
      console.error("Error deleting problem:", error);
      toast.error("Failed to delete problem");
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    
    if (!csvFile) {
      toast.error("Please select a CSV file");
      return;
    }

    setUploading(true);

    try {
      const text = await csvFile.text();
      
      // Use PapaParse for proper CSV parsing
      const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      });

      console.log("Parsed CSV result:", result);
      console.log("First row data:", result.data[0]);
      console.log("Column headers:", Object.keys(result.data[0] || {}));
      console.log("All rows:", result.data);
      console.log("Total rows parsed:", result.data.length);

      if (result.errors.length > 0) {
        console.error("CSV parsing errors:", result.errors);
      }

      if (result.data.length === 0) {
        toast.error("CSV file is empty");
        setUploading(false);
        return;
      }

      // Filter out empty rows (rows where title or solution_code is missing)
      const validRows = result.data.filter(row => {
        const hasTitle = row.title && row.title.trim() !== '';
        const hasSolution = row.solution_code && row.solution_code.trim() !== '';
        return hasTitle && hasSolution;
      });

      console.log(`Total rows: ${result.data.length}, Valid rows: ${validRows.length}`);

      if (validRows.length === 0) {
        toast.error("No valid rows found. Make sure 'title' and 'solution_code' columns have data.");
        setUploading(false);
        return;
      }

      // Upload
      const response = await axios.post(
        `${API}/problems/bulk-upload`,
        { csv_data: validRows },
        { withCredentials: true }
      );

      if (response.data.created > 0) {
        toast.success(`✅ Successfully uploaded ${response.data.created} problems!`);
      }
      
      if (response.data.errors && response.data.errors.length > 0) {
        toast.error(`⚠️ ${response.data.errors.length} rows had errors. Check console for details.`);
        console.error("Upload errors:", response.data.errors);
        // Show first few errors in alert for easy viewing
        const firstErrors = response.data.errors.slice(0, 3).join('\n');
        alert(`Upload Errors:\n\n${firstErrors}\n\n${response.data.errors.length > 3 ? '...and more. Check console for full list.' : ''}`);
      }

      setBulkUploadDialogOpen(false);
      setCsvFile(null);
      fetchProblems();
    } catch (error) {
      console.error("Error uploading CSV:", error);
      toast.error("Failed to upload CSV");
    } finally {
      setUploading(false);
    }
  };

  // Multi-select handlers
  const toggleProblemSelection = (problemId) => {
    setSelectedProblems(prev => 
      prev.includes(problemId) 
        ? prev.filter(id => id !== problemId)
        : [...prev, problemId]
    );
  };

  const handleCreateAssignment = () => {
    if (selectedProblems.length === 0) {
      toast.error("Please select at least one problem");
      return;
    }
    setAssignmentBuilderOpen(true);
  };

  const toggleChapter = (chapter) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapter)) {
        newSet.delete(chapter);
      } else {
        newSet.add(chapter);
      }
      return newSet;
    });
  };

  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [expandedProblemTypes, setExpandedProblemTypes] = useState(new Set());

  const toggleLesson = (lessonKey) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonKey)) {
        newSet.delete(lessonKey);
      } else {
        newSet.add(lessonKey);
      }
      return newSet;
    });
  };

  const toggleProblemType = (typeKey) => {
    setExpandedProblemTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(typeKey)) {
        newSet.delete(typeKey);
      } else {
        newSet.add(typeKey);
      }
      return newSet;
    });
  };

  const groupProblemsByChapterLessonType = () => {
    const grouped = {};
    filteredProblems.forEach(problem => {
      const chapter = problem.chapter || "Uncategorized";
      const lesson = problem.lesson || "General";
      const problemType = problem.problem_type || "Independent Practice";
      
      if (!grouped[chapter]) {
        grouped[chapter] = {};
      }
      if (!grouped[chapter][lesson]) {
        grouped[chapter][lesson] = {};
      }
      if (!grouped[chapter][lesson][problemType]) {
        grouped[chapter][lesson][problemType] = [];
      }
      grouped[chapter][lesson][problemType].push(problem);
    });
    return grouped;
  };

  const categories = [...new Set(problems.map(p => p.category))].filter(Boolean);
  const chapters = [...new Set(problems.map(p => p.chapter))].filter(Boolean).sort();
  const groupedProblems = groupProblemsByChapterLessonType();

  return (
    <div data-testid="assignment-library" className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button onClick={() => navigate("/teacher/dashboard")} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-7 h-7 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">Assignment Library</span>
            </div>
          </div>
          {user.role === "teacher" && (
            <div className="flex gap-2">
              {!selectionMode ? (
                <>
                  <Button 
                    onClick={() => {
                      setSelectionMode(true);
                      setSelectedProblems([]);
                    }}
                    variant="outline" 
                    className="gap-2 bg-purple-50 border-purple-300 hover:bg-purple-100"
                  >
                    <Plus className="w-5 h-5" />
                    Create Assignment
                  </Button>

                  <Dialog open={bulkUploadDialogOpen} onOpenChange={setBulkUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="bulk-upload-btn" variant="outline" className="gap-2">
                    <Download className="w-5 h-5" />
                    Bulk Upload CSV
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="bulk-upload-dialog">
                  <DialogHeader>
                    <DialogTitle>Bulk Upload from CSV</DialogTitle>
                    <DialogDescription>
                      Upload multiple problems at once using a CSV file
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleBulkUpload} className="space-y-4">
                    <div>
                      <Label>CSV Format Required:</Label>
                      <div className="text-xs text-gray-600 mt-2 p-3 bg-gray-50 rounded font-mono overflow-x-auto">
                        title,description,starter_code,solution_code,expected_output,category,difficulty,csta_standard
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        • Title and solution_code are required<br/>
                        • Multi-line code: Use \n or wrap in quotes with actual line breaks<br/>
                        • Difficulty: Easy, Medium, or Hard<br/>
                        • Example: "Problem 1","Description here","","print('Hello')\nprint('World')","Hello\nWorld","Basics","Easy","3A-AP-16"
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="csvFile">Select CSV File</Label>
                      <Input
                        data-testid="csv-file-input"
                        id="csvFile"
                        type="file"
                        accept=".csv"
                        onChange={(e) => setCsvFile(e.target.files[0])}
                        className="mt-1"
                      />
                    </div>

                    <Button 
                      data-testid="upload-csv-btn" 
                      type="submit" 
                      disabled={uploading || !csvFile}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      {uploading ? "Uploading..." : "Upload CSV"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-to-library-btn" className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                    <Plus className="w-5 h-5" />
                    Add to Library
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="create-library-dialog">
                <DialogHeader>
                  <DialogTitle>Add Problem to Library</DialogTitle>
                  <DialogDescription>
                    Create a reusable problem that you can bundle into assignments
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateProblem} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      data-testid="lib-title-input"
                      id="title"
                      placeholder="e.g., Problem 5: Print Hello World"
                      value={newProblem.title}
                      onChange={(e) => setNewProblem({ ...newProblem, title: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      data-testid="lib-description-input"
                      id="description"
                      placeholder="Instructions for students..."
                      value={newProblem.description}
                      onChange={(e) => setNewProblem({ ...newProblem, description: e.target.value })}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Input
                        data-testid="lib-category-input"
                        id="category"
                        placeholder="e.g., Basics, Loops"
                        value={newProblem.category}
                        onChange={(e) => setNewProblem({ ...newProblem, category: e.target.value })}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="chapter">Chapter (Optional)</Label>
                      <Input
                        data-testid="lib-chapter-input"
                        id="chapter"
                        placeholder="e.g., Chapter 1"
                        value={newProblem.chapter}
                        onChange={(e) => setNewProblem({ ...newProblem, chapter: e.target.value })}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">Organize problems by chapter</p>
                    </div>

                    <div>
                      <Label htmlFor="lesson">Lesson (Optional)</Label>
                      <Input
                        data-testid="lib-lesson-input"
                        id="lesson"
                        placeholder="e.g., Lesson 1"
                        value={newProblem.lesson}
                        onChange={(e) => setNewProblem({ ...newProblem, lesson: e.target.value })}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">Sub-folder under chapter</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select value={newProblem.difficulty} onValueChange={(val) => setNewProblem({ ...newProblem, difficulty: val })}>
                        <SelectTrigger data-testid="lib-difficulty-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Easy">Easy</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="csta">CSTA Standard</Label>
                      <Input
                        data-testid="lib-csta-input"
                        id="csta"
                        placeholder="e.g., 3A-AP-16"
                        value={newProblem.csta_standard}
                        onChange={(e) => setNewProblem({ ...newProblem, csta_standard: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="problemType">Problem Type</Label>
                      <Select value={newProblem.problem_type} onValueChange={(val) => setNewProblem({ ...newProblem, problem_type: val })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Class Practice">Class Practice</SelectItem>
                          <SelectItem value="Paired Programming">Paired Programming</SelectItem>
                          <SelectItem value="Independent Practice">Independent Practice</SelectItem>
                          <SelectItem value="Debugging">Debugging</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="resourcesLink">Resources Link (Optional)</Label>
                      <Input
                        id="resourcesLink"
                        placeholder="https://drive.google.com/..."
                        value={newProblem.resources_link}
                        onChange={(e) => setNewProblem({ ...newProblem, resources_link: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="starterCode">Starter Code (Optional)</Label>
                    <Textarea
                      data-testid="lib-starter-input"
                      id="starterCode"
                      placeholder="# Starter code for students..."
                      value={newProblem.starter_code}
                      onChange={(e) => setNewProblem({ ...newProblem, starter_code: e.target.value })}
                      className="mt-1 font-mono text-sm"
                      rows={5}
                    />
                  </div>

                  <div>
                    <Label htmlFor="solutionCode">Solution Code *</Label>
                    <Textarea
                      data-testid="lib-solution-input"
                      id="solutionCode"
                      placeholder="# Your solution code..."
                      value={newProblem.solution_code}
                      onChange={(e) => setNewProblem({ ...newProblem, solution_code: e.target.value })}
                      className="mt-1 font-mono text-sm"
                      rows={8}
                    />
                  </div>

                  <div>
                    <Label htmlFor="expectedOutput">Expected Output (Optional)</Label>
                    <Textarea
                      data-testid="lib-expected-output-input"
                      id="expectedOutput"
                      placeholder="e.g., 60"
                      value={newProblem.expected_output}
                      onChange={(e) => setNewProblem({ ...newProblem, expected_output: e.target.value })}
                      className="mt-1 font-mono text-sm"
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">What the program should output when run</p>
                  </div>

                  <Button data-testid="lib-submit-btn" type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                    Add to Library
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => {
                      setSelectionMode(false);
                      setSelectedProblems([]);
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateAssignment}
                    disabled={selectedProblems.length === 0}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Create Assignment ({selectedProblems.length} selected)
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  data-testid="search-library"
                  placeholder="Search problems..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48" data-testid="filter-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-40" data-testid="filter-difficulty">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>

            <Select value={chapterFilter} onValueChange={setChapterFilter}>
              <SelectTrigger className="w-40" data-testid="filter-chapter">
                <SelectValue placeholder="All Chapters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chapters</SelectItem>
                {chapters.map((chapter) => (
                  <SelectItem key={chapter} value={chapter}>
                    {chapter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-gray-600">
            Showing {filteredProblems.length} of {problems.length} problems
          </div>
        </div>

        {/* Problem Display - 3-Level Folder View: Chapter > Lesson > Problem Type */}
        {loading ? (
          <div className="text-center py-20 text-gray-600">Loading library...</div>
        ) : filteredProblems.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No problems found</h3>
            <p className="text-gray-500">Try adjusting your filters or add a new problem</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.keys(groupedProblems).sort().map((chapter) => {
              const isChapterExpanded = expandedChapters.has(chapter);
              const lessons = groupedProblems[chapter];
              
              return (
                <div key={chapter} className="border rounded-lg bg-white shadow-sm">
                  {/* Chapter Folder */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleChapter(chapter)}
                  >
                    {isChapterExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                    {isChapterExpanded ? (
                      <FolderOpen className="w-6 h-6 text-blue-500" />
                    ) : (
                      <Folder className="w-6 h-6 text-blue-500" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">{chapter}</h3>
                    <span className="ml-auto text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {Object.keys(lessons).length} lesson{Object.keys(lessons).length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Lessons in Chapter */}
                  {isChapterExpanded && (
                    <div className="pl-8 pr-4 pb-4 space-y-3">
                      {Object.keys(lessons).sort().map((lesson) => {
                        const lessonKey = `${chapter}-${lesson}`;
                        const isLessonExpanded = expandedLessons.has(lessonKey);
                        const problemTypes = lessons[lesson];
                        
                        return (
                          <div key={lessonKey} className="border rounded-lg bg-gray-50">
                            {/* Lesson Folder */}
                            <div
                              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 transition-colors rounded-lg"
                              onClick={() => toggleLesson(lessonKey)}
                            >
                              {isLessonExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                              )}
                              {isLessonExpanded ? (
                                <FolderOpen className="w-5 h-5 text-teal-500" />
                              ) : (
                                <Folder className="w-5 h-5 text-teal-500" />
                              )}
                              <h4 className="text-md font-medium text-gray-800">{lesson}</h4>
                              <span className="ml-auto text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                                {Object.keys(problemTypes).length} type{Object.keys(problemTypes).length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            {/* Problem Types in Lesson */}
                            {isLessonExpanded && (
                              <div className="pl-6 pr-3 pb-3 pt-0 space-y-3">
                                {Object.keys(problemTypes).sort().map((problemType) => {
                                  const typeKey = `${chapter}-${lesson}-${problemType}`;
                                  const isTypeExpanded = expandedProblemTypes.has(typeKey);
                                  const problems = problemTypes[problemType];
                                  
                                  return (
                                    <div key={typeKey} className="border rounded-lg bg-white">
                                      {/* Problem Type Folder */}
                                      <div
                                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg"
                                        onClick={() => toggleProblemType(typeKey)}
                                      >
                                        {isTypeExpanded ? (
                                          <ChevronDown className="w-4 h-4 text-gray-600" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 text-gray-600" />
                                        )}
                                        {isTypeExpanded ? (
                                          <FolderOpen className="w-5 h-5 text-purple-500" />
                                        ) : (
                                          <Folder className="w-5 h-5 text-purple-500" />
                                        )}
                                        <h5 className="text-sm font-medium text-gray-700">{problemType}</h5>
                                        <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                          {problems.length} problem{problems.length !== 1 ? 's' : ''}
                                        </span>
                                      </div>

                                      {/* Problems */}
                                      {isTypeExpanded && (
                                        <div className="p-3 pt-0 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                          {problems.map((problem) => (
                                            <Card
                                              key={problem.id}
                                              data-testid={`library-card-${problem.id}`}
                                              className={`hover:shadow-lg transition-all border-2 ${
                                                selectionMode && selectedProblems.includes(problem.id)
                                                  ? 'border-purple-500 bg-purple-50'
                                                  : 'border-gray-100'
                                              } ${selectionMode ? 'cursor-pointer' : ''}`}
                                              onClick={() => selectionMode && toggleProblemSelection(problem.id)}
                                            >
                                              <CardHeader>
                                                <div className="flex justify-between items-start mb-2">
                                                  <div className="flex items-center gap-2">
                                                    {selectionMode && (
                                                      <Checkbox
                                                        checked={selectedProblems.includes(problem.id)}
                                                        onCheckedChange={() => toggleProblemSelection(problem.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                      />
                                                    )}
                                                    <div className={`px-2 py-1 rounded text-xs font-semibold ${
                                                      problem.difficulty === "Easy" ? "bg-green-100 text-green-700" :
                                                      problem.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700" :
                                                      "bg-red-100 text-red-700"
                                                    }`}>
                                                      {problem.difficulty}
                                                    </div>
                                                  </div>
                                                  <div className="text-xs text-gray-500">
                                                    <Download className="w-3 h-3 inline mr-1" />
                                                    {problem.times_imported || 0}
                                                  </div>
                                                </div>
                                                <CardTitle className="text-lg">{problem.title}</CardTitle>
                                                <CardDescription className="line-clamp-2">{problem.description}</CardDescription>
                                              </CardHeader>
                                              <CardContent className="space-y-2">
                                                <div className="flex flex-wrap gap-2">
                                                  {problem.chapter && (
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                                      📚 {problem.chapter}
                                                    </span>
                                                  )}
                                                  {problem.lesson && (
                                                    <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs font-medium">
                                                      📖 {problem.lesson}
                                                    </span>
                                                  )}
                                                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                                                    {problem.category}
                                                  </span>
                                                  {problem.csta_standard && (
                                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                                      {problem.csta_standard}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="text-xs text-gray-500 pt-2">
                                                  By {problem.creator_name}
                                                </div>
                                                {!selectionMode && (
                                                  <div className="space-y-2 mt-3">
                                                    <div className="flex gap-2">
                                                      <Button
                                                        data-testid={`edit-${problem.id}`}
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setEditingProblem(problem);
                                                          setEditDialogOpen(true);
                                                        }}
                                                        variant="outline"
                                                        className="flex-1"
                                                        size="sm"
                                                      >
                                                        <Edit className="w-4 h-4 mr-1" />
                                                        Edit
                                                      </Button>
                                                      <Button
                                                        data-testid={`practice-${problem.id}`}
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          navigate(`/teacher-practice/${problem.id}`);
                                                        }}
                                                        variant="outline"
                                                        className="flex-1 bg-green-50 border-green-300 hover:bg-green-100"
                                                        size="sm"
                                                      >
                                                        <Code2 className="w-4 h-4 mr-1" />
                                                        Practice
                                                      </Button>
                                                    </div>
                                                    <Button
                                                      data-testid={`import-${problem.id}`}
                                                      onClick={() => navigate(`/library/import/${problem.id}`)}
                                                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                                                      size="sm"
                                                    >
                                                      Import to Classroom
                                                    </Button>
                                                  </div>
                                                )}
                                              </CardContent>
                                            </Card>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Problem Dialog */}
        {editingProblem && (
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Problem</DialogTitle>
                <DialogDescription>
                  Update the problem details
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditProblem} className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input
                    id="edit-title"
                    placeholder="e.g., Problem 5: Print Hello World"
                    value={editingProblem.title}
                    onChange={(e) => setEditingProblem({ ...editingProblem, title: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">Description *</Label>
                  <Textarea
                    id="edit-description"
                    placeholder="Instructions for students..."
                    value={editingProblem.description}
                    onChange={(e) => setEditingProblem({ ...editingProblem, description: e.target.value })}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-category">Category *</Label>
                    <Input
                      id="edit-category"
                      placeholder="e.g., Basics, Loops"
                      value={editingProblem.category}
                      onChange={(e) => setEditingProblem({ ...editingProblem, category: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-chapter">Chapter (Optional)</Label>
                    <Input
                      id="edit-chapter"
                      placeholder="e.g., Chapter 1"
                      value={editingProblem.chapter || ""}
                      onChange={(e) => setEditingProblem({ ...editingProblem, chapter: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-lesson">Lesson (Optional)</Label>
                    <Input
                      id="edit-lesson"
                      placeholder="e.g., Lesson 1"
                      value={editingProblem.lesson || ""}
                      onChange={(e) => setEditingProblem({ ...editingProblem, lesson: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-difficulty">Difficulty</Label>
                    <Select value={editingProblem.difficulty} onValueChange={(val) => setEditingProblem({ ...editingProblem, difficulty: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-csta">CSTA Standard</Label>
                    <Input
                      id="edit-csta"
                      placeholder="e.g., 3A-AP-16"
                      value={editingProblem.csta_standard}
                      onChange={(e) => setEditingProblem({ ...editingProblem, csta_standard: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-problemType">Problem Type</Label>
                    <Select value={editingProblem.problem_type} onValueChange={(val) => setEditingProblem({ ...editingProblem, problem_type: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Class Practice">Class Practice</SelectItem>
                        <SelectItem value="Paired Programming">Paired Programming</SelectItem>
                        <SelectItem value="Independent Practice">Independent Practice</SelectItem>
                        <SelectItem value="Debugging">Debugging</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-resourcesLink">Resources Link (Optional)</Label>
                  <Input
                    id="edit-resourcesLink"
                    placeholder="https://drive.google.com/..."
                    value={editingProblem.resources_link}
                    onChange={(e) => setEditingProblem({ ...editingProblem, resources_link: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-starterCode">Starter Code (Optional)</Label>
                  <Textarea
                    id="edit-starterCode"
                    placeholder="# Starter code for students..."
                    value={editingProblem.starter_code}
                    onChange={(e) => setEditingProblem({ ...editingProblem, starter_code: e.target.value })}
                    className="mt-1 font-mono text-sm"
                    rows={5}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-solutionCode">Solution Code *</Label>
                  <Textarea
                    id="edit-solutionCode"
                    placeholder="# Your solution code..."
                    value={editingProblem.solution_code}
                    onChange={(e) => setEditingProblem({ ...editingProblem, solution_code: e.target.value })}
                    className="mt-1 font-mono text-sm"
                    rows={8}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-expectedOutput">Expected Output (Optional)</Label>
                  <Textarea
                    id="edit-expectedOutput"
                    placeholder="e.g., 60"
                    value={editingProblem.expected_output}
                    onChange={(e) => setEditingProblem({ ...editingProblem, expected_output: e.target.value })}
                    className="mt-1 font-mono text-sm"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">What the program should output when run</p>
                </div>

                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                  Update Problem
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Assignment Builder Dialog */}
        <AssignmentBuilder
          open={assignmentBuilderOpen}
          onOpenChange={setAssignmentBuilderOpen}
          selectedProblems={selectedProblems}
          problems={problems}
          onSuccess={() => {
            setAssignmentBuilderOpen(false);
            setSelectionMode(false);
            setSelectedProblems([]);
            toast.success("Assignment created successfully!");
            navigate(-1);
          }}
        />
      </main>
    </div>
  );
}

// Assignment Builder Component
function AssignmentBuilder({ open, onOpenChange, selectedProblems, problems, onSuccess }) {
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassrooms, setSelectedClassrooms] = useState([]);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [chapter, setChapter] = useState("");
  const [lesson, setLesson] = useState("");
  const [availableDate, setAvailableDate] = useState("");
  const [availableTime, setAvailableTime] = useState("00:00");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("23:59");
  const [allowLate, setAllowLate] = useState(true);
  const [latePenalty, setLatePenalty] = useState(0);
  const [completionBonusXp, setCompletionBonusXp] = useState(100);
  const [completionBonusCoins, setCompletionBonusCoins] = useState(50);
  const [creating, setCreating] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API = `${BACKEND_URL}/api`;

  useEffect(() => {
    if (open) {
      fetchClassrooms();
    }
  }, [open]);

  const fetchClassrooms = async () => {
    try {
      const response = await axios.get(`${API}/classrooms`, {
        withCredentials: true,
      });
      setClassrooms(response.data);
    } catch (error) {
      console.error("Error fetching classrooms:", error);
    }
  };

  const toggleClassroom = (classroomId) => {
    setSelectedClassrooms(prev =>
      prev.includes(classroomId)
        ? prev.filter(id => id !== classroomId)
        : [...prev, classroomId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!assignmentTitle.trim()) {
      toast.error("Please enter an assignment title");
      return;
    }

    if (selectedClassrooms.length === 0) {
      toast.error("Please select at least one classroom");
      return;
    }

    if (availableDate && dueDate) {
      const availableDateTime = new Date(`${availableDate}T${availableTime}`);
      const dueDateTime = new Date(`${dueDate}T${dueTime}`);

      if (dueDateTime <= availableDateTime) {
        toast.error("Due date must be after available date");
        return;
      }
    }

    setCreating(true);

    try {
      const availableDateTime = availableDate && availableTime
        ? `${availableDate}T${availableTime}:00Z`
        : null;

      const dueDateTime = dueDate && dueTime
        ? `${dueDate}T${dueTime}:00Z`
        : null;

      await axios.post(
        `${API}/assignments`,
        {
          title: assignmentTitle,
          description: assignmentDescription,
          chapter: chapter,
          lesson: lesson,
          problem_ids: selectedProblems,
          classroom_ids: selectedClassrooms,
          available_date: availableDateTime,
          due_date: dueDateTime,
          allow_late_submission: allowLate,
          late_penalty_percent: parseInt(latePenalty),
          completion_bonus_xp: parseInt(completionBonusXp),
          completion_bonus_coins: parseInt(completionBonusCoins)
        },
        { withCredentials: true }
      );

      onSuccess();
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast.error(error.response?.data?.detail || "Failed to create assignment");
    } finally {
      setCreating(false);
    }
  };

  const selectedProblemsList = problems.filter(p => selectedProblems.includes(p.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Assignment Bundle</DialogTitle>
          <DialogDescription>
            Bundle {selectedProblems.length} problem(s) into a single assignment with unified scheduling
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selected Problems Preview */}
          <div>
            <Label>Selected Problems ({selectedProblems.length})</Label>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto p-3 bg-gray-50 rounded-lg border">
              {selectedProblemsList.map((problem, index) => (
                <div key={problem.id} className="text-sm flex items-center gap-2">
                  <span className="font-semibold text-gray-600">{index + 1}.</span>
                  <span>{problem.title}</span>
                  <span className="text-xs text-gray-500">({problem.difficulty})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Assignment Details */}
          <div>
            <Label htmlFor="assignmentTitle">Assignment Title *</Label>
            <Input
              id="assignmentTitle"
              placeholder="e.g., Week 1 - Variables & Loops"
              value={assignmentTitle}
              onChange={(e) => setAssignmentTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="assignmentDescription">Description</Label>
            <Textarea
              id="assignmentDescription"
              placeholder="Complete all problems to master the basics..."
              value={assignmentDescription}
              onChange={(e) => setAssignmentDescription(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="chapter">Chapter</Label>
              <Input
                id="chapter"
                placeholder="e.g., Chapter 1"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">For organizing student assignments</p>
            </div>
            <div>
              <Label htmlFor="lesson">Lesson</Label>
              <Input
                id="lesson"
                placeholder="e.g., Lesson 1"
                value={lesson}
                onChange={(e) => setLesson(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Sub-folder under chapter</p>
            </div>
          </div>

          {/* Classroom Selection */}
          <div>
            <Label>Assign to Classrooms *</Label>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto p-3 bg-gray-50 rounded-lg border">
              {classrooms.map((classroom) => (
                <div key={classroom.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`classroom-${classroom.id}`}
                    checked={selectedClassrooms.includes(classroom.id)}
                    onCheckedChange={() => toggleClassroom(classroom.id)}
                  />
                  <label
                    htmlFor={`classroom-${classroom.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {classroom.name} ({classroom.class_code})
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Scheduling */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="availableDate">Available Date</Label>
              <Input
                id="availableDate"
                type="date"
                value={availableDate}
                onChange={(e) => setAvailableDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="availableTime">Available Time</Label>
              <Input
                id="availableTime"
                type="time"
                value={availableTime}
                onChange={(e) => setAvailableTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dueTime">Due Time</Label>
              <Input
                id="dueTime"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Late Submission */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowLate"
                checked={allowLate}
                onCheckedChange={setAllowLate}
              />
              <label htmlFor="allowLate" className="text-sm font-medium cursor-pointer">
                Allow late submissions
              </label>
            </div>
            {allowLate && (
              <div>
                <Label htmlFor="latePenalty">Late Penalty (%)</Label>
                <Input
                  id="latePenalty"
                  type="number"
                  min="0"
                  max="100"
                  value={latePenalty}
                  onChange={(e) => setLatePenalty(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          {/* Completion Bonuses */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bonusXp">Completion Bonus XP</Label>
              <Input
                id="bonusXp"
                type="number"
                min="0"
                value={completionBonusXp}
                onChange={(e) => setCompletionBonusXp(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Bonus for completing all problems</p>
            </div>
            <div>
              <Label htmlFor="bonusCoins">Completion Bonus Coins</Label>
              <Input
                id="bonusCoins"
                type="number"
                min="0"
                value={completionBonusCoins}
                onChange={(e) => setCompletionBonusCoins(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Bonus coins for completing all</p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={creating}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {creating ? "Creating..." : "Create Assignment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
