import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Sparkles, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function TrialSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", school: "", grade_level: "" });
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error("Password needs at least 6 characters");
    setBusy(true);
    try {
      const res = await axios.post(`${API}/trial/signup`, form);
      // Store session so subsequent axios calls include the cookie AND localStorage token
      localStorage.setItem("session_token", res.data.session_token);
      localStorage.setItem("user", JSON.stringify(res.data));
      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.session_token}`;
      toast.success(`Welcome to ByteBattles! Your 14-day trial has started.`);
      navigate("/teacher/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Signup failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="trial-signup-page" className="min-h-screen bg-cyber-black cyber-grid-bg text-slate-100 flex flex-col">
      <header className="border-b border-cyber-cyan/20 bg-cyber-navy/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-orbitron text-cyber-cyan text-lg tracking-widest">
            <Sparkles className="w-5 h-5" />
            ByteBattles
          </Link>
          <Link to="/teacher-login" className="text-slate-400 hover:text-cyber-cyan font-chakra text-sm">
            Already have an account? Sign In
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-lime/10 border border-cyber-lime/30 text-cyber-lime text-xs font-orbitron uppercase tracking-widest mb-4">
              14-Day Free Trial
            </div>
            <h1 className="font-chakra font-bold text-white text-4xl mb-2 heading-glow-cyan">Start Your Free Trial</h1>
            <p className="text-slate-300 text-sm">No credit card. Cancel anytime. Full access for 14 days.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-cyber-navy/60 border border-cyber-cyan/20 rounded p-6 space-y-4">
            <div>
              <Label htmlFor="name" className="text-slate-300">Your name</Label>
              <Input
                id="name" data-testid="trial-name"
                required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-cyber-black/60 border-cyber-cyan/20 mt-1 text-white"
                placeholder="Ms. Ramirez"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-slate-300">Work email</Label>
              <Input
                id="email" type="email" data-testid="trial-email"
                required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-cyber-black/60 border-cyber-cyan/20 mt-1 text-white"
                placeholder="you@school.org"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-slate-300">Choose a password</Label>
              <Input
                id="password" type="password" data-testid="trial-password"
                required minLength={6} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="bg-cyber-black/60 border-cyber-cyan/20 mt-1 text-white"
                placeholder="at least 6 characters"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="school" className="text-slate-300">School (optional)</Label>
                <Input
                  id="school" data-testid="trial-school"
                  value={form.school}
                  onChange={(e) => setForm({ ...form, school: e.target.value })}
                  className="bg-cyber-black/60 border-cyber-cyan/20 mt-1 text-white"
                  placeholder="Jefferson MS"
                />
              </div>
              <div>
                <Label htmlFor="grade" className="text-slate-300">Grade (optional)</Label>
                <Input
                  id="grade" data-testid="trial-grade"
                  value={form.grade_level}
                  onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
                  className="bg-cyber-black/60 border-cyber-cyan/20 mt-1 text-white"
                  placeholder="8th"
                />
              </div>
            </div>

            <Button
              type="submit" data-testid="trial-submit-btn" disabled={busy}
              className="w-full py-6 bg-cyber-cyan text-cyber-black hover:shadow-[0_0_30px_rgba(0,240,255,0.7)] font-orbitron text-sm uppercase tracking-widest rounded-none font-bold"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Start 14-Day Trial <ArrowRight className="w-4 h-4 ml-2" /></>}
            </Button>

            <div className="border-t border-cyber-cyan/10 pt-4 mt-2">
              <div className="flex items-start gap-3 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-cyber-lime shrink-0 mt-0.5" />
                <ul className="space-y-1">
                  <li>• We never sell your data or student data</li>
                  <li>• One click to delete everything, anytime</li>
                  <li>• Data is kept 30 days after trial ends, then auto-deleted</li>
                  <li>• $5/month per teacher after trial — cancel anytime</li>
                </ul>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
