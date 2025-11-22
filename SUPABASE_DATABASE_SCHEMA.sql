-- ============================================================================
-- EDUCOMPASS - COMPLETE DATABASE SCHEMA FOR SUPABASE
-- ============================================================================
-- This schema creates a complete backend for the EduCompass application
-- with user-specific data isolation, boards, resources, shares, and assignments
-- ============================================================================

-- ============================================================================
-- 1. USERS TABLE (Stores user profile information)
-- ============================================================================
CREATE TABLE
IF NOT EXISTS users
(
  id UUID PRIMARY KEY DEFAULT auth.uid
(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP
WITH TIME ZONE DEFAULT now
(),
  updated_at TIMESTAMP
WITH TIME ZONE DEFAULT now
(),
  FOREIGN KEY
(id) REFERENCES auth.users
(id) ON
DELETE CASCADE
);

-- Enable RLS for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read their own profile"
  ON users
  FOR
SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON users
  FOR
UPDATE
  USING (auth.uid()
= id);

-- Create trigger to auto-populate users table when new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user
()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users
    (id, email, full_name)
  VALUES
    (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path
= public;

CREATE TRIGGER on_auth_user_created
  AFTER
INSERT ON
auth.users
FOR EACH ROW
EXECUTE
PROCEDURE public.handle_new_user
();

-- ============================================================================
-- 2. BOARDS TABLE (User study boards)
-- ============================================================================
CREATE TABLE
IF NOT EXISTS boards
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
  user_id UUID NOT NULL REFERENCES users
(id) ON
DELETE CASCADE,
  title TEXT
NOT NULL,
  description TEXT,
  schedule_study_time TEXT,
  color TEXT DEFAULT '#fbbf24',
  created_at TIMESTAMP
WITH TIME ZONE DEFAULT now
(),
  updated_at TIMESTAMP
WITH TIME ZONE DEFAULT now
()
);

-- Create index for faster queries
CREATE INDEX idx_boards_user_id ON boards(user_id);
CREATE INDEX idx_boards_created_at ON boards(created_at DESC);

-- Enable RLS for boards
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

-- Users can see boards they own
CREATE POLICY "Users can see their own boards"
  ON boards
  FOR
SELECT
  USING (auth.uid() = user_id);

-- Users can create boards
CREATE POLICY "Users can create boards"
  ON boards
  FOR
INSERT
  WITH CHECK (auth.uid() =
user_id);

-- Users can update their own boards
CREATE POLICY "Users can update their own boards"
  ON boards
  FOR
UPDATE
  USING (auth.uid()
= user_id);

-- Users can delete their own boards
CREATE POLICY "Users can delete their own boards"
  ON boards
  FOR
DELETE
  USING (auth.uid
() = user_id);

-- ============================================================================
-- 3. RESOURCES TABLE (Study materials linked to boards)
-- ============================================================================
CREATE TABLE
IF NOT EXISTS resources
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
  board_id UUID NOT NULL REFERENCES boards
(id) ON
DELETE CASCADE,
  title TEXT
NOT NULL,
  description TEXT,
  urls JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  status TEXT DEFAULT 'todo' CHECK
(status IN
('todo', 'in-progress', 'completed')),
  progress INTEGER DEFAULT 0 CHECK
(progress >= 0 AND progress <= 100),
  module_tag TEXT,
  has_practice_assignment BOOLEAN DEFAULT false,
  assignment_completed BOOLEAN DEFAULT false,
  latest_assignment_score INTEGER,
  created_at TIMESTAMP
WITH TIME ZONE DEFAULT now
(),
  updated_at TIMESTAMP
WITH TIME ZONE DEFAULT now
()
);

-- Create indexes
CREATE INDEX idx_resources_board_id ON resources(board_id);
CREATE INDEX idx_resources_status ON resources(status);

-- Enable RLS for resources
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Users can see resources in boards they own
CREATE POLICY "Users can see resources in their boards"
  ON resources
  FOR
SELECT
  USING (EXISTS (
    SELECT 1
  FROM boards
  WHERE boards.id = resources.board_id
    AND auth.uid() = boards.user_id
  ));

-- Users can create resources in their boards
CREATE POLICY "Users can create resources in their boards"
  ON resources
  FOR
