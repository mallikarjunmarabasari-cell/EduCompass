import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import { supabase } from "./db/supabase.js";
import { sendBoardShareNotification } from "./services/emailService.js";
import {
  generateAIContent,
  extractArticleText,
  extractPDFText,
  youtubeService,
} from "./services/aiService.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Create uploads directory if it doesn't exist
const uploadsDir = "./uploads/pdfs";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${timestamp}_${sanitized}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
// Serve uploaded files statically
app.use("/uploads", express.static("uploads"));

// Helper to extract user ID from headers
function getUserId(req) {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    throw new Error("Missing x-user-id header. User authentication required.");
  }
  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new Error(`Invalid user ID format. Expected UUID, got: ${userId}`);
  }
  console.log("📝 Request user ID:", userId);
  return userId;
}

// Helper function to format resource for frontend
function formatResource(resource) {
  return {
    ...resource,
    id: resource.id,
    boardId: resource.board_id,
    title: resource.title,
    url:
      resource.urls && resource.urls.length > 0
        ? resource.urls[0]
        : resource.url || "",
    urls: resource.urls || [],
    category: resource.category,
    status: resource.status,
    progress: resource.progress || 0,
    description: resource.description,
    moduleTag: resource.module_tag,
    hasPracticeAssignment: !!resource.has_practice_assignment,
    assignmentCompleted: !!resource.assignment_completed,
    latestAssignmentScore:
      resource.latest_assignment_score !== undefined
        ? resource.latest_assignment_score
        : null,
    createdAt: resource.created_at,
    updatedAt: resource.updated_at,
  };
}

// Helper: upsert tags (returns array of { id, name })
async function upsertTags(tagNames) {
  if (!tagNames || !Array.isArray(tagNames) || tagNames.length === 0) return [];
  const cleanNames = Array.from(
    new Set(tagNames.map((t) => (t || "").trim()).filter(Boolean)),
  );
  if (cleanNames.length === 0) return [];

  // Get existing tags
  const { data: existing } = await supabase
    .from("tags")
    .select("id, name")
    .in("name", cleanNames);
  const existingNames = (existing || []).map((t) => t.name);

  // Insert missing tags
  const missing = cleanNames.filter((n) => !existingNames.includes(n));
  if (missing.length > 0) {
    await supabase
      .from("tags")
      .insert(missing.map((name) => ({ name })))
      .select();
  }

  // Return all tags for these names
  const { data: allTags } = await supabase
    .from("tags")
    .select("id, name")
    .in("name", cleanNames);
  return allTags || [];
}

// Helper: link resource to tags (resource_id UUID, tagNames array)
async function upsertResourceTags(resourceId, tagNames) {
  if (!resourceId) return;
  const tags = await upsertTags(tagNames || []);
  if (!tags || tags.length === 0) return;

  const relations = tags.map((t) => ({
    resource_id: resourceId,
    tag_id: t.id,
  }));
  // Insert relations, ignore conflicts by using upsert via onConflict equivalent - use insert and ignore duplicates by catching error
  for (const rel of relations) {
    try {
      await supabase.from("resource_tags").insert(rel).select();
    } catch (e) {
      // ignore duplicates
    }
  }
}

// Helper: replace resource tags (delete existing and add new)
async function replaceResourceTags(resourceId, tagNames) {
  if (!resourceId) return;
  await supabase.from("resource_tags").delete().eq("resource_id", resourceId);
  await upsertResourceTags(resourceId, tagNames);
}

// ============================================================================
// BOARDS ENDPOINTS
// ============================================================================

