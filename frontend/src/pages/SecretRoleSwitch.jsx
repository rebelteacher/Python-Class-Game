import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SecretRoleSwitch() {
  const navigate = useNavigate();

  useEffect(() => {
    const switchRole = async () => {
      try {
        await axios.post(`${API}/auth/switch-role`, {}, { withCredentials: true });
        alert("Role switched! Redirecting...");
        window.location.href = "/";
      } catch (error) {
        console.error("Error switching role:", error);
        alert("Error switching role. Please try again.");
        navigate("/");
      }
    };

    switchRole();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-cyber-navy/40 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Switching Role...</h1>
        <p className="text-slate-400">Please wait...</p>
      </div>
    </div>
  );
}
