import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Cpu, 
  BookOpen, 
  Clock, 
  CheckCircle,
  Wrench,
  Target,
  Code,
  HelpCircle,
  ChevronRight,
  Zap,
  Lightbulb
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MicrobitCurriculum({ user }) {
  const navigate = useNavigate();
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassrooms, setSelectedClassrooms] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCurriculum();
    if (user?.role === "teacher") {
      fetchClassrooms();
    }
  }, [user]);

  const fetchCurriculum = async () => {
    try {
      const response = await axios.get(`${API}/microbit/curriculum`, {
        withCredentials: true
      });
      setCurriculum(response.data);
    } catch (error) {
      console.error("Error fetching curriculum:", error);
      toast.error("Failed to load curriculum");
    } finally {
      setLoading(false);
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
    }
  };

  const handleAssignLesson = async () => {
    if (!selectedLesson || selectedClassrooms.length === 0) {
      toast.error("Please select at least one classroom");
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(
        `${API}/microbit/create-from-lesson`,
        {
          unit_id: selectedUnit.id,
          lesson_id: selectedLesson.id,
          classroom_ids: selectedClassrooms
        },
        { withCredentials: true }
      );
      
      toast.success(`Assignment created! Proctor code: ${response.data.proctor_code}`);
      setShowAssignDialog(false);
      setSelectedClassrooms([]);
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast.error("Failed to create assignment");
    } finally {
      setCreating(false);
    }
  };

  const getLessonTypeIcon = (type) => {
    switch (type) {
      case "quiz":
        return <HelpCircle className="w-4 h-4" />;
      case "code":
        return <Code className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getLessonTypeColor = (type) => {
    switch (type) {
      case "quiz":
        return "bg-purple-100 text-purple-700";
      case "code":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-cyber-navy/30 text-slate-300";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black cyber-grid-bg flex items-center justify-center">
        <div className="text-center">
          <Cpu className="w-12 h-12 text-cyan-600 animate-pulse mx-auto mb-4" />
          <p className="text-lg text-slate-400">Loading Micro:bit Curriculum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      {/* Header */}
      <nav className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="text-white hover:bg-cyber-navy/60/20"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <Cpu className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">BBC Micro:bit Curriculum</h1>
                  <p className="text-cyan-100 text-sm">Unit 4: Python Programming with Hardware</p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => navigate("/library?type=microbit")}
              className="bg-cyber-navy/60 text-cyan-600 hover:bg-cyan-50"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Go to Micro:bit Library
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/library?type=microbit")}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-cyan-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-semibold">Problem Library</h3>
                <p className="text-sm text-slate-400">View & create Micro:bit problems</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-cyan-500 bg-cyan-50" onClick={() => navigate("/microbit/teach")}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-cyan-500 rounded-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-cyan-700">Teaching Mode</h3>
                <p className="text-sm text-cyan-600">Live demo with simulator</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowAssignDialog(true)}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Quick Assign</h3>
                <p className="text-sm text-slate-400">Assign a lesson to your class</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/teacher/dashboard")}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Student Progress</h3>
                <p className="text-sm text-slate-400">View in classroom page</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Introduction Card */}
        <Card className="mb-8 bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-cyber-navy/60/20 rounded-lg">
                <Zap className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Learn Physical Computing with Micro:bit!</h2>
                <p className="text-cyan-100">
                  This curriculum teaches Python programming using real BBC Micro:bit hardware. 
                  Students will build circuits, control LEDs, read sensors, and create interactive projects.
                </p>
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="w-4 h-4" />
                    <span>12 Lessons</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>8 Weeks</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4" />
                    <span>Hands-on Projects</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attribution & Official Resources */}
        <Card className="mb-6 border-cyan-200 bg-cyan-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <img 
                  src="https://microbit.org/images/microbit-logo.svg" 
                  alt="micro:bit" 
                  className="h-8"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="text-sm">
                  <p className="text-slate-300">
                    Curriculum based on <a href="https://microbit.org" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline font-medium">BBC micro:bit</a> resources.
                  </p>
                  <p className="text-slate-500 text-xs">
                    micro:bit is a trademark of the Micro:bit Educational Foundation.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => window.open('https://microbit.org/get-started/first-steps/introduction/', '_blank')}
                >
                  <BookOpen className="w-3 h-3 mr-1" />
                  Official Tutorials
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => window.open('https://microbit-micropython.readthedocs.io/en/latest/tutorials/introduction.html', '_blank')}
                >
                  <Code className="w-3 h-3 mr-1" />
                  Python Docs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Units */}
        <div className="space-y-6">
          {curriculum?.units?.map((unit, unitIndex) => (
            <Card key={unit.id} className="overflow-hidden">
              <CardHeader 
                className={`cursor-pointer transition-colors ${
                  selectedUnit?.id === unit.id 
                    ? 'bg-cyan-50 border-b-2 border-cyan-500' 
                    : 'hover:bg-cyber-navy/40'
                }`}
                onClick={() => setSelectedUnit(selectedUnit?.id === unit.id ? null : unit)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg ${
                      unitIndex === 0 ? 'bg-green-500' :
                      unitIndex === 1 ? 'bg-blue-500' :
                      unitIndex === 2 ? 'bg-purple-500' :
                      'bg-orange-500'
                    }`}>
                      {unitIndex + 1}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{unit.title}</CardTitle>
                      <CardDescription>{unit.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{unit.weeks}</Badge>
                    <Badge variant="secondary">{unit.lessons.length} Lessons</Badge>
                    <ChevronRight className={`w-5 h-5 transition-transform ${
                      selectedUnit?.id === unit.id ? 'rotate-90' : ''
                    }`} />
                  </div>
                </div>
              </CardHeader>

              {selectedUnit?.id === unit.id && (
                <CardContent className="p-0">
                  <div className="divide-y">
                    {unit.lessons.map((lesson, lessonIndex) => (
                      <div 
                        key={lesson.id}
                        className="p-4 hover:bg-cyber-navy/40 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-cyber-navy/30 flex items-center justify-center text-sm font-medium">
                              {lessonIndex + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{lesson.title}</h4>
                                <Badge className={getLessonTypeColor(lesson.type)}>
                                  {getLessonTypeIcon(lesson.type)}
                                  <span className="ml-1 capitalize">{lesson.type}</span>
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {lesson.duration}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-400 mb-2">{lesson.description}</p>
                              
                              {/* Learning Objectives */}
                              <div className="mb-2">
                                <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                                  <Target className="w-3 h-3" /> Learning Objectives:
                                </p>
                                <ul className="text-xs text-slate-400 space-y-1">
                                  {lesson.objectives.map((obj, i) => (
                                    <li key={i} className="flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3 text-green-500" />
                                      {obj}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Materials */}
                              <div>
                                <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                                  <Wrench className="w-3 h-3" /> Materials Needed:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {lesson.materials.map((mat, i) => (
                                    <Badge key={i} variant="outline" className="text-xs bg-yellow-50">
                                      {mat}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {user?.role === "teacher" && (
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedLesson(lesson);
                                  setShowAssignDialog(true);
                                }}
                                className="bg-cyan-600 hover:bg-cyan-700"
                              >
                                Assign to Class
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Tips Card */}
        <Card className="mt-8 bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              Teacher Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span><strong>Hardware First:</strong> Let students explore the physical Micro:bit before coding</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span><strong>Pair Programming:</strong> Have students work in pairs to share hardware</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span><strong>Debug Together:</strong> Common issues include loose connections and typos</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span><strong>Celebrate Failures:</strong> Hardware debugging is a valuable learning experience</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>

      {/* Assign to Classroom Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Micro:bit Lesson</DialogTitle>
            <DialogDescription>
              Create an assignment from: <strong>{selectedLesson?.title}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Classrooms:</label>
              {classrooms.length === 0 ? (
                <p className="text-sm text-slate-500">No classrooms found. Create a classroom first.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                  {classrooms.map((classroom) => (
                    <div 
                      key={classroom.id}
                      className="flex items-center gap-2 p-2 hover:bg-cyber-navy/40 rounded"
                    >
                      <Checkbox
                        id={classroom.id}
                        checked={selectedClassrooms.includes(classroom.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedClassrooms([...selectedClassrooms, classroom.id]);
                          } else {
                            setSelectedClassrooms(selectedClassrooms.filter(id => id !== classroom.id));
                          }
                        }}
                      />
                      <label htmlFor={classroom.id} className="text-sm cursor-pointer">
                        {classroom.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedLesson && (
              <div className="bg-cyber-navy/40 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">This will create:</p>
                <ul className="text-slate-400 space-y-1">
                  <li>• A problem in your Assignment Library</li>
                  <li>• An assignment for selected classrooms</li>
                  <li>• Pre-filled with starter code & test cases</li>
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignLesson}
              disabled={creating || selectedClassrooms.length === 0}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {creating ? "Creating..." : "Create Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
