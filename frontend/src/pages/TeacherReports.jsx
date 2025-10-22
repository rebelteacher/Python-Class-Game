import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Download, FileSpreadsheet, AlertCircle, User } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function TeacherReports({ user }) {
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassrooms, setSelectedClassrooms] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignments, setSelectedAssignments] = useState([]);
  const [reportType, setReportType] = useState("grades"); // "grades" or "missing"
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    if (selectedClassrooms.length > 0) {
      fetchAssignments();
    } else {
      setAssignments([]);
      setSelectedAssignments([]);
    }
  }, [selectedClassrooms]);

  const fetchClassrooms = async () => {
    try {
      const response = await axios.get(`${API}/classrooms`, {
        withCredentials: true,
      });
      setClassrooms(response.data);
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      toast.error("Failed to load classrooms");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      // Fetch assignments from all selected classrooms
      const allAssignments = [];
      const assignmentIds = new Set();
      
      for (const classroomId of selectedClassrooms) {
        const response = await axios.get(`${API}/assignments/classroom/${classroomId}`, {
          withCredentials: true,
        });
        
        // Deduplicate assignments that appear in multiple classrooms
        response.data.forEach(assignment => {
          if (!assignmentIds.has(assignment.id)) {
            assignmentIds.add(assignment.id);
            allAssignments.push(assignment);
          }
        });
      }
      
      setAssignments(allAssignments);
      setSelectedAssignments([]); // Reset selection
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error("Failed to load assignments");
    }
  };

  const toggleClassroom = (classroomId) => {
    setSelectedClassrooms(prev =>
      prev.includes(classroomId)
        ? prev.filter(id => id !== classroomId)
        : [...prev, classroomId]
    );
  };

  const selectAllClassrooms = () => {
    setSelectedClassrooms(classrooms.map(c => c.id));
  };

  const deselectAllClassrooms = () => {
    setSelectedClassrooms([]);
  };

  const toggleAssignment = (assignmentId) => {
    setSelectedAssignments(prev =>
      prev.includes(assignmentId)
        ? prev.filter(id => id !== assignmentId)
        : [...prev, assignmentId]
    );
  };

  const selectAllAssignments = () => {
    setSelectedAssignments(assignments.map(a => a.id));
  };

  const deselectAllAssignments = () => {
    setSelectedAssignments([]);
  };

  const generateReport = async () => {
    if (selectedClassrooms.length === 0) {
      toast.error("Please select at least one classroom");
      return;
    }

    if (reportType === "grades" && selectedAssignments.length === 0) {
      toast.error("Please select at least one assignment");
      return;
    }

    setGenerating(true);
    setReportData(null);

    try {
      const endpoint = reportType === "grades" ? "/reports/gradebook" : "/reports/missing";
      const payload = {
        classroom_ids: selectedClassrooms,
        ...(reportType === "grades" && { assignment_ids: selectedAssignments })
      };

      const response = await axios.post(
        `${API}${endpoint}`,
        payload,
        { withCredentials: true }
      );

      setReportData(response.data);
      toast.success("Report generated! Click Download to save as Excel.");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error(error.response?.data?.detail || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const downloadExcel = () => {
    if (!reportData) return;

    if (reportType === "grades") {
      downloadGradebookExcel();
    } else {
      downloadMissingExcel();
    }
  };

  const downloadGradebookExcel = () => {
    // Create gradebook-style spreadsheet
    const worksheetData = [];
    
    // Header row: "Student Name" | Assignment 1 | Assignment 2 | ...
    const headerRow = ["Student Name"];
    reportData.assignments.forEach(assignment => {
      headerRow.push(assignment.title);
    });
    worksheetData.push(headerRow);

    // Data rows: each student with their scores
    reportData.students.forEach(student => {
      const row = [student.student_name];
      
      reportData.assignments.forEach(assignment => {
        const scoreData = student.scores[assignment.id];
        if (scoreData) {
          row.push(scoreData.average_score);
        } else {
          row.push(0);
        }
      });
      
      worksheetData.push(row);
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    const colWidths = [{ wch: 25 }]; // Student name column
    reportData.assignments.forEach(() => colWidths.push({ wch: 15 }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Gradebook");

    // Download
    const fileName = `Gradebook_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Excel file downloaded!");
  };

  const downloadMissingExcel = () => {
    // Create missing/incomplete assignments report
    const worksheetData = [];
    
    // Header
    worksheetData.push(["Missing & Incomplete Assignments Report"]);
    worksheetData.push([`Generated: ${new Date().toLocaleString()}`]);
    worksheetData.push([]);

    reportData.students.forEach(student => {
      worksheetData.push([student.student_name, student.student_email]);
      worksheetData.push([]);

      if (student.missing_assignments.length > 0) {
        worksheetData.push(["Missing Assignments (Not Started):"]);
        student.missing_assignments.forEach(assignment => {
          worksheetData.push(["", assignment.assignment_title, `${assignment.total_problems} problems`]);
        });
        worksheetData.push([]);
      }

      if (student.incomplete_assignments.length > 0) {
        worksheetData.push(["Incomplete Assignments:"]);
        student.incomplete_assignments.forEach(assignment => {
          worksheetData.push(["", assignment.assignment_title, `${assignment.completed_problems}/${assignment.total_problems} completed`]);
        });
        worksheetData.push([]);
      }

      worksheetData.push([]);
      worksheetData.push(["---"]);
      worksheetData.push([]);
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    ws['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, ws, "Missing Report");

    // Download
    const fileName = `Missing_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Excel file downloaded!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button onClick={() => navigate("/teacher/dashboard")} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-7 h-7 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">Student Reports</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Generate Student Reports</CardTitle>
            <CardDescription>
              Export grade reports or missing assignment lists for parent conferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Report Type Selection */}
            <div>
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grades">Grade Report (by assignment)</SelectItem>
                  <SelectItem value="missing">Missing & Incomplete Assignments</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Classroom Selection */}
            <div>
              <Label>Classroom *</Label>
              <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a classroom" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map((classroom) => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignment Selection (only for grades report) */}
            {reportType === "grades" && selectedClassroom && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Select Assignments *</Label>
                  <div className="flex gap-2">
                    <Button onClick={selectAllAssignments} variant="outline" size="sm">
                      Select All
                    </Button>
                    <Button onClick={deselectAllAssignments} variant="outline" size="sm">
                      Clear All
                    </Button>
                  </div>
                </div>
                <div className="border rounded-lg p-4 max-h-80 overflow-y-auto space-y-2">
                  {assignments.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No assignments found in this classroom
                    </p>
                  ) : (
                    assignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`assignment-${assignment.id}`}
                          checked={selectedAssignments.includes(assignment.id)}
                          onCheckedChange={() => toggleAssignment(assignment.id)}
                        />
                        <label
                          htmlFor={`assignment-${assignment.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {assignment.title}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {selectedAssignments.length} assignment(s) selected
                </p>
              </div>
            )}

            {/* Report Description */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    {reportType === "grades" ? (
                      <div>
                        <p className="font-semibold mb-1">Grade Report will include:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Student Name</li>
                          <li>Assignment Title</li>
                          <li>Overall Assignment Score (average including 0s for unattempted)</li>
                          <li>Date Completed</li>
                        </ul>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold mb-1">Missing & Incomplete Report will include:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Student Name</li>
                          <li>Missing Assignments (not started)</li>
                          <li>Incomplete Assignments (problems not attempted)</li>
                          <li>Useful for parent-teacher conferences</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Button
              onClick={generateReport}
              disabled={generating || !selectedClassroom || (reportType === "grades" && selectedAssignments.length === 0)}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              {generating ? "Generating..." : "Download Report (CSV)"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
