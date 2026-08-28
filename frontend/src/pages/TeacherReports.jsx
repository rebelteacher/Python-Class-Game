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
  const [reportType, setReportType] = useState("curriculum"); // "curriculum" (gradebook grid), "grades", or "missing"
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [curriculumClassroomId, setCurriculumClassroomId] = useState(""); // single-classroom selection for gradebook grid
  const [curriculumData, setCurriculumData] = useState(null); // { columns, rows } from /reports/gradebook GET

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
    if (reportType === "curriculum") {
      if (!curriculumClassroomId) {
        toast.error("Please select a classroom");
        return;
      }
      setGenerating(true);
      setCurriculumData(null);
      try {
        const response = await axios.get(
          `${API}/reports/gradebook?classroom_id=${encodeURIComponent(curriculumClassroomId)}`,
          { withCredentials: true }
        );
        setCurriculumData(response.data);
        toast.success(`Loaded ${response.data.rows.length} students × ${response.data.columns.length} columns`);
      } catch (error) {
        console.error("Error loading gradebook:", error);
        toast.error(error.response?.data?.detail || "Failed to load gradebook");
      } finally {
        setGenerating(false);
      }
      return;
    }

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
    if (reportType === "curriculum") {
      downloadCurriculumExcel();
      return;
    }
    if (!reportData) return;

    if (reportType === "grades") {
      downloadGradebookExcel();
    } else {
      downloadMissingExcel();
    }
  };

  const downloadCurriculumExcel = () => {
    if (!curriculumData) return;
    const headerRow = ["Student", ...curriculumData.columns.map((c) => c.label)];
    const data = [headerRow];
    curriculumData.rows.forEach((row) => {
      const line = [row.student_name];
      curriculumData.columns.forEach((col) => {
        const v = row.cells[col.key];
        line.push(v === null || v === undefined ? "" : v);
      });
      data.push(line);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 26 }, ...curriculumData.columns.map(() => ({ wch: 14 }))];
    ws["!freeze"] = { xSplit: 1, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws, "Gradebook");
    const clsName = classrooms.find((c) => c.id === curriculumClassroomId)?.name || "Class";
    XLSX.writeFile(wb, `Gradebook_${clsName}_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Excel file downloaded!");
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
      <div className="min-h-screen bg-cyber-navy/40 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-navy/40">
      {/* Header */}
      <nav className="bg-cyber-navy/80 backdrop-blur-xl border-b border-cyber-cyan/20">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button onClick={() => navigate("/teacher/dashboard")} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-7 h-7 text-cyber-cyan" />
              <span className="text-xl font-bold text-white">Student Reports</span>
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
                  <SelectItem value="curriculum">Curriculum Gradebook (grid view)</SelectItem>
                  <SelectItem value="grades">Grade Report (by assignment)</SelectItem>
                  <SelectItem value="missing">Missing & Incomplete Assignments</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Curriculum mode: single classroom selector */}
            {reportType === "curriculum" && (
              <div data-testid="curriculum-classroom-picker">
                <Label>Select a Classroom *</Label>
                <Select value={curriculumClassroomId} onValueChange={setCurriculumClassroomId}>
                  <SelectTrigger className="mt-1" data-testid="curriculum-classroom-select">
                    <SelectValue placeholder="Choose a classroom to view its gradebook…" />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-2">
                  Shows every lesson average, lesson quiz, and chapter test score for every student in this class.
                </p>
              </div>
            )}

            {/* Classroom Selection - Multi-select (grades / missing modes only) */}
            {reportType !== "curriculum" && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Select Classrooms *</Label>
                <div className="flex gap-2">
                  <Button onClick={selectAllClassrooms} variant="outline" size="sm">
                    Select All
                  </Button>
                  <Button onClick={deselectAllClassrooms} variant="outline" size="sm">
                    Clear All
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                {classrooms.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No classrooms found
                  </p>
                ) : (
                  classrooms.map((classroom) => (
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
                        {classroom.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {selectedClassrooms.length} classroom(s) selected
              </p>
            </div>
            )}

            {/* Assignment Selection (only for grades report) */}
            {reportType === "grades" && selectedClassrooms.length > 0 && (
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
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                  {assignments.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No assignments found in selected classrooms
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
                <p className="text-xs text-slate-500 mt-2">
                  {selectedAssignments.length} assignment(s) selected
                </p>
              </div>
            )}

            {/* Report Description */}
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    {reportType === "curriculum" ? (
                      <div>
                        <p className="font-semibold mb-1">Curriculum Gradebook will show:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>One row per student in the selected class</li>
                          <li>Columns in curriculum order: Lesson Avg → Lesson Quiz → … → Chapter Test</li>
                          <li>Lesson Avg = average of best-per-problem scores across every problem in the lesson</li>
                          <li>Frozen student column + header row for easy scrolling</li>
                        </ul>
                      </div>
                    ) : reportType === "grades" ? (
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
            <div className="space-y-3">
              <Button
                onClick={generateReport}
                disabled={
                  generating ||
                  (reportType === "curriculum" ? !curriculumClassroomId : (
                    selectedClassrooms.length === 0 ||
                    (reportType === "grades" && selectedAssignments.length === 0)
                  ))
                }
                className="w-full bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold"
                size="lg"
                data-testid="generate-report-btn"
              >
                <FileSpreadsheet className="w-5 h-5 mr-2" />
                {generating ? "Generating..." : reportType === "curriculum" ? "Load Gradebook" : "Generate Report"}
              </Button>

              {((reportType === "curriculum" && curriculumData) || (reportType !== "curriculum" && reportData)) && (
                <Button
                  onClick={downloadExcel}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                  data-testid="download-report-btn"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Excel (.xlsx)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Curriculum Gradebook Grid — sticky first column + sticky header row */}
        {reportType === "curriculum" && curriculumData && (
          <Card className="mt-6 max-w-none mx-auto" data-testid="curriculum-gradebook-card">
            <CardHeader>
              <CardTitle>Curriculum Gradebook</CardTitle>
              <CardDescription>
                {curriculumData.rows.length} student(s) × {curriculumData.columns.length} column(s) — scroll horizontally. Blank cells = not attempted yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {curriculumData.rows.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No students enrolled in this class yet.</p>
                </div>
              ) : (
                <div
                  className="overflow-auto border border-cyber-cyan/20 rounded-lg"
                  style={{ maxHeight: "70vh" }}
                  data-testid="gradebook-scroll-container"
                >
                  <table className="border-collapse text-sm">
                    <thead>
                      <tr>
                        <th
                          className="sticky top-0 left-0 z-30 bg-cyber-navy text-white px-4 py-3 text-left font-semibold border-r border-b border-cyber-cyan/25 min-w-[220px] shadow-[2px_0_6px_rgba(0,0,0,0.5)]"
                          data-testid="gradebook-corner-header"
                        >
                          Student
                        </th>
                        {curriculumData.columns.map((col) => {
                          const isQuiz = col.type === "lesson_quiz";
                          const isChapter = col.type === "chapter_test";
                          const bg = isChapter ? "bg-fuchsia-950/80" : isQuiz ? "bg-cyan-950/80" : "bg-cyber-navy/90";
                          return (
                            <th
                              key={col.key}
                              className={`sticky top-0 z-20 ${bg} text-white px-3 py-3 text-center font-medium border-r border-b border-cyber-cyan/25 whitespace-nowrap`}
                              data-testid={`gradebook-col-${col.key}`}
                              title={`${col.chapter}${col.lesson ? " · " + col.lesson : ""} · ${col.type.replace("_", " ")}`}
                            >
                              <div className="text-[10px] uppercase tracking-wider text-slate-400 leading-tight">
                                {col.chapter}
                              </div>
                              <div className="mt-0.5">{col.label}</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {curriculumData.rows.map((row, idx) => (
                        <tr key={row.student_id}>
                          <td
                            className={`sticky left-0 z-10 ${idx % 2 === 0 ? "bg-[#0b1220]" : "bg-[#111a2c]"} text-white px-4 py-2 font-medium border-r border-b border-cyber-cyan/20 whitespace-nowrap shadow-[2px_0_6px_rgba(0,0,0,0.4)]`}
                            data-testid={`gradebook-student-${row.student_id}`}
                          >
                            {row.student_name}
                          </td>
                          {curriculumData.columns.map((col) => {
                            const v = row.cells[col.key];
                            const hasValue = v !== null && v !== undefined;
                            const score = Number(v) || 0;
                            const stripe = idx % 2 === 0 ? "bg-cyber-navy/40" : "bg-cyber-navy/20";
                            const bg = !hasValue
                              ? `${stripe} text-slate-500`
                              : score >= 90
                              ? "bg-green-500/25 text-green-200"
                              : score >= 70
                              ? "bg-yellow-500/25 text-yellow-100"
                              : score > 0
                              ? "bg-orange-500/25 text-orange-100"
                              : "bg-red-500/20 text-red-200";
                            return (
                              <td
                                key={col.key}
                                className={`px-3 py-2 text-center border-r border-b border-cyber-cyan/10 ${bg}`}
                                data-testid={`gradebook-cell-${row.student_id}-${col.key}`}
                              >
                                {hasValue ? Math.round(score) : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-slate-500 mt-3">
                Colour key:
                <span className="ml-2 inline-block px-2 py-0.5 rounded bg-green-500/25 text-green-200">≥ 90</span>
                <span className="ml-1 inline-block px-2 py-0.5 rounded bg-yellow-500/25 text-yellow-100">70–89</span>
                <span className="ml-1 inline-block px-2 py-0.5 rounded bg-orange-500/25 text-orange-100">1–69</span>
                <span className="ml-1 inline-block px-2 py-0.5 rounded bg-red-500/20 text-red-200">0</span>
                <span className="ml-1 inline-block px-2 py-0.5 rounded bg-slate-800/50 text-slate-500">not attempted</span>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Report Preview */}
        {reportData && reportType === "grades" && (
          <Card className="mt-6 max-w-6xl mx-auto">
            <CardHeader>
              <CardTitle>Report Preview</CardTitle>
              <CardDescription>
                {reportData.students.length} student(s) × {reportData.assignments.length} assignment(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-cyber-cyan/15 text-sm">
                  <thead>
                    <tr className="bg-cyber-navy/30">
                      <th className="border border-cyber-cyan/15 px-4 py-2 text-left font-semibold">
                        Student Name
                      </th>
                      {reportData.assignments.map(assignment => (
                        <th key={assignment.id} className="border border-cyber-cyan/15 px-4 py-2 text-center font-semibold">
                          {assignment.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.students.map(student => (
                      <tr key={student.student_id} className="hover:bg-cyber-navy/40">
                        <td className="border border-cyber-cyan/15 px-4 py-2 font-medium">
                          {student.student_name}
                        </td>
                        {reportData.assignments.map(assignment => {
                          const scoreData = student.scores[assignment.id];
                          const score = scoreData ? scoreData.average_score : 0;
                          const bgColor = score >= 90 ? "bg-green-500/20" : 
                                        score >= 70 ? "bg-yellow-500/20" : 
                                        score > 0 ? "bg-orange-500/20" : "bg-red-500/20";
                          
                          return (
                            <td key={assignment.id} className={`border border-cyber-cyan/15 px-4 py-2 text-center ${bgColor}`}>
                              {score}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {reportData && reportType === "missing" && (
          <Card className="mt-6 max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Report Preview</CardTitle>
              <CardDescription>
                {reportData.students.length} student(s) with missing or incomplete assignments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {reportData.students.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>All students are up to date!</p>
                  <p className="text-sm">No missing or incomplete assignments found.</p>
                </div>
              ) : (
                reportData.students.map(student => (
                  <div key={student.student_id} className="border rounded-lg p-4 bg-cyber-navy/40">
                    <h3 className="font-semibold text-lg mb-1">{student.student_name}</h3>
                    <p className="text-sm text-slate-400 mb-3">{student.student_email}</p>
                    
                    {student.missing_assignments.length > 0 && (
                      <div className="mb-3">
                        <h4 className="font-medium text-red-400 mb-2">Missing (Not Started):</h4>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          {student.missing_assignments.map(assignment => (
                            <li key={assignment.assignment_id} className="text-sm">
                              {assignment.assignment_title} ({assignment.total_problems} problems)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {student.incomplete_assignments.length > 0 && (
                      <div>
                        <h4 className="font-medium text-orange-400 mb-2">Incomplete:</h4>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          {student.incomplete_assignments.map(assignment => (
                            <li key={assignment.assignment_id} className="text-sm">
                              {assignment.assignment_title} ({assignment.completed_problems}/{assignment.total_problems} completed)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
