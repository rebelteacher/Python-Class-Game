import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MessageCircle, Mail, User, Tag, Calendar, Reply, Trash2, Check, Eye } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminMessages({ user }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [filter, setFilter] = useState("all"); // all, unread, read, resolved

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/admin/feedback`, {
        withCredentials: true,
      });
      setMessages(response.data.messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (messageId, status) => {
    try {
      await axios.put(
        `${API}/admin/feedback/${messageId}/status`,
        null,
        {
          params: { status },
          withCredentials: true,
        }
      );
      fetchMessages();
      toast.success(`Marked as ${status}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) {
      toast.error("Please enter a reply");
      return;
    }

    setReplying(true);
    try {
      const response = await axios.post(
        `${API}/admin/feedback/${selectedMessage.id}/reply`,
        { reply: replyText },
        { withCredentials: true }
      );

      toast.success(response.data.message);
      setReplyDialogOpen(false);
      setReplyText("");
      setSelectedMessage(null);
      fetchMessages();
      
      // Show the user's email for manual follow-up
      if (response.data.user_email) {
        toast.info(`User email: ${response.data.user_email}`, { duration: 10000 });
      }
    } catch (error) {
      console.error("Error replying:", error);
      toast.error("Failed to save reply");
    } finally {
      setReplying(false);
    }
  };

  const handleDelete = async (messageId) => {
    if (!window.confirm("Are you sure you want to delete this message?")) {
      return;
    }

    try {
      await axios.delete(`${API}/admin/feedback/${messageId}`, {
        withCredentials: true,
      });
      toast.success("Message deleted");
      fetchMessages();
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    }
  };

  const openReplyDialog = (message) => {
    setSelectedMessage(message);
    setReplyText(message.admin_reply || "");
    setReplyDialogOpen(true);
  };

  const filteredMessages = messages.filter(msg => {
    if (filter === "all") return true;
    return msg.status === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "unread": return "bg-red-100 text-red-800";
      case "read": return "bg-blue-100 text-blue-800";
      case "resolved": return "bg-green-100 text-green-800";
      default: return "bg-cyber-navy/30 text-slate-200";
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "question": return "❓";
      case "bug": return "🐛";
      case "feature": return "💡";
      default: return "💬";
    }
  };

  return (
    <div className="min-h-screen bg-cyber-black cyber-grid-bg">
      <nav className="bg-cyber-navy/80 backdrop-blur-xl border-b border-cyber-cyan/20">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => navigate("/admin-dashboard")}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-7 h-7 text-cyber-cyan" />
              <span className="text-xl font-bold text-white">User Messages</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-10">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {["all", "unread", "read", "resolved"].map((f) => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              className={filter === f ? "bg-cyber-cyan text-cyber-black" : ""}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "unread" && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {messages.filter(m => m.status === "unread").length}
                </span>
              )}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-slate-400">Loading messages...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <MessageCircle className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No Messages</h3>
              <p className="text-slate-500">
                {filter === "all" ? "No messages yet" : `No ${filter} messages`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((message) => (
              <Card key={message.id} className={message.status === "unread" ? "border-l-4 border-l-red-500" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getCategoryIcon(message.category)}</span>
                        <div>
                          <CardTitle className="text-lg">{message.name}</CardTitle>
                          <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {message.email}
                            </span>
                            {message.user_type && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {message.user_type}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(message.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(message.status)}`}>
                        {message.status}
                      </span>
                      <span className="ml-2 inline-block px-2 py-1 rounded text-xs font-semibold bg-cyber-navy/30 text-slate-200">
                        {message.category}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-cyber-navy/40 p-4 rounded-lg">
                      <p className="text-slate-200 whitespace-pre-wrap">{message.message}</p>
                    </div>

                    {message.admin_reply && (
                      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                        <p className="text-sm font-semibold text-blue-900 mb-2">Your Reply:</p>
                        <p className="text-slate-200 whitespace-pre-wrap">{message.admin_reply}</p>
                        {message.replied_at && (
                          <p className="text-xs text-slate-500 mt-2">
                            Replied on {new Date(message.replied_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={() => openReplyDialog(message)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 gap-2"
                      >
                        <Reply className="w-4 h-4" />
                        {message.admin_reply ? "Edit Reply" : "Reply"}
                      </Button>

                      {message.status === "unread" && (
                        <Button
                          onClick={() => updateStatus(message.id, "read")}
                          size="sm"
                          variant="outline"
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Mark as Read
                        </Button>
                      )}

                      {message.status !== "resolved" && (
                        <Button
                          onClick={() => updateStatus(message.id, "resolved")}
                          size="sm"
                          variant="outline"
                          className="gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Mark as Resolved
                        </Button>
                      )}

                      <Button
                        onClick={() => handleDelete(message.id)}
                        size="sm"
                        variant="outline"
                        className="gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>

                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(message.email);
                          toast.success("Email copied to clipboard!");
                        }}
                        size="sm"
                        variant="outline"
                        className="gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Copy Email
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to {selectedMessage?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-cyber-navy/40 p-4 rounded-lg">
              <p className="text-sm font-semibold text-slate-300 mb-2">Original Message:</p>
              <p className="text-slate-200 whitespace-pre-wrap">{selectedMessage?.message}</p>
            </div>

            <div>
              <Label htmlFor="reply">Your Reply</Label>
              <Textarea
                id="reply"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your response here..."
                rows={8}
                className="mt-1"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                📧 <strong>Note:</strong> Your reply will be saved here. Copy the user's email ({selectedMessage?.email}) to send your response manually until email integration is set up.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => {
                  setReplyDialogOpen(false);
                  setReplyText("");
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReply}
                disabled={replying}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {replying ? "Saving..." : "Save Reply"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
