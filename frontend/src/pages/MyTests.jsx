import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileQuestion, Code2, Clock, Calendar, CheckCircle, XCircle } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MyTests({ user }) {
  const navigate = useNavigate();
  const [mcTests, setMcTests] = useState([]);
  const [codingTests, setCodingTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllTests();
  }, []);

  const fetchAllTests = async () => {
    try {
      const classroomsRes = await axios.get(`${API}/classrooms/student`, {
        withCredentials: true
      });
      
      const allMcTests = [];
      const allCodingTests = [];
      
      for (const classroom of classroomsRes.data) {
        try {
          const mcRes = await axios.get(`${API}/mc-tests/classroom/${classroom.id}`, {
            withCredentials: true
          });
          mcRes.data.forEach(test => {
            allMcTests.push({ ...test, classroom_name: classroom.name });
          });
        } catch (err) {
          console.error("Error fetching MC tests:", err);
        }

        try {
          const codingRes = await axios.get(`${API}/coding-tests/classroom/${classroom.id}`, {
            withCredentials: true
          });
          codingRes.data.forEach(test => {
            allCodingTests.push({ ...test, classroom_name: classroom.name });
          });
        } catch (err) {
          console.error("Error fetching coding tests:", err);
        }
      }
      
      setMcTests(allMcTests);
      setCodingTests(allCodingTests);
    } catch (error) {
      console.error("Error fetching tests:", error);
      toast.error("Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date() > new Date(dueDate);
  };

  const handleStartMCTest = (testId) => {
    navigate(`/test/${testId}`);
  };

  const handleStartCodingTest = (testId) => {
    navigate(`/coding-test/${testId}`);
  };

  const handleViewResult = (testId, type) => {
    if (type === "mc") {
      navigate(`/test-taking/${testId}`);
    } else {
      navigate(`/coding-test-result/${testId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-gray-600">Loading tests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate("/student")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Tests</h1>

        <Tabs defaultValue="coding" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="coding" className="gap-2">
              <Code2 className="w-4 h-4" />
              Coding Tests
            </TabsTrigger>
            <TabsTrigger value="mc" className="gap-2">
              <FileQuestion className="w-4 h-4" />
              Multiple Choice
            </TabsTrigger>
          </TabsList>

          {/* Coding Tests Tab */}
          <TabsContent value="coding" className="mt-6">
            {codingTests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Code2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No coding tests available</h3>
                  <p className="text-gray-600">
                    Check back later for new assignments
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {codingTests.map((test) => {
                  const overdue = isOverdue(test.due_date);
                  const submitted = test.is_submitted;

                  return (
                    <Card key={test.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{test.title}</CardTitle>
                          {submitted ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : overdue ? (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                              Overdue
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                              Available
                            </span>
                          )}
                        </div>
                        <CardDescription>{test.classroom_name}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          {test.time_limit_minutes > 0 && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{test.time_limit_minutes} minute time limit</span>
                            </div>
                          )}
                          {test.due_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span className={overdue ? "text-red-600 font-medium" : ""}>
                                Due: {formatDate(test.due_date)}
                              </span>
                            </div>
                          )}
                        </div>

                        {submitted ? (
                          <Button
                            onClick={() => handleViewResult(test.id, "coding")}
                            variant="outline"
                            className="w-full"
                          >
                            View Result
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleStartCodingTest(test.id)}
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                            disabled={overdue}
                          >
                            {overdue ? "Test Closed" : "Start Test"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* MC Tests Tab */}
          <TabsContent value="mc" className="mt-6">
            {mcTests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileQuestion className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No multiple choice tests available</h3>
                  <p className="text-gray-600">
                    Check back later for new tests
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mcTests.map((test) => {
                  const overdue = isOverdue(test.due_date);

                  return (
                    <Card key={test.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{test.title}</CardTitle>
                          {overdue ? (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                              Overdue
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                              Available
                            </span>
                          )}
                        </div>
                        <CardDescription>{test.classroom_name}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <FileQuestion className="w-4 h-4" />
                            <span>{test.num_questions} questions</span>
                          </div>
                          {test.time_limit_minutes > 0 && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{test.time_limit_minutes} minute time limit</span>
                            </div>
                          )}
                          {test.due_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span className={overdue ? "text-red-600 font-medium" : ""}>
                                Due: {formatDate(test.due_date)}
                              </span>
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={() => handleStartMCTest(test.id)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          {overdue ? "View Test" : "Start Test"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
