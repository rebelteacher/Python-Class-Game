import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Calendar, Plus, Medal, Award, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function CompetitionManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [competitions, setCompetitions] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClassrooms, setSelectedClassrooms] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minProblems, setMinProblems] = useState(10);

  useEffect(() => {
    fetchCompetitions();
    fetchClassrooms();
  }, []);

  const fetchCompetitions = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/competitions`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCompetitions(data);
      }
    } catch (error) {
      console.error('Error fetching competitions:', error);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/classrooms`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setClassrooms(data);
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    }
  };

  const handleCreateCompetition = async () => {
    if (!title || selectedClassrooms.length < 2 || !startDate || !endDate) {
      toast({
        title: "Missing fields",
        description: "Please fill all required fields and select at least 2 classrooms",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/competitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description,
          classroom_ids: selectedClassrooms,
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
          min_problems_required: minProblems
        })
      });
      
      if (response.ok) {
        toast({
          title: "Competition created!",
          description: "Your competition has been created successfully"
        });
        setCreateDialogOpen(false);
        // Reset form
        setTitle('');
        setDescription('');
        setSelectedClassrooms([]);
        setStartDate('');
        setEndDate('');
        setMinProblems(10);
        fetchCompetitions();
      } else {
        const error = await response.json();
        toast({
          title: "Failed to create",
          description: error.detail || "Something went wrong",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create competition",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleClassroom = (classroomId) => {
    setSelectedClassrooms(prev => 
      prev.includes(classroomId)
        ? prev.filter(id => id !== classroomId)
        : [...prev, classroomId]
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      upcoming: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.upcoming}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Competition Management
            </h1>
            <p className="text-gray-600">Create and manage class vs class competitions</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => navigate('/teacher')} variant="outline">
              Back to Dashboard
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Competition
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Competition</DialogTitle>
                  <DialogDescription>
                    Set up a friendly competition between your classrooms
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Competition Title *</label>
                    <Input
                      placeholder="e.g., Week 1 Python Challenge"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Textarea
                      placeholder="Describe the competition goals..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Classroom Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Select Classrooms * (minimum 2)
                    </label>
                    <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                      {classrooms.length === 0 ? (
                        <p className="text-sm text-gray-500">No classrooms available</p>
                      ) : (
                        classrooms.map(classroom => (
                          <label key={classroom.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={selectedClassrooms.includes(classroom.id)}
                              onChange={() => toggleClassroom(classroom.id)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">{classroom.name}</span>
                            <span className="text-xs text-gray-500">({classroom.students?.length || 0} students)</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Start Date *</label>
                      <Input
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">End Date *</label>
                      <Input
                        type="datetime-local"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Min Problems */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Minimum Problems Required
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={minProblems}
                      onChange={(e) => setMinProblems(parseInt(e.target.value) || 10)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Students must solve at least this many problems to be eligible
                    </p>
                  </div>

                  {/* Create Button */}
                  <Button
                    onClick={handleCreateCompetition}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                  >
                    {loading ? 'Creating...' : 'Create Competition'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Competitions List */}
      <div className="max-w-7xl mx-auto">
        {competitions.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No competitions yet</h3>
              <p className="text-gray-500 mb-4">Create your first class vs class competition!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {competitions.map(comp => (
              <Card 
                key={comp.id} 
                className="border-2 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/teacher/competition/${comp.id}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl mb-2">{comp.title}</CardTitle>
                      <CardDescription>{comp.description}</CardDescription>
                    </div>
                    {getStatusBadge(comp.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Participating Classes */}
                    <div className="flex items-start gap-2">
                      <Users className="w-5 h-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Participating Classes</p>
                        <p className="text-sm text-gray-600">
                          {comp.classrooms?.map(c => c.name).join(', ') || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="flex items-start gap-2">
                      <Calendar className="w-5 h-5 text-pink-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Competition Period</p>
                        <p className="text-xs text-gray-600">
                          {new Date(comp.start_date).toLocaleDateString()} - {new Date(comp.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Min Problems */}
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Min Problems</p>
                        <p className="text-sm text-gray-600">{comp.min_problems_required}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/teacher/competition/${comp.id}`);
                      }}
                    >
                      View Details & Standings
                    </Button>
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

export default CompetitionManagement;
