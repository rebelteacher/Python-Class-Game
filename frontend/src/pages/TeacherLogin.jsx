import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import CyberRain from "@/components/CyberRain";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function TeacherLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/teacher-login`, {
        email,
        password
      }, {
        withCredentials: true  // Important: allows cookies to be set
      });

      // Store session token in localStorage as fallback
      localStorage.setItem("session_token", response.data.session_token);
      
      // Set session cookie
      const maxAge = 7 * 24 * 60 * 60; // 7 days
      const isProduction = window.location.protocol === 'https:';
      const cookieString = `session_token=${response.data.session_token}; path=/; max-age=${maxAge}${isProduction ? '; secure' : ''}; samesite=lax`;
      document.cookie = cookieString;
      
      // Set default axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.session_token}`;
      
      console.log("Cookie set:", cookieString);
      console.log("User data:", response.data);
      
      toast.success("Login successful! Redirecting...");
      
      // Small delay to ensure cookie is written
      setTimeout(() => {
        window.location.href = "/teacher/dashboard";
      }, 500);
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg flex items-center justify-center p-6 relative overflow-hidden">
      <CyberRain density={30} speed={1} />
      <Card className="w-full max-w-md bg-cyber-navy/80 backdrop-blur-xl border border-cyber-cyan/20 rounded-none shadow-[0_0_30px_rgba(0,240,255,0.1)] relative z-10">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-orbitron text-cyber-cyan uppercase tracking-wider heading-glow-cyan">Teacher Login</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-slate-400 hover:text-cyber-cyan"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <CardDescription className="text-slate-400 font-chakra">
            Sign in with your teacher account credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300 font-chakra">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-cyber-cyan/50" />
                <Input
                  id="email"
                  type="email"
                  placeholder="teacher@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-cyber-black/50 border-cyber-cyan/30 text-white placeholder:text-slate-600 focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan rounded-none font-chakra"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 font-chakra">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-cyber-cyan/50" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-cyber-black/50 border-cyber-cyan/30 text-white placeholder:text-slate-600 focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan rounded-none font-chakra"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-cyber-cyan text-cyber-black font-orbitron uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(0,240,255,0.6)] rounded-none border border-cyber-cyan transition-all duration-300 font-bold"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center pt-4 border-t border-cyber-cyan/10">
              <p className="text-sm text-slate-500 mb-2 font-chakra">
                Don't have an account?
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => navigate("/teacher-signup")}
                  className="text-cyber-cyan hover:text-cyber-cyan/80 font-chakra"
                >
                  Teacher Sign Up (with invite code)
                </Button>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => navigate("/signup/school-admin")}
                  className="text-cyber-lime hover:text-cyber-lime/80 font-chakra"
                >
                  School Admin Sign Up (requires approval)
                </Button>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => navigate("/signup/district-admin")}
                  className="text-cyber-pink hover:text-cyber-pink/80 font-chakra"
                >
                  District Admin Sign Up (requires approval)
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
