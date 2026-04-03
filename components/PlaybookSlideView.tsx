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
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: '#09090f' }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{ background: 'rgba(18,18,31,0.8)', borderColor: '#1e1e30' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="text-sm font-medium"
            style={{ color: '#ededf5' }}
          >
            {title || 'Presentation'}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{ color: '#9090a8', background: '#1e1e30' }}
          >
            {currentSlide + 1} / {slides.length}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#9090a8' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#ededf5';
              (e.currentTarget as HTMLElement).style.background = '#1e1e30';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#9090a8';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            aria-label="Close presentation"
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#9090a8' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#ededf5';
              (e.currentTarget as HTMLElement).style.background = '#1e1e30';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#9090a8';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
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
          aria-label="Previous slide"
          className="absolute left-4 p-3 rounded-full transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          style={{ color: '#5a5a72' }}
          onMouseEnter={(e) => {
            if (!(e.currentTarget as HTMLElement).disabled) {
              (e.currentTarget as HTMLElement).style.color = '#ededf5';
              (e.currentTarget as HTMLElement).style.background = 'rgba(18,18,31,0.5)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#5a5a72';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        {/* Content */}
        <div className="w-full max-w-4xl max-h-[75vh] overflow-y-auto px-12 py-8">
          <div
            className="prose prose-invert prose-lg max-w-none
              prose-headings:font-bold
              prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
              prose-p:text-xl prose-p:leading-relaxed
              prose-li:text-lg
            "
            style={
              {
                '--tw-prose-headings': '#ededf5',
                '--tw-prose-body': '#ededf5',
                '--tw-prose-bold': '#fcc824',
                '--tw-prose-code': '#fcc824',
                '--tw-prose-quotes': '#9090a8',
              } as React.CSSProperties
            }
          >
            <style>{`
              .prose code { background: #1e1e30; padding: 0.125rem 0.375rem; border-radius: 0.25rem; color: #fcc824; }
              .prose blockquote { border-left-color: #fcc824; color: #9090a8; }
              .prose p, .prose li { color: #9090a8; }
              .prose h1, .prose h2, .prose h3, .prose h4 { color: #ededf5; }
              .prose strong { color: #fcc824; }
            `}</style>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {slides[currentSlide]}
            </ReactMarkdown>
          </div>
        </div>

        {/* Next button */}
        <button
          onClick={goNext}
          disabled={currentSlide === slides.length - 1}
          aria-label="Next slide"
          className="absolute right-4 p-3 rounded-full transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          style={{ color: '#5a5a72' }}
          onMouseEnter={(e) => {
            if (!(e.currentTarget as HTMLElement).disabled) {
              (e.currentTarget as HTMLElement).style.color = '#ededf5';
              (e.currentTarget as HTMLElement).style.background = 'rgba(18,18,31,0.5)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#5a5a72';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>

      {/* Slide indicators */}
      <div
        className="flex justify-center gap-1.5 py-4 flex-wrap border-t"
        style={{ background: 'rgba(18,18,31,0.8)', borderColor: '#1e1e30' }}
      >
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="w-2.5 h-2.5 rounded-full transition-all"
            style={{
              background: i === currentSlide ? '#fcc824' : '#1e1e30',
              transform: i === currentSlide ? 'scale(1.25)' : 'scale(1)',
            }}
            onMouseEnter={(e) => {
              if (i !== currentSlide) {
                (e.currentTarget as HTMLElement).style.background = '#5a5a72';
              }
            }}
            onMouseLeave={(e) => {
              if (i !== currentSlide) {
                (e.currentTarget as HTMLElement).style.background = '#1e1e30';
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
