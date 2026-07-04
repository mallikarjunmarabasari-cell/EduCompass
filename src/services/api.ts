import axios from 'axios';
import type { Board, Resource, Assignment, AssignmentResult, SearchFilters, Tag } from '../types';
import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const API = axios.create({
  baseURL: API_BASE,
});

let cachedUserId: string | null = null;

// Add user ID to all requests
API.interceptors.request.use(async (config) => {
  try {
    // Try to get from cache first to avoid delay
    if (cachedUserId) {
      config.headers['x-user-id'] = cachedUserId;
      return config;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      cachedUserId = session.user.id;
      config.headers['x-user-id'] = session.user.id;
      console.log('✅ User ID added to request:', session.user.id);
    } else {
      console.warn('⚠️ No session/user ID found');
    }
  } catch (err) {
    console.error('Error getting session:', err);
  }
  return config;
});

// Listen for auth changes to update cached user ID
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user?.id) {
    cachedUserId = session.user.id;
    console.log('🔄 Auth state changed, user ID updated:', cachedUserId);
  } else {
    cachedUserId = null;
  }
});

// Boards
export const boardService = {
  getAll: () => API.get<Board[]>('/boards'),
  getById: (id: string) => API.get<Board>(`/boards/${id}`),
  create: (board: Omit<Board, 'id' | 'createdAt' | 'updatedAt'>) => API.post<Board>('/boards', board),
  update: (id: string, board: Partial<Board>) => API.patch<Board>(`/boards/${id}`, board),
  delete: (id: string) => API.delete(`/boards/${id}`),
};

// Resources
export const resourceService = {
  getByBoard: (boardId: string) => API.get<Resource[]>(`/boards/${boardId}/resources`),
  create: (boardId: string, resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) =>
    API.post<Resource>(`/boards/${boardId}/resources`, resource),
  update: (id: string, resource: Partial<Resource>) => API.patch<Resource>(`/resources/${id}`, resource),
  delete: (id: string) => API.delete(`/resources/${id}`),
  getTags: (resourceId: string) => API.get<Tag[]>(`/resources/${resourceId}/tags`),
  addTags: (resourceId: string, tags: string[]) =>
    API.post<Tag[]>(`/resources/${resourceId}/tags`, { tags }),
  removeTag: (resourceId: string, tagId: number) =>
    API.delete(`/resources/${resourceId}/tags/${tagId}`),
};

// Search
export const searchService = {
  search: (filters: SearchFilters) => {
    const params = new URLSearchParams();
    if (filters.query) params.append('q', filters.query);
    if (filters.tags && filters.tags.length > 0) params.append('tags', filters.tags.join(','));
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    return API.get<Resource[]>(`/search?${params.toString()}`);
  },
};

// Tags
export const tagService = {
  getAll: () => API.get<Tag[]>('/tags'),
};

// Assignments
export const assignmentService = {
  getByResource: (resourceId: string) => API.get<Assignment>(`/assignments/${resourceId}`),
  submit: (resourceId: string, answers: number[]) =>
    API.post<{ scorePercent: number; result: AssignmentResult }>(`/assignments/${resourceId}/submit`, { answers }),
};

// Analytics
export const analyticsService = {
  getOverview: () =>
    API.get<{
      totalBoards: number;
      totalResources: number;
      completedResources: number;
      averageScore: number;
      averageProgress: number;
      quizzesCompleted: number;
      assignmentCompletionRate: number;
      distribution: {
        Video: number;
        Notes: number;
        PDF: number;
        Practice: number;
        Reading: number;
      };
      completion: {
        completed: number;
        pending: number;
        total: number;
      };
    }>('/analytics/overview'),
  getSummary: () =>
    API.get<{
      totalBoards: number;
      totalResources: number;
      completedResources: number;
      averageScore: number;
    }>('/analytics/summary'),
  getDistribution: () =>
    API.get<{
      Video: number;
      Notes: number;
      PDF: number;
      Practice: number;
      Reading: number;
    }>('/analytics/distribution'),
  getCompletion: () =>
    API.get<{
      completed: number;
      pending: number;
      total: number;
    }>('/analytics/completion'),
};

// AI Content
export const aiService = {
  generateContent: (resourceId: string, url: string, contentType?: string) =>
    API.post<{ summary: string; keyPoints: string[]; flashcards: any[]; source?: 'gemini' | 'fallback' }>(
      `/resources/${resourceId}/generate-ai`,
      { url, contentType }
    ),
  getSummary: (resourceId: string) => API.get(`/resources/${resourceId}/summary`),
  getFlashcards: (resourceId: string) => API.get(`/resources/${resourceId}/flashcards`),
  getExtractedContent: (resourceId: string) => API.get(`/resources/${resourceId}/extracted-content`),
};

