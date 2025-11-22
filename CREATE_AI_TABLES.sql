-- ============================================================================
-- CREATE AI CONTENT TABLES FOR EDUCOMPASS
-- ============================================================================

-- 1. AI SUMMARIES TABLE
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
[],
  generated_at TIMESTAMP
WITH TIME ZONE DEFAULT now
(),
  updated_at TIMESTAMP
WITH TIME ZONE DEFAULT now
()
);

CREATE INDEX
IF NOT EXISTS idx_ai_summaries_resource_id ON ai_summaries
(resource_id);
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_summaries_select" ON ai_summaries FOR
SELECT USING (
  EXISTS (
    SELECT 1
    FROM resources r
        JOIN boards b ON b.id = r.board_id
    WHERE r.id = resource_id AND b.user_id = auth.uid()
  )
);

CREATE POLICY "ai_summaries_insert" ON ai_summaries FOR
INSERT WITH CHECK
    (
    EXISTS (
    SELECT 1
FROM resources r
    JOIN boards b ON b.id = r.board_id
WHERE r.id = resource_id AND b.user_id = auth.uid()
  )
);

CREATE POLICY "ai_summaries_update" ON ai_summaries FOR
UPDATE USING (
  EXISTS (
    SELECT 1
FROM resources r
    JOIN boards b ON b.id = r.board_id
WHERE r.id = resource_id AND b.user_id = auth.uid()
  )
);

-- 2. AI FLASHCARDS TABLE
CREATE TABLE
IF NOT EXISTS ai_flashcards
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
  resource_id UUID NOT NULL REFERENCES resources
(id) ON
DELETE CASCADE,
  flashcards JSONB[],
  generated_at TIMESTAMP
WITH TIME ZONE DEFAULT now
(),
  updated_at TIMESTAMP
WITH TIME ZONE DEFAULT now
()
);

CREATE INDEX
IF NOT EXISTS idx_ai_flashcards_resource_id ON ai_flashcards
(resource_id);
ALTER TABLE ai_flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_flashcards_select" ON ai_flashcards FOR
SELECT USING (
  EXISTS (
    SELECT 1
    FROM resources r
        JOIN boards b ON b.id = r.board_id
    WHERE r.id = resource_id AND b.user_id = auth.uid()
  )
);

CREATE POLICY "ai_flashcards_insert" ON ai_flashcards FOR
INSERT WITH CHECK
    (
    EXISTS (
    SELECT 1
FROM resources r
    JOIN boards b ON b.id = r.board_id
WHERE r.id = resource_id AND b.user_id = auth.uid()
  )
);

CREATE POLICY "ai_flashcards_update" ON ai_flashcards FOR
UPDATE USING (
  EXISTS (
    SELECT 1
FROM resources r
    JOIN boards b ON b.id = r.board_id
WHERE r.id = resource_id AND b.user_id = auth.uid()
  )
);

-- 3. EXTRACTED CONTENT TABLE
CREATE TABLE
IF NOT EXISTS extracted_content
(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
  resource_id UUID NOT NULL REFERENCES resources
(id) ON
DELETE CASCADE,
  content_type TEXT
NOT NULL,
  content TEXT,
  extracted_at TIMESTAMP
WITH TIME ZONE DEFAULT now
()
);

CREATE INDEX
IF NOT EXISTS idx_extracted_content_resource_id ON extracted_content
(resource_id);
CREATE INDEX
IF NOT EXISTS idx_extracted_content_type ON extracted_content
(content_type);
ALTER TABLE extracted_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "extracted_content_select" ON extracted_content FOR
SELECT USING (
  EXISTS (
    SELECT 1
    FROM resources r
        JOIN boards b ON b.id = r.board_id
    WHERE r.id = resource_id AND b.user_id = auth.uid()
  )
);

CREATE POLICY "extracted_content_insert" ON extracted_content FOR
INSERT WITH CHECK
    (
    EXISTS (
    SELECT 1
FROM resources r
    JOIN boards b ON b.id = r.board_id
WHERE r.id = resource_id AND b.user_id = auth.uid()
  )
);
