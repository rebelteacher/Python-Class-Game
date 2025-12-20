import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Code2, Clock, Calendar } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CodingTestCreate({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [problems, setProblems] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    chapter: "",
    lesson: "",
    problem_id: "",
    time_limit_minutes: 0,
    classroom_ids: [],
    available_date: "",
    due_date: ""
  });

  useEffect(() => {
    fetchProblems();
    fetchClassrooms();
  }, []);

  const fetchProblems = async () => {
    try {
      const response = await axios.get(`${API}/problems`, {
        withCredentials: true
      });
      setProblems(response.data);
    } catch (error) {
      console.error("Error fetching problems:", error);
      toast.error("Failed to load problems");
    }
  };

  const fetchClassrooms = async () => {
    try {
      const response = await axios.get(`${API}/classrooms`, {
        withCredentials: true
      });
      setClassrooms(response.data);
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      toast.error("Failed to load classrooms");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.problem_id) {
      toast.error("Please select a problem from the library");
      return;
    }
    
    if (formData.classroom_ids.length === 0) {
      toast.error("Please select at least one classroom");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/coding-tests`, formData, {
        withCredentials: true
      });
      
      toast.success("Coding test created successfully!");
      navigate("/teacher/dashboard");
    } catch (error) {
      console.error("Error creating test:", error);
      toast.error(error.response?.data?.detail || "Failed to create test");
    } finally {
      setLoading(false);
    }
  };

  const toggleClassroom = (classroomId) => {
    setFormData(prev => ({
      ...prev,
      classroom_ids: prev.classroom_ids.includes(classroomId)
        ? prev.classroom_ids.filter(id => id !== classroomId)
        : [...prev.classroom_ids, classroomId]
    }));
  };

  const selectedProblem = problems.find(p => p.id === formData.problem_id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate("/teacher/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Code2 className="w-6 h-6 text-indigo-600" />
              Create Coding Test
            </CardTitle>
            <CardDescription>
              Select a problem from your library and configure test settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Test Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Week 1 Coding Assessment"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the test..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="chapter">Chapter</Label>
                    <Input
                      id="chapter"
                      value={formData.chapter}
                      onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                      placeholder="e.g., Chapter 1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lesson">Lesson</Label>
                    <Input
                      id="lesson"
                      value={formData.lesson}
                      onChange={(e) => setFormData({ ...formData, lesson: e.target.value })}
                      placeholder="e.g., Lesson 2"
                    />
                  </div>
                </div>
              </div>

              {/* Problem Selection */}
              <div>
                <Label htmlFor="problem">Select Problem from Library *</Label>
                <Select
                  value={formData.problem_id}
                  onValueChange={(value) => setFormData({ ...formData, problem_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a problem..." />
                  </SelectTrigger>
                  <SelectContent>
                    {problems.map((problem) => (
                      <SelectItem key={problem.id} value={problem.id}>
                        {problem.title} ({problem.difficulty})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProblem && (
                  <p className="mt-2 text-sm text-gray-600">
                    {selectedProblem.description}
                  </p>
                )}
              </div>

              {/* Time Limit */}
              <div>
                <Label htmlFor="time_limit" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Time Limit (minutes)
                </Label>
                <Input
                  id="time_limit"
                  type="number"
                  min="0"
                  value={formData.time_limit_minutes}
                  onChange={(e) => setFormData({ ...formData, time_limit_minutes: parseInt(e.target.value) || 0 })}
                  placeholder="0 = no time limit"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Set to 0 for unlimited time
                </p>
              </div>

              {/* Classroom Selection */}
              <div>
                <Label>Assign to Classrooms *</Label>
                <div className="mt-2 space-y-2">
                  {classrooms.map((classroom) => (
                    <label
                      key={classroom.id}
                      className="flex items-center gap-2 p-3 border rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.classroom_ids.includes(classroom.id)}
                        onChange={() => toggleClassroom(classroom.id)}
                        className="w-4 h-4"
                      />
                      <span>{classroom.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="available_date" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Available Date
                  </Label>
                  <Input
                    id="available_date"
                    type="datetime-local"
                    value={formData.available_date}
                    onChange={(e) => setFormData({ ...formData, available_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="due_date" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Due Date
                  </Label>
                  <Input
                    id="due_date"
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/teacher")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  {loading ? "Creating..." : "Create Coding Test"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
