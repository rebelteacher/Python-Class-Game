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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, Save, Sparkles, Printer, FileText, Calendar, Clock, 
  GraduationCap, BookOpen, Target, Users, CheckCircle, Loader2,
  ChevronDown, ChevronUp, Edit3, Trash2, Plus, Download, 
  ListChecks, ExternalLink, Copy, Upload, X
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
    nextMajorAssessment: "",
    // Standards and objectives that the AI should use
    standards: "",
    objectives: "",
    // Toggle: let AI auto-generate these fields per-lesson instead of using the text above
    aiGenerateStandards: false,
    aiGenerateObjectives: false,
  });

  // Lesson plan templates uploaded by the teacher (.docx / .pdf)
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  // Weekly schedule — each row: {day_label, unit, chapter, lesson, span_days}
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);

  // Lesson plan generation inputs
  const [lessonInput, setLessonInput] = useState({
    subject: "",
    topic: "",
    gradeLevel: "7th Grade",
    startDate: new Date().toISOString().split('T')[0],
    numberOfDays: 5,
    // Specific unit/chapter for problem filtering
    problemUnit: "",
    problemChapter: ""
  });

  // Generated lesson plans
  const [generatedPlans, setGeneratedPlans] = useState([]);
  const [availableProblems, setAvailableProblems] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedPlans, setSavedPlans] = useState([]);
  const [expandedDays, setExpandedDays] = useState({});
  const [editingSection, setEditingSection] = useState(null);
  const [showProblemsPanel, setShowProblemsPanel] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Curriculum structure for dropdowns
  const [curriculumStructure, setCurriculumStructure] = useState({ units: [], chapters: [] });
  // Nested curriculum for the Weekly Schedule dropdowns:
  //   [{name: "Unit 1: ...", chapters: [{name, lessons: [{name}]}]}]
  const [curriculumUnits, setCurriculumUnits] = useState([]);

  // Load saved header fields from localStorage and fetch curriculum structure
  useEffect(() => {
    const savedHeader = localStorage.getItem('lessonPlanHeader');
    if (savedHeader) {
      setHeaderFields(prev => ({ ...prev, ...JSON.parse(savedHeader) }));
    }
    fetchSavedPlans();
    fetchCurriculumStructure();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const r = await axios.get(`${API}/lesson-plans/templates`, { withCredentials: true });
      setTemplates(r.data || []);
      if (r.data && r.data.length && !selectedTemplateId) {
        setSelectedTemplateId(r.data[0].id);
      }
    } catch (e) {
      console.error("Error fetching templates:", e);
    }
  };

  const handleTemplateUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", file.name.replace(/\.(docx|pdf)$/i, ""));
    setUploadingTemplate(true);
    try {
      const r = await axios.post(`${API}/lesson-plans/templates`, fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Template "${r.data.name}" uploaded!`);
      setSelectedTemplateId(r.data.id);
      fetchTemplates();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploadingTemplate(false);
      e.target.value = "";
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await axios.delete(`${API}/lesson-plans/templates/${id}`, { withCredentials: true });
      toast.success("Template deleted");
      if (selectedTemplateId === id) setSelectedTemplateId("");
      fetchTemplates();
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  // Weekly schedule helpers
  const addScheduleRow = () => {
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const nextIdx = weeklySchedule.length;
    setWeeklySchedule([
      ...weeklySchedule,
      {
        day_label: dayNames[nextIdx % 5],
        unit: "",
        chapter: "",
        lesson: "",
        span_days: 1,
      },
    ]);
  };

  const updateScheduleRow = (idx, patch) => {
    setWeeklySchedule(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const removeScheduleRow = (idx) => {
    setWeeklySchedule(prev => prev.filter((_, i) => i !== idx));
  };

  // Download one generated day as a .docx that matches the teacher's uploaded template.
  const downloadDayAsDocx = async (planId, dayIndex, dayLabel) => {
    try {
      const url = `${API}/lesson-plans/${planId}/download/${dayIndex}`;
      const r = await axios.get(url, { withCredentials: true, responseType: "blob" });
      const blob = new Blob([r.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const dlUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      const safe = (dayLabel || `Day-${dayIndex + 1}`).replace(/[^A-Za-z0-9_\-]+/g, "_");
      a.download = `${safe}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(dlUrl);
      toast.success("Downloaded!");
    } catch (err) {
      console.error(err);
      let msg = "Download failed";
      // axios turns 4xx responses into blobs when responseType is blob — try to parse the JSON
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          msg = parsed.detail || msg;
        } catch (_) { /* ignore */ }
      } else if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      toast.error(msg);
    }
  };

  const generateFromWeeklySchedule = async () => {    if (weeklySchedule.length === 0) {
      toast.error("Add at least one day to your schedule");
      return;
    }
    const invalid = weeklySchedule.find(r => !r.unit || !r.chapter || !r.lesson);
    if (invalid) {
      toast.error("Every day needs Unit, Chapter, and Lesson selected");
      return;
    }
    // Expand multi-day spans into individual day entries so the AI generates
    // Day-1-of-N and Day-2-of-N variants for each spanning lesson.
    const expanded = [];
    let dayIdx = 0;
    for (const row of weeklySchedule) {
      const span = Math.max(1, parseInt(row.span_days || 1, 10));
      // Find the assignment_type from the selected Unit — pass it directly to the
      // backend so grounding works regardless of unit-name changes.
      const unitObj = curriculumUnits.find(u => u.name === row.unit);
      const atype = unitObj?.assignment_type || null;
      for (let d = 1; d <= span; d++) {
        expanded.push({
          day_label: span === 1 ? row.day_label : `${row.day_label} (Day ${d} of ${span})`,
          day_index: dayIdx++,
          unit: row.unit,
          chapter: row.chapter,
          lesson: row.lesson,
          assignment_type: atype,
          span_days: span,
          day_within_span: d,
        });
      }
    }
    setGeneratingSchedule(true);
    try {
      const r = await axios.post(
        `${API}/lesson-plans/generate-from-schedule`,
        {
          template_id: selectedTemplateId || null,
          schedule: expanded,
          header_fields: headerFields,
          ai_generate_standards: !!headerFields.aiGenerateStandards,
          ai_generate_objectives: !!headerFields.aiGenerateObjectives,
        },
        { withCredentials: true }
      );
      toast.success(`Generated ${r.data.plans.length} day(s) of lesson plans!`);
      // Tag each plan with the parent plan id + day index so we can wire download buttons.
      const tagged = (r.data.plans || []).map((p, idx) => ({
        ...p,
        _plan_id: r.data.id,
        _day_index: idx,
      }));
      setGeneratedPlans(tagged);
      fetchSavedPlans();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Generation failed");
    } finally {
      setGeneratingSchedule(false);
    }
  };

  // Save header fields to localStorage when changed
  useEffect(() => {
    localStorage.setItem('lessonPlanHeader', JSON.stringify(headerFields));
  }, [headerFields]);

  const fetchCurriculumStructure = async () => {
    try {
      const response = await axios.get(`${API}/curriculum-structure`, {
        withCredentials: true
      });
      setCurriculumStructure(response.data);
    } catch (error) {
      console.error("Error fetching curriculum structure:", error);
    }
    try {
      // Also fetch the nested version (chapters -> lessons) for the Weekly Schedule dropdowns
      const nested = await axios.get(`${API}/curriculum/units`, { withCredentials: true });
      // /api/curriculum/units returns an array of {name, assignment_type, chapters: [{name, lessons: [{name, ...}]}]}
      setCurriculumUnits(Array.isArray(nested.data) ? nested.data : []);
    } catch (error) {
      console.error("Error fetching nested curriculum units:", error);
    }
  };

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
    if (!lessonInput.problemChapter || !lessonInput.problemUnit) {
      toast.error("Please select a Chapter and a Lesson in 'Pull Problems From' — required so the AI knows which ByteBattles unit to use.");
      return;
    }

    // Find the parent unit (assignment_type) from the selected chapter name
    let unitObj = null;
    let chapterObj = null;
    for (const u of curriculumUnits) {
      const c = (u.chapters || []).find(c => c.name === lessonInput.problemChapter);
      if (c) { unitObj = u; chapterObj = c; break; }
    }
    if (!unitObj || !chapterObj) {
      toast.error("Couldn't find the selected chapter in the curriculum. Please pick again.");
      return;
    }

    // Convert the OLD generator's single-topic + N-days shape into the schedule
    // shape used by the new template-aware endpoint. Treat this as ONE lesson
    // spanning `numberOfDays` days (Day 1 = intro/modeling; Day 2+ = independent/reteach).
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const nDays = Math.max(1, parseInt(lessonInput.numberOfDays || "1", 10));
    const startDate = lessonInput.startDate ? new Date(lessonInput.startDate) : null;
    const expanded = [];
    for (let d = 0; d < nDays; d++) {
      let label = dayNames[d % 7];
      if (startDate) {
        const dt = new Date(startDate);
        dt.setDate(dt.getDate() + d);
        label = `${dayNames[dt.getDay() === 0 ? 6 : dt.getDay() - 1]}, ${(dt.getMonth() + 1)}/${dt.getDate()}`;
      }
      expanded.push({
        day_label: label,
        day_index: d,
        unit: unitObj.name,
        chapter: chapterObj.name,
        lesson: lessonInput.problemUnit,  // Legacy: OLD form calls the LESSON field "problemUnit"
        assignment_type: unitObj.assignment_type,
        span_days: nDays,
        day_within_span: d + 1,
      });
    }

    setIsGenerating(true);
    try {
      const response = await axios.post(
        `${API}/lesson-plans/generate-from-schedule`,
        {
          template_id: selectedTemplateId || null,
          schedule: expanded,
          header_fields: { ...headerFields, ...lessonInput },
          ai_generate_standards: !!headerFields.aiGenerateStandards,
          ai_generate_objectives: !!headerFields.aiGenerateObjectives,
        },
        { withCredentials: true }
      );

      const tagged = (response.data.plans || []).map((p, idx) => ({
        ...p,
        _plan_id: response.data.id,
        _day_index: idx,
      }));
      setGeneratedPlans(tagged);
      setAvailableProblems([]);

      const expandedState = {};
      tagged.forEach((_, index) => { expandedState[index] = true; });
      setExpandedDays(expandedState);

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

  // Export lesson plan as Word document
  const exportAsDocument = async () => {
    if (generatedPlans.length === 0) {
      toast.error("No lesson plan to export");
      return;
    }

    setIsExporting(true);
    try {
      const response = await axios.post(
        `${API}/export-lesson-plan`,
        {
          headerFields,
          lessonInput,
          dailyPlans: generatedPlans
        },
        { 
          withCredentials: true,
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `Lesson_Plan_${lessonInput.topic.replace(/\s+/g, '_')}_${lessonInput.startDate}.docx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Lesson plan downloaded!");
    } catch (error) {
      console.error("Error exporting lesson plan:", error);
      toast.error("Failed to export lesson plan");
    } finally {
      setIsExporting(false);
    }
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
    <div data-testid="lesson-plan-generator" className="min-h-screen bg-cyber-black cyber-grid-bg">
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
      <nav className="bg-cyber-navy/80 backdrop-blur-xl border-b border-cyber-cyan/20 no-print">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button onClick={() => navigate("/teacher/dashboard")} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-7 h-7 text-cyber-cyan" />
              <div>
                <span className="text-xl font-bold text-white">Lesson Plan Generator</span>
                <p className="text-xs text-slate-500">{headerFields.schoolName}</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {generatedPlans.length > 0 && (
              <>
                <Button 
                  onClick={exportAsDocument} 
                  disabled={isExporting}
                  variant="outline" 
                  className="gap-2"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download
                </Button>
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
                  <FileText className="w-5 h-5 text-cyber-cyan" />
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
                  <Label htmlFor="lessonRange">Week Date Range</Label>
                  <Input
                    id="lessonRange"
                    value={headerFields.lessonRange}
                    onChange={(e) => setHeaderFields({ ...headerFields, lessonRange: e.target.value })}
                    placeholder="e.g., 8/10/2026 - 8/14/2026"
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">The dates covered by this weekly lesson plan</p>
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
                  <Clock className="w-5 h-5 text-cyber-cyan" />
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

            {/* Standards & Objectives Card */}
            <Card className="border-purple-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Standards & Objectives
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="standards">Standards</Label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        data-testid="lp-ai-generate-standards"
                        checked={!!headerFields.aiGenerateStandards}
                        onChange={(e) => setHeaderFields({ ...headerFields, aiGenerateStandards: e.target.checked })}
                      />
                      <span>Let AI generate standards</span>
                    </label>
                  </div>
                  <Textarea
                    id="standards"
                    value={headerFields.standards}
                    onChange={(e) => setHeaderFields({ ...headerFields, standards: e.target.value })}
                    disabled={!!headerFields.aiGenerateStandards}
                    placeholder="Paste your state/district standards here, e.g.:
CCSS.MATH.CONTENT.7.NS.A.1
ISTE 1.1.c - Students use technology to seek feedback..."
                    className={`mt-1 text-sm ${headerFields.aiGenerateStandards ? 'opacity-50' : ''}`}
                    rows={4}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {headerFields.aiGenerateStandards
                      ? "AI will generate relevant CS standards for each lesson."
                      : "These standards will be incorporated into generated lessons."}
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="objectives">Learning Objectives</Label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        data-testid="lp-ai-generate-objectives"
                        checked={!!headerFields.aiGenerateObjectives}
                        onChange={(e) => setHeaderFields({ ...headerFields, aiGenerateObjectives: e.target.checked })}
                      />
                      <span>Let AI generate objectives</span>
                    </label>
                  </div>
                  <Textarea
                    id="objectives"
                    value={headerFields.objectives}
                    onChange={(e) => setHeaderFields({ ...headerFields, objectives: e.target.value })}
                    disabled={!!headerFields.aiGenerateObjectives}
                    placeholder="Enter specific learning objectives, e.g.:
- Students will understand variables and data types
- Students will be able to write basic loops
- Students will debug simple programs"
                    className={`mt-1 text-sm ${headerFields.aiGenerateObjectives ? 'opacity-50' : ''}`}
                    rows={4}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {headerFields.aiGenerateObjectives
                      ? "AI will write SWBAT-style objectives from the lesson content."
                      : "These objectives will guide the AI's lesson content."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Template Library Card */}
            <Card className="border-cyan-500/30" data-testid="lp-template-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-cyan-500" />
                  Lesson Plan Template
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-500">
                  Upload a .docx or .pdf of your school's template. The AI will use its structure
                  (section headings, order, and level of detail) when generating your lesson plans.
                </p>
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded border border-cyan-500/40 bg-cyber-navy/40 hover:bg-cyber-navy/60 cursor-pointer text-sm">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  {uploadingTemplate ? "Uploading…" : "Upload .docx or .pdf"}
                  <input
                    type="file"
                    accept=".docx,.pdf"
                    onChange={handleTemplateUpload}
                    disabled={uploadingTemplate}
                    className="hidden"
                    data-testid="lp-upload-template"
                  />
                </label>
                {templates.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No templates uploaded yet.</p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1" data-testid="lp-template-list">
                    {templates.map(t => (
                      <div
                        key={t.id}
                        className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${selectedTemplateId === t.id ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-700 hover:border-cyan-500/40'}`}
                        onClick={() => setSelectedTemplateId(t.id)}
                      >
                        <input
                          type="radio"
                          name="lp-template"
                          checked={selectedTemplateId === t.id}
                          onChange={() => setSelectedTemplateId(t.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{t.name}</div>
                          <div className="text-[10px] text-slate-500 uppercase flex items-center gap-2">
                            <span>{t.format} · {t.uploaded_at?.slice(0, 10)}</span>
                            {t.fillable ? (
                              <span className="text-emerald-400 normal-case">✓ fillable</span>
                            ) : (
                              <span className="text-amber-400 normal-case" title="PDF templates are used only as a style guide — the AI can't fill them. Upload a .docx to enable downloads that match your template exactly.">
                                ⚠ style-guide only
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          data-testid={`lp-del-template-${t.id}`}
                          onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                          className="text-slate-500 hover:text-red-400 p-1"
                          title="Delete template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Schedule Card */}
            <Card className="border-emerald-500/30" data-testid="lp-weekly-schedule-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                  Weekly Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-500">
                  Map each school day to a ByteBattles lesson. Use <b>Spans</b> if you're spreading
                  one lesson across multiple days — the AI will split Day 1 (intro + modeling +
                  guided practice) from Day 2+ (independent practice + reteach + closure).
                </p>
                {weeklySchedule.map((row, idx) => {
                  const unitObj = curriculumUnits.find(u => u.name === row.unit);
                  const chapterOptions = unitObj?.chapters || [];
                  const chapterObj = chapterOptions.find(c => c.name === row.chapter);
                  const lessonOptions = (chapterObj?.lessons || []).filter(l => l.name && !l.is_orphan);
                  return (
                    <div key={idx} className="border border-emerald-500/20 rounded p-2 space-y-2" data-testid={`lp-schedule-row-${idx}`}>
                      <div className="flex items-center gap-2">
                        <Input
                          value={row.day_label}
                          onChange={(e) => updateScheduleRow(idx, { day_label: e.target.value })}
                          placeholder="e.g., Monday"
                          className="w-32 text-sm"
                        />
                        <select
                          value={row.unit}
                          onChange={(e) => updateScheduleRow(idx, { unit: e.target.value, chapter: "", lesson: "" })}
                          className="flex-1 text-sm bg-slate-900 text-slate-100 border border-slate-700 rounded p-1.5 focus:border-emerald-500 focus:outline-none [&>option]:bg-slate-900 [&>option]:text-slate-100"
                        >
                          <option value="">-- Unit --</option>
                          {curriculumUnits.map(u => (
                            <option key={u.name} value={u.name}>{u.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeScheduleRow(idx)}
                          className="text-slate-500 hover:text-red-400 p-1"
                          title="Remove row"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={row.chapter}
                          onChange={(e) => updateScheduleRow(idx, { chapter: e.target.value, lesson: "" })}
                          disabled={!row.unit}
                          className="flex-1 min-w-0 text-sm bg-slate-900 text-slate-100 border border-slate-700 rounded p-1.5 focus:border-emerald-500 focus:outline-none disabled:opacity-50 [&>option]:bg-slate-900 [&>option]:text-slate-100"
                        >
                          <option value="">-- Chapter --</option>
                          {chapterOptions.map(c => (
                            <option key={c.name} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                        <select
                          value={row.lesson}
                          onChange={(e) => updateScheduleRow(idx, { lesson: e.target.value })}
                          disabled={!row.chapter}
                          className="flex-1 min-w-0 text-sm bg-slate-900 text-slate-100 border border-slate-700 rounded p-1.5 focus:border-emerald-500 focus:outline-none disabled:opacity-50 [&>option]:bg-slate-900 [&>option]:text-slate-100"
                        >
                          <option value="">-- Lesson --</option>
                          {lessonOptions.map(l => (
                            <option key={l.name} value={l.name}>{l.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">This lesson spans:</span>
                        <select
                          value={row.span_days}
                          onChange={(e) => updateScheduleRow(idx, { span_days: parseInt(e.target.value, 10) })}
                          className="text-sm bg-slate-900 text-slate-100 border border-slate-700 rounded p-1.5 focus:border-emerald-500 focus:outline-none [&>option]:bg-slate-900 [&>option]:text-slate-100"
                          title="Number of days this lesson spans"
                        >
                          <option value={1}>1 day</option>
                          <option value={2}>2 days</option>
                          <option value={3}>3 days</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addScheduleRow}
                  data-testid="lp-add-schedule-row"
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add day
                </Button>
                <Button
                  type="button"
                  onClick={generateFromWeeklySchedule}
                  disabled={generatingSchedule || weeklySchedule.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  data-testid="lp-generate-schedule"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  {generatingSchedule ? "Generating…" : `Generate ${weeklySchedule.length} day(s) of plans`}
                </Button>
              </CardContent>
            </Card>


            {/* Generate Card */}
            <Card className="border-indigo-200 bg-indigo-500/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyber-cyan" />
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
                    className="mt-1 bg-cyber-navy/60"
                  />
                </div>
                <div>
                  <Label htmlFor="topic">Topic/Unit *</Label>
                  <Input
                    id="topic"
                    value={lessonInput.topic}
                    onChange={(e) => setLessonInput({ ...lessonInput, topic: e.target.value })}
                    placeholder="e.g., Fractions and Decimals"
                    className="mt-1 bg-cyber-navy/60"
                  />
                </div>
                <div>
                  <Label htmlFor="gradeLevel">Grade Level</Label>
                  <Input
                    id="gradeLevel"
                    value={lessonInput.gradeLevel}
                    onChange={(e) => setLessonInput({ ...lessonInput, gradeLevel: e.target.value })}
                    placeholder="e.g., 7th Grade"
                    className="mt-1 bg-cyber-navy/60"
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
                      className="mt-1 bg-cyber-navy/60"
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
                      className="mt-1 bg-cyber-navy/60"
                    />
                  </div>
                </div>
                
                {/* Problem Source Filter - Dropdowns */}
                <Separator className="my-2" />
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <Label className="text-green-400 font-semibold text-sm flex items-center gap-2 mb-2">
                    <ListChecks className="w-4 h-4" />
                    Pull Problems From <span className="text-red-400">*required</span>
                  </Label>
                  <p className="text-xs text-slate-400 mb-2">
                    Required — tells the AI which ByteBattles unit/chapter/lesson to use so it doesn't guess.
                  </p>
                  
                  {curriculumStructure.chapters.length > 0 ? (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-green-400">Unit / Chapter</Label>
                        <Select
                          value={lessonInput.problemChapter}
                          onValueChange={(value) => setLessonInput({ 
                            ...lessonInput, 
                            problemChapter: value === "none" ? "" : value 
                          })}
                        >
                          <SelectTrigger className="mt-1 bg-cyber-navy/60">
                            <SelectValue placeholder="Select a unit/chapter..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- All Chapters --</SelectItem>
                            {curriculumStructure.chapters.map((ch) => (
                              <SelectItem key={ch.name} value={ch.name}>
                                {ch.displayName || ch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Show lessons dropdown if a chapter is selected */}
                      {lessonInput.problemChapter && (
                        <div>
                          <Label className="text-xs text-green-400">Lesson <span className="text-red-400">*required</span></Label>
                          <Select
                            value={lessonInput.problemUnit}
                            onValueChange={(value) => setLessonInput({ 
                              ...lessonInput, 
                              problemUnit: value === "none" ? "" : value 
                            })}
                          >
                            <SelectTrigger className="mt-1 bg-cyber-navy/60">
                              <SelectValue placeholder="Select a lesson..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">-- All Lessons --</SelectItem>
                              {curriculumStructure.chapters
                                .find(ch => ch.name === lessonInput.problemChapter)
                                ?.lessons.map((lesson) => (
                                  <SelectItem key={lesson} value={lesson}>
                                    {lesson}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="problemUnit" className="text-xs text-green-400">Unit</Label>
                        <Input
                          id="problemUnit"
                          value={lessonInput.problemUnit}
                          onChange={(e) => setLessonInput({ ...lessonInput, problemUnit: e.target.value })}
                          placeholder="e.g., Unit 2: Turtle Graphics"
                          className="mt-1 bg-cyber-navy/60 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="problemChapter" className="text-xs text-green-400">Chapter</Label>
                        <Input
                          id="problemChapter"
                          value={lessonInput.problemChapter}
                          onChange={(e) => setLessonInput({ ...lessonInput, problemChapter: e.target.value })}
                          placeholder="e.g., Chapter 3: Colors"
                          className="mt-1 bg-cyber-navy/60 text-sm"
                        />
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-green-600 mt-2">
                    Only pull practice problems from this specific chapter/lesson
                  </p>
                </div>
                
                <Button 
                  onClick={generateLessonPlan} 
                  disabled={isGenerating}
                  className="w-full bg-cyber-cyan text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] font-bold gap-2"
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
                          className="p-3 bg-cyber-navy/40 rounded-lg flex items-center justify-between"
                        >
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => loadSavedPlan(plan)}
                          >
                            <p className="font-medium text-sm">{plan.lessonInput?.topic || "Untitled"}</p>
                            <p className="text-xs text-slate-500">
                              {plan.lessonInput?.subject} • {plan.dailyPlans?.length || 0} days
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSavedPlan(plan.id)}
                            className="text-red-500 hover:text-red-400"
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
              <Card className="border-green-500/30">
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
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                {showProblemsPanel && (
                  <CardContent>
                    <p className="text-xs text-slate-500 mb-3">
                      These problems from your library match the lesson topic. Use them for class practice!
                    </p>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {availableProblems.map((problem) => (
                          <div 
                            key={problem.id}
                            className="p-2 bg-green-500/10 rounded-lg text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-200">{problem.title}</span>
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
                              <p className="text-xs text-slate-500 mt-1">{problem.chapter}</p>
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
                  <h3 className="text-xl font-semibold text-slate-400 mb-2">No Lesson Plan Generated</h3>
                  <p className="text-slate-500 max-w-md">
                    Fill in the subject and topic on the left, then click "Generate Plan" to create a comprehensive multi-day lesson plan with AI.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Plan Header - Print Version */}
                <div className="print-only bg-cyber-navy/60 p-6 rounded-lg">
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
                      className="cursor-pointer hover:bg-cyber-navy/40 no-print"
                      onClick={() => toggleDay(dayIndex)}
                    >
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                            <span className="text-indigo-400 font-bold">D{dayIndex + 1}</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">Day {dayIndex + 1}</h3>
                            <p className="text-sm text-slate-500 font-normal">
                              {day.day_label || formatDate(lessonInput.startDate, dayIndex)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {day._plan_id && day.sections && Object.keys(day.sections).length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-cyan-400 hover:bg-cyan-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadDayAsDocx(day._plan_id, day._day_index, day.day_label);
                              }}
                              data-testid={`lp-download-day-${dayIndex}`}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download .docx
                            </Button>
                          )}
                          {expandedDays[dayIndex] ? (
                            <ChevronUp className="w-5 h-5 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-500" />
                          )}
                        </div>
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
                            <div key={section.key} className="border-b border-cyber-cyan/10 pb-4 last:border-0">
                              <div className="flex items-start gap-2 mb-2">
                                <Icon className="w-4 h-4 text-cyber-cyan mt-1 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-slate-200">
                                      {section.label}
                                      {section.description && (
                                        <span className="font-normal text-slate-500 text-sm ml-2">
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
                                      className="text-slate-400 mt-1 whitespace-pre-wrap"
                                      dangerouslySetInnerHTML={{ 
                                        __html: toDisplayString(day[section.key]).replace(
                                          /\*\*(.*?)\*\*/g, 
                                          '<strong class="text-white">$1</strong>'
                                        )
                                      }}
                                    />
                                  )}
                                  
                                  {/* Show suggested problems for practice sections */}
                                  {section.showProblems && day.suggestedProblems?.length > 0 && (
                                    <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg no-print">
                                      <h5 className="text-sm font-semibold text-green-400 flex items-center gap-2 mb-2">
                                        <ListChecks className="w-4 h-4" />
                                        Suggested App Problems
                                      </h5>
                                      <div className="space-y-1">
                                        {day.suggestedProblems.map((problemId, idx) => {
                                          const problem = getProblemById(problemId);
                                          if (!problem) return null;
                                          return (
                                            <div key={idx} className="flex items-center justify-between text-sm bg-cyber-navy/60 p-2 rounded border border-green-100">
                                              <span className="text-slate-300">{problem.title}</span>
                                              <div className="flex items-center gap-1">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => copyProblemLink(problemId)}
                                                  className="h-6 px-2 text-green-600 hover:text-green-400"
                                                  title="Copy link"
                                                >
                                                  <Copy className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => window.open(`/library?problem=${problemId}`, '_blank')}
                                                  className="h-6 px-2 text-green-600 hover:text-green-400"
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
