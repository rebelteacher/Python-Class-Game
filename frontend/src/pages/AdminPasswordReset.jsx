import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, KeyRound, Copy, Check } from "lucide-react";
import CyberRain from "@/components/CyberRain";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminPasswordReset() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Enter the user's email");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/admin/reset-user-password`, { email: email.trim() }, { withCredentials: true });
      setResult(res.data);
      toast.success("Temporary password generated");
    } catch (error) {
      console.error("Reset failed:", error);
      toast.error(error.response?.data?.detail || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!result?.temp_password) return;
    try {
      await navigator.clipboard.writeText(result.temp_password);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg relative overflow-hidden">
      <CyberRain />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md bg-cyber-navy/80 border border-cyber-magenta/40 rounded-none backdrop-blur-sm">
          <CardHeader>
            <Button
              variant="ghost"
              onClick={() => navigate("/admin-dashboard")}
              className="self-start mb-2 text-cyber-cyan hover:bg-cyber-cyan/10 rounded-none w-fit gap-2"
              data-testid="back-to-admin-btn"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 border border-cyber-magenta/50 bg-cyber-magenta/10 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-cyber-magenta" />
              </div>
              <CardTitle className="text-white font-orbitron uppercase tracking-widest text-lg">
                Reset User Password
              </CardTitle>
            </div>
            <CardDescription className="text-slate-400 font-chakra">
              Generate a temporary password for a user. Share it with them out-of-band (text, phone, secure message).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label htmlFor="user-email" className="text-cyber-cyan font-chakra text-sm">User's Email</Label>
                <Input
                  id="user-email"
                  data-testid="reset-user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@example.com"
                  className="mt-1 bg-cyber-black/50 border-cyber-cyan/30 text-white placeholder:text-slate-600 rounded-none font-chakra"
                />
              </div>
              <Button
                type="submit"
                data-testid="generate-temp-password-btn"
                disabled={loading}
                className="w-full bg-cyber-magenta text-white hover:shadow-[0_0_20px_rgba(255,0,170,0.5)] font-orbitron uppercase tracking-widest text-xs rounded-none border border-cyber-magenta transition-all duration-300 font-bold"
              >
                {loading ? "Generating..." : "Generate Temp Password"}
              </Button>
            </form>

            {result && (
              <div className="border border-cyber-magenta/40 bg-cyber-magenta/5 rounded-none p-4 space-y-2" data-testid="reset-result">
                <div className="text-[10px] font-orbitron uppercase tracking-[0.2em] text-cyber-magenta">
                  Temporary Password
                </div>
                <div className="text-sm text-slate-300 font-chakra">
                  For <strong className="text-white">{result.name || result.email}</strong>:
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-cyber-black/50 border border-cyber-cyan/30 text-cyber-cyan font-mono px-3 py-2 text-sm select-all">
                    {result.temp_password}
                  </code>
                  <Button
                    type="button"
                    onClick={copyToClipboard}
                    variant="outline"
                    size="sm"
                    data-testid="copy-temp-password-btn"
                    className="border-cyber-cyan/40 text-cyber-cyan rounded-none gap-1 hover:bg-cyber-cyan/10"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-slate-400 font-chakra leading-relaxed">
                  Share this password with the user via text, phone, or another secure channel — not email if their account email is the one you're resetting. They'll be able to sign in with it and should change it from their profile right away.
                </p>
                <p className="text-[10px] text-slate-500 font-chakra">
                  All previous sessions for this user have been invalidated.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
