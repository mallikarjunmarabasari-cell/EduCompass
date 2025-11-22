import { useState } from 'react';
import { X, Plus, Trash2, Upload } from 'lucide-react';
import { detectCategory, extractYouTubeId, getYouTubeThumbnail } from '../../utils/linkUtils';
import type { Resource } from '../../types';

interface AddResourceModalProps {
  onClose: () => void;
  onAdd: (resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt' | 'boardId'>) => void;
}

export function AddResourceModal({ onClose, onAdd }: AddResourceModalProps) {
  const [title, setTitle] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [category, setCategory] = useState<Resource['category']>('Reading');
  const [status, setStatus] = useState<Resource['status']>('todo');
  const [description, setDescription] = useState('');
  const [moduleTag, setModuleTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUrlChange = (index: number, newUrl: string) => {
    const updatedUrls = [...urls];
    updatedUrls[index] = newUrl;
    setUrls(updatedUrls);
    if (index === 0 && newUrl) {
      setCategory(detectCategory(newUrl));
    }
  };

  const handleAddUrl = () => {
    setUrls([...urls, '']);
  };

  const handleRemoveUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for either URL or PDF file (at least one required)
    if (!title.trim()) return;
    const hasUrls = urls.some(url => url.trim());
    if (!hasUrls && !pdfFile) return;

    setLoading(true);
    try {
      let thumbnailUrl: string | undefined;
      let primaryUrl = '';
      let resourceCategory = category;

      // Handle PDF file upload
      if (pdfFile) {
        const formData = new FormData();
        formData.append('file', pdfFile);
        
        try {
          console.log("📤 Uploading PDF file:", pdfFile.name);
          const uploadResponse = await fetch('/api/upload/pdf', {
            method: 'POST',
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            console.log("✅ PDF uploaded, response:", uploadResult);
            const { fileUrl } = uploadResult;
            primaryUrl = fileUrl;
            if (!resourceCategory.includes('PDF')) {
              resourceCategory = 'PDF';
            }
            console.log("✅ PDF URL set to:", primaryUrl);
          }
        } catch (error) {
          console.error('Error uploading PDF:', error);
          primaryUrl = `pdf://${pdfFile.name}`;
        }
      }

      // If no PDF or no primaryUrl from PDF, use first URL as primary
      if (!primaryUrl) {
        const firstUrl = urls.find(url => url.trim());
        if (firstUrl) {
          primaryUrl = firstUrl;
          
          if (category === 'Video') {
            const videoId = extractYouTubeId(primaryUrl);
            if (videoId) {
              thumbnailUrl = getYouTubeThumbnail(videoId);
            }
          }
        }
      }

      // Collect all URLs (both manual entries and PDF if present)
      let finalUrls: string[] = [];
      
      // Add all manual URLs
      const manualUrls = urls.filter(url => url.trim());
      finalUrls.push(...manualUrls);
      
      // Add PDF URL if it exists and not already in manual URLs
      if (primaryUrl && primaryUrl.includes('/uploads/pdfs')) {
        if (!finalUrls.includes(primaryUrl)) {
          finalUrls.unshift(primaryUrl); // Add PDF as first
        }
      }
      
      // If still no URLs, use primaryUrl
      if (finalUrls.length === 0 && primaryUrl) {
        finalUrls = [primaryUrl];
      }

      const resourceData = {
        title,
        url: primaryUrl,
        urls: finalUrls,
        tags: tags,
        category: resourceCategory,
        status,
        progress: 0,
        description,
        moduleTag,
        thumbnailUrl,
        hasPracticeAssignment: true,
        assignmentCompleted: false,
        latestAssignmentScore: undefined,
      };

      console.log("📤 Sending resource data to backend:", resourceData);

      await onAdd(resourceData);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    const val = tagInput.trim();
    if (!val) return;
    const normalized = val.replace(/^#/, '');
    if (!tags.includes(normalized)) setTags([...tags, normalized]);
    setTagInput('');
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Resource</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Resource Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Operating Systems Crash Course"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              required
            />
          </div>

          {/* URL / Links and PDF Upload Section */}
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                Resources (URLs and/or PDF) *
              </label>
              <button
                type="button"
                onClick={handleAddUrl}
                className="p-1 hover:bg-yellow-400/20 rounded-lg transition text-yellow-400"
                title="Add another link"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* URLs Section */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Links</label>
              {urls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    placeholder={index === 0 ? "https://youtube.com/watch?v=... (optional)" : "Additional link (optional)"}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  {urls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveUrl(index)}
                      className="p-2 hover:bg-red-500/20 rounded transition text-red-500"
                      title="Remove link"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* PDF Upload Section */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">PDF File (Optional)</label>
              {pdfFile ? (
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Upload size={18} className="text-yellow-400" />
                    <span className="text-sm text-gray-900 dark:text-white">{pdfFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPdfFile(null)}
                    className="p-1 hover:bg-red-500/20 rounded transition text-red-500"
                    title="Remove PDF"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPdfFile(file);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer"
                />
              )}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 pt-2">
              💡 Tip: You can add both links and a PDF file. At least one is required.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Resource['category'])}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="Video">Video</option>
                <option value="Notes">Notes</option>
                <option value="PDF">PDF</option>
                <option value="Practice">Practice Problems</option>
                <option value="Reading">Reading</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Resource['status'])}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this resource..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none h-20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Module/Topic Tag (Optional)
            </label>
            <input
              type="text"
              value={moduleTag}
              onChange={(e) => setModuleTag(e.target.value)}
              placeholder="e.g., Module 1, Chapter 3"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {/* Tags Section */}
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <label className="block text-sm font-medium text-gray-900 dark:text-white">
              Tags (Optional) - Press Enter or click + to add
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="e.g., chem_101, review_later"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="p-2 hover:bg-yellow-400/20 rounded-lg transition text-yellow-400"
                title="Add tag"
              >
                <Plus size={18} />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 px-3 py-1 bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 rounded-full text-sm"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(index)}
                      className="hover:text-yellow-700 dark:hover:text-yellow-300"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition font-medium disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
