import { useState } from 'react';
import { ChevronDown, Sparkles, Loader } from 'lucide-react';

interface AISummaryData {
  summary: string;
  keyPoints: string[];
}

interface AISummaryPanelProps {
  summary?: AISummaryData | string | null;
  keyPoints?: string[];
  isLoading?: boolean;
  onGenerate?: () => void;
}

export function AISummaryPanel({
  summary,
  keyPoints,
  isLoading = false,
  onGenerate,
}: AISummaryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle both old string format and new object format
  let summaryText = '';
  let summaryKeyPoints: string[] = [];
  
  if (summary) {
    if (typeof summary === 'string') {
      summaryText = summary;
    } else if (typeof summary === 'object') {
      summaryText = summary.summary;
      summaryKeyPoints = summary.keyPoints || [];
    }
  }

  // Use passed keyPoints if available, otherwise use keyPoints from summary object
  const displayKeyPoints = keyPoints || summaryKeyPoints;

  if (!summaryText && !isLoading && onGenerate) {
    return (
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3 space-y-2">
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full flex items-center gap-2 text-xs text-yellow-400 hover:text-yellow-500 disabled:opacity-50 font-semibold"
        >
          <Sparkles size={14} />
          Generate AI Summary
        </button>
        <p className="text-[11px] leading-5 text-gray-500 dark:text-gray-400">
          Add some content or upload a file to generate a quick summary and key points.
        </p>
      </div>
    );
  }

  if (!summaryText) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3 space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-xs font-semibold text-yellow-400 hover:text-yellow-500 transition"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} />
          {isLoading ? 'Generating Summary...' : 'AI Summary'}
        </div>
        <ChevronDown
          size={14}
          className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {(isExpanded || isLoading) && (
        <div className="space-y-3 bg-yellow-400/5 dark:bg-yellow-400/10 p-3 rounded">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Loader size={12} className="animate-spin" />
              Generating AI content...
            </div>
          ) : (
            <>
              {summaryText && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Summary:</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {summaryText}
                  </p>
                </div>
              )}

              {displayKeyPoints && displayKeyPoints.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Key Points:</p>
                  <ul className="space-y-1">
                    {displayKeyPoints.map((point, idx) => (
                      <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex gap-2">
                        <span className="text-yellow-400 font-bold">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