INSERT
  WITH CHECK
  (EXISTS (
  SELECT 1
  FROM boards
  WHERE boards.id = resources.board_
  AND auth.uid() = boards.user_id
  )
);

-- Users can update resources in their boards
CREATE POLICY "Users can update resources in their boards"
  ON resources
  FOR
UPDATE
  USING (EXISTS (
    SELECT 1
FROM boards
WHERE boards.id = resources.board_id
  AND auth.uid() = boards.user_id
  )
);

-- Users can delete resources in their own boards
CREATE POLICY "Users can delete resources in their boards"
  ON resources
  FOR
DELETE
  USING (EXISTS
(
    SELECT 1
FROM boards
WHERE boards.id = resources.board_id
  AND auth.uid() = boards.user_id
  )
);

-- Full text search vector for resources
ALTER TABLE resources
  ADD COLUMN
IF NOT EXISTS search_vector tsvector;

-- Trigger function to update search_vector on insert/update
CREATE OR REPLACE FUNCTION public.update_resources_search_vector
()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector
('english', concat_ws
(' ', COALESCE
(NEW.title, ''), COALESCE
(NEW.description, ''), COALESCE
(NEW.category, '')));
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resources_search_vector_trigger
  BEFORE
INSERT OR
UPDATE ON resources
  FOR EACH ROW
EXECUTE
PROCEDURE public.update_resources_search_vector
();

-- Create GIN index on search_vector
CREATE INDEX
IF NOT EXISTS idx_resources_search_vector ON resources USING GIN
(search_vector);

-- ============================================================================
-- TAGS & RESOURCE_TAGS (Many-to-many tags for resources)
-- ============================================================================
CREATE TABLE
IF NOT EXISTS tags
(
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE GENERATED ALWAYS AS
(LOWER
(REGEXP_REPLACE
(name, '\s+', '_', 'g'))) STORED,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP
WITH TIME ZONE DEFAULT now
()
);

-- Index for tag lookups
CREATE INDEX
IF NOT EXISTS idx_tags_name ON tags
(name);
CREATE INDEX
IF NOT EXISTS idx_tags_slug ON tags
(slug);
CREATE INDEX
IF NOT EXISTS idx_tags_usage_count ON tags
(usage_count DESC);

CREATE TABLE
IF NOT EXISTS resource_tags
(
  resource_id UUID NOT NULL REFERENCES resources
(id) ON
DELETE CASCADE,
  tag_id INTEGER
NOT NULL REFERENCES tags
(id) ON
DELETE CASCADE,
  created_at TIMESTAMP
WITH TIME ZONE DEFAULT now
(),
  PRIMARY KEY
(resource_id, tag_id)
);

-- Indexes to speed up tag lookups
CREATE INDEX
IF NOT EXISTS idx_resource_tags_tag_id ON resource_tags
(tag_id);
CREATE INDEX
IF NOT EXISTS idx_resource_tags_resource_id ON resource_tags
(resource_id);
CREATE INDEX
IF NOT EXISTS idx_resource_tags_created_at ON resource_tags
(created_at DESC);

-- Enable RLS for tags and resource_tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_tags ENABLE ROW LEVEL SECURITY;

-- Tags are publicly visible (read-only)
CREATE POLICY "Tags are readable by all authenticated users"
  ON tags
  FOR
SELECT
  USING (TRUE);

-- Resource tags are viewable by board owner
CREATE POLICY "Resource tags are viewable by board owner"
  ON resource_tags
  FOR
SELECT
  USING (EXISTS (
    SELECT 1
  FROM resources r
    JOIN boards b ON b.id = r.board_id
  WHERE r.id = resource_id AND auth.uid() = b.user_id
  ));

-- RPC: Search resources by full-text query, tags, category, and status
CREATE OR REPLACE FUNCTION public.search_resources
(q TEXT, tag_names TEXT[], category_filter TEXT, status_filter TEXT)
RETURNS SETOF resources AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT r.*
  FROM resources r
    LEFT JOIN resource_tags rt ON r.id = rt.resource_id
    LEFT JOIN tags t ON t.id = rt.tag_id
  WHERE (
    q IS NULL OR q = '' OR r.search_vector
  @@ plainto_tsquery
  ('english', q)
  )
  AND
  (
    category_filter IS NULL OR category_filter = '' OR r.category = category_filter
  )
  AND
  (
    status_filter IS NULL OR status_filter = '' OR r.status = status_filter
  )
  AND
  (
    tag_names IS NULL OR array_length
  (tag_names, 1) = 0 OR t.name = ANY
  (tag_names)
  )
  ORDER BY 
    CASE WHEN q IS NULL OR q = '' THEN 0 ELSE ts_rank_cd
  (r.search_vector, plainto_tsquery
  ('english', q))
