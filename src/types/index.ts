export interface Board {
  id: string;
  title: string;
  description?: string;
  youtubeLinks?: string[];
  driveLinks?: string[];
  websiteLinks?: string[];
  scheduleTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  id: string;
  boardId: string;
  title: string;
  url: string;
  urls?: string[];
  tags?: string[] | Tag[];
  category: 'Video' | 'Notes' | 'PDF' | 'Practice' | 'Reading';
  status: 'todo' | 'in-progress' | 'completed';
  progress: number;
  description?: string;
  thumbnailUrl?: string;
  moduleTag?: string;
  hasPracticeAssignment: boolean;
  assignmentCompleted: boolean;
  latestAssignmentScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface Assignment {
  id: string;
  resourceId?: string;
  boardId: string;
  type: 'practice' | 'graded';
  title: string;
  questions: Question[];
  createdAt: string;
}

export interface AssignmentResult {
  id: string;
  assignmentId: string;
  resourceId?: string;
  type: 'practice' | 'graded';
  scorePercent: number;
  answeredAt: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  createdAt: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface ResourceWithTags extends Resource {
  tags: Tag[];
}

export interface SearchFilters {
  query?: string;
  tags?: string[];
  category?: string;
  status?: 'todo' | 'in-progress' | 'completed';
}

export interface TagSuggestion extends Tag {
  usage_count?: number;
  slug?: string;
}

export interface AISummary {
  id: string;
  resource_id: string;
  summary: string;
  key_points: string[];
  generated_at: string;
  updated_at: string;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface AIFlashcards {
  id: string;
  resource_id: string;
  flashcards: Flashcard[];
  generated_at: string;
  updated_at: string;
}

export interface ExtractedContent {
  id: string;
  resource_id: string;
  content_type: 'youtube_transcript' | 'article_text';
  content: string;
  extracted_at: string;
}

