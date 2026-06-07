import {
  pgTable,
  varchar,
  text,
  integer,
  serial,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { InferSelectModel } from "drizzle-orm";

export const USER_TIERS = ["free", "pro", "studio", "unlimited"] as const;
export type UserTier = (typeof USER_TIERS)[number];

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().default("gen_random_uuid()"),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  email: text("email"),
  tier: text("tier").notNull().default("free"),
  credits: integer("credits").notNull().default(50),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = InferSelectModel<typeof users>;

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey().default("gen_random_uuid()"),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Session = InferSelectModel<typeof sessions>;

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).references(() => users.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull().default("پروژه بدون عنوان"),
  description: text("description"),
  creativeIntent: text("creative_intent"),
  style: text("style"),
  tone: text("tone"),
  aspectRatio: text("aspect_ratio").default("16:9"),
  currentStage: text("current_stage").default("narrative"),
  thumbnailUrl: text("thumbnail_url"),
  progress: integer("progress").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Project = InferSelectModel<typeof projects>;

export const narratives = pgTable("narratives", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  idea: text("idea"),
  logline: text("logline"),
  script: text("script"),
  targetAudience: text("target_audience"),
  duration: text("duration"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Narrative = InferSelectModel<typeof narratives>;

export const visionBoards = pgTable("vision_boards", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  directorBrief: jsonb("director_brief"),
  referenceImages: jsonb("reference_images"),
  colorPalette: jsonb("color_palette"),
  moodKeywords: jsonb("mood_keywords"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type VisionBoard = InferSelectModel<typeof visionBoards>;

export const visionShots = pgTable("vision_shots", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
  title: text("title").notNull().default("شات بدون عنوان"),
  description: text("description"),
  prompt: text("prompt"),
  shotType: text("shot_type"),
  cameraAngle: text("camera_angle"),
  cameraMovement: text("camera_movement"),
  keyLight: text("key_light"),
  colorGrade: text("color_grade"),
  cameraModel: text("camera_model"),
  lensType: text("lens_type"),
  focalLength: text("focal_length"),
  cinemaAspectRatio: text("cinema_aspect_ratio"),
  duration: integer("duration").default(3),
  dialogueText: text("dialogue_text"),
  notes: text("notes"),
  sceneNumber: integer("scene_number"),
  sceneName: text("scene_name"),
  status: text("status").default("draft"),
  generatedImageUrl: text("generated_image_url"),
  generatedVideoUrl: text("generated_video_url"),
  lipSyncStatus: text("lip_sync_status").default("none"),
  lipSyncTaskId: text("lip_sync_task_id"),
  lipSyncUrl: text("lip_sync_url"),
  dialogueAudioUrl: text("dialogue_audio_url"),
  endFrameUrl: text("end_frame_url"),
  klingTaskId: text("kling_task_id"),
  locationId: integer("location_id"),
  characterIds: jsonb("character_ids"),
  propIds: jsonb("prop_ids"),
  raccordNotes: text("raccord_notes"),
  transitionFromPrev: text("transition_from_prev"),
  generationVersions: jsonb("generation_versions"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type VisionShot = InferSelectModel<typeof visionShots>;

export const assemblies = pgTable("assemblies", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  timeline: jsonb("timeline"),
  exportSettings: jsonb("export_settings"),
  status: text("status").default("draft"),
  exportUrl: text("export_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Assembly = InferSelectModel<typeof assemblies>;

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).references(() => users.id, {
    onDelete: "set null",
  }),
  projectId: integer("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  type: text("type"),
  description: text("description"),
  mediaType: text("media_type"),
  mimeType: text("mime_type"),
  fileUrl: text("file_url"),
  imageUrl: text("image_url"),
  thumbnailUrl: text("thumbnail_url"),
  fileSize: integer("file_size"),
  duration: integer("duration"),
  width: integer("width"),
  height: integer("height"),
  source: text("source").default("uploaded"),
  tags: jsonb("tags"),
  metadata: jsonb("metadata"),
  klingElementId: text("kling_element_id"),
  multiShotUrls: jsonb("multi_shot_urls"),
  angleImages: jsonb("angle_images"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Asset = InferSelectModel<typeof assets>;

export const audioTracks = pgTable("audio_tracks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  shotId: integer("shot_id")
    .references(() => visionShots.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url"),
  duration: integer("duration"),
  type: text("type").default("music"),
  volume: integer("volume").default(100),
  startTime: integer("start_time").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AudioTrack = InferSelectModel<typeof audioTracks>;

export const omniChatSessions = pgTable("omni_chat_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  title: text("title").default("گفتگوی جدید"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OmniChatSession = InferSelectModel<typeof omniChatSessions>;

export const omniChatMessages = pgTable("omni_chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => omniChatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("user"),
  content: text("content").notNull(),
  imageGeneration: jsonb("image_generation"),
  attachedImages: jsonb("attached_images"),
  toolResults: jsonb("tool_results"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OmniChatMessage = InferSelectModel<typeof omniChatMessages>;

export const usageLogs = pgTable("usage_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  creditsUsed: integer("credits_used").notNull().default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UsageLog = InferSelectModel<typeof usageLogs>;

export const agentRunLogs = pgTable("agent_run_logs", {
  id: serial("id").primaryKey(),
  threadId: text("thread_id").notNull(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  nodeName: text("node_name").notNull(),
  status: text("status").notNull().default("running"),
  costCredits: integer("cost_credits").default(0),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AgentRunLog = InferSelectModel<typeof agentRunLogs>;

export const featureFlags = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  label: text("label"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type FeatureFlag = InferSelectModel<typeof featureFlags>;

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("open"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Ticket = InferSelectModel<typeof tickets>;

export const ticketMessages = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  authorId: varchar("author_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TicketMessage = InferSelectModel<typeof ticketMessages>;

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  icon: text("icon"),
  priority: text("priority").default("normal"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Announcement = InferSelectModel<typeof announcements>;

export const announcementReads = pgTable("announcement_reads", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id")
    .notNull()
    .references(() => announcements.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").defaultNow().notNull(),
});

export type AnnouncementRead = InferSelectModel<typeof announcementReads>;