END
DESC,
    r.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- RPC: Get all tags with usage counts
CREATE OR REPLACE FUNCTION public.get_all_tags
()
RETURNS TABLE
(id INTEGER, name TEXT, slug TEXT, usage_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.slug, COUNT(rt.resource_id)
  ::INTEGER as usage_count
  FROM tags t
  LEFT JOIN resource_tags rt ON t.id = rt.tag_id
  GROUP BY t.id, t.name, t.slug
  ORDER BY COUNT
  (rt.resource_id) DESC, t.name ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger: Update tag usage count when resource_tags are inserted/deleted
CREATE OR REPLACE FUNCTION public.update_tag_usage_count
()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
  UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
  UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
END
IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resource_tags_usage_count_trigger
AFTER
INSERT OR
DELETE ON resource_tags
FOR EACH
ROW
EXECUTE
PROCEDURE public.update_tag_usage_count
();

-- ============================================================================
-- 4. BOARD_SHARES TABLE (Collaborative sharing)
-- ============================================================================
CREATE TABLE
IF NOT EXISTS board_shares
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
  board_id UUID NOT NULL REFERENCES boards
(id) ON
DELETE CASCADE,
  recipient_email TEXT
NOT NULL,
  permission_level TEXT NOT NULL CHECK
(permission_level IN
('read', 'edit')),
  shared_by UUID NOT NULL REFERENCES users
(id) ON
DELETE CASCADE,
  share_token TEXT
UNIQUE NOT NULL,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP
WITH TIME ZONE,
  created_at TIMESTAMP
WITH TIME ZONE DEFAULT now
(),
  expires_at TIMESTAMP
WITH TIME ZONE,
  UNIQUE
(board_id, recipient_email)
);

-- Create indexes
CREATE INDEX idx_board_shares_board_id ON board_shares(board_id);
CREATE INDEX idx_board_shares_share_token ON board_shares(share_token);
CREATE INDEX idx_board_shares_recipient_email ON board_shares(recipient_email);
CREATE INDEX idx_board_shares_created_at ON board_shares(created_at DESC);

-- Enable RLS for board_shares
ALTER TABLE board_shares ENABLE ROW LEVEL SECURITY;

-- Users can see shares for their boards
CREATE POLICY "Users can see shares for their boards"
  ON board_shares
  FOR
SELECT
  USING (EXISTS (
    SELECT 1
  FROM boards
  WHERE boards.id = board_shares.board_id
    AND auth.uid() = boards.user_id
  ));

-- Users can create shares for their boards
CREATE POLICY "Users can create shares for their boards"
  ON board_shares
  FOR
INSERT
  WITH CHECK
  (EXISTS (
  SELECT 1
  FROM boards
  WHERE boards.id = board_shares.board_
  AND auth.uid() = boards.user_id
  )
AND shared_by = auth.uid
());

-- Users can update shares for their boards
CREATE POLICY "Users can update shares for their boards"
  ON board_shares
  FOR
UPDATE
  USING (EXISTS (
    SELECT 1
FROM boards
WHERE boards.id = board_shares.board_id
  AND auth.uid() = boards.user_id
  )
);

-- Users can delete shares for their boards
CREATE POLICY "Users can delete shares for their boards"
  ON board_shares
  FOR
DELETE
  USING (EXISTS
(
    SELECT 1
FROM boards
WHERE boards.id = board_shares.board_id
  AND auth.uid() = boards.user_id
  )
);

-- ============================================================================
-- 5. ASSIGNMENTS TABLE (Practice assignments linked to resources)
-- ============================================================================
CREATE TABLE
IF NOT EXISTS assignments
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
  resource_id UUID NOT NULL REFERENCES resources
(id) ON
DELETE CASCADE,
  title TEXT
NOT NULL,
  description TEXT,
  instructions TEXT,
  due_date DATE,
  created_at TIMESTAMP
WITH TIME ZONE DEFAULT now
(),
  updated_at TIMESTAMP
