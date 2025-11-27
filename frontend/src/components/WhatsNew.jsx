import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Calendar } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function WhatsNew() {
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    checkForNew();
  }, []);

  const checkForNew = async () => {
    try {
      const response = await axios.get(`${API}/announcements`, {
        withCredentials: true,
      });
      const announcements = response.data.announcements || [];
      setHasNew(announcements.length > 0);
    } catch (error) {
      console.error("Error checking announcements:", error);
    }
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/announcements`, {
        withCredentials: true,
      });
      setAnnouncements(response.data.announcements || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    fetchAnnouncements();
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="outline"
        size="sm"
        className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 relative"
      >
        <Sparkles className="w-4 h-4" />
        What's New
        {hasNew && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="w-6 h-6 text-purple-600" />
              What's New in ByteBattles Arena
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="py-20 text-center">
              <p className="text-gray-600">Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-20 text-center">
              <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Announcements</h3>
              <p className="text-gray-500">Check back later for updates!</p>
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              {announcements.map((announcement, index) => (
                <div
                  key={announcement.id}
                  className="border-l-4 border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 p-5 rounded-r-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{announcement.title}</h3>
                    {index === 0 && (
                      <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full">
                        NEW
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(announcement.created_at)}</span>
                  </div>
                  
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {announcement.content}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t">
            <Button onClick={() => setOpen(false)} className="w-full bg-purple-600 hover:bg-purple-700">
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
