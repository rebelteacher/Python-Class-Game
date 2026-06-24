import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, KeyRound } from "lucide-react";
import CyberRain from "@/components/CyberRain";

export default function ForgotPassword() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg relative overflow-hidden">
      <CyberRain />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md bg-cyber-navy/80 border border-cyber-magenta/40 rounded-none backdrop-blur-sm">
          <CardHeader>
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="self-start mb-2 text-cyber-cyan hover:bg-cyber-cyan/10 rounded-none w-fit gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 border border-cyber-magenta/50 bg-cyber-magenta/10 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-cyber-magenta" />
              </div>
              <CardTitle className="text-white font-orbitron uppercase tracking-widest text-lg">
                Forgot password?
              </CardTitle>
            </div>
            <CardDescription className="text-slate-400 font-chakra">
              No worries — your administrator can reset it for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border border-cyber-magenta/20 bg-cyber-magenta/5 rounded-none p-4">
              <p className="text-sm text-slate-300 font-chakra leading-relaxed">
                Please email your ByteBattles administrator with:
              </p>
              <ul className="text-sm text-slate-300 font-chakra mt-2 space-y-1 ml-4">
                <li>• The email address you used to sign up</li>
                <li>• Your name (so we can verify it's you)</li>
              </ul>
              <p className="text-sm text-slate-300 font-chakra mt-3 leading-relaxed">
                You'll receive a temporary password and a link to set a new one.
              </p>
            </div>

            <a
              href="mailto:astapp@spanola.net?subject=ByteBattles%20Password%20Reset%20Request&body=Hi%20Amy%2C%0A%0AI%20forgot%20my%20ByteBattles%20password.%20Please%20reset%20it%20for%20me.%0A%0AEmail%3A%20%0AName%3A%20%0A%0AThanks!"
              data-testid="email-admin-link"
              className="flex items-center justify-center gap-2 w-full bg-cyber-magenta text-white hover:shadow-[0_0_20px_rgba(255,0,170,0.5)] font-orbitron uppercase tracking-widest text-xs rounded-none border border-cyber-magenta transition-all duration-300 font-bold py-2.5"
            >
              <Mail className="h-4 w-4" />
              Email Admin
            </a>

            <div className="text-center pt-2">
              <Button
                type="button"
                variant="link"
                onClick={() => navigate("/teacher-login")}
                className="text-cyber-cyan hover:text-cyber-cyan/80 font-chakra text-sm"
              >
                Back to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
