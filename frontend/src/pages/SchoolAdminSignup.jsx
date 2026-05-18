import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Lock, Mail, User, Building, Building2, Briefcase } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SchoolAdminSignup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [school, setSchool] = useState("");
  const [district, setDistrict] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (!name || !email || !password || !confirmPassword || !school || !district || !jobTitle) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/auth/school-admin-signup`, {
        name,
        email,
        password,
        school,
        district,
        job_title: jobTitle
      }, {
        withCredentials: true
      });
      
      toast.success("Request submitted! A platform administrator will review your request shortly.");
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(error.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">School Admin Signup</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <CardDescription>
            Request school administrator access (requires approval)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">School Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="principal@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-slate-500">Use your official school email address</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <select
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Select your role...</option>
                  <option value="Principal">Principal</option>
                  <option value="Assistant Principal">Assistant Principal</option>
                  <option value="Administrator">Administrator</option>
                  <option value="Department Head">Department Head</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="school">School Name</Label>
              <div className="relative">
                <Building className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="school"
                  type="text"
                  placeholder="e.g., Lincoln Elementary"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="district">District Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="district"
                  type="text"
                  placeholder="e.g., Springfield School District"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-3">
              <p className="text-sm text-blue-400">
                ℹ️ Your request will be reviewed by a platform administrator. You'll receive access once approved.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Request"}
            </Button>

            <p className="text-center text-sm text-slate-400">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/teacher-login")}
                className="text-emerald-600 hover:underline"
              >
                Login here
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
