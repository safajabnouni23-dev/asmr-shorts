import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  serial,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  gender: text("gender").notNull(), // "male" | "female"
  maleContentRatio: integer("male_content_ratio").default(10).notNull(), // percentage 0-100
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
});

export const likedVideos = pgTable("liked_videos", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  videoId: text("video_id").notNull(),
  videoTitle: text("video_title").default("").notNull(),
  creatorGender: text("creator_gender").default("unknown").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const watchedVideos = pgTable("watched_videos", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  videoId: text("video_id").notNull(),
  watchedAt: timestamp("watched_at").defaultNow().notNull(),
});

export const videoCache = pgTable("video_cache", {
  id: serial("id").primaryKey(),
  videoId: text("video_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").default("").notNull(),
  thumbnailUrl: text("thumbnail_url").default("").notNull(),
  channelTitle: text("channel_title").default("").notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  approved: boolean("approved").default(true).notNull(),
  cachedAt: timestamp("cached_at").defaultNow().notNull(),
});
