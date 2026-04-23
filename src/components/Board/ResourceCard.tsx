import { useState } from 'react';
import { Trash2, ExternalLink, ChevronDown } from 'lucide-react';
import { getCategoryColor } from '../../utils/linkUtils';
import type { Resource } from '../../types';
import { AssignmentBadge } from './AssignmentBadge';
import { EditResourceModal } from './EditResourceModal';
import { YoutubePreviewModal } from './YoutubePreviewModal';
import { AISummaryPanel, AIFlashcards } from '../AI';
import { aiService } from '../../services/api';

interface ResourceCardProps {
  resource: Resource;
  onStatusChange: (id: string, status: Resource['status']) => void;
  onProgressChange: (id: string, progress: number) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Resource>) => void;
  isReadOnly?: boolean;
}

export function ResourceCard({
  resource,
  onStatusChange,
  onProgressChange,
  onDelete,
  onUpdate,
  isReadOnly = false,
}: ResourceCardProps) {
  const [showProgressEditor, setShowProgressEditor] = useState(false);
  const [tempProgress, setTempProgress] = useState(resource.progress);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showYoutubePreview, setShowYoutubePreview] = useState(false);
  const [selectedYoutubeUrl, setSelectedYoutubeUrl] = useState<string>('');
  const [aiSummary, setAISummary] = useState<{ summary: string; keyPoints: string[] } | null>(null);
  const [aiFlashcards, setAIFlashcards] = useState<any>(null);
  const [aiLoading, setAILoading] = useState(false);
  const [aiLoaded, setAILoaded] = useState(false);

  const handleProgressSave = () => {
    onProgressChange(resource.id, tempProgress);
    setShowProgressEditor(false);
  };

  const handleGenerateAI = async () => {
    if (aiLoaded) return;
    
    try {
      setAILoading(true);
      console.log(`🤖 Generating AI content for ${resource.title}`);
      
      const response = await aiService.generateContent(resource.id, resource.url);
      
      if (response.data) {
        setAISummary({
          summary: response.data.summary,
          keyPoints: response.data.keyPoints || []
        });
        setAIFlashcards(response.data.flashcards);
        setAILoaded(true);
      }
    } catch (error) {
      console.error('Error generating AI content:', error);
      // Try to fetch if already generated
      try {
        const summaryRes = await aiService.getSummary(resource.id);
        const flashcardsRes = await aiService.getFlashcards(resource.id);
        setAISummary({
          summary: summaryRes.data.summary,
          keyPoints: summaryRes.data.key_points || []
        });
        setAIFlashcards(flashcardsRes.data.flashcards);
        setAILoaded(true);
      } catch (e) {
        console.error('Failed to fetch generated AI content:', e);
      }
    } finally {
      setAILoading(false);
    }
  };

  const statuses: Array<Resource['status']> = ['todo', 'in-progress', 'completed'];

  return (
    <>
      <div className="card-elevated p-4 space-y-3 group">
        {/* Title and Actions */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-yellow-400 transition line-clamp-2">
              {resource.title}
            </h3>
          </div>
          {!isReadOnly && (
            <button
              onClick={() => onDelete(resource.id)}
              className="p-1 hover:bg-red-500/20 rounded-lg transition opacity-0 group-hover:opacity-100"
              title="Delete resource"
            >
              <Trash2 size={16} className="text-red-500" />
            </button>
          )}
        </div>

        {/* Category Badge */}
        <div className="flex items-center gap-2">
          <span className={`badge ${getCategoryColor(resource.category)}`}>
            {resource.category}
          </span>
          {resource.thumbnailUrl && (
            <img
              src={resource.thumbnailUrl}
              alt="thumbnail"
              className="w-10 h-10 rounded object-cover"
            />
          )}
        </div>

        {/* Description */}
        {resource.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{resource.description}</p>
        )}

        {/* Multiple Links */}
        {resource.urls && resource.urls.length > 0 && (
          <div className="space-y-2 p-2 bg-gray-100/50 dark:bg-gray-800/50 rounded">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Links ({resource.urls.length})</p>
            <div className="space-y-1">
              {resource.urls.map((link, index) => {
                const isYouTube = link.includes('youtube.com') || link.includes('youtu.be');
                const isPDF = link.includes('.pdf') || link.startsWith('/uploads/pdfs');
                const isRelativePath = link.startsWith('/');
                
                // Get hostname for absolute URLs, or filename for relative paths
                let displayName = link;
                try {
                  if (!isRelativePath && !isPDF) {
                    displayName = new URL(link).hostname || link;
                  } else if (isPDF) {
                    displayName = '📄 PDF';
                  } else {
                    displayName = link.split('/').pop() || link;
                  }
                } catch (e) {
                  // Fallback if URL parsing fails
                  displayName = isPDF ? '📄 PDF' : link;
                }
                
                return (
                  <div key={index} className="flex items-center gap-1">
                    {isYouTube ? (
                      <button
                        onClick={() => {
                          setSelectedYoutubeUrl(link);
                          setShowYoutubePreview(true);
                        }}
                        className="flex-1 text-left text-xs px-2 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition flex items-center gap-1"
                        title="Click to preview"
                      >
                        <span className="text-xs">▶</span>
                        <span className="truncate">YouTube</span>
                      </button>
                    ) : (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-left text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 transition truncate"
                        title={link}
                      >
                        {displayName}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <button
              onClick={() => setShowProgressEditor(!showProgressEditor)}
              className="text-yellow-400 hover:text-yellow-500 font-semibold disabled:opacity-50"
              disabled={isReadOnly}
            >
              {resource.progress}%
            </button>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${resource.progress}%` }}
            ></div>
          </div>
        </div>

        {/* Progress Editor */}
        {showProgressEditor && !isReadOnly && (
          <div className="space-y-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
            <input
              type="range"
              min="0"
              max="100"
              value={tempProgress}
              onChange={(e) => setTempProgress(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex gap-2">
              <button
                onClick={handleProgressSave}
                className="flex-1 px-2 py-1 bg-yellow-400 text-black text-xs font-semibold rounded hover:bg-yellow-500 transition"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowProgressEditor(false);
                  setTempProgress(resource.progress);
                }}
                className="flex-1 px-2 py-1 bg-gray-400 text-white text-xs font-semibold rounded hover:bg-gray-500 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Assignment Badge */}
        <AssignmentBadge resource={resource} />

        {/* Status and Link */}
        <div className="flex gap-2 pt-2">
          <div className="relative flex-1">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="w-full flex items-center justify-between px-3 py-1 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition disabled:opacity-50"
              disabled={isReadOnly}
            >
              <span className="capitalize">{resource.status}</span>
              <ChevronDown size={14} />
            </button>
            {showStatusMenu && !isReadOnly && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded shadow-lg z-10">
                {statuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      onStatusChange(resource.id, status);
                      setShowStatusMenu(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-xs capitalize hover:bg-yellow-400/20 transition ${
                      status === resource.status ? 'bg-yellow-400/10 font-semibold' : ''
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-yellow-400/20 text-yellow-400 rounded text-xs font-medium hover:bg-yellow-400/30 transition"
            title="Open resource"
          >
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Edit Button */}
        {!isReadOnly && (
          <button
            onClick={() => setShowEditModal(true)}
            className="w-full text-xs py-1 text-gray-600 dark:text-gray-400 hover:text-yellow-400 transition"
          >
            Edit
          </button>
        )}

        {/* AI Content Panels */}
        <AISummaryPanel
          summary={aiSummary}
          isLoading={aiLoading}
          onGenerate={handleGenerateAI}
        />
        <AIFlashcards
          flashcards={aiFlashcards}
          isLoading={aiLoading}
        />
      </div>

      {showEditModal && (
        <EditResourceModal
          resource={resource}
          onClose={() => setShowEditModal(false)}
          onUpdate={(updates) => {
            onUpdate(resource.id, updates);
            setShowEditModal(false);
          }}
        />
      )}

      {showYoutubePreview && selectedYoutubeUrl && (
        <YoutubePreviewModal
          url={selectedYoutubeUrl}
          title={resource.title}
          onClose={() => {
            setShowYoutubePreview(false);
            setSelectedYoutubeUrl('');
          }}
        />
      )}
    </>
  );
}
