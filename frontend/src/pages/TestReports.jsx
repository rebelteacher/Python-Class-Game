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
  const [selectedClassrooms, setSelectedClassrooms] = useState([]); // Changed to array
  const [allTests, setAllTests] = useState([]); // All tests from selected classrooms
  const [selectedTests, setSelectedTests] = useState([]); // Changed to array
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [results, setResults] = useState([]);
  const [testInfo, setTestInfo] = useState(null);

  useEffect(() => {
    fetchClassrooms();
    
    // Pre-select from URL param or navigation state
    if (testId) {
      setSelectedTests([testId]);
    } else if (location.state?.selectedTestId) {
      setSelectedTests([location.state.selectedTestId]);
    }
    
    if (location.state?.classroomId) {
      setSelectedClassrooms([location.state.classroomId]);
    }
  }, [testId]);

  useEffect(() => {
    if (selectedClassrooms.length > 0) {
      fetchAllTests();
    } else {
      setAllTests([]);
      setSelectedTests([]);
      setResults([]);
    }
  }, [selectedClassrooms]);

  useEffect(() => {
    if (selectedTests.length > 0) {
      fetchResults();
    } else {
      setResults([]);
    }
  }, [selectedTests]);

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

  const fetchAllTests = async () => {
    try {
      // Fetch tests from all selected classrooms
      const testPromises = selectedClassrooms.map(classroomId =>
        axios.get(`${API}/mc-tests/classroom/${classroomId}`, {
          withCredentials: true,
        })
      );
      
      const responses = await Promise.all(testPromises);
      const allTestsData = responses.flatMap(response => response.data);
      setAllTests(allTestsData);
    } catch (error) {
      console.error("Error fetching tests:", error);
      toast.error("Failed to load tests");
    }
  };

  const fetchResults = async () => {
    setLoadingResults(true);
    try {
      // Fetch results from all selected tests
      const resultsPromises = selectedTests.map(testId =>
        axios.get(`${API}/mc-tests/${testId}/results`, {
          withCredentials: true,
        }).then(response => ({ testId, data: response.data }))
      );
      
      const allResultsData = await Promise.all(resultsPromises);
      
      // Get all unique classrooms from selected tests
      const uniqueClassroomIds = [...new Set(selectedTests.map(testId => {
        const test = allTests.find(t => t.id === testId);
        return test?.classroom_id;
      }).filter(Boolean))];
      
      // Fetch all classrooms to map student IDs to names
      const classroomPromises = uniqueClassroomIds.map(classroomId =>
        axios.get(`${API}/classrooms/${classroomId}`, { withCredentials: true })
      );
      const classroomResponses = await Promise.all(classroomPromises);
      
      // Create a map of classroom_id to student details
      const classroomStudentMap = {};
      classroomResponses.forEach(res => {
        classroomStudentMap[res.data.id] = res.data.student_details || [];
      });
      
      // Combine all results with student names and test info
      const combinedResults = [];
      allResultsData.forEach(({ testId, data }) => {
        const test = allTests.find(t => t.id === testId);
        const students = classroomStudentMap[test?.classroom_id] || [];
        
        data.results.forEach(result => {
          const student = students.find(s => s.id === result.student_id);
          combinedResults.push({
            ...result,
            student_name: student?.name || "Unknown Student",
            test_title: test?.title || "Unknown Test",
            test_id: testId,
            classroom_id: test?.classroom_id
          });
        });
      });
      
      setResults(combinedResults);
      
      // Set test info for stats (use first test if multiple)
      if (selectedTests.length === 1) {
        const test = allTests.find(t => t.id === selectedTests[0]);
        setTestInfo(test);
      } else {
        setTestInfo({ title: `${selectedTests.length} Tests Combined` });
      }
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
    
    // Get total students from selected classrooms
    const selectedClassroomData = classrooms.filter(c => selectedClassrooms.includes(c.id));
    const totalStudents = selectedClassroomData.reduce((sum, c) => sum + (c.students?.length || 0), 0);
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
            <CardTitle>Select Tests to Report On</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Select multiple classrooms and tests to combine results</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Classroom Selection */}
              <div>
                <Label className="mb-2 block font-semibold">Classrooms ({selectedClassrooms.length} selected)</Label>
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                  <div className="flex items-center space-x-2 pb-2 border-b">
                    <input
                      type="checkbox"
                      id="select-all-classrooms"
                      checked={selectedClassrooms.length === classrooms.length && classrooms.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClassrooms(classrooms.map(c => c.id));
                        } else {
                          setSelectedClassrooms([]);
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="select-all-classrooms" className="font-semibold cursor-pointer">
                      Select All
                    </Label>
                  </div>
                  {classrooms.map((classroom) => (
                    <div key={classroom.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`classroom-${classroom.id}`}
                        checked={selectedClassrooms.includes(classroom.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClassrooms([...selectedClassrooms, classroom.id]);
                          } else {
                            setSelectedClassrooms(selectedClassrooms.filter(id => id !== classroom.id));
                            // Also remove tests from this classroom
                            const testsFromClassroom = allTests.filter(t => t.classroom_id === classroom.id).map(t => t.id);
                            setSelectedTests(selectedTests.filter(id => !testsFromClassroom.includes(id)));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <Label htmlFor={`classroom-${classroom.id}`} className="cursor-pointer">
                        {classroom.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Selection */}
              <div>
                <Label className="mb-2 block font-semibold">Tests ({selectedTests.length} selected)</Label>
                {selectedClassrooms.length === 0 ? (
                  <div className="border rounded-lg p-4 text-center text-gray-500">
                    Select classrooms first
                  </div>
                ) : allTests.length === 0 ? (
                  <div className="border rounded-lg p-4 text-center text-gray-500">
                    No tests available in selected classrooms
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <input
                        type="checkbox"
                        id="select-all-tests"
                        checked={selectedTests.length === allTests.length && allTests.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTests(allTests.map(t => t.id));
                          } else {
                            setSelectedTests([]);
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="select-all-tests" className="font-semibold cursor-pointer">
                        Select All
                      </Label>
                    </div>
                    {allTests.map((test) => (
                      <div key={test.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`test-${test.id}`}
                          checked={selectedTests.includes(test.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTests([...selectedTests, test.id]);
                            } else {
                              setSelectedTests(selectedTests.filter(id => id !== test.id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <Label htmlFor={`test-${test.id}`} className="cursor-pointer">
                          {test.title}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
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
