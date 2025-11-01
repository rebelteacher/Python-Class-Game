import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Zap } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminAddCoins() {
  const navigate = useNavigate();
  const [studentEmail, setStudentEmail] = useState("");
  const [coinsToAdd, setCoinsToAdd] = useState(500);
  const [loading, setLoading] = useState(false);

  const handleAddCoins = async (e) => {
    e.preventDefault();
    
    if (!studentEmail) {
      toast.error("Please enter student email");
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/admin/fix-student-account`, {
        student_email: studentEmail,
        coins_to_add: parseInt(coinsToAdd),
        items: {}
      }, {
        withCredentials: true
      });

      toast.success(`Successfully added ${coinsToAdd} coins to ${studentEmail}!`);
      setStudentEmail("");
      setCoinsToAdd(500);
    } catch (error) {
      console.error("Add coins error:", error);
      toast.error(error.response?.data?.detail || "Failed to add coins");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-green-200">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <Button onClick={() => navigate("/admin-dashboard")} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="flex items-center space-x-2 pt-4">
            <Zap className="w-8 h-8 text-green-600" />
            <CardTitle className="text-2xl font-bold">Add Coins to Student</CardTitle>
          </div>
          <CardDescription>
            Refund or bonus coins for students (Admin only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddCoins} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentEmail">Student Email</Label>
              <Input
                id="studentEmail"
                type="email"
                placeholder="student@gmail.com"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coins">Coins to Add</Label>
              <Input
                id="coins"
                type="number"
                min="1"
                value={coinsToAdd}
                onChange={(e) => setCoinsToAdd(e.target.value)}
                required
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> Student must be logged in for changes to take effect. They should refresh their page after you add coins.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? "Adding coins..." : `Add ${coinsToAdd} Coins`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
