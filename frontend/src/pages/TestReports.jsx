import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, FileSpreadsheet, Printer, TrendingUp, TrendingDown, Users, Award } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function TestReports({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { testId } = useParams(); // Get testId from URL
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [results, setResults] = useState([]);
  const [testInfo, setTestInfo] = useState(null);

  useEffect(() => {
    fetchClassrooms();
    
    // Pre-select from URL param or navigation state
    if (testId) {
      setSelectedTest(testId);
    } else if (location.state?.selectedTestId) {
      setSelectedTest(location.state.selectedTestId);
    }
    
    if (location.state?.classroomId) {
      setSelectedClassroom(location.state.classroomId);
    }
  }, [testId]);

  useEffect(() => {
    if (selectedClassroom) {
      fetchTests();
    } else {
      setTests([]);
      setSelectedTest("");
      setResults([]);
    }
  }, [selectedClassroom]);

  useEffect(() => {
    if (selectedTest) {
      fetchResults();
    } else {
      setResults([]);
    }
  }, [selectedTest]);

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

  const fetchTests = async () => {
    try {
      const response = await axios.get(`${API}/mc-tests/classroom/${selectedClassroom}`, {
        withCredentials: true,
      });
      setTests(response.data);
    } catch (error) {
      console.error("Error fetching tests:", error);
      toast.error("Failed to load tests");
    }
  };

  const fetchResults = async () => {
    setLoadingResults(true);
    try {
      const response = await axios.get(`${API}/mc-tests/${selectedTest}/results`, {
        withCredentials: true,
      });
      
      // Get test info
      const test = tests.find(t => t.id === selectedTest);
      setTestInfo(test);
      
      // Get classroom to map student IDs to names
      const classroomRes = await axios.get(`${API}/classrooms/${selectedClassroom}`, {
        withCredentials: true,
      });
      const classroom = classroomRes.data;
      
      // Map student IDs to names
      const resultsWithNames = response.data.results.map(result => {
        const student = classroom.students_details?.find(s => s.id === result.student_id);
        return {
          ...result,
          student_name: student?.name || "Unknown Student"
        };
      });
      
      setResults(resultsWithNames);
    } catch (error) {
      console.error("Error fetching results:", error);
      toast.error("Failed to load test results");
    } finally {
      setLoadingResults(false);
    }
  };

  const calculateStats = () => {
    if (results.length === 0) return null;
    
    const scores = results.map(r => r.score);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    
    // Get classroom student count
    const classroom = classrooms.find(c => c.id === selectedClassroom);
    const totalStudents = classroom?.students?.length || 0;
    const completionRate = totalStudents > 0 ? (results.length / totalStudents * 100) : 0;
    
    return {
      average: average.toFixed(1),
      highest: highest.toFixed(1),
      lowest: lowest.toFixed(1),
      completionRate: completionRate.toFixed(1),
      totalStudents,
      completed: results.length
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (results.length === 0) {
      toast.error("No results to export");
      return;
    }

    const stats = calculateStats();
    const classroom = classrooms.find(c => c.id === selectedClassroom);
    
    // Prepare data for Excel
    const exportData = results.map(result => ({
      "Student Name": result.student_name,
      "Score (%)": result.score.toFixed(1),
      "Date Taken": new Date(result.submitted_at).toLocaleString()
    }));
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Add results sheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Test Results");
    
    // Add statistics sheet
    const statsData = [
      { Metric: "Test Name", Value: testInfo?.title || "N/A" },
      { Metric: "Classroom", Value: classroom?.name || "N/A" },
      { Metric: "Total Students", Value: stats.totalStudents },
      { Metric: "Completed", Value: stats.completed },
      { Metric: "Completion Rate", Value: `${stats.completionRate}%` },
      { Metric: "Average Score", Value: `${stats.average}%` },
      { Metric: "Highest Score", Value: `${stats.highest}%` },
      { Metric: "Lowest Score", Value: `${stats.lowest}%` }
    ];
    const statsWs = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, statsWs, "Statistics");
    
    // Download
    const fileName = `${testInfo?.title || "Test"}_${classroom?.name || "Results"}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Report exported successfully!");
  };

  const stats = calculateStats();
  const classroom = classrooms.find(c => c.id === selectedClassroom);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <style>{`
        @media print {
          nav, .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          body {
            background: white !important;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>

      <nav className="bg-white shadow-sm border-b border-gray-200 no-print">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button onClick={() => navigate("/teacher/dashboard")} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-7 h-7 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">Test Reports</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        {/* Print Header */}
        <div className="print-only mb-6">
          <h1 className="text-2xl font-bold">Test Score Report</h1>
          <p className="text-gray-600">Generated on {new Date().toLocaleDateString()}</p>
        </div>

        {/* Filters */}
        <Card className="mb-6 no-print">
          <CardHeader>
            <CardTitle>Select Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="classroom">Classroom</Label>
                <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                  <SelectTrigger id="classroom" className="mt-1">
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

              <div>
                <Label htmlFor="test">Test</Label>
                <Select 
                  value={selectedTest} 
                  onValueChange={setSelectedTest}
                  disabled={!selectedClassroom || tests.length === 0}
                >
                  <SelectTrigger id="test" className="mt-1">
                    <SelectValue placeholder={!selectedClassroom ? "Select classroom first" : tests.length === 0 ? "No tests available" : "Select a test"} />
                  </SelectTrigger>
                  <SelectContent>
                    {tests.map((test) => (
                      <SelectItem key={test.id} value={test.id}>
                        {test.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loadingResults && (
          <div className="text-center py-20">
            <p className="text-gray-600">Loading results...</p>
          </div>
        )}

        {/* Results */}
        {!loadingResults && selectedTest && results.length === 0 && (
          <Card>
            <CardContent className="py-20 text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Results Yet</h3>
              <p className="text-gray-500">No students have completed this test yet.</p>
            </CardContent>
          </Card>
        )}

        {!loadingResults && selectedTest && results.length > 0 && stats && (
          <>
            {/* Action Buttons */}
            <div className="flex gap-4 mb-6 no-print">
              <Button onClick={handlePrint} variant="outline" className="gap-2">
                <Printer className="w-4 h-4" />
                Print Report
              </Button>
              <Button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 gap-2">
                <Download className="w-4 h-4" />
                Export to Excel
              </Button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Average Score</p>
                      <p className="text-3xl font-bold text-indigo-600">{stats.average}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-indigo-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Highest Score</p>
                      <p className="text-3xl font-bold text-green-600">{stats.highest}%</p>
                    </div>
                    <Award className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Lowest Score</p>
                      <p className="text-3xl font-bold text-yellow-600">{stats.lowest}%</p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Completion</p>
                      <p className="text-3xl font-bold text-blue-600">{stats.completionRate}%</p>
                      <p className="text-xs text-gray-500">{stats.completed} of {stats.totalStudents}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Test Info */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{testInfo?.title || "Test Results"}</CardTitle>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Classroom:</strong> {classroom?.name || "N/A"}</p>
                  <p><strong>Questions:</strong> {testInfo?.num_questions || "N/A"} per student</p>
                  {testInfo?.time_limit_minutes > 0 && (
                    <p><strong>Time Limit:</strong> {testInfo.time_limit_minutes} minutes</p>
                  )}
                </div>
              </CardHeader>
            </Card>

            {/* Results Table */}
            <Card>
              <CardHeader>
                <CardTitle>Student Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">#</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Student Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Score</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Date Taken</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results
                        .sort((a, b) => b.score - a.score) // Sort by score descending
                        .map((result, index) => (
                          <tr key={result.id || index} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-600">{index + 1}</td>
                            <td className="py-3 px-4 font-medium">{result.student_name}</td>
                            <td className="py-3 px-4">
                              <span className={`font-bold ${
                                result.score >= 90 ? "text-green-600" :
                                result.score >= 80 ? "text-blue-600" :
                                result.score >= 70 ? "text-yellow-600" :
                                "text-red-600"
                              }`}>
                                {result.score.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {new Date(result.submitted_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
