import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, Save, Sparkles, Printer, FileText, Calendar, Clock, 
  GraduationCap, BookOpen, Target, Users, CheckCircle, Loader2,
  ChevronDown, ChevronUp, Edit3, Trash2, Plus, Download, 
  ListChecks, ExternalLink, Copy
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Helper to safely convert any value to displayable string
const toDisplayString = (value) => {
  if (value === null || value === undefined) return 'Not specified';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join('\n• ');
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

export default function LessonPlanCreator({ user }) {
  const navigate = useNavigate();
  
  // Header fields (saved to localStorage and DB)
  const [headerFields, setHeaderFields] = useState({
    schoolName: "Batesville Junior High School",
    teacherName: "",
    className: "",
    lessonRange: "",
    timePerPeriod: "50",
    pacingIntro: "5",
    pacingDirectInstruction: "15",
    pacingGuidedPractice: "15",
    pacingIndependentPractice: "10",
    pacingClosure: "5",
    nextMajorAssessment: ""
  });

  // Lesson plan generation inputs
  const [lessonInput, setLessonInput] = useState({
    subject: "",
    topic: "",
    gradeLevel: "7th Grade",
    startDate: new Date().toISOString().split('T')[0],
    numberOfDays: 5
  });

  // Generated lesson plans
  const [generatedPlans, setGeneratedPlans] = useState([]);
  const [availableProblems, setAvailableProblems] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedPlans, setSavedPlans] = useState([]);
  const [expandedDays, setExpandedDays] = useState({});
  const [editingSection, setEditingSection] = useState(null);
  const [showProblemsPanel, setShowProblemsPanel] = useState(false);

  // Load saved header fields from localStorage
  useEffect(() => {
    const savedHeader = localStorage.getItem('lessonPlanHeader');
    if (savedHeader) {
      setHeaderFields(JSON.parse(savedHeader));
    }
    fetchSavedPlans();
  }, []);

  // Save header fields to localStorage when changed
  useEffect(() => {
    localStorage.setItem('lessonPlanHeader', JSON.stringify(headerFields));
  }, [headerFields]);

  const fetchSavedPlans = async () => {
    try {
      const response = await axios.get(`${API}/lesson-plans`, {
        withCredentials: true
      });
      setSavedPlans(response.data);
    } catch (error) {
      console.error("Error fetching saved plans:", error);
    }
  };

  const generateLessonPlan = async () => {
    if (!lessonInput.subject.trim() || !lessonInput.topic.trim()) {
      toast.error("Please enter both subject and topic");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await axios.post(
        `${API}/generate-lesson-plan`,
        {
          ...headerFields,
          ...lessonInput
        },
        { withCredentials: true }
      );
      
      setGeneratedPlans(response.data.dailyPlans);
      setAvailableProblems(response.data.availableProblems || []);
      
      // Expand all days by default
      const expanded = {};
      response.data.dailyPlans.forEach((_, index) => {
        expanded[index] = true;
      });
      setExpandedDays(expanded);
      
      // Show problems panel if we have problems
      if (response.data.availableProblems?.length > 0) {
        setShowProblemsPanel(true);
      }
      
      toast.success("Lesson plan generated successfully!");
    } catch (error) {
      console.error("Error generating lesson plan:", error);
      toast.error(error.response?.data?.detail || "Failed to generate lesson plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveLessonPlan = async () => {
    if (generatedPlans.length === 0) {
      toast.error("No lesson plan to save");
      return;
    }

    try {
      await axios.post(
        `${API}/lesson-plans`,
        {
          headerFields,
          lessonInput,
          dailyPlans: generatedPlans
        },
        { withCredentials: true }
      );
      toast.success("Lesson plan saved!");
      fetchSavedPlans();
    } catch (error) {
      console.error("Error saving lesson plan:", error);
      toast.error("Failed to save lesson plan");
    }
  };

  const deleteSavedPlan = async (planId) => {
    if (!window.confirm("Delete this saved lesson plan?")) return;
    
    try {
      await axios.delete(`${API}/lesson-plans/${planId}`, {
        withCredentials: true
      });
      toast.success("Lesson plan deleted");
      fetchSavedPlans();
    } catch (error) {
      toast.error("Failed to delete lesson plan");
    }
  };

  const loadSavedPlan = (plan) => {
    setHeaderFields(plan.headerFields);
    setLessonInput(plan.lessonInput);
    setGeneratedPlans(plan.dailyPlans);
    
    const expanded = {};
    plan.dailyPlans.forEach((_, index) => {
      expanded[index] = true;
    });
    setExpandedDays(expanded);
    
    toast.success("Lesson plan loaded");
  };

  const toggleDay = (dayIndex) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayIndex]: !prev[dayIndex]
    }));
  };

  const updateDayContent = (dayIndex, section, value) => {
    const updated = [...generatedPlans];
    updated[dayIndex] = {
      ...updated[dayIndex],
      [section]: value
    };
    setGeneratedPlans(updated);
  };

  const printLessonPlan = () => {
    window.print();
  };

  const formatDate = (dateStr, dayOffset) => {
    // Parse date parts to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day + dayOffset);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Lesson plan sections configuration
  const lessonSections = [
    { key: 'learnerOutcomes', label: 'Learner Outcomes/Objectives', icon: Target, description: 'By the end of the lesson, students will be able to:' },
    { key: 'standards', label: 'Standards', icon: BookOpen },
    { key: 'anticipatorySet', label: 'Anticipatory Set', icon: Sparkles },
    { key: 'teachingTheLesson', label: 'Teaching the Lesson', icon: GraduationCap },
    { key: 'modeling', label: 'Modeling', icon: Users },
    { key: 'instructionalStrategies', label: 'Instructional Strategies', icon: FileText },
    { key: 'checksForUnderstanding', label: 'Checks for Understanding', icon: CheckCircle },
    { key: 'guidedPractice', label: 'Guided Practice', icon: Users, showProblems: true },
    { key: 'independentPractice', label: 'Independent Practice', icon: Edit3, showProblems: true },
    { key: 'closure', label: 'Closure', icon: CheckCircle },
    { key: 'formativeAssessment', label: 'Formative Assessment', icon: FileText },
    { key: 'summativeAssessmentDate', label: 'Summative Assessment Date', icon: Calendar },
    { key: 'extendedActivities', label: 'Extended Activities', icon: Plus },
    { key: 'reviewReteachActivities', label: 'Review/Reteach Activities', icon: BookOpen }
  ];

  // Helper to get problem details by ID
  const getProblemById = (problemId) => {
    return availableProblems.find(p => p.id === problemId);
  };

  // Copy problem link to clipboard
  const copyProblemLink = (problemId) => {
    const link = `${window.location.origin}/library?problem=${problemId}`;
    navigator.clipboard.writeText(link);
    toast.success("Problem link copied!");
  };

  return (
    <div data-testid="lesson-plan-generator" className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .lesson-day { page-break-after: always; }
          .lesson-day:last-child { page-break-after: avoid; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 no-print">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button onClick={() => navigate("/teacher/dashboard")} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-7 h-7 text-indigo-600" />
              <div>
                <span className="text-xl font-bold text-gray-900">Lesson Plan Generator</span>
                <p className="text-xs text-gray-500">{headerFields.schoolName}</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {generatedPlans.length > 0 && (
              <>
                <Button onClick={printLessonPlan} variant="outline" className="gap-2">
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                <Button onClick={saveLessonPlan} className="bg-green-600 hover:bg-green-700 gap-2">
                  <Save className="w-4 h-4" />
                  Save Plan
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-1 space-y-6 no-print">
            {/* Header Fields Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Plan Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="schoolName">School Name</Label>
                  <Input
                    id="schoolName"
                    value={headerFields.schoolName}
                    onChange={(e) => setHeaderFields({ ...headerFields, schoolName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="teacherName">Teacher Name</Label>
                  <Input
                    id="teacherName"
                    value={headerFields.teacherName}
                    onChange={(e) => setHeaderFields({ ...headerFields, teacherName: e.target.value })}
                    placeholder="Enter your name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="className">Class Name</Label>
                  <Input
                    id="className"
                    value={headerFields.className}
                    onChange={(e) => setHeaderFields({ ...headerFields, className: e.target.value })}
                    placeholder="e.g., 7th Grade Math - Period 3"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lessonRange">Lesson Range</Label>
                  <Input
                    id="lessonRange"
                    value={headerFields.lessonRange}
                    onChange={(e) => setHeaderFields({ ...headerFields, lessonRange: e.target.value })}
                    placeholder="e.g., Chapter 2/Lessons 1-6"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="nextMajorAssessment">Next Major Assessment</Label>
                  <Input
                    id="nextMajorAssessment"
                    type="date"
                    value={headerFields.nextMajorAssessment}
                    onChange={(e) => setHeaderFields({ ...headerFields, nextMajorAssessment: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pacing Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Pacing (minutes)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="timePerPeriod">Time per Class Period</Label>
                  <Input
                    id="timePerPeriod"
                    type="number"
                    value={headerFields.timePerPeriod}
                    onChange={(e) => setHeaderFields({ ...headerFields, timePerPeriod: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Intro</Label>
                    <Input
                      type="number"
                      value={headerFields.pacingIntro}
                      onChange={(e) => setHeaderFields({ ...headerFields, pacingIntro: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Direct Instruction</Label>
                    <Input
                      type="number"
                      value={headerFields.pacingDirectInstruction}
                      onChange={(e) => setHeaderFields({ ...headerFields, pacingDirectInstruction: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Guided Practice</Label>
                    <Input
                      type="number"
                      value={headerFields.pacingGuidedPractice}
                      onChange={(e) => setHeaderFields({ ...headerFields, pacingGuidedPractice: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Independent Practice</Label>
                    <Input
                      type="number"
                      value={headerFields.pacingIndependentPractice}
                      onChange={(e) => setHeaderFields({ ...headerFields, pacingIndependentPractice: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Closure</Label>
                    <Input
                      type="number"
                      value={headerFields.pacingClosure}
                      onChange={(e) => setHeaderFields({ ...headerFields, pacingClosure: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Generate Card */}
            <Card className="border-indigo-200 bg-indigo-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  Generate Lesson Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={lessonInput.subject}
                    onChange={(e) => setLessonInput({ ...lessonInput, subject: e.target.value })}
                    placeholder="e.g., Mathematics, English, Science"
                    className="mt-1 bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="topic">Topic/Unit *</Label>
                  <Input
                    id="topic"
                    value={lessonInput.topic}
                    onChange={(e) => setLessonInput({ ...lessonInput, topic: e.target.value })}
                    placeholder="e.g., Fractions and Decimals"
                    className="mt-1 bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="gradeLevel">Grade Level</Label>
                  <Input
                    id="gradeLevel"
                    value={lessonInput.gradeLevel}
                    onChange={(e) => setLessonInput({ ...lessonInput, gradeLevel: e.target.value })}
                    placeholder="e.g., 7th Grade"
                    className="mt-1 bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={lessonInput.startDate}
                      onChange={(e) => setLessonInput({ ...lessonInput, startDate: e.target.value })}
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="numberOfDays">Number of Days</Label>
                    <Input
                      id="numberOfDays"
                      type="number"
                      min="1"
                      max="10"
                      value={lessonInput.numberOfDays}
                      onChange={(e) => setLessonInput({ ...lessonInput, numberOfDays: parseInt(e.target.value) || 1 })}
                      className="mt-1 bg-white"
                    />
                  </div>
                </div>
                <Button 
                  onClick={generateLessonPlan} 
                  disabled={isGenerating}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
                  data-testid="generate-plan-btn"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Plan
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Saved Plans */}
            {savedPlans.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Save className="w-5 h-5 text-green-600" />
                    Saved Plans ({savedPlans.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {savedPlans.map((plan) => (
                        <div 
                          key={plan.id} 
                          className="p-3 bg-gray-50 rounded-lg flex items-center justify-between"
                        >
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => loadSavedPlan(plan)}
                          >
                            <p className="font-medium text-sm">{plan.lessonInput?.topic || "Untitled"}</p>
                            <p className="text-xs text-gray-500">
                              {plan.lessonInput?.subject} • {plan.dailyPlans?.length || 0} days
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSavedPlan(plan.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Available Problems Panel */}
            {availableProblems.length > 0 && (
              <Card className="border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle 
                    className="text-lg flex items-center justify-between cursor-pointer"
                    onClick={() => setShowProblemsPanel(!showProblemsPanel)}
                  >
                    <span className="flex items-center gap-2">
                      <ListChecks className="w-5 h-5 text-green-600" />
                      App Problems ({availableProblems.length})
                    </span>
                    {showProblemsPanel ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </CardTitle>
                </CardHeader>
                {showProblemsPanel && (
                  <CardContent>
                    <p className="text-xs text-gray-500 mb-3">
                      These problems from your library match the lesson topic. Use them for class practice!
                    </p>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {availableProblems.map((problem) => (
                          <div 
                            key={problem.id}
                            className="p-2 bg-green-50 rounded-lg text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-800">{problem.title}</span>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyProblemLink(problem.id)}
                                  className="h-6 px-2 text-green-600"
                                  title="Copy link"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(`/library?problem=${problem.id}`, '_blank')}
                                  className="h-6 px-2 text-green-600"
                                  title="Open"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            {problem.chapter && (
                              <p className="text-xs text-gray-500 mt-1">{problem.chapter}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                )}
              </Card>
            )}
          </div>

          {/* Right Column - Generated Plan */}
          <div className="lg:col-span-2">
            {generatedPlans.length === 0 ? (
              <Card className="h-full flex items-center justify-center min-h-[500px]">
                <CardContent className="text-center py-12">
                  <GraduationCap className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No Lesson Plan Generated</h3>
                  <p className="text-gray-500 max-w-md">
                    Fill in the subject and topic on the left, then click "Generate Plan" to create a comprehensive multi-day lesson plan with AI.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Plan Header - Print Version */}
                <div className="print-only bg-white p-6 rounded-lg">
                  <div className="text-center mb-4">
                    <h1 className="text-2xl font-bold">{headerFields.schoolName}</h1>
                    <h2 className="text-lg">{lessonInput.subject} - {lessonInput.topic}</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <p><strong>Teacher:</strong> {headerFields.teacherName}</p>
                    <p><strong>Class:</strong> {headerFields.className}</p>
                    <p><strong>Lesson Range:</strong> {headerFields.lessonRange}</p>
                    <p><strong>Grade Level:</strong> {lessonInput.gradeLevel}</p>
                    <p><strong>Time per Period:</strong> {headerFields.timePerPeriod} minutes</p>
                    <p><strong>Next Assessment:</strong> {headerFields.nextMajorAssessment}</p>
                  </div>
                  <div className="mt-4 text-sm">
                    <strong>Pacing:</strong> Intro ({headerFields.pacingIntro}m) → Direct Instruction ({headerFields.pacingDirectInstruction}m) → Guided Practice ({headerFields.pacingGuidedPractice}m) → Independent Practice ({headerFields.pacingIndependentPractice}m) → Closure ({headerFields.pacingClosure}m)
                  </div>
                </div>

                {/* Daily Plans */}
                {generatedPlans.map((day, dayIndex) => (
                  <Card key={dayIndex} className="lesson-day">
                    <CardHeader 
                      className="cursor-pointer hover:bg-gray-50 no-print"
                      onClick={() => toggleDay(dayIndex)}
                    >
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-700 font-bold">D{dayIndex + 1}</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">Day {dayIndex + 1}</h3>
                            <p className="text-sm text-gray-500 font-normal">
                              {formatDate(lessonInput.startDate, dayIndex)}
                            </p>
                          </div>
                        </div>
                        {expandedDays[dayIndex] ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </CardTitle>
                    </CardHeader>

                    {/* Print header for each day */}
                    <div className="print-only px-6 pb-2 border-b">
                      <h3 className="text-lg font-bold">Day {dayIndex + 1} - {formatDate(lessonInput.startDate, dayIndex)}</h3>
                    </div>

                    {(expandedDays[dayIndex] || true) && (
                      <CardContent className={`space-y-4 ${!expandedDays[dayIndex] ? 'no-print hidden' : ''}`}>
                        {lessonSections.map((section) => {
                          const Icon = section.icon;
                          const isEditing = editingSection === `${dayIndex}-${section.key}`;
                          
                          return (
                            <div key={section.key} className="border-b border-gray-100 pb-4 last:border-0">
                              <div className="flex items-start gap-2 mb-2">
                                <Icon className="w-4 h-4 text-indigo-600 mt-1 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-gray-800">
                                      {section.label}
                                      {section.description && (
                                        <span className="font-normal text-gray-500 text-sm ml-2">
                                          ({section.description})
                                        </span>
                                      )}
                                    </h4>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingSection(isEditing ? null : `${dayIndex}-${section.key}`)}
                                      className="no-print h-7 px-2"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  
                                  {isEditing ? (
                                    <Textarea
                                      value={day[section.key] || ''}
                                      onChange={(e) => updateDayContent(dayIndex, section.key, e.target.value)}
                                      className="mt-2 min-h-[100px]"
                                      onBlur={() => setEditingSection(null)}
                                      autoFocus
                                    />
                                  ) : (
                                    <div 
                                      className="text-gray-600 mt-1 whitespace-pre-wrap"
                                      dangerouslySetInnerHTML={{ 
                                        __html: toDisplayString(day[section.key]).replace(
                                          /\*\*(.*?)\*\*/g, 
                                          '<strong class="text-gray-900">$1</strong>'
                                        )
                                      }}
                                    />
                                  )}
                                  
                                  {/* Show suggested problems for practice sections */}
                                  {section.showProblems && day.suggestedProblems?.length > 0 && (
                                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg no-print">
                                      <h5 className="text-sm font-semibold text-green-800 flex items-center gap-2 mb-2">
                                        <ListChecks className="w-4 h-4" />
                                        Suggested App Problems
                                      </h5>
                                      <div className="space-y-1">
                                        {day.suggestedProblems.map((problemId, idx) => {
                                          const problem = getProblemById(problemId);
                                          if (!problem) return null;
                                          return (
                                            <div key={idx} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-green-100">
                                              <span className="text-gray-700">{problem.title}</span>
                                              <div className="flex items-center gap-1">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => copyProblemLink(problemId)}
                                                  className="h-6 px-2 text-green-600 hover:text-green-800"
                                                  title="Copy link"
                                                >
                                                  <Copy className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => window.open(`/library?problem=${problemId}`, '_blank')}
                                                  className="h-6 px-2 text-green-600 hover:text-green-800"
                                                  title="Open in library"
                                                >
                                                  <ExternalLink className="w-3 h-3" />
                                                </Button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
