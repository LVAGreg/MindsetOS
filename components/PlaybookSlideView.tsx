'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PlaybookSlideViewProps {
  content: string;
  title?: string;
  onClose: () => void;
}

export function PlaybookSlideView({ content, title, onClose }: PlaybookSlideViewProps) {
  const slides = content.split(/\n---\n/).map(s => s.trim()).filter(Boolean);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const goNext = useCallback(() => {
    setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, onClose]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  if (slides.length < 2) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900/80 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 font-medium">{title || 'Presentation'}</span>
          <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded">
            {currentSlide + 1} / {slides.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center relative px-16">
        {/* Prev button */}
        <button
          onClick={goPrev}
          disabled={currentSlide === 0}
          className="absolute left-4 p-3 text-gray-500 hover:text-white hover:bg-gray-800/50 rounded-full transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        {/* Content */}
        <div className="w-full max-w-4xl max-h-[75vh] overflow-y-auto px-12 py-8">
          <div className="prose prose-invert prose-lg max-w-none
            prose-headings:text-white prose-headings:font-bold
            prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
            prose-p:text-gray-300 prose-p:text-xl prose-p:leading-relaxed
            prose-li:text-gray-300 prose-li:text-lg
            prose-strong:text-amber-400
            prose-code:text-amber-300 prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-blockquote:border-amber-500 prose-blockquote:text-gray-400
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {slides[currentSlide]}
            </ReactMarkdown>
          </div>
        </div>

        {/* Next button */}
        <button
          onClick={goNext}
          disabled={currentSlide === slides.length - 1}
          className="absolute right-4 p-3 text-gray-500 hover:text-white hover:bg-gray-800/50 rounded-full transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>

      {/* Slide indicators */}
      <div className="flex justify-center gap-1.5 py-4 bg-gray-900/80 border-t border-gray-800">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i === currentSlide
                ? 'bg-amber-500 scale-125'
                : 'bg-gray-700 hover:bg-gray-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
