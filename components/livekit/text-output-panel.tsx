'use client';

import React from 'react';
import { ExternalLink, FileText, Play, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface TextOutputPanelProps {
  isOpen: boolean;
  onClose: () => void;
  textContent: string; // May be plain text OR JSON string containing {content, web_sources, youtube_videos}
  className?: string;
}

export const TextOutputPanel: React.FC<TextOutputPanelProps> = ({
  isOpen,
  onClose,
  textContent,
  className,
}) => {
  // Parse text content to extract structured information
  const parseStructured = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.content) {
        return {
          mainContent: parsed.content as string,
          webSources: Array.isArray(parsed.web_sources) ? parsed.web_sources : [],
          youtubeVideos: Array.isArray(parsed.youtube_videos) ? parsed.youtube_videos : [],
          structured: true,
        };
      }
    } catch (_) {}
    return null;
  };

  const legacyParse = (content: string) => {
    if (!content) return { mainContent: '', webSources: [], youtubeVideos: [], structured: false };
    return { mainContent: content, webSources: [], youtubeVideos: [], structured: false };
  };

  const parsed = parseStructured(textContent) || legacyParse(textContent);
  const { mainContent, webSources, youtubeVideos } = parsed;

  // Format main content with better structure for diagnostic reports
  const formatMainContent = (content: string) => {
    return (
      content
        // Format section headers (Category, Potential Root Causes, etc.)
        .replace(
          /\*\*([^*]+):\*\*/g,
          '<h3 class="text-lg font-bold text-blue-600 dark:text-blue-400 mt-6 mb-3 border-b border-blue-200 dark:border-blue-800 pb-2">$1</h3>'
        )
        // Format single line category descriptions
        .replace(
          /\*\*Category:\*\*\s*([^\n]+)/g,
          '<div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4"><strong class="text-blue-700 dark:text-blue-300">Category:</strong> <span class="text-gray-800 dark:text-gray-200">$1</span></div>'
        )
        // Format bullet points with better styling
        .replace(
          /^• (.+)$/gm,
          '<div class="flex items-start mb-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded"><span class="text-blue-500 mr-3 mt-1 text-lg">•</span><span class="text-gray-800 dark:text-gray-200 leading-relaxed">$1</span></div>'
        )
        // Convert line breaks
        .replace(/\n\n/g, '<div class="my-4"></div>')
        .replace(/\n/g, '<br>')
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              'bg-background fixed top-0 right-0 z-50 h-full w-full max-w-2xl overflow-hidden border-l shadow-2xl',
              className
            )}
          >
            {/* Header */}
            <div className="bg-muted/30 flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Diagnostic Report</h2>
              </div>
              <button
                onClick={onClose}
                className="hover:bg-muted rounded-lg p-2 transition-colors"
                aria-label="Close diagnostic report"
                title="Close diagnostic report"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {/* Main Content - Diagnostic Report */}
              {mainContent && (
                <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-6 dark:border-gray-700 dark:from-gray-900 dark:to-gray-800">
                  <div
                    dangerouslySetInnerHTML={{ __html: formatMainContent(mainContent) }}
                    className="diagnostic-content"
                  />
                </div>
              )}

              {/* Web Sources */}
              {webSources.length > 0 && (
                <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                  <h3 className="mb-3 flex items-center text-lg font-semibold text-blue-600 dark:text-blue-400">
                    <ExternalLink className="mr-2 h-5 w-5" />
                    Web Sources
                  </h3>
                  <div className="space-y-3">
                    {webSources.map((source: { title: string; url: string }, index: number) => (
                      <div key={index} className="border-l-2 border-blue-300 pl-3">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block font-medium text-blue-600 underline transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {source.title}
                        </a>
                        <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                          {source.url}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* YouTube Videos */}
              {youtubeVideos.length > 0 && (
                <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                  <h3 className="mb-3 flex items-center text-lg font-semibold text-red-600 dark:text-red-400">
                    <Play className="mr-2 h-5 w-5" />
                    Diagnostic Videos
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {youtubeVideos.map(
                      (
                        video: {
                          title: string;
                          url: string;
                          thumbnail?: string;
                          video_id?: string;
                        },
                        index: number
                      ) => (
                        <div
                          key={index}
                          className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
                        >
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block"
                          >
                            <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
                              <img
                                src={
                                  video.thumbnail ||
                                  (video.video_id
                                    ? `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`
                                    : 'https://img.youtube.com/vi/default/mqdefault.jpg')
                                }
                                alt={video.title}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'https://img.youtube.com/vi/default/default.jpg';
                                }}
                              />
                              <div className="bg-opacity-20 group-hover:bg-opacity-30 absolute inset-0 flex items-center justify-center bg-black transition-all">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform group-hover:scale-110">
                                  <Play className="ml-1 h-6 w-6 text-white" fill="currentColor" />
                                </div>
                              </div>
                            </div>
                            <div className="p-3">
                              <p className="line-clamp-2 text-sm font-medium text-gray-900 transition-colors group-hover:text-red-600 dark:text-gray-100 dark:group-hover:text-red-400">
                                {video.title}
                              </p>
                            </div>
                          </a>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
