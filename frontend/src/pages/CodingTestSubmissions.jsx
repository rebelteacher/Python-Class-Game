import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Trophy, Clock, Calendar, FileSpreadsheet } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CodingTestSubmissions({ user }) {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [test, setTest] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestAndSubmissions();
  }, [testId]);

  const fetchTestAndSubmissions = async () => {
    try {
      // Fetch test details
      const testResponse = await axios.get(`${API}/coding-tests`, {
        withCredentials: true
      });
      const foundTest = testResponse.data.find(t => t.id === testId);
      setTest(foundTest);

      // Fetch submissions
      const submissionsResponse = await axios.get(`${API}/coding-tests/${testId}/submissions`, {
        withCredentials: true
      });
      
      // Group submissions by student
      const submissionsByStudent = {};
      submissionsResponse.data.forEach(sub => {
        if (!submissionsByStudent[sub.student_id]) {
          submissionsByStudent[sub.student_id] = {
            student_id: sub.student_id,
            student_name: sub.student_name,
            submissions: []
          };
        }
        submissionsByStudent[sub.student_id].submissions.push(sub);
      });

      // Calculate overall scores (best score per problem, then average across problems)
      const studentsWithScores = Object.values(submissionsByStudent).map(student => {
        // Group submissions by problem and get best score for each
        const bestScoreByProblem = {};
        student.submissions.forEach(sub => {
          if (!bestScoreByProblem[sub.problem_id] || sub.score > bestScoreByProblem[sub.problem_id]) {
            bestScoreByProblem[sub.problem_id] = sub.score;
          }
        });
        
        // Calculate average of best scores across all problems attempted
        const bestScores = Object.values(bestScoreByProblem);
        const totalBestScore = bestScores.reduce((sum, score) => sum + score, 0);
        const averageScore = bestScores.length > 0 ? totalBestScore / bestScores.length : 0;
        
        return {
          ...student,
          overall_score: averageScore,
          problems_submitted: Object.keys(bestScoreByProblem).length, // Count unique problems
          total_problems: foundTest?.problem_ids?.length || 0,
          best_scores_by_problem: bestScoreByProblem // Include for detailed view
        };
      });

      setSubmissions(studentsWithScores);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const formatTime = (seconds) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleExportToExcel = () => {
    if (!submissions || submissions.length === 0) {
      toast.error("No submissions to export");
      return;
    }

    // Prepare main results data
    const exportData = submissions.map(student => {
      return {
        "Student Name": student.student_name,
        "Overall Score": student.overall_score.toFixed(1) + "%",
        "Problems Completed": `${student.problems_submitted}/${student.total_problems}`,
        "Student ID": student.student_id
      };
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Add main results sheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Student Scores");

    // Add statistics sheet
    const avgScore = submissions.reduce((sum, s) => sum + s.overall_score, 0) / submissions.length;
    const highestScore = Math.max(...submissions.map(s => s.overall_score));
    const lowestScore = Math.min(...submissions.map(s => s.overall_score));
    const completionRate = (submissions.reduce((sum, s) => sum + s.problems_submitted, 0) / (submissions.length * (test?.problem_ids?.length || 1))) * 100;

    const statsData = [
      { "Metric": "Total Students", "Value": submissions.length },
      { "Metric": "Average Score", "Value": avgScore.toFixed(1) + "%" },
      { "Metric": "Highest Score", "Value": highestScore.toFixed(1) + "%" },
      { "Metric": "Lowest Score", "Value": lowestScore.toFixed(1) + "%" },
      { "Metric": "Completion Rate", "Value": completionRate.toFixed(1) + "%" },
      { "Metric": "Total Problems", "Value": test?.problem_ids?.length || 0 }
    ];

    const statsWs = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, statsWs, "Statistics");

    // Generate filename
    const fileName = `CodingTest_${test?.title || 'Report'}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Download
    XLSX.writeFile(wb, fileName);
    toast.success("Report exported successfully!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-gray-600">Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {test && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{test.title}</h1>
            <p className="text-gray-600">{test.description}</p>
            <div className="mt-2 flex gap-4 text-sm text-gray-600">
              <span>Problems: {test.problem_ids?.length || 0}</span>
              {test.time_limit_minutes > 0 && <span>Time Limit: {test.time_limit_minutes} min</span>}
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Student Submissions</CardTitle>
                <CardDescription>
                  {submissions.length} student{submissions.length !== 1 ? 's' : ''} submitted
                </CardDescription>
              </div>
              {submissions.length > 0 && (
                <Button
                  onClick={handleExportToExcel}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export to Excel
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No submissions yet
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((student) => (
                  <Card key={student.student_id} className="border-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-gray-400" />
                          <div>
                            <CardTitle className="text-lg">{student.student_name}</CardTitle>
                            <CardDescription>
                              {student.problems_submitted} / {student.total_problems} problems submitted
                            </CardDescription>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-1">Overall Score</p>
                          <p className={`text-3xl font-bold ${getScoreColor(student.overall_score)}`}>
                            {Math.round(student.overall_score)}%
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {student.submissions.map((sub, index) => (
                          <div key={sub.id} className="p-3 bg-gray-50 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">Problem {index + 1}</span>
                              <span className={`text-xl font-bold ${getScoreColor(sub.score)}`}>
                                {Math.round(sub.score)}%
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatTime(sub.time_taken_seconds)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(sub.submitted_at).toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="mt-2 p-2 bg-white rounded text-xs">
                              <p className="font-semibold text-gray-700 mb-1">Feedback:</p>
                              <p className="text-gray-600">{sub.feedback}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
