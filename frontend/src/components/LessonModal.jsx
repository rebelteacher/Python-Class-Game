import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, X, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import ResizableVideoPlayer from './ResizableVideoPlayer';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * LessonModal Component
 * 
 * Displays learning materials with rich content (markdown, images, code examples)
 * Free for students to access anytime while working on assignments
 */
export default function LessonModal({ isOpen, onClose, lesson }) {
  const [showVideo, setShowVideo] = useState(false);

  if (!lesson || !lesson.exists === false) {
    return null;
  }

  const videoUrl = lesson.video_filename 
    ? `${BACKEND_URL}/api/lessons/${lesson.id}/video`
    : null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-2xl">{lesson.title}</DialogTitle>
                  <DialogDescription className="text-sm mt-1">
                    📚 Free learning material • Study as much as you need!
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {videoUrl && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      console.log('Watch Tutorial clicked, videoUrl:', videoUrl);
                      setShowVideo(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 gap-2"
                  >
                    <Video className="w-4 h-4" />
                    Watch Tutorial
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

        <div className="mt-6">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                // Custom rendering for code blocks
                code({node, inline, className, children, ...props}) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline ? (
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  ) : (
                    <code className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
                // Custom rendering for images
                img({node, ...props}) {
                  return (
                    <img
                      {...props}
                      className="rounded-lg shadow-md max-w-full h-auto my-4"
                      alt={props.alt || "Lesson image"}
                      loading="lazy"
                    />
                  );
                },
                // Headings
                h1({node, ...props}) {
                  return <h1 className="text-3xl font-bold text-white mt-6 mb-4" {...props} />;
                },
                h2({node, ...props}) {
                  return <h2 className="text-2xl font-bold text-slate-200 mt-5 mb-3" {...props} />;
                },
                h3({node, ...props}) {
                  return <h3 className="text-xl font-semibold text-slate-200 mt-4 mb-2" {...props} />;
                },
                // Links
                a({node, ...props}) {
                  return (
                    <a
                      {...props}
                      className="text-blue-600 hover:text-blue-400 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  );
                },
                // Lists
                ul({node, ...props}) {
                  return <ul className="list-disc list-inside space-y-2 my-4" {...props} />;
                },
                ol({node, ...props}) {
                  return <ol className="list-decimal list-inside space-y-2 my-4" {...props} />;
                },
                // Paragraphs
                p({node, ...props}) {
                  return <p className="text-slate-300 leading-relaxed my-3" {...props} />;
                },
                // Blockquotes
                blockquote({node, ...props}) {
                  return (
                    <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-500/10 italic text-slate-300" {...props} />
                  );
                },
              }}
            >
              {lesson.content}
            </ReactMarkdown>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t flex justify-between items-center">
          <p className="text-sm text-slate-500">
            💡 Tip: You can come back and review this anytime!
          </p>
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
            Got it! Let's code 🚀
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Resizable Video Player - Floats on top */}
    {showVideo && videoUrl && (
      <ResizableVideoPlayer
        videoUrl={videoUrl}
        onClose={() => setShowVideo(false)}
      />
    )}
  </>
  );
}