WITH TIME ZONE DEFAULT now
()
);

-- Create index
CREATE INDEX idx_assignments_resource_id ON assignments(resource_id);

-- Enable RLS for assignments
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Users can see assignments for resources in their boards
CREATE POLICY "Users can see assignments in accessible resources"
  ON assignments
  FOR
SELECT
  USING (EXISTS (
    SELECT 1
  FROM resources
    JOIN boards ON boards.id = resources.board_id
  WHERE resources.id = assignments.resource_id
    AND auth.uid() = boards.user_id
  ));

-- ============================================================================
-- 6. ASSIGNMENT_RESULTS TABLE (User assignment submissions and scores)
-- ============================================================================
CREATE TABLE
IF NOT EXISTS assignment_results
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
  assignment_id UUID NOT NULL REFERENCES assignments
(id) ON
DELETE CASCADE,
  user_id UUID
NOT NULL REFERENCES users
(id) ON
DELETE CASCADE,
  score_percent INTEGER
CHECK
(score_percent >= 0 AND score_percent <= 100),
  submission_text TEXT,
  submitted_at TIMESTAMP
WITH TIME ZONE DEFAULT now
(),
  created_at TIMESTAMP
WITH TIME ZONE DEFAULT now
(),
  updated_at TIMESTAMP
WITH TIME ZONE DEFAULT now
()
);

-- Create indexes
CREATE INDEX idx_assignment_results_assignment_id ON assignment_results(assignment_id);
CREATE INDEX idx_assignment_results_user_id ON assignment_results(user_id);

-- Enable RLS for assignment_results
ALTER TABLE assignment_results ENABLE ROW LEVEL SECURITY;

-- Users can see their own results
CREATE POLICY "Users can see their own assignment results"
  ON assignment_results
  FOR
SELECT
  USING (auth.uid() = user_id);

-- Users can create their own results
CREATE POLICY "Users can create their own assignment results"
  ON assignment_results
  FOR
INSERT
  WITH CHECK (auth.uid() =
user_id);

-- Users can update their own results
CREATE POLICY "Users can update their own assignment results"
  ON assignment_results
  FOR
UPDATE
  USING (auth.uid()
= user_id);

-- ============================================================================
-- 7. ACTIVITY_LOG TABLE (Track user activities for analytics)
-- ============================================================================
CREATE TABLE
IF NOT EXISTS activity_log
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
  user_id UUID NOT NULL REFERENCES users
(id) ON
DELETE CASCADE,
  board_id UUID
REFERENCES boards
(id) ON
DELETE
SET NULL
,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP
WITH TIME ZONE DEFAULT now
()
);

