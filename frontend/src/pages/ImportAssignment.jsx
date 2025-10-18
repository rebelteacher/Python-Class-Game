import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Calendar, Clock, Download } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ImportAssignment({ user }) {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassrooms, setSelectedClassrooms] = useState([]);
  const [availableDate, setAvailableDate] = useState("");
  const [availableTime, setAvailableTime] = useState("00:00");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("23:59");
  const [allowLate, setAllowLate] = useState(true);
  const [latePenalty, setLatePenalty] = useState(0);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchAssignment();
    fetchClassrooms();
  }, [assignmentId]);

  const fetchAssignment = async () => {
    try {
      const response = await axios.get(`${API}/library/assignments`, {
        withCredentials: true,
      });
      const found = response.data.find(a => a.id === assignmentId);
      setAssignment(found);
    } catch (error) {
      console.error("Error fetching assignment:", error);
      toast.error("Failed to load assignment");
    } finally {
      setLoading(false);
    }
  };

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

  const handleImport = async () => {
    if (selectedClassrooms.length === 0) {
      toast.error("Please select at least one classroom");
      return;
    }

    setImporting(true);

    try {
      // Combine date and time into ISO format
      const availableDateTime = availableDate && availableTime
        ? `${availableDate}T${availableTime}:00Z`
        : null;
      
      const dueDateTime = dueDate && dueTime
        ? `${dueDate}T${dueTime}:00Z`
        : null;

      await axios.post(
        `${API}/library/assignments/import`,
        {
          library_assignment_id: assignmentId,
          classroom_ids: selectedClassrooms,
          available_date: availableDateTime,
          due_date: dueDateTime,
          allow_late_submission: allowLate,
          late_penalty_percent: latePenalty
        },
        { withCredentials: true }
      );

      toast.success(`Assignment imported to ${selectedClassrooms.length} classroom(s)!`);
      navigate(-1);
    } catch (error) {
      console.error("Error importing assignment:", error);
      toast.error(error.response?.data?.detail || "Failed to import assignment");
    } finally {
      setImporting(false);
    }
  };

  if (loading || !assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div data-testid="import-assignment-page" className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex items-center space-x-4">
          <Button onClick={() => navigate(-1)} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center space-x-2">
            <Download className="w-7 h-7 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">Import Assignment</span>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Assignment Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Title</div>
                <div className="font-semibold">{assignment.title}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Description</div>
                <div className="text-sm">{assignment.description}</div>
              </div>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  assignment.difficulty === "Easy" ? "bg-green-100 text-green-700" :
                  assignment.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {assignment.difficulty}
                </span>
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">
                  {assignment.category}
                </span>
                {assignment.csta_standard && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                    {assignment.csta_standard}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right: Import Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Import Settings</CardTitle>
              <CardDescription>Configure scheduling and late submission policy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Available Date */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" />
                  Available Date (Optional)
                </Label>
                <div className="text-xs text-gray-500 mb-2">Students can't access before this date/time</div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    data-testid="available-date"
                    type="date"
                    value={availableDate}
                    onChange={(e) => setAvailableDate(e.target.value)}
                  />
                  <Input
                    data-testid="available-time"
                    type="time"
                    value={availableTime}
                    onChange={(e) => setAvailableTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" />
                  Due Date (Optional)
                </Label>
                <div className="text-xs text-gray-500 mb-2">Submission deadline</div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    data-testid="due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                  <Input
                    data-testid="due-time"
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Late Submission */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label>Allow Late Submissions</Label>
                  <Switch
                    data-testid="allow-late-switch"
                    checked={allowLate}
                    onCheckedChange={setAllowLate}
                  />
                </div>
                {allowLate && (
                  <div>
                    <Label className="text-sm">Late Penalty (%)</Label>
                    <Input
                      data-testid="late-penalty-input"
                      type="number"
                      min="0"
                      max="100"
                      value={latePenalty}
                      onChange={(e) => setLatePenalty(Number(e.target.value))}
                      className="mt-1"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Deduct {latePenalty}% from score for late submissions
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Classroom Selection */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Select Classrooms</CardTitle>
            <CardDescription>Import this assignment to one or more classrooms</CardDescription>
          </CardHeader>
          <CardContent>
            {classrooms.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No classrooms found. Create a classroom first.
              </div>
            ) : (
              <div className="space-y-3">
                {classrooms.map((classroom) => (
                  <div
                    key={classroom.id}
                    data-testid={`classroom-checkbox-${classroom.id}`}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleClassroom(classroom.id)}
                  >
                    <Checkbox
                      checked={selectedClassrooms.includes(classroom.id)}
                      onCheckedChange={() => toggleClassroom(classroom.id)}
                    />
                    <div className="flex-1">
                      <div className="font-semibold">{classroom.name}</div>
                      <div className="text-sm text-gray-600">
                        Code: {classroom.class_code} • {classroom.students?.length || 0} students
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import Button */}
        <div className="mt-6">
          <Button
            data-testid="import-submit-btn"
            onClick={handleImport}
            disabled={importing || selectedClassrooms.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700 py-6 text-lg"
          >
            {importing
              ? "Importing..."
              : `Import to ${selectedClassrooms.length} Classroom${selectedClassrooms.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </main>
    </div>
  );
}
