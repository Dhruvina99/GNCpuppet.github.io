import {
  users,
  members,
  stories,
  characters,
  roles,
  attendance,
  shows,
  notifications,
  polls,
  pollResponses,
  reports,
  practiceLinks,
  type User,
  type UpsertUser,
  type Member,
  type InsertMember,
  type Story,
  type InsertStory,
  type Character,
  type InsertCharacter,
  type Role,
  type InsertRole,
  type Attendance,
  type InsertAttendance,
  type Show,
  type InsertShow,
  type Notification,
  type InsertNotification,
  type Poll,
  type InsertPoll,
  type PollResponse,
  type InsertPollResponse,
  type Report,
  type InsertReport,
  type PracticeLink,
  type InsertPracticeLink,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Member operations
  getMemberByUserId(userId: string): Promise<Member | undefined>;
  getMember(id: string): Promise<Member | undefined>;
  getMembers(): Promise<Member[]>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: string, member: Partial<InsertMember>): Promise<Member | undefined>;
  deleteMember(id: string): Promise<void>;

  // Story operations
  getStories(): Promise<Story[]>;
  getStoriesWithCharacters(): Promise<(Story & { characters: Character[] })[]>;
  getStory(id: string): Promise<Story | undefined>;
  createStory(story: InsertStory): Promise<Story>;
  updateStory(id: string, story: Partial<InsertStory>): Promise<Story | undefined>;
  deleteStory(id: string): Promise<void>;

  // Character operations
  getCharactersByStory(storyId: string): Promise<Character[]>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  deleteCharacter(id: string): Promise<void>;

  // Role operations
  getRoles(): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;

  // Attendance operations
  getAttendanceByMember(memberId: string): Promise<Attendance[]>;
  getAllAttendance(): Promise<Attendance[]>;
  getAttendanceWithDetails(): Promise<any[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;

  // Show operations
  getShows(): Promise<Show[]>;
  getShowsWithDetails(): Promise<any[]>;
  createShow(show: InsertShow): Promise<Show>;
  updateShow(id: string, show: Partial<InsertShow>): Promise<Show | undefined>;
  deleteShow(id: string): Promise<void>;

  // Notification operations
  getNotifications(): Promise<Notification[]>;
  getActiveNotifications(): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  deleteNotification(id: string): Promise<void>;

  // Poll operations
  getPolls(): Promise<Poll[]>;
  createPoll(poll: InsertPoll): Promise<Poll>;
  getPollResponsesByPollId(pollId: string): Promise<PollResponse[]>;
  createPollResponse(response: InsertPollResponse): Promise<PollResponse>;

  // Report operations
  getReports(): Promise<Report[]>;
  getReportsByMember(memberId: string): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  markReportAsRead(id: string): Promise<void>;

  // Practice Links operations
  getPracticeLinks(): Promise<PracticeLink[]>;
  getPracticeLinksWithStory(): Promise<(PracticeLink & { story?: Story })[]>;
  createPracticeLink(link: InsertPracticeLink): Promise<PracticeLink>;
  updatePracticeLink(id: string, link: Partial<InsertPracticeLink>): Promise<PracticeLink | undefined>;
  deletePracticeLink(id: string): Promise<void>;

  // Stats
  getStats(): Promise<{
    totalMembers: number;
    totalShows: number;
    recentAttendance: number;
    activeNotifications: number;
  }>;
  getReportStats(): Promise<{
    totalMembers: number;
    averageAttendance: number;
    topPerformers: { name: string; percentage: number }[];
    lowPerformers: { name: string; percentage: number }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Member operations
  async getMemberByUserId(userId: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.userId, userId));
    return member;
  }

  async getMember(id: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member;
  }

  async getMembers(): Promise<Member[]> {
    return db.select().from(members).orderBy(members.name);
  }

  async createMember(member: InsertMember): Promise<Member> {
    // Auto-create user for new member
    let userId = member.userId;
    if (!userId) {
      const [newUser] = await db.insert(users).values({
        email: member.email,
        firstName: member.name?.split(' ')[0],
        lastName: member.name?.split(' ').slice(1).join(' '),
      }).returning();
      userId = newUser.id;
    }
    
    const [created] = await db.insert(members).values({
      ...member,
      userId,
    }).returning();
    return created;
  }

  async updateMember(id: string, member: Partial<InsertMember>): Promise<Member | undefined> {
    const [updated] = await db
      .update(members)
      .set({ ...member, updatedAt: new Date() })
      .where(eq(members.id, id))
      .returning();
    return updated;
  }

  async deleteMember(id: string): Promise<void> {
    await db.delete(members).where(eq(members.id, id));
  }

  // Story operations
  async getStories(): Promise<Story[]> {
    return db.select().from(stories).where(eq(stories.isActive, true)).orderBy(stories.name);
  }

  async getStoriesWithCharacters(): Promise<(Story & { characters: Character[] })[]> {
    const allStories = await db.select().from(stories).where(eq(stories.isActive, true)).orderBy(stories.name);
    const allCharacters = await db.select().from(characters);
    
    return allStories.map(story => ({
      ...story,
      characters: allCharacters.filter(c => c.storyId === story.id),
    }));
  }

  async getStory(id: string): Promise<Story | undefined> {
    const [story] = await db.select().from(stories).where(eq(stories.id, id));
    return story;
  }

  async createStory(story: InsertStory): Promise<Story> {
    const [created] = await db.insert(stories).values(story).returning();
    return created;
  }

  async updateStory(id: string, story: Partial<InsertStory>): Promise<Story | undefined> {
    const [updated] = await db.update(stories).set(story).where(eq(stories.id, id)).returning();
    return updated;
  }

  async deleteStory(id: string): Promise<void> {
    await db.update(stories).set({ isActive: false }).where(eq(stories.id, id));
  }

  // Character operations
  async getCharactersByStory(storyId: string): Promise<Character[]> {
    return db.select().from(characters).where(eq(characters.storyId, storyId)).orderBy(characters.name);
  }

  async createCharacter(character: InsertCharacter): Promise<Character> {
    const [created] = await db.insert(characters).values(character).returning();
    return created;
  }

  async deleteCharacter(id: string): Promise<void> {
    await db.delete(characters).where(eq(characters.id, id));
  }

  // Role operations
  async getRoles(): Promise<Role[]> {
    return db.select().from(roles).where(eq(roles.isActive, true)).orderBy(roles.name);
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [created] = await db.insert(roles).values(role).returning();
    return created;
  }

  // Attendance operations
  async getAttendanceByMember(memberId: string): Promise<Attendance[]> {
    return db.select().from(attendance).where(eq(attendance.memberId, memberId)).orderBy(desc(attendance.date));
  }

  async getAllAttendance(): Promise<Attendance[]> {
    return db.select().from(attendance).orderBy(desc(attendance.date));
  }

  async getAttendanceWithDetails(): Promise<any[]> {
    const allAttendance = await db.select().from(attendance).orderBy(desc(attendance.date));
    const allMembers = await db.select().from(members);
    const allStories = await db.select().from(stories);
    const allRoles = await db.select().from(roles);

    return allAttendance.map(record => ({
      ...record,
      member: allMembers.find(m => m.id === record.memberId),
      story: allStories.find(s => s.id === record.storyId),
      role: allRoles.find(r => r.id === record.roleId),
      replacedMember: allMembers.find(m => m.id === record.replacedMemberId),
    }));
  }

  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const [created] = await db.insert(attendance).values(attendanceData).returning();
    return created;
  }

  // Show operations
  async getShows(): Promise<Show[]> {
    return db.select().from(shows).orderBy(desc(shows.date));
  }

  async getShowsWithDetails(): Promise<any[]> {
    const allShows = await db.select().from(shows).orderBy(desc(shows.date));
    const allStories = await db.select().from(stories);
    const allMembers = await db.select().from(members);

    return allShows.map(show => ({
      ...show,
      story: allStories.find(s => s.id === show.storyId),
      createdBy: allMembers.find(m => m.id === show.createdById),
    }));
  }

  async createShow(show: InsertShow): Promise<Show> {
    const [created] = await db.insert(shows).values(show).returning();
    return created;
  }

  async updateShow(id: string, show: Partial<InsertShow>): Promise<Show | undefined> {
    const [updated] = await db.update(shows).set({ ...show, updatedAt: new Date() }).where(eq(shows.id, id)).returning();
    return updated;
  }

  async deleteShow(id: string): Promise<void> {
    await db.delete(shows).where(eq(shows.id, id));
  }

  // Notification operations
  async getNotifications(): Promise<Notification[]> {
    return db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }

  async getActiveNotifications(): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.isActive, true)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async deleteNotification(id: string): Promise<void> {
    await db.update(notifications).set({ isActive: false }).where(eq(notifications.id, id));
  }

  // Poll operations
  async getPolls(): Promise<Poll[]> {
    return db.select().from(polls).orderBy(desc(polls.createdAt));
  }

  async createPoll(poll: InsertPoll): Promise<Poll> {
    const [created] = await db.insert(polls).values(poll).returning();
    return created;
  }

  async getPollResponsesByPollId(pollId: string): Promise<any[]> {
    const responses = await db.select().from(pollResponses).where(eq(pollResponses.pollId, pollId)).orderBy(desc(pollResponses.createdAt));
    const allMembers = await db.select().from(members);
    
    return responses.map(response => ({
      ...response,
      member: allMembers.find(m => m.id === response.memberId),
    }));
  }

  async createPollResponse(response: InsertPollResponse): Promise<PollResponse> {
    const [created] = await db.insert(pollResponses).values(response).returning();
    return created;
  }

  // Report operations
  async getReports(): Promise<Report[]> {
    const allReports = await db.select().from(reports).orderBy(desc(reports.createdAt));
    const allMembers = await db.select().from(members);
    
    return allReports.map(report => ({
      ...report,
      member: allMembers.find(m => m.id === report.memberId),
    })) as any;
  }

  async getReportsByMember(memberId: string): Promise<Report[]> {
    return db.select().from(reports).where(eq(reports.memberId, memberId)).orderBy(desc(reports.createdAt));
  }

  async createReport(report: InsertReport): Promise<Report> {
    const [created] = await db.insert(reports).values(report).returning();
    return created;
  }

  async markReportAsRead(id: string): Promise<void> {
    await db.update(reports).set({ isRead: true }).where(eq(reports.id, id));
  }

  // Practice Links operations
  async getPracticeLinks(): Promise<PracticeLink[]> {
    return db.select().from(practiceLinks).orderBy(practiceLinks.title);
  }

  async getPracticeLinksWithStory(): Promise<(PracticeLink & { story?: Story })[]> {
    const allLinks = await db.select().from(practiceLinks).orderBy(practiceLinks.title);
    const allStories = await db.select().from(stories);

    return allLinks.map(link => ({
      ...link,
      story: allStories.find(s => s.id === link.storyId),
    }));
  }

  async createPracticeLink(link: InsertPracticeLink): Promise<PracticeLink> {
    const [created] = await db.insert(practiceLinks).values(link).returning();
    return created;
  }

  async updatePracticeLink(id: string, link: Partial<InsertPracticeLink>): Promise<PracticeLink | undefined> {
    const [updated] = await db.update(practiceLinks).set({ ...link, updatedAt: new Date() }).where(eq(practiceLinks.id, id)).returning();
    return updated;
  }

  async deletePracticeLink(id: string): Promise<void> {
    await db.delete(practiceLinks).where(eq(practiceLinks.id, id));
  }

  // Stats
  async getStats(): Promise<{
    totalMembers: number;
    totalShows: number;
    recentAttendance: number;
    activeNotifications: number;
  }> {
    const memberCount = await db.select({ count: sql<number>`count(*)` }).from(members);
    const showCount = await db.select({ count: sql<number>`count(*)` }).from(shows);
    const notificationCount = await db.select({ count: sql<number>`count(*)` }).from(notifications).where(eq(notifications.isActive, true));
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentAttendance = await db.select().from(attendance)
      .where(gte(attendance.date, oneWeekAgo.toISOString().split('T')[0]));
    
    const presentCount = recentAttendance.filter(a => a.status === 'present' || a.status === 'replaced').length;
    const attendancePercentage = recentAttendance.length > 0 
      ? Math.round((presentCount / recentAttendance.length) * 100) 
      : 0;

    return {
      totalMembers: Number(memberCount[0]?.count) || 0,
      totalShows: Number(showCount[0]?.count) || 0,
      recentAttendance: attendancePercentage,
      activeNotifications: Number(notificationCount[0]?.count) || 0,
    };
  }

  async getReportStats(): Promise<{
    totalMembers: number;
    averageAttendance: number;
    topPerformers: { name: string; percentage: number }[];
    lowPerformers: { name: string; percentage: number }[];
  }> {
    const allMembers = await db.select().from(members);
    const allAttendance = await db.select().from(attendance);

    const memberStats = allMembers.map(member => {
      const memberAttendance = allAttendance.filter(a => a.memberId === member.id);
      const presentCount = memberAttendance.filter(a => a.status === 'present' || a.status === 'replaced').length;
      const percentage = memberAttendance.length > 0 
        ? Math.round((presentCount / memberAttendance.length) * 100) 
        : 0;
      return { name: member.name, percentage };
    });

    const sorted = memberStats.sort((a, b) => b.percentage - a.percentage);
    
    const averageAttendance = memberStats.length > 0
      ? Math.round(memberStats.reduce((sum, m) => sum + m.percentage, 0) / memberStats.length)
      : 0;

    return {
      totalMembers: allMembers.length,
      averageAttendance,
      topPerformers: sorted.slice(0, 3),
      lowPerformers: sorted.slice(-3).reverse(),
    };
  }
}

export const storage = new DatabaseStorage();
