import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
  date,
  time,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Event types for categorizing activities
export const EVENT_TYPES = ['JJ', 'Janmashtami', 'Holi', 'Other'] as const;
export type EventType = typeof EVENT_TYPES[number];

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Members table - sevarthis registered in the system
export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mhtId: varchar("mht_id").notNull().unique(),
  name: varchar("name").notNull(),
  email: varchar("email"),
  mobile: varchar("mobile"),
  birthday: date("birthday"),
  gDay: date("g_day"),
  isAdmin: boolean("is_admin").default(false),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stories table
export const stories = pgTable("stories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  eventType: varchar("event_type"), // 'JJ', 'Janmashtami', 'Holi', 'Other'
  eventCustom: varchar("event_custom"), // Custom event name when eventType is 'Other'
  createdAt: timestamp("created_at").defaultNow(),
});

// Characters table - linked to stories
export const characters = pgTable("characters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  storyId: varchar("story_id").notNull().references(() => stories.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Roles table (Character, AV, Management, Announcement, Counting, etc.)
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Attendance records
export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: 'cascade' }),
  date: date("date").notNull(),
  status: varchar("status").notNull(), // 'present', 'absent', 'replaced'
  storyId: varchar("story_id").references(() => stories.id),
  timeIn: time("time_in"),
  timeOut: time("time_out"),
  roleId: varchar("role_id").references(() => roles.id),
  characterIds: text("character_ids").array(), // Array of character IDs if role is Character
  reason: text("reason"), // For absent status
  reasonVisibleToAdmins: boolean("reason_visible_to_admins").default(false),
  replacedMemberId: varchar("replaced_member_id").references(() => members.id), // Whom they replaced
  eventType: varchar("event_type"), // 'JJ', 'Janmashtami', 'Holi', 'Other'
  eventCustom: varchar("event_custom"), // Custom event name when eventType is 'Other'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Show details
export const shows = pgTable("shows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: date("date").notNull(),
  storyId: varchar("story_id").notNull().references(() => stories.id),
  numberOfShows: integer("number_of_shows").default(1),
  audiencePerShow: integer("audience_per_show").array(),
  totalAudience: integer("total_audience"),
  isSchool: boolean("is_school").default(false),
  schoolName: varchar("school_name"),
  schoolPlace: varchar("school_place"),
  numberOfStudents: integer("number_of_students"),
  asPlanned: boolean("as_planned").default(true),
  cancelledReason: text("cancelled_reason"),
  notAsPlannedReason: text("not_as_planned_reason"),
  eventType: varchar("event_type"), // 'JJ', 'Janmashtami', 'Holi', 'Other'
  eventCustom: varchar("event_custom"), // Custom event name when eventType is 'Other'
  createdById: varchar("created_by_id").references(() => members.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications/Announcements
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  type: varchar("type").notNull(), // 'announcement', 'planner', 'meeting', 'poll'
  eventType: varchar("event_type"), // 'JJ', 'Janmashtami', 'Holi', 'Other'
  eventCustom: varchar("event_custom"), // Custom event name when eventType is 'Other'
  createdById: varchar("created_by_id").references(() => members.id),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Polls
export const polls = pgTable("polls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: varchar("question").notNull(),
  options: text("options").array().notNull(),
  notificationId: varchar("notification_id").references(() => notifications.id, { onDelete: 'cascade' }),
  isActive: boolean("is_active").default(true),
  createdById: varchar("created_by_id").references(() => members.id),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// Poll responses
export const pollResponses = pgTable("poll_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollId: varchar("poll_id").notNull().references(() => polls.id, { onDelete: 'cascade' }),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: 'cascade' }),
  selectedOption: integer("selected_option").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reports submitted by users to admins
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  eventType: varchar("event_type"), // 'JJ', 'Janmashtami', 'Holi', 'Other'
  eventCustom: varchar("event_custom"), // Custom event name when eventType is 'Other'
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Practice drive links
export const practiceLinks = pgTable("practice_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storyId: varchar("story_id").notNull().references(() => stories.id, { onDelete: 'cascade' }),
  title: varchar("title").notNull(),
  url: varchar("url").notNull(),
  createdById: varchar("created_by_id").references(() => members.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  member: one(members, {
    fields: [users.id],
    references: [members.userId],
  }),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
  attendanceRecords: many(attendance),
  reports: many(reports),
}));

export const storiesRelations = relations(stories, ({ many }) => ({
  characters: many(characters),
  shows: many(shows),
  practiceLinks: many(practiceLinks),
}));

export const charactersRelations = relations(characters, ({ one }) => ({
  story: one(stories, {
    fields: [characters.storyId],
    references: [stories.id],
  }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  member: one(members, {
    fields: [attendance.memberId],
    references: [members.id],
  }),
  story: one(stories, {
    fields: [attendance.storyId],
    references: [stories.id],
  }),
  role: one(roles, {
    fields: [attendance.roleId],
    references: [roles.id],
  }),
  replacedMember: one(members, {
    fields: [attendance.replacedMemberId],
    references: [members.id],
  }),
}));

export const showsRelations = relations(shows, ({ one }) => ({
  story: one(stories, {
    fields: [shows.storyId],
    references: [stories.id],
  }),
  createdBy: one(members, {
    fields: [shows.createdById],
    references: [members.id],
  }),
}));

export const pollsRelations = relations(polls, ({ one, many }) => ({
  notification: one(notifications, {
    fields: [polls.notificationId],
    references: [notifications.id],
  }),
  responses: many(pollResponses),
}));

export const pollResponsesRelations = relations(pollResponses, ({ one }) => ({
  poll: one(polls, {
    fields: [pollResponses.pollId],
    references: [polls.id],
  }),
  member: one(members, {
    fields: [pollResponses.memberId],
    references: [members.id],
  }),
}));

export const practiceLinksRelations = relations(practiceLinks, ({ one }) => ({
  story: one(stories, {
    fields: [practiceLinks.storyId],
    references: [stories.id],
  }),
}));

// Insert schemas
export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStorySchema = createInsertSchema(stories).omit({
  id: true,
  createdAt: true,
});

export const insertCharacterSchema = createInsertSchema(characters).omit({
  id: true,
  createdAt: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShowSchema = createInsertSchema(shows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertPollSchema = createInsertSchema(polls).omit({
  id: true,
  createdAt: true,
});

export const insertPollResponseSchema = createInsertSchema(pollResponses).omit({
  id: true,
  createdAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

export const insertPracticeLinkSchema = createInsertSchema(practiceLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = typeof stories.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof characters.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertShow = z.infer<typeof insertShowSchema>;
export type Show = typeof shows.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertPoll = z.infer<typeof insertPollSchema>;
export type Poll = typeof polls.$inferSelect;
export type InsertPollResponse = z.infer<typeof insertPollResponseSchema>;
export type PollResponse = typeof pollResponses.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertPracticeLink = z.infer<typeof insertPracticeLinkSchema>;
export type PracticeLink = typeof practiceLinks.$inferSelect;

// Extended types with relations
export type MemberWithUser = Member & { user?: User };
export type StoryWithCharacters = Story & { characters: Character[] };
export type AttendanceWithDetails = Attendance & {
  member?: Member;
  story?: Story;
  role?: Role;
  replacedMember?: Member;
};
export type ShowWithDetails = Show & {
  story?: Story;
  createdBy?: Member;
};
export type PollWithResponses = Poll & {
  responses?: PollResponse[];
};