-- Create indexes
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_board_id ON activity_log(board_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- Enable RLS for activity_log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Users can see their own activity
CREATE POLICY "Users can see their own activity"
  ON activity_log
  FOR
SELECT
  USING (auth.uid() = user_id);

-- Users can create activity logs
CREATE POLICY "Users can create activity logs"
  ON activity_log
  FOR
INSERT
  WITH CHECK (auth.uid() =
user_id);

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Function to get user by email
CREATE OR REPLACE FUNCTION get_user_by_email
(email_param TEXT)
RETURNS TABLE
(id UUID, email TEXT, full_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT users.id, users.email, users.full_name
  FROM users
  WHERE users.email = email_param;
END;
$$ LANGUAGE plpgsql;

-- Function to check board access
CREATE OR REPLACE FUNCTION has_board_access
(board_id_param UUID, user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS
  (
    SELECT 1
  FROM boards
  WHERE boards.id = board_id_param
    AND auth.uid() = boards.user_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. AI CONTENT TABLES (Stores AI-generated summaries, notes, flashcards)
-- ============================================================================

CREATE TABLE
IF NOT EXISTS ai_summaries
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
  resource_id UUID NOT NULL REFERENCES resources
(id) ON
DELETE CASCADE,
  summary TEXT,
  key_points TEXT
[], -- Array of bullet points
  generated_at TIMESTAMP
WITH TIME ZONE DEFAULT now
(),
  updated_at TIMESTAMP
WITH TIME ZONE DEFAULT now
()
);

-- Create index for faster queries
CREATE INDEX idx_ai_summaries_resource_id ON ai_summaries(resource_id);

-- Enable RLS for ai_summaries
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;

-- Users can read AI summaries for resources in their boards
CREATE POLICY "Users can read AI summaries for their resources"
  ON ai_summaries
  FOR
SELECT
  USING (
    EXISTS (
      SELECT 1
  FROM resources r
    JOIN boards b ON b.id = r.board_id
  WHERE r.id = resource_id
    AND b.user_id = auth.uid()
    )
  );

-- Create table for AI-generated flashcards
CREATE TABLE
IF NOT EXISTS ai_flashcards
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
  resource_id UUID NOT NULL REFERENCES resources
(id) ON
DELETE CASCADE,
  flashcards JSONB[], -- Array of {question, answer} objects
  generated_at TIMESTAMP
WITH TIME ZONE DEFAULT now
(),
  updated_at TIMESTAMP
WITH TIME ZONE DEFAULT now
()
);

-- Create index for faster queries
CREATE INDEX idx_ai_flashcards_resource_id ON ai_flashcards(resource_id);

-- Enable RLS for ai_flashcards
ALTER TABLE ai_flashcards ENABLE ROW LEVEL SECURITY;

-- Users can read flashcards for resources in their boards
CREATE POLICY "Users can read flashcards for their resources"
  ON ai_flashcards
  FOR
SELECT
  USING (
    EXISTS (
      SELECT 1
  FROM resources r
    JOIN boards b ON b.id = r.board_id
  WHERE r.id = resource_id
    AND b.user_id = auth.uid()
    )
  );

-- Create table to store extracted content (YouTube transcripts, article text)
CREATE TABLE
IF NOT EXISTS extracted_content
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
  resource_id UUID NOT NULL REFERENCES resources
(id) ON
DELETE CASCADE,
  content_type TEXT
NOT NULL, -- 'youtube_transcript' or 'article_text'
  content TEXT,
  extracted_at TIMESTAMP
WITH TIME ZONE DEFAULT now
()
);

-- Create index for faster queries
CREATE INDEX idx_extracted_content_resource_id ON extracted_content(resource_id);
CREATE INDEX idx_extracted_content_type ON extracted_content(content_type);

-- Enable RLS for extracted_content
ALTER TABLE extracted_content ENABLE ROW LEVEL SECURITY;

-- Users can read extracted content for their resources
CREATE POLICY "Users can read extracted content for their resources"
  ON extracted_content
  FOR
SELECT
  USING (
    EXISTS (
      SELECT 1
  FROM resources r
    JOIN boards b ON b.id = r.board_id
  WHERE r.id = resource_id
    AND b.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: User's boards with share count and resource count
CREATE OR REPLACE VIEW user_boards_summary AS
SELECT
  b.id,
  b.user_id,
  b.title,
  b.description,
  b.schedule_study_time,
  b.color,
  COUNT(DISTINCT bs.id) as share_count,
  COUNT(DISTINCT r.id) as resource_count,
  b.created_at,
  b.updated_at
FROM boards b
  LEFT JOIN board_shares bs ON bs.board_id = b.id
  LEFT JOIN resources r ON r.board_id = b.id
GROUP BY b.id, b.user_id, b.title, b.description, b.schedule_study_time, b.color, b.created_at, b.updated_at;

-- View: Board details with owner info
CREATE OR REPLACE VIEW board_details AS
SELECT
  b.id,
  b.user_id,
  u.email as owner_email,
  u.full_name as owner_name,
  b.title,
  b.description,
  b.schedule_study_time,
  b.created_at,
  b.updated_at
FROM boards b
  JOIN users u ON u.id = b.user_id;

-- ============================================================================
-- 10. QUERY EXAMPLES
-- ============================================================================

-- Get current user's boards
-- SELECT * FROM boards WHERE user_id = auth.uid();

-- Get board shares for a specific board
-- SELECT * FROM board_shares WHERE board_id = '...' ORDER BY created_at DESC;

-- Get resources for a board with status counts
-- SELECT status, COUNT(*) as count FROM resources WHERE board_id = '...' GROUP BY status;

-- Get user's total statistics
-- SELECT
--   COUNT(DISTINCT b.id) as total_boards,
--   COUNT(DISTINCT r.id) as total_resources,
--   COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) as completed_resources
-- FROM boards b
-- LEFT JOIN resources r ON r.board_id = b.id
-- WHERE b.user_id = auth.uid();
