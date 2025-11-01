import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Mail } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminAccountFix() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("astapp@spanola.net");
  const [studentEmail, setStudentEmail] = useState("");
  const [coinsToAdd, setCoinsToAdd] = useState(500);
  const [loading, setLoading] = useState(false);
  const [loadingCoins, setLoadingCoins] = useState(false);

  const handleFix = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API}/admin/emergency-fix-account`, {
        email
      });

      toast.success(response.data.message || "Account fixed successfully!");
      
      setTimeout(() => {
        navigate("/teacher-login");
      }, 2000);
    } catch (error) {
      console.error("Fix error:", error);
      toast.error(error.response?.data?.detail || "Failed to fix account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-purple-200">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" />
            <CardTitle className="text-2xl font-bold">Emergency Account Fix</CardTitle>
          </div>
          <CardDescription>
            Use this page if your teacher account was accidentally changed to student
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFix} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Your Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="astapp@spanola.net"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>How it works:</strong> This page will restore your account (astapp@spanola.net) to teacher/admin status. No password needed - just click the button below!
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={loading}
            >
              {loading ? "Fixing account..." : "Fix My Account"}
            </Button>

            <div className="text-center pt-4 border-t">
              <Button
                type="button"
                variant="link"
                onClick={() => navigate("/")}
                className="text-indigo-600"
              >
                Back to Home
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
