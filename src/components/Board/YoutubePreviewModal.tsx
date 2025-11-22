import { X } from 'lucide-react';
import { extractYouTubeId } from '../../utils/linkUtils';

interface YoutubePreviewModalProps {
  url: string;
  title: string;
  onClose: () => void;
}

export function YoutubePreviewModal({ url, title, onClose }: YoutubePreviewModalProps) {
  const videoId = extractYouTubeId(url);

  if (!videoId) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invalid YouTube URL</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Could not extract video ID from URL: {url}</p>
        </div>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-4xl w-full p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* YouTube Embed */}
        <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={embedUrl}
            title={title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-center"
          >
            Open on YouTube
          </a>
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
