import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Upload } from 'lucide-react';
import type { Resource, Tag } from '../../types';
import { TagInput } from '../Search/TagInput';
import { buildThumbnailsByUrl, extractUploadedFileUrl, extractYouTubeId, getAllowedFileAccept, getUploadRoute, getYouTubeThumbnail, inferCategoryFromFile, normalizeTagNames, resolveResourceCategory, hasResourceFormChanges } from '../../utils/linkUtils';
import { tagService } from '../../services/api';

interface EditResourceModalProps {
  resource: Resource;
  onClose: () => void;
  onUpdate: (updates: Partial<Resource>) => void;
}

export function EditResourceModal({ resource, onClose, onUpdate }: EditResourceModalProps) {
  const [title, setTitle] = useState(resource.title);
  const [urls, setUrls] = useState<string[]>(resource.urls && resource.urls.length > 0 ? resource.urls : [resource.url]);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [category, setCategory] = useState(resource.category);
  const [status, setStatus] = useState(resource.status);
  const [description, setDescription] = useState(resource.description || '');
  const [moduleTag, setModuleTag] = useState(resource.moduleTag || '');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tags, setTags] = useState<Tag[]>(
    resource.tags 
      ? (Array.isArray(resource.tags) 
          ? resource.tags.map((t, idx) => 
              typeof t === 'string' 
                ? { id: Date.now() + idx, name: t.trim() }
                : { id: t.id, name: t.name.trim() }
            ) 
          : [])
      : []
  );
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasFileChanges, setHasFileChanges] = useState(false);

  const hasMeaningfulChanges = 
    title !== resource.title ||
    JSON.stringify(urls) !== JSON.stringify(resource.urls && resource.urls.length > 0 ? resource.urls : [resource.url]) ||
    category !== resource.category ||
    status !== resource.status ||
    description !== (resource.description || '') ||
    moduleTag !== (resource.moduleTag || '') ||
    tags.map((tag) => tag.name).join(',') !== (resource.tags || []).map((tag) => (typeof tag === 'string' ? tag : tag.name)).join(',');

  useEffect(() => {
    const loadAvailableTags = async () => {
      try {
        const response = await tagService.getAll();
        setAvailableTags(response.data || []);
      } catch (error) {
        console.error('Error loading tags:', error);
      }
    };

    loadAvailableTags();
  }, []);

  const handleChange = () => {
    setHasChanges(true);
  };

  const handleAddUrl = () => {
    setUrls([...urls, '']);
    handleChange();
  };

  const handleRemoveUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
    handleChange();
  };

  const handleFileChange = (files: File[]) => {
    if (files.length > 0) {
      setPdfFiles((prev) => [...prev, ...files]);
      setHasFileChanges(true);
      handleChange();
    }
  };

  const handleUrlChange = (index: number, newUrl: string) => {
    const updatedUrls = [...urls];
    updatedUrls[index] = newUrl;
    setUrls(updatedUrls);
    handleChange();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const hasUrls = urls.some(url => url.trim());
    if (!hasUrls && pdfFiles.length === 0) return;

    setLoading(true);
    try {
      let primaryUrl = '';
      let resourceCategory = category;
      let thumbnailUrl: string | undefined;
      let thumbnailsByUrl: Record<string, string> = resource.thumbnailsByUrl || {};

      // Handle multiple PDF file uploads
      const pdfUrls: string[] = [];
      if (pdfFiles.length > 0) {
        for (const pdfFile of pdfFiles) {
          const formData = new FormData();
          formData.append('file', pdfFile);
          
          try {
            const uploadRoute = getUploadRoute(pdfFile.name);
            const uploadResponse = await fetch(uploadRoute, {
              method: 'POST',
              body: formData,
            });

            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json();
              const fileUrl = extractUploadedFileUrl(uploadResult);
              if (fileUrl) {
                pdfUrls.push(fileUrl);
              }

              const inferredCategory = inferCategoryFromFile(pdfFile.name);
              resourceCategory = resolveResourceCategory({
                selectedCategory: resourceCategory,
                inferredCategory,
              });
            }
          } catch (error) {
            console.error('Error uploading file:', error);
            pdfUrls.push(`file://${pdfFile.name}`);
          }
        }
        if (pdfUrls.length > 0) {
          primaryUrl = pdfUrls[0];
        }
      }

      // If no PDF or no primaryUrl from PDF, use first URL as primary
      if (!primaryUrl) {
        const firstUrl = urls.find(url => url.trim());
        if (firstUrl) {
          primaryUrl = firstUrl;
          const videoId = extractYouTubeId(firstUrl);
          if (videoId) {
            thumbnailUrl = getYouTubeThumbnail(videoId);
          }
        }
      }

      const manualUrls = urls.filter(url => url.trim());
      thumbnailsByUrl = buildThumbnailsByUrl(manualUrls, resource.thumbnailsByUrl || {});

      if (primaryUrl) {
        thumbnailUrl = thumbnailsByUrl[primaryUrl] || thumbnailUrl || resource.thumbnailUrl;
      }

      // Collect all URLs (PDFs first, then manual entries)
      let finalUrls: string[] = [];
      
      // Add all PDF URLs first
      finalUrls.push(...pdfUrls);
      
      // Add all manual URLs
      finalUrls.push(...manualUrls);
      
      // If still no URLs, use primaryUrl
      if (finalUrls.length === 0 && primaryUrl) {
        finalUrls = [primaryUrl];
      }

      if (!hasResourceFormChanges({ hasChanges, hasMeaningfulChanges, hasFileChanges }) && pdfFiles.length === 0) {
        onClose();
        return;
      }

      const normalizedTagNames = normalizeTagNames(tags.map((tag) => ({ id: tag.id, name: tag.name })));

      await onUpdate({
        title,
        url: primaryUrl || finalUrls[0] || '',
        urls: finalUrls,
        category: resourceCategory,
        status,
        description,
        moduleTag,
        thumbnailUrl,
        thumbnailsByUrl,
        tags: normalizedTagNames,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Resource</h2>
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
              onChange={(e) => {
                setTitle(e.target.value);
                handleChange();
              }}
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

            {/* File Upload Section */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">Files (Optional, Multiple - PDF, Code, Text, Archives)</label>
              {pdfFiles.length > 0 ? (
                <div className="space-y-2 mb-2">
                  {pdfFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <Upload size={18} className="text-yellow-400" />
                        <span className="text-sm text-gray-900 dark:text-white">{file.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPdfFiles(pdfFiles.filter((_, i) => i !== index));
                          setHasFileChanges(true);
                          handleChange();
                        }}
                        className="p-1 hover:bg-red-500/20 rounded transition text-red-500"
                        title="Remove file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <input
                type="file"
                accept={getAllowedFileAccept()}
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    handleFileChange(files);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer"
              />
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
                onChange={(e) => {
                  setCategory(e.target.value as Resource['category']);
                  handleChange();
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="Video">Video</option>
                <option value="Notes">Notes</option>
                <option value="PDF">PDF</option>
                <option value="Practice">Practice Problems</option>
                <option value="Reading">Reading</option>
                <option value="Code">Code</option>
                <option value="Text">Text</option>
                <option value="Archive">Archive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as Resource['status']);
                  handleChange();
                }}
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
              onChange={(e) => {
                setDescription(e.target.value);
                handleChange();
              }}
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
              onChange={(e) => {
                setModuleTag(e.target.value);
                handleChange();
              }}
              placeholder="e.g., Module 1, Chapter 3"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Tags (Optional)
            </label>
            <TagInput
              tags={tags}
              onTagsChange={(newTags) => {
                setTags(newTags);
                handleChange();
              }}
              suggestions={availableTags}
              placeholder="Add or select tags..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              💡 Add tags to help with AI content generation and organization
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !hasResourceFormChanges({ hasChanges, hasMeaningfulChanges, hasFileChanges })}
              className="flex-1 py-2 px-4 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition font-medium disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
