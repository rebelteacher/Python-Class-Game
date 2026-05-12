import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Code2, Clock, Calendar, Users, FileCode } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CodingTestList({ user }) {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTest, setExpandedTest] = useState(null);
  const [submissions, setSubmissions] = useState({});

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await axios.get(`${API}/coding-tests`, {
        withCredentials: true
      });
      setTests(response.data);
    } catch (error) {
      console.error("Error fetching tests:", error);
      toast.error("Failed to load coding tests");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (testId) => {
    try {
      const response = await axios.get(`${API}/coding-tests/${testId}/submissions`, {
        withCredentials: true
      });
      setSubmissions(prev => ({
        ...prev,
        [testId]: response.data
      }));
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Failed to load submissions");
    }
  };

  const toggleExpand = (testId) => {
    if (expandedTest === testId) {
      setExpandedTest(null);
    } else {
      setExpandedTest(testId);
      if (!submissions[testId]) {
        fetchSubmissions(testId);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusColor = (test) => {
    const now = new Date();
    const dueDate = test.due_date ? new Date(test.due_date) : null;
    
    if (dueDate && now > dueDate) {
      return "bg-gray-100 text-gray-700";
    }
    return "bg-green-100 text-green-700";
  };

  const getStatusText = (test) => {
    const now = new Date();
    const dueDate = test.due_date ? new Date(test.due_date) : null;
    
    if (dueDate && now > dueDate) {
      return "Closed";
    }
    return "Active";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid-bg">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-gray-600">Loading coding tests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={() => navigate("/teacher/dashboard")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button
            onClick={() => navigate("/coding-tests/create")}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Code2 className="w-4 h-4 mr-2" />
            Create New Test
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Coding Tests</h1>

        {tests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Code2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No coding tests yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first coding test to assess student skills
              </p>
              <Button
                onClick={() => navigate("/coding-tests/create")}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Code2 className="w-4 h-4 mr-2" />
                Create Test
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tests.map((test) => (
              <Card key={test.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{test.title}</CardTitle>
                      <CardDescription>{test.description}</CardDescription>
                      
                      <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-600">
                        {test.chapter && (
                          <span className="px-2 py-1 bg-blue-50 rounded">
                            {test.chapter}
                          </span>
                        )}
                        {test.lesson && (
                          <span className="px-2 py-1 bg-purple-50 rounded">
                            {test.lesson}
                          </span>
                        )}
                        {test.time_limit_minutes > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-orange-50 rounded">
                            <Clock className="w-3 h-3" />
                            {test.time_limit_minutes} min
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(test)}`}>
                      {getStatusText(test)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Available: {formatDate(test.available_date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {formatDate(test.due_date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{test.classroom_ids?.length || 0} classroom(s)</span>
                      </div>
                    </div>
                    
                    {test.proctor_code && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm font-semibold text-yellow-900 mb-1">Proctor Code:</p>
                        <p className="text-2xl font-mono font-bold text-yellow-800 tracking-widest">
                          {test.proctor_code}
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Students need this code if they exit fullscreen during the test
                        </p>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleExpand(test.id)}
                      className="w-full"
                    >
                      {expandedTest === test.id ? "Hide" : "View"} Submissions
                      <FileCode className="w-4 h-4 ml-2" />
                    </Button>

                    {expandedTest === test.id && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="font-semibold mb-3">Student Submissions</h4>
                        {!submissions[test.id] ? (
                          <p className="text-sm text-gray-600">Loading...</p>
                        ) : submissions[test.id].length === 0 ? (
                          <p className="text-sm text-gray-600">No submissions yet</p>
                        ) : (
                          <div className="space-y-2">
                            {submissions[test.id].map((submission) => (
                              <div
                                key={submission.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded"
                              >
                                <div>
                                  <p className="font-medium">{submission.student_name}</p>
                                  <p className="text-xs text-gray-600">
                                    Submitted: {formatDate(submission.submitted_at)}
                                  </p>
                                  {submission.time_taken_seconds > 0 && (
                                    <p className="text-xs text-gray-600">
                                      Time: {Math.floor(submission.time_taken_seconds / 60)}m {submission.time_taken_seconds % 60}s
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-indigo-600">
                                    {Math.round(submission.score)}%
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
