import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Video, Image, Link, FileText, ExternalLink, ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * LessonPopup - A mandatory pop-up that displays instructional materials
 * Students must click "I'm Ready to Begin" to close and start working
 * 
 * Props:
 * - open: boolean - whether dialog is open
 * - onClose: function - called when user acknowledges and closes
 * - lessonTitle: string - title of the lesson
 * - materials: array of { type: 'video'|'image'|'text'|'link', content: string, title?: string }
 */
export default function LessonPopup({ open, onClose, lessonTitle, materials = [] }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const hasMultipleSlides = materials.length > 1;

  const handleClose = () => {
    setCurrentSlide(0);
    onClose();
  };

  const nextSlide = () => {
    if (currentSlide < materials.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const isLastSlide = currentSlide === materials.length - 1;

  // Render content based on type
  const renderContent = (material) => {
    if (!material) return null;

    switch (material.type) {
      case 'video':
        // Handle YouTube, Loom, and other video URLs
        const videoUrl = material.content;
        let embedUrl = videoUrl;
        
        // Convert YouTube URLs to embed format
        if (videoUrl.includes('youtube.com/watch')) {
          const videoId = videoUrl.split('v=')[1]?.split('&')[0];
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (videoUrl.includes('youtu.be/')) {
          const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0];
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (videoUrl.includes('loom.com/share/')) {
          const videoId = videoUrl.split('loom.com/share/')[1]?.split('?')[0];
          embedUrl = `https://www.loom.com/embed/${videoId}`;
        }

        return (
          <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
              src={embedUrl}
              title={material.title || "Lesson Video"}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );

      case 'image':
        return (
          <div className="w-full flex justify-center">
            <img
              src={material.content}
              alt={material.title || "Lesson Image"}
              className="max-w-full max-h-[400px] rounded-lg shadow-md object-contain"
            />
          </div>
        );

      case 'text':
        return (
          <div className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-lg">
            <div className="whitespace-pre-wrap text-gray-700">
              {material.content}
            </div>
          </div>
        );

      case 'link':
        return (
          <a
            href={material.content}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
          >
            <ExternalLink className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <div className="font-medium text-blue-800">{material.title || "External Resource"}</div>
              <div className="text-sm text-blue-600 truncate max-w-md">{material.content}</div>
            </div>
          </a>
        );

      default:
        return null;
    }
  };

  // Get icon for material type
  const getTypeIcon = (type) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'text': return <FileText className="w-4 h-4" />;
      case 'link': return <Link className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  if (!materials || materials.length === 0) {
    return null;
  }

  const currentMaterial = materials[currentSlide];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">{lessonTitle || "Before You Begin..."}</DialogTitle>
              <DialogDescription>
                Review this material before starting the assignment
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Progress indicators for multiple slides */}
        {hasMultipleSlides && (
          <div className="flex items-center justify-center gap-2 py-2">
            {materials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentSlide 
                    ? 'bg-purple-600' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Content area */}
        <ScrollArea className="flex-1 px-1">
          <div className="space-y-4 py-4">
            {/* Material title if exists */}
            {currentMaterial?.title && (
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                {getTypeIcon(currentMaterial.type)}
                <span>{currentMaterial.title}</span>
              </div>
            )}

            {/* Render the content */}
            {renderContent(currentMaterial)}
          </div>
        </ScrollArea>

        {/* Navigation and close button */}
        <DialogFooter className="border-t pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasMultipleSlides && (
              <>
                <Button
                  variant="outline"
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-500 px-2">
                  {currentSlide + 1} of {materials.length}
                </span>
                {!isLastSlide && (
                  <Button
                    variant="outline"
                    onClick={nextSlide}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Can only close on last slide (or single slide) */}
          {(isLastSlide || materials.length === 1) && (
            <Button 
              onClick={handleClose}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
              data-testid="lesson-popup-close-btn"
            >
              I&apos;m Ready to Begin
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