// GET /api/boards - Get all boards for current user
app.get("/api/boards", async (req, res) => {
  try {
    let userId;
    try {
      userId = getUserId(req);
    } catch (err) {
      console.warn("⚠️ User ID validation failed:", err.message);
      return res.status(401).json({ error: err.message });
    }

    console.log("🔍 Fetching boards for user:", userId);

    const { data, error } = await supabase
      .from("boards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching boards:", error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} boards for user ${userId}`);

    res.json(data || []);
  } catch (err) {
    console.error("Error fetching boards:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/boards/:id - Get a single board with access control
app.get("/api/boards/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const { data, error } = await supabase
      .from("boards")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      console.error("❌ Error fetching board:", error);
      return res.status(404).json({ error: "Board not found" });
    }

    res.json(data);
  } catch (err) {
    console.error("Error fetching board:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/boards - Create new board
app.post("/api/boards", async (req, res) => {
  try {
    let userId;
    try {
      userId = getUserId(req);
    } catch (err) {
      console.warn("⚠️ User ID validation failed:", err.message);
      return res.status(401).json({ error: err.message });
    }

    const { title, description, schedule_study_time } = req.body;

    console.log("➕ Creating board for user:", userId);

    // First, ensure user exists in users table
    const { data: user, error: userCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (userCheckError || !user) {
      // User doesn't exist, create placeholder user
      console.log("User not found, creating placeholder for:", userId);
      await supabase
        .from("users")
        .insert({
          id: userId,
          email: `user-${userId}@local`,
          full_name: "User",
        })
        .select();
    }

    const { data, error } = await supabase
      .from("boards")
      .insert({
        user_id: userId,
        title,
        description,
        schedule_study_time,
        color: "#fbbf24",
      })
      .select();

    if (error) {
      console.error("❌ Error creating board:", error);
      throw error;
    }

    console.log(`✅ Board created with ID:`, data[0]?.id, "for user:", userId);
    res.json(data[0]);
  } catch (err) {
    console.error("❌ Error creating board:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/boards/:id - Update board
app.patch("/api/boards/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    // Verify user owns the board
    const { data: board, error: fetchError } = await supabase
      .from("boards")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || board.user_id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { data, error } = await supabase
      .from("boards")
      .update(req.body)
      .eq("id", id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error("Error updating board:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/boards/:id - Delete board
app.delete("/api/boards/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    // Verify user owns the board
    const { data: board, error: fetchError } = await supabase
      .from("boards")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || board.user_id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { error } = await supabase.from("boards").delete().eq("id", id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting board:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// RESOURCES ENDPOINTS
// ============================================================================

// GET /api/boards/:boardId/resources
app.get("/api/boards/:boardId/resources", async (req, res) => {
  try {
    const { boardId } = req.params;

    const { data, error } = await supabase
      .from("resources")
      .select(`*, resource_tags(tags(id, name))`)
      .eq("board_id", boardId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const formatted = (data || []).map((resource) => {
      const formattedResource = formatResource(resource);
      return {
        ...formattedResource,
        tags: (resource.resource_tags || [])
          .map((rt) => rt.tags)
          .filter(Boolean),
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching resources:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/boards/:boardId/resources
app.post("/api/boards/:boardId/resources", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { boardId } = req.params;
    const { title, description, urls, url, category, tags } = req.body;

    console.log("📝 Creating resource:", { title, category, url, urls });

    // Verify user owns the board
    const { data: board } = await supabase
      .from("boards")
      .select("user_id")
      .eq("id", boardId)
      .single();

    if (!board || board.user_id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Handle both urls array and url field
    const urlsArray = urls && urls.length > 0 ? urls : url ? [url] : [];

    console.log("📝 URLs array being saved:", urlsArray);

    const { data, error } = await supabase
      .from("resources")
      .insert({
        board_id: boardId,
        title,
        description,
        url: req.body.url || (urlsArray.length > 0 ? urlsArray[0] : null),
        urls: urlsArray,
        category,
        status: req.body.status || "todo",
        progress: req.body.progress ?? 0,
        module_tag: req.body.moduleTag || null,
        has_practice_assignment:
          req.body.hasPracticeAssignment !== undefined
            ? req.body.hasPracticeAssignment
            : true,
        assignment_completed:
          req.body.assignmentCompleted !== undefined
            ? req.body.assignmentCompleted
            : false,
        latest_assignment_score:
          req.body.latestAssignmentScore !== undefined
            ? req.body.latestAssignmentScore
            : null,
      })
      .select();

    if (error) throw error;
    const resource = data[0];
    // link tags if provided
    if (tags && Array.isArray(tags)) {
      try {
        await upsertResourceTags(resource.id, tags);
      } catch (e) {
        console.error("Error upserting resource tags:", e);
      }
    }

    // Create a default practice assignment when resources are created with practice enabled
    if (resource.has_practice_assignment) {
      try {
        const { data: existingAssignment, error: existingAssignmentError } =
          await supabase
            .from("assignments")
            .select("*")
            .eq("resource_id", resource.id)
            .single();

        if (!existingAssignment && !existingAssignmentError) {
          await supabase.from("assignments").insert({
            resource_id: resource.id,
            board_id: boardId,
            type: "practice",
            title: `Practice Quiz: ${title}`,
            questions: [
              {
                id: "q1",
                text: `What is the main topic covered in \"${title}\"?`,
                options: [
                  "The main learning objective",
                  "An unrelated topic",
                  "A random fact",
                  "None of the above",
                ],
                correctIndex: 0,
              },
              {
                id: "q2",
                text: `Which action should you take after reviewing this resource?`,
                options: [
                  "Continue practicing the material",
                  "Ignore the resource",
                  "Delete the board",
                  "Share it immediately without review",
                ],
                correctIndex: 0,
              },
              {
                id: "q3",
                text: `How can this resource help you learn better?`,
                options: [
                  "By reinforcing important concepts",
                  "By distracting me",
                  "By lowering my progress",
                  "By removing assignments",
                ],
                correctIndex: 0,
              },
            ],
          });
        }
      } catch (assignmentError) {
        console.error("Error creating default assignment:", assignmentError);
      }
    }

    res.json(formatResource(resource));
  } catch (err) {
    console.error("Error creating resource:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/resources/:id
app.patch("/api/resources/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {};

    if (req.body.status) updateData.status = req.body.status;
    if (req.body.progress !== undefined)
      updateData.progress = req.body.progress;
    if (req.body.url) updateData.url = req.body.url;
    if (req.body.urls) updateData.urls = req.body.urls;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.title) updateData.title = req.body.title;
    if (req.body.moduleTag !== undefined)
      updateData.module_tag = req.body.moduleTag;
    if (req.body.category) updateData.category = req.body.category;
    if (req.body.thumbnailUrl) updateData.thumbnail_url = req.body.thumbnailUrl;
    if (req.body.hasPracticeAssignment !== undefined)
      updateData.has_practice_assignment = req.body.hasPracticeAssignment;
    if (req.body.assignmentCompleted !== undefined)
      updateData.assignment_completed = req.body.assignmentCompleted;
    if (req.body.latestAssignmentScore !== undefined)
      updateData.latest_assignment_score = req.body.latestAssignmentScore;

    const { data, error } = await supabase
      .from("resources")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;
    const updated = data[0];
    // If tags provided in body, replace resource tags
    if (req.body.tags && Array.isArray(req.body.tags)) {
      try {
        await replaceResourceTags(id, req.body.tags);
      } catch (e) {
        console.error("Error replacing resource tags:", e);
      }
    }

    res.json(formatResource(updated));
  } catch (err) {
    console.error("Error updating resource:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/search?q=...&tags=tag1,tag2&category=Video&status=todo
app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q ? String(req.query.q) : null;
    const tagsParam = req.query.tags ? String(req.query.tags) : null;
    const categoryParam = req.query.category
      ? String(req.query.category)
      : null;
    const statusParam = req.query.status ? String(req.query.status) : null;

    const tagArray = tagsParam
      ? tagsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : null;

    const { data, error } = await supabase.rpc("search_resources", {
      q: q,
      tag_names: tagArray,
      category_filter: categoryParam || null,
      status_filter: statusParam || null,
    });
    if (error) throw error;
    res.json((data || []).map(formatResource));
  } catch (err) {
    console.error("Error searching resources:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/resources/:id
app.delete("/api/resources/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("resources").delete().eq("id", id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting resource:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// ASSIGNMENTS ENDPOINTS
// ============================================================================

app.get("/api/assignments/:resourceId", async (req, res) => {
  try {
    const { resourceId } = req.params;

    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("resource_id", resourceId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (data) {
      return res.json(data);
    }

    // Create a default assignment if the resource has practice enabled
    const { data: resource, error: resourceError } = await supabase
      .from("resources")
      .select("has_practice_assignment, title")
      .eq("id", resourceId)
      .single();

    if (resourceError) throw resourceError;

    if (!resource || !resource.has_practice_assignment) {
      return res.json(null);
    }

    const assignmentPayload = {
      resource_id: resourceId,
      board_id: null,
      type: "practice",
      title: `Practice Quiz: ${resource.title || "Resource"}`,
      questions: [
        {
          id: "q1",
          text: `What is the best next step after reviewing this resource?`,
          options: [
            "Practice what I learned",
            "Ignore the content",
            "Delete the resource",
            "Share without reviewing",
          ],
          correctIndex: 0,
        },
        {
          id: "q2",
          text: `What should you do when you finish this topic?`,
          options: [
            "Move to the next resource",
            "Stop learning entirely",
            "Reset the board",
            "Create an unrelated note",
          ],
          correctIndex: 0,
        },
      ],
    };

    const { data: createdAssignment, error: createError } = await supabase
      .from("assignments")
      .insert(assignmentPayload)
      .select()
      .single();

    if (createError) throw createError;

    res.json(createdAssignment);
  } catch (err) {
    console.error("Error fetching assignment:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/assignments/:resourceId/submit", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { resourceId } = req.params;
    const { answers } = req.body;

    // Get assignment
    const { data: assignment } = await supabase
      .from("assignments")
      .select("*")
      .eq("resource_id", resourceId)
      .single();

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const questions = Array.isArray(assignment.questions)
      ? assignment.questions
      : [];
    const selectedAnswers = Array.isArray(answers) ? answers : [];

    let correctCount = 0;
    questions.forEach((question, index) => {
      if (
        selectedAnswers[index] !== undefined &&
        selectedAnswers[index] === question.correctIndex
      ) {
        correctCount += 1;
      }
    });

    const scorePercent =
      questions.length > 0
        ? Math.round((correctCount / questions.length) * 100)
        : 0;

    // Create result record
    const { data: result, error } = await supabase
      .from("assignment_results")
      .insert({
        assignment_id: assignment.id,
        user_id: userId,
        score_percent: scorePercent,
        submission_text: JSON.stringify(answers),
      })
      .select();

    if (error) throw error;

    // Update resource with completion status
    await supabase
      .from("resources")
      .update({
        assignment_completed: true,
        latest_assignment_score: scorePercent,
      })
      .eq("id", resourceId);

    res.json({ scorePercent, result: result[0] });
  } catch (err) {
    console.error("Error submitting assignment:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// BOARD SHARING ENDPOINTS
// ============================================================================

app.get("/api/boards/:boardId/shares", async (req, res) => {
  try {
    let userId;
    try {
      userId = getUserId(req);
    } catch (authErr) {
      console.warn("⚠️ Auth error in /shares:", authErr.message);
      return res.status(401).json({ error: authErr.message });
    }

    const { boardId } = req.params;
    console.log("📤 Fetching shares for board:", boardId, "by user:", userId);

    // Verify user owns the board
    const { data: board, error: boardError } = await supabase
      .from("boards")
      .select("user_id")
      .eq("id", boardId)
      .single();

    if (boardError) {
      console.error("❌ Error fetching board:", boardError.message);
      return res.status(500).json({ error: "Failed to fetch board" });
    }

    if (!board || board.user_id !== userId) {
      console.warn("⚠️ Not authorized: board owner mismatch");
      return res.status(403).json({ error: "Not authorized" });
    }

    const { data, error } = await supabase
      .from("board_shares")
      .select("*")
      .eq("board_id", boardId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching shares:", error.message);
      throw error;
    }

    console.log("✅ Shares retrieved:", (data || []).length, "records");
    res.json(data || []);
  } catch (err) {
    console.error("❌ Error in /shares endpoint:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/boards/:boardId/share", async (req, res) => {
  try {
    let userId;
    try {
      userId = getUserId(req);
    } catch (authErr) {
      console.warn("⚠️ Auth error in /share:", authErr.message);
      return res.status(401).json({ error: authErr.message });
    }

    const { boardId } = req.params;
    const { email, permissionLevel } = req.body;

    if (!email || !permissionLevel) {
      return res
        .status(400)
        .json({ error: "Missing required fields: email and permissionLevel" });
    }

    console.log(
      "📧 Sharing board:",
      boardId,
      "with:",
      email,
      "level:",
      permissionLevel,
    );

    // Verify user owns the board
    const { data: board, error: boardError } = await supabase
      .from("boards")
      .select("*")
      .eq("id", boardId)
      .single();

    if (boardError) {
      console.error("❌ Error fetching board:", boardError.message);
      return res.status(500).json({ error: "Failed to fetch board" });
    }

    if (!board || board.user_id !== userId) {
      console.warn("⚠️ Not authorized: board owner mismatch");
      return res.status(403).json({ error: "Not authorized" });
    }

    // Generate share token
    const shareToken = `share_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const { data: share, error: shareError } = await supabase
      .from("board_shares")
      .insert({
        board_id: boardId,
        recipient_email: email,
        permission_level: permissionLevel,
        shared_by: userId,
        share_token: shareToken,
        email_sent: false,
      })
      .select();

    if (shareError) {
      console.error("❌ Error creating share:", shareError.message);
      throw shareError;
    }

    console.log("✅ Share created, sending email...");

    // Send email notification (async - doesn't block response)
    sendBoardShareNotification({
      recipientEmail: email,
      boardTitle: board.title,
      sharedByName: userId,
      shareToken,
      userId,
      boardId,
      permissionLevel,
    })
      .then((emailSent) => {
        // Update email_sent status
        supabase
          .from("board_shares")
          .update({ email_sent: emailSent, email_sent_at: new Date() })
          .eq("id", share[0].id)
          .then(() => console.log(`✅ Email sent to ${email}`))
          .catch((err) =>
            console.error("Error updating email status:", err.message),
          );
      })
      .catch((err) => console.error("Error sending email:", err.message));

    res.json({ success: true, share: share[0], emailSent: true });
  } catch (err) {
    console.error("❌ Error in /share endpoint:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/boards/:boardId/share/:shareId", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { boardId, shareId } = req.params;
    const { permissionLevel } = req.body;

    // Verify user owns the board
    const { data: board } = await supabase
      .from("boards")
      .select("user_id")
      .eq("id", boardId)
      .single();

    if (!board || board.user_id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { data, error } = await supabase
      .from("board_shares")
      .update({ permission_level: permissionLevel })
      .eq("id", shareId)
      .select();

    if (error) throw error;
    res.json({ success: true, share: data[0] });
  } catch (err) {
    console.error("Error updating share:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/boards/:boardId/share/:shareId", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { boardId, shareId } = req.params;

    // Verify user owns the board
    const { data: board } = await supabase
      .from("boards")
      .select("user_id")
      .eq("id", boardId)
      .single();

    if (!board || board.user_id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { error } = await supabase
      .from("board_shares")
      .delete()
      .eq("id", shareId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting share:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/boards/share/:shareToken", async (req, res) => {
  try {
    const { shareToken } = req.params;

    const { data: share, error } = await supabase
      .from("board_shares")
      .select("*")
      .eq("share_token", shareToken)
      .single();

    if (error || !share) {
      return res.status(404).json({ error: "Invalid share link" });
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(400).json({ error: "Share link has expired" });
    }

    const { data: board } = await supabase
      .from("boards")
      .select("*")
      .eq("id", share.board_id)
      .single();

    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    res.json({ success: true, board, share });
  } catch (err) {
    console.error("Error accessing shared board:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// TAGS ENDPOINTS
// ============================================================================

// GET /api/tags - Get all tags with usage counts
app.get("/api/tags", async (req, res) => {
  try {
    const { data, error } = await supabase.rpc("get_all_tags");
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error("Error fetching tags:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/resources/:resourceId/tags - Get tags for a resource
app.get("/api/resources/:resourceId/tags", async (req, res) => {
  try {
    const { resourceId } = req.params;

    const { data, error } = await supabase
      .from("resource_tags")
      .select("tags(id, name, slug)")
      .eq("resource_id", resourceId);

    if (error) throw error;
    const tags = (data || []).map((rt) => rt.tags).filter(Boolean);
    res.json(tags);
  } catch (err) {
    console.error("Error fetching resource tags:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/resources/:resourceId/tags - Add tags to a resource
app.post("/api/resources/:resourceId/tags", async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: "Tags must be a non-empty array" });
    }

    // Verify resource exists
    const { data: resource } = await supabase
      .from("resources")
      .select("id")
      .eq("id", resourceId)
      .single();

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Use upsertResourceTags helper to add new tags
    await upsertResourceTags(resourceId, tags);

    // Return updated tags
    const { data, error } = await supabase
      .from("resource_tags")
      .select("tags(id, name, slug)")
      .eq("resource_id", resourceId);

    if (error) throw error;
    const updatedTags = (data || []).map((rt) => rt.tags).filter(Boolean);
    res.json(updatedTags);
  } catch (err) {
    console.error("Error adding tags to resource:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/resources/:resourceId/tags/:tagId - Remove tag from resource
app.delete("/api/resources/:resourceId/tags/:tagId", async (req, res) => {
  try {
    const { resourceId, tagId } = req.params;

    const { error } = await supabase
      .from("resource_tags")
      .delete()
      .eq("resource_id", resourceId)
      .eq("tag_id", parseInt(tagId));

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("Error removing tag from resource:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

app.get("/api/analytics/summary", async (req, res) => {
  try {
    const userId = getUserId(req);

    const { data: boards } = await supabase
      .from("boards")
      .select("id")
      .eq("user_id", userId);

    const { data: resources } = await supabase
      .from("resources")
      .select("id, status")
      .in("board_id", boards?.map((b) => b.id) || []);

    const completedResources =
      resources?.filter((r) => r.status === "completed").length || 0;

    const { data: scoredResources } = await supabase
      .from("resources")
      .select("latest_assignment_score")
      .in("board_id", boards?.map((b) => b.id) || [])
      .not("latest_assignment_score", "is", null);

    const averageScore =
      scoredResources && scoredResources.length > 0
        ? Math.round(
            scoredResources.reduce(
              (sum, res) => sum + (res.latest_assignment_score || 0),
              0,
            ) / scoredResources.length,
          )
        : 0;

    res.json({
      totalBoards: boards?.length || 0,
      totalResources: resources?.length || 0,
      completedResources,
      averageScore,
    });
  } catch (err) {
    console.error("Error fetching analytics:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/analytics/distribution", async (req, res) => {
  try {
    const userId = getUserId(req);

    const { data: boards } = await supabase
      .from("boards")
      .select("id")
      .eq("user_id", userId);

    const { data: resources } = await supabase
      .from("resources")
      .select("category")
      .in("board_id", boards?.map((b) => b.id) || []);

    const distribution = {
      Video: 0,
      Notes: 0,
      PDF: 0,
      Practice: 0,
      Reading: 0,
    };

    resources?.forEach((r) => {
      if (r.category && distribution.hasOwnProperty(r.category)) {
        distribution[r.category]++;
      }
    });

    res.json(distribution);
  } catch (err) {
    console.error("Error fetching distribution:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/analytics/completion", async (req, res) => {
  try {
    const userId = getUserId(req);

    const { data: boards } = await supabase
      .from("boards")
      .select("id")
      .eq("user_id", userId);

    const boardIds = boards?.map((b) => b.id) || [];
    const { data: resources } = await supabase
      .from("resources")
      .select("id, status")
      .in("board_id", boardIds);

    const completed =
      resources?.filter((r) => r.status === "completed").length || 0;
    const total = resources?.length || 0;

    res.json({
      completed,
      pending: total - completed,
      total,
    });
  } catch (err) {
    console.error("Error fetching completion:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/analytics/overview", async (req, res) => {
  try {
    const userId = getUserId(req);

    const { data: boards, error: boardsError } = await supabase
      .from("boards")
      .select("id")
      .eq("user_id", userId);

    if (boardsError) throw boardsError;

    const boardIds = boards?.map((b) => b.id) || [];
    const { data: resources, error: resourcesError } = await supabase
      .from("resources")
      .select("status, category, latest_assignment_score, progress, assignment_completed")
      .in("board_id", boardIds);

    if (resourcesError) throw resourcesError;

    const totalBoards = boardIds.length;
    const totalResources = resources?.length || 0;
    const completedResources =
      resources?.filter((r) => r.status === "completed").length || 0;
    const scoredResources = resources?.filter(
      (r) =>
        r.latest_assignment_score !== null &&
        r.latest_assignment_score !== undefined,
    );
    const averageScore =
      scoredResources && scoredResources.length > 0
        ? Math.round(
            scoredResources.reduce(
              (sum, res) => sum + (res.latest_assignment_score || 0),
              0,
            ) / scoredResources.length,
          )
        : 0;

    const distribution = {
      Video: 0,
      Notes: 0,
      PDF: 0,
      Practice: 0,
      Reading: 0,
    };

    let totalProgress = 0;
    let quizzesCompleted = 0;

    resources?.forEach((resource) => {
      if (resource.category && distribution.hasOwnProperty(resource.category)) {
        distribution[resource.category]++;
      }
      totalProgress += resource.progress || 0;
      if (resource.assignment_completed) {
        quizzesCompleted += 1;
      }
    });

    const completed = completedResources;
    const pending = totalResources - completed;
    const averageProgress = totalResources > 0 ? Math.round(totalProgress / totalResources) : 0;
    const assignmentCompletionRate = totalResources > 0 ? Math.round((quizzesCompleted / totalResources) * 100) : 0;

    res.json({
      totalBoards,
      totalResources,
      completedResources,
      averageScore,
      averageProgress,
      quizzesCompleted,
      assignmentCompletionRate,
      distribution,
      completion: {
        completed,
        pending,
        total: totalResources,
      },
    });
  } catch (err) {
    console.error("Error fetching analytics overview:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// AI CONTENT GENERATION ENDPOINTS
// ============================================================================

// Generate AI content (summary, key points, flashcards) for a resource
app.post("/api/resources/:resourceId/generate-ai", async (req, res) => {
  try {
    const { resourceId } = req.params;
    let { url, contentType } = req.body;

    if (!url) {
      const { data: resource, error: resourceError } = await supabase
        .from("resources")
        .select("url, urls")
        .eq("id", resourceId)
        .single();

      if (resourceError) {
        throw resourceError;
      }

      url = resource?.url || (resource?.urls?.[0] ?? null);
    }

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    console.log(
      `🤖 Generating AI content for resource ${resourceId} from URL: ${url}`,
    );

    let content;
    let extractedType = contentType || "article";

    // Determine content type and extract content
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      extractedType = "youtube_transcript";
      const videoId = youtubeService.extractVideoId(url);
      if (!videoId) {
        return res.status(400).json({ error: "Invalid YouTube URL" });
      }

      try {
        content = await youtubeService.getTranscript(videoId);
        console.log(`📺 Successfully fetched transcript for video: ${videoId}`);
      } catch (transcriptError) {
        console.warn(
          `⚠️ Could not fetch transcript for ${videoId}:`,
          transcriptError.message,
        );
        content = `[YouTube Video Content]\n\nTitle: Learning Resource\nThis is a fallback transcript placeholder because the video transcript could not be retrieved.`;
      }
    } else if (url.includes(".pdf") || url.startsWith("/uploads/pdfs")) {
      // Handle PDF files
      extractedType = "pdf_text";
      console.log(`📄 Processing PDF file: ${url}`);

      try {
        // Extract text from PDF using pdf-parse
        content = await extractPDFText(url);
        console.log(`📄 Successfully extracted text from PDF: ${url}`);
      } catch (pdfError) {
        console.error("Error extracting PDF text:", pdfError.message);
        content = `[PDF Document]\n\nNote: Could not extract text from PDF. Error: ${pdfError.message}`;
      }
    } else {
      extractedType = "article_text";
      try {
        content = await extractArticleText(url);
      } catch (extractError) {
        console.warn(
          "Warning: Could not extract article text:",
          extractError.message,
        );
        content = `[Article Content]\n\nUnable to extract full article text from URL. Using this placeholder for demonstration.`;
      }
    }

    console.log(`✅ Content extracted, length: ${content.length} characters`);

    // Validate content isn't too short
    if (!content || content.length < 20) {
      console.warn("⚠️ Extracted content too short, may fail AI generation");
    }

    // Store extracted content
    const { data: extractedData, error: extractError } = await supabase
      .from("extracted_content")
      .insert({
        resource_id: resourceId,
        content_type: extractedType,
        content: content,
      })
      .select();

    if (extractError) {
      console.warn("Warning: Could not store extracted content:", extractError);
    }

    // Generate AI content
    console.log("🔄 Calling Gemini API...");
    const aiContent = await generateAIContent(content, extractedType);
    console.log("✅ AI content generated successfully");

    // Store summary - delete old if exists, then insert
    try {
      await supabase
        .from("ai_summaries")
        .delete()
        .eq("resource_id", resourceId);
    } catch (e) {
      // Ignore delete errors
    }

    const { data: summaryData, error: summaryError } = await supabase
      .from("ai_summaries")
      .insert({
        resource_id: resourceId,
        summary: aiContent.summary,
        key_points: aiContent.keyPoints,
      })
      .select();

    if (summaryError) {
      console.error("Error storing summary:", summaryError);
      return res.status(500).json({ error: "Failed to store summary" });
    }

    // Store flashcards - delete old if exists, then insert
    try {
      await supabase
        .from("ai_flashcards")
        .delete()
        .eq("resource_id", resourceId);
    } catch (e) {
      // Ignore delete errors
    }

    const { data: flashcardData, error: flashcardError } = await supabase
      .from("ai_flashcards")
      .insert({
        resource_id: resourceId,
        flashcards: aiContent.flashcards,
      })
      .select();

    if (flashcardError) {
      console.error("Error storing flashcards:", flashcardError);
      return res.status(500).json({ error: "Failed to store flashcards" });
    }

    console.log(
      `✅ AI content generated successfully for resource ${resourceId}`,
    );

    res.json({
      summary: aiContent.summary,
      keyPoints: aiContent.keyPoints,
      flashcards: aiContent.flashcards,
    });
  } catch (err) {
    console.error("❌ Error generating AI content:", err.message);
    console.error("Stack trace:", err.stack);
    console.error("Full error:", JSON.stringify(err, null, 2));
    res.status(500).json({
      error: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// Get AI summary for a resource
app.get("/api/resources/:resourceId/summary", async (req, res) => {
  try {
    const { resourceId } = req.params;
    console.log("📄 Fetching summary for resource:", resourceId);

    const { data: summary, error } = await supabase
      .from("ai_summaries")
      .select("*")
      .eq("resource_id", resourceId)
      .single();

    if (error) {
      console.warn("⚠️ Summary query error:", error.message);
      if (error.code === "PGRST116") {
        // No rows found
        return res
          .status(404)
          .json({ error: "Summary not found", code: "NOT_FOUND" });
      }
      throw error;
    }

    if (!summary) {
      return res.status(404).json({ error: "Summary not found" });
    }

    console.log("✅ Summary retrieved successfully");
    res.json({
      summary: summary.summary,
      keyPoints: summary.key_points || [],
    });
  } catch (err) {
    console.error("❌ Error fetching summary:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get AI flashcards for a resource
app.get("/api/resources/:resourceId/flashcards", async (req, res) => {
  try {
    const { resourceId } = req.params;

    const { data: flashcards, error } = await supabase
      .from("ai_flashcards")
      .select("*")
      .eq("resource_id", resourceId)
      .single();

    if (error || !flashcards) {
      return res.status(404).json({ error: "Flashcards not found" });
    }

    res.json({
      flashcards: flashcards.flashcards || [],
    });
  } catch (err) {
    console.error("Error fetching flashcards:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get extracted content for a resource
app.get("/api/resources/:resourceId/extracted-content", async (req, res) => {
  try {
    const { resourceId } = req.params;

    const { data: content, error } = await supabase
      .from("extracted_content")
      .select("*")
      .eq("resource_id", resourceId)
      .order("extracted_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !content) {
      return res.status(404).json({ error: "Extracted content not found" });
    }

    res.json(content);
  } catch (err) {
    console.error("Error fetching extracted content:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// PDF UPLOAD ENDPOINT
// ============================================================================

app.post("/api/upload/pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileUrl = `/uploads/pdfs/${req.file.filename}`;
    console.log("📄 PDF uploaded successfully:", fileUrl);

    res.json({
      success: true,
      fileUrl: fileUrl,
      filename: req.file.originalname,
      size: req.file.size,
    });
  } catch (err) {
    console.error("Error uploading PDF:", err);
    res.status(500).json({ error: err.message });
  }
});

// Process uploaded PDF and generate AI content
app.post("/api/resources/:resourceId/process-pdf", async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { pdfPath } = req.body;

    if (!pdfPath) {
      return res.status(400).json({ error: "PDF path is required" });
    }

    console.log(`🤖 Processing PDF for resource ${resourceId}: ${pdfPath}`);

    // Extract text from PDF
    let pdfText;
    try {
      pdfText = await extractPDFText(pdfPath);
    } catch (extractError) {
      console.warn(
        "Warning: Could not extract PDF text:",
        extractError.message,
      );
      return res.status(400).json({
        error: "Failed to extract text from PDF. Ensure the PDF is valid.",
      });
    }

    // Store extracted content
    const { data: extractedData, error: extractError } = await supabase
      .from("extracted_content")
      .insert({
        resource_id: resourceId,
        content_type: "pdf_text",
        content: pdfText,
      })
      .select();

    if (extractError) {
      console.warn("Warning: Could not store extracted content:", extractError);
    }

    // Generate AI content from extracted text
    const aiContent = await generateAIContent(pdfText, "pdf_text");

    // Store summary
    try {
      await supabase
        .from("ai_summaries")
        .delete()
        .eq("resource_id", resourceId);
    } catch (e) {
      // Ignore delete errors
    }

    const { data: summaryData, error: summaryError } = await supabase
      .from("ai_summaries")
      .insert({
        resource_id: resourceId,
        summary: aiContent.summary,
        key_points: aiContent.keyPoints,
      })
      .select();

    if (summaryError) {
      console.error("Error storing summary:", summaryError);
      return res.status(500).json({ error: "Failed to store summary" });
    }

    // Store flashcards
    try {
      await supabase
        .from("ai_flashcards")
        .delete()
        .eq("resource_id", resourceId);
    } catch (e) {
      // Ignore delete errors
    }

    const { data: flashcardData, error: flashcardError } = await supabase
      .from("ai_flashcards")
      .insert({
        resource_id: resourceId,
        flashcards: aiContent.flashcards,
      })
      .select();

    if (flashcardError) {
      console.error("Error storing flashcards:", flashcardError);
      return res.status(500).json({ error: "Failed to store flashcards" });
    }

    console.log(`✅ PDF processed successfully for resource ${resourceId}`);

    res.json({
      success: true,
      extractedText: pdfText,
      summary: aiContent.summary,
      keyPoints: aiContent.keyPoints,
      flashcards: aiContent.flashcards,
    });
  } catch (err) {
    console.error("❌ Error processing PDF:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`🚀 EduCompass Backend running at http://localhost:${PORT}`);
  console.log(`📊 Connected to Supabase`);
});
