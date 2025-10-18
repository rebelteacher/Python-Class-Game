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
import { BookOpen, Plus, Search, Filter, Code2, ArrowLeft, Download } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AssignmentLibrary({ user }) {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    starter_code: "",
    solution_code: "",
    category: "",
    difficulty: "Easy",
    csta_standard: ""
  });

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    filterAssignments();
  }, [searchTerm, categoryFilter, difficultyFilter, assignments]);

  const fetchAssignments = async () => {
    try {
      const response = await axios.get(`${API}/library/assignments`, {
        withCredentials: true,
      });
      setAssignments(response.data);
      setFilteredAssignments(response.data);
    } catch (error) {
      console.error("Error fetching library:", error);
      toast.error("Failed to load assignment library");
    } finally {
      setLoading(false);
    }
  };

  const filterAssignments = () => {
    let filtered = [...assignments];

    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(a => a.category === categoryFilter);
    }

    if (difficultyFilter) {
      filtered = filtered.filter(a => a.difficulty === difficultyFilter);
    }

    setFilteredAssignments(filtered);
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    
    if (!newAssignment.title.trim() || !newAssignment.solution_code.trim()) {
      toast.error("Please fill in title and solution code");
      return;
    }

    try {
      await axios.post(
        `${API}/library/assignments`,
        newAssignment,
        { withCredentials: true }
      );
      toast.success("Assignment added to library!");
      setCreateDialogOpen(false);
      setNewAssignment({
        title: "",
        description: "",
        starter_code: "",
        solution_code: "",
        category: "",
        difficulty: "Easy",
        csta_standard: ""
      });
      fetchAssignments();
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast.error("Failed to create assignment");
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
        transformHeader: (header) => header.trim().toLowerCase()
      });

      if (result.errors.length > 0) {
        console.error("CSV parsing errors:", result.errors);
      }

      if (result.data.length === 0) {
        toast.error("CSV file is empty");
        setUploading(false);
        return;
      }

      // Upload
      const response = await axios.post(
        `${API}/library/assignments/bulk-upload`,
        { csv_data: result.data },
        { withCredentials: true }
      );

      toast.success(`✅ Uploaded ${response.data.created} assignments!`);
      
      if (response.data.errors.length > 0) {
        toast.error(`${response.data.errors.length} rows had errors. Check console for details.`);
        console.log("Upload errors:", response.data.errors);
      }

      setBulkUploadDialogOpen(false);
      setCsvFile(null);
      fetchAssignments();
    } catch (error) {
      console.error("Error uploading CSV:", error);
      toast.error("Failed to upload CSV");
    } finally {
      setUploading(false);
    }
  };

  const categories = [...new Set(assignments.map(a => a.category))].filter(Boolean);

  return (
    <div data-testid="assignment-library" className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button onClick={() => navigate(-1)} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-7 h-7 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">Assignment Library</span>
            </div>
          </div>
          {user.role === "teacher" && (
            <div className="flex gap-2">
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
                      Upload multiple assignments at once using a CSV file
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleBulkUpload} className="space-y-4">
                    <div>
                      <Label>CSV Format Required:</Label>
                      <div className="text-xs text-gray-600 mt-2 p-3 bg-gray-50 rounded font-mono">
                        title,description,starter_code,solution_code,category,difficulty,csta_standard
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        • Title and solution_code are required<br/>
                        • Use quotes for multi-line code: "print('hello')"<br/>
                        • Difficulty: Easy, Medium, or Hard
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
                  <DialogTitle>Add Assignment to Library</DialogTitle>
                  <DialogDescription>
                    Create a reusable assignment that you or other teachers can import
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAssignment} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      data-testid="lib-title-input"
                      id="title"
                      placeholder="e.g., Problem 5: Print Hello World"
                      value={newAssignment.title}
                      onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      data-testid="lib-description-input"
                      id="description"
                      placeholder="Instructions for students..."
                      value={newAssignment.description}
                      onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Input
                        data-testid="lib-category-input"
                        id="category"
                        placeholder="e.g., Basics, Loops"
                        value={newAssignment.category}
                        onChange={(e) => setNewAssignment({ ...newAssignment, category: e.target.value })}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select value={newAssignment.difficulty} onValueChange={(val) => setNewAssignment({ ...newAssignment, difficulty: val })}>
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
                        value={newAssignment.csta_standard}
                        onChange={(e) => setNewAssignment({ ...newAssignment, csta_standard: e.target.value })}
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
                      value={newAssignment.starter_code}
                      onChange={(e) => setNewAssignment({ ...newAssignment, starter_code: e.target.value })}
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
                      value={newAssignment.solution_code}
                      onChange={(e) => setNewAssignment({ ...newAssignment, solution_code: e.target.value })}
                      className="mt-1 font-mono text-sm"
                      rows={8}
                    />
                  </div>

                  <Button data-testid="lib-submit-btn" type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                    Add to Library
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
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
                  placeholder="Search assignments..."
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
          </div>

          <div className="text-sm text-gray-600">
            Showing {filteredAssignments.length} of {assignments.length} assignments
          </div>
        </div>

        {/* Assignment Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-600">Loading library...</div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No assignments found</h3>
            <p className="text-gray-500">Try adjusting your filters or add a new assignment</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssignments.map((assignment) => (
              <Card
                key={assignment.id}
                data-testid={`library-card-${assignment.id}`}
                className="hover:shadow-lg transition-shadow border-2 border-gray-100"
              >
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${
                      assignment.difficulty === "Easy" ? "bg-green-100 text-green-700" :
                      assignment.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {assignment.difficulty}
                    </div>
                    <div className="text-xs text-gray-500">
                      <Download className="w-3 h-3 inline mr-1" />
                      {assignment.times_imported || 0}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{assignment.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{assignment.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                      {assignment.category}
                    </span>
                    {assignment.csta_standard && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        {assignment.csta_standard}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 pt-2">
                    By {assignment.creator_name}
                  </div>
                  <Button
                    data-testid={`import-${assignment.id}`}
                    onClick={() => navigate(`/library/import/${assignment.id}`)}
                    className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700"
                    size="sm"
                  >
                    Import to Classroom
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
