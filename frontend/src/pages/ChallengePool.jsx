import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function ChallengePool() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [problems, setProblems] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [starterCode, setStarterCode] = useState('');
  const [solutionCode, setSolutionCode] = useState('');
  const [testCases, setTestCases] = useState([{ input_data: '', expected_output: '' }]);

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/challenge-problems`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setProblems(data);
      }
    } catch (error) {
      console.error('Error fetching problems:', error);
    }
  };

  const handleAddTestCase = () => {
    setTestCases([...testCases, { input_data: '', expected_output: '' }]);
  };

  const handleTestCaseChange = (index, field, value) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const handleRemoveTestCase = (index) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const handleCreate = async () => {
    if (!title || !description || !solutionCode || testCases.length === 0) {
      toast({
        title: "Missing fields",
        description: "Please fill all required fields and add at least one test case",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/challenge-problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description,
          starter_code: starterCode,
          solution_code: solutionCode,
          test_cases: testCases
        })
      });

      if (response.ok) {
        toast({
          title: "Problem added!",
          description: "Challenge problem has been added to the pool"
        });
        setDialogOpen(false);
        // Reset form
        setTitle('');
        setDescription('');
        setStarterCode('');
        setSolutionCode('');
        setTestCases([{ input_data: '', expected_output: '' }]);
        fetchProblems();
      } else {
        toast({
          title: "Failed",
          description: "Could not add problem",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add problem",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (problemId) => {
    if (!confirm('Delete this challenge problem?')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/challenge-problems/${problemId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Deleted",
          description: "Challenge problem removed"
        });
        fetchProblems();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete problem",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
                Challenge Problem Pool
              </h1>
              <p className="text-gray-600">Problems for student-to-student challenges</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/teacher')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-orange-600 to-red-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Problem
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Challenge Problem</DialogTitle>
                    <DialogDescription>
                      Create a problem for student challenges (5-minute battles)
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Title *</label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Reverse a String"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Description *</label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Problem description..."
                        rows={4}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Starter Code (optional)</label>
                      <Textarea
                        value={starterCode}
                        onChange={(e) => setStarterCode(e.target.value)}
                        placeholder="def solve():\n    # Your code here\n    pass"
                        rows={4}
                        className="font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Solution Code *</label>
                      <Textarea
                        value={solutionCode}
                        onChange={(e) => setSolutionCode(e.target.value)}
                        placeholder="def solve():\n    return 'answer'"
                        rows={4}
                        className="font-mono"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium">Test Cases *</label>
                        <Button onClick={handleAddTestCase} size="sm" variant="outline">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Test Case
                        </Button>
                      </div>
                      {testCases.map((tc, index) => (
                        <div key={index} className="border p-3 rounded mb-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Test Case {index + 1}</span>
                            {testCases.length > 1 && (
                              <Button
                                onClick={() => handleRemoveTestCase(index)}
                                size="sm"
                                variant="ghost"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Input
                              placeholder="Input (leave empty if none)"
                              value={tc.input_data}
                              onChange={(e) => handleTestCaseChange(index, 'input_data', e.target.value)}
                            />
                            <Input
                              placeholder="Expected output *"
                              value={tc.expected_output}
                              onChange={(e) => handleTestCaseChange(index, 'expected_output', e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={handleCreate}
                      className="w-full bg-gradient-to-r from-orange-600 to-red-600"
                    >
                      Add to Challenge Pool
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Problems List */}
        {problems.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No challenge problems yet</h3>
              <p className="text-gray-500 mb-4">Add problems for students to battle with!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {problems.map(problem => (
              <Card key={problem.id} className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{problem.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-2">{problem.description}</p>
                    </div>
                    <Button
                      onClick={() => handleDelete(problem.id)}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600">
                    <p><strong>{problem.test_cases?.length || 0}</strong> test cases</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Added {new Date(problem.created_at).toLocaleDateString()}
                    </p>
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

export default ChallengePool;
