import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertMemberSchema, insertStorySchema, insertCharacterSchema, insertAttendanceSchema, insertShowSchema, insertNotificationSchema, insertReportSchema, insertPracticeLinkSchema, users } from "@shared/schema";
import { z } from "zod";
import * as XLSX from "xlsx";
import { db } from "./db";

async function seedSampleData() {
  try {
    const members = await storage.getMembers();
    const adminExists = members.some(m => m.mhtId === 'MHT001');
    
    if (!adminExists) {
      // Create user first
      const userId = 'sample-admin-user';
      await storage.upsertUser({
        id: userId,
        email: 'admin@gnc.org',
        firstName: 'Admin',
        lastName: 'User',
        profileImageUrl: null,
      });

      // Then create member
      const created = await storage.createMember({
        userId: userId,
        name: 'Admin User',
        email: 'admin@gnc.org',
        mobile: '9876543210',
        mhtId: 'MHT001',
        isAdmin: true,
        birthday: null,
        gDay: null,
      });
      console.log('✓ Sample admin created!');
      console.log('  Login: admin@gnc.org');
      console.log('  MHT ID: MHT001');
    } else {
      console.log('✓ Sample admin already exists');
    }

    // Seed stories and characters - exact data from user
    const existingStories = await storage.getStories();
    const storiesDataToSeed = [
      { name: 'Lumpy & Pooh', characters: ['Tiger', 'Lumpy', 'Pooh', 'Smarty', 'Jimmy', 'Mikey', 'Honey Bee'] },
      { name: 'Sonu & Meow (Aatali J Vat)', characters: ['Sonu', 'Meow', 'Aman', 'Karan', 'Mayadidi', 'Kudamji', 'Mithumiya', 'Patangiyu'] },
      { name: 'Dukh Se Sukh Ki Aur (Shreck & Donkey)', characters: ['Shrek', 'Donkey', 'Nimo'] },
      { name: 'Dalo Tarwadi', characters: ['Dalo', 'Pasha Patel', 'Shethani'] },
      { name: 'Jealousy Ki Remedy', characters: ['Mr. Trevor', 'Poly', 'Fiyona', 'Sporty', 'Flory', 'Teacher'] },
      { name: 'Mashkari Na Jokhamo', characters: ['Dhruv', 'Parth', 'Mona', 'Pinki', 'Teacher', 'Principal'] },
    ];

    for (const storyItem of storiesDataToSeed) {
      const existingStory = existingStories.find(s => s.name === storyItem.name);
      if (!existingStory) {
        const createdStory = await storage.createStory({
          name: storyItem.name,
          description: `${storyItem.name} - GNC Puppet Performance`,
        });
        
        for (const charName of storyItem.characters) {
          await storage.createCharacter({
            storyId: createdStory.id,
            name: charName,
          });
        }
        console.log(`✓ Story added: ${storyItem.name}`);
      }
    }
  } catch (error: any) {
    console.error('Error seeding sample data:', error?.message || error);
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<void> {
  // Auth middleware
  await setupAuth(app);

  // Seed sample data on startup
  await seedSampleData();

  // Custom login endpoint (no Replit dependency)
  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { emailOrMobile, mhtId } = req.body;

      if (!emailOrMobile || !mhtId) {
        return res.status(400).json({ message: "Missing credentials" });
      }

      const members = await storage.getMembers();
      let member = members.find(m =>
        (m.email === emailOrMobile || m.mobile === emailOrMobile) && m.mhtId === mhtId
      );

      if (!member) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // If member doesn't have userId, create a user record for them
      if (!member.userId) {
        const [newUser] = await db.insert(users).values({
          email: member.email,
          firstName: member.name?.split(' ')[0],
          lastName: member.name?.split(' ').slice(1).join(' '),
        }).returning();
        
        // Update member with userId
        await storage.updateMember(member.id, { userId: newUser.id });
        member = { ...member, userId: newUser.id };
      }

      // Create a session user object with expiration (30 days)
      const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
      const user = {
        id: member.userId!,
        memberId: member.id,
        claims: {
          sub: member.userId!,
        },
        expires_at: expiresAt,
      };

      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        // Save session explicitly
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "Login failed" });
          }
          res.json({ message: "Logged in successfully", member });
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req: any, res) => {
    req.logout((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // For custom login with memberId
      if (req.user.memberId) {
        const member = await storage.getMember(req.user.memberId);
        return res.json(member);
      }
      // For Replit OAuth login
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get current member
  app.get('/api/members/me', isAuthenticated, async (req: any, res) => {
    try {
      let member;
      // Use memberId if available (custom login)
      if (req.user.memberId) {
        member = await storage.getMember(req.user.memberId);
      } else {
        // For Replit OAuth login
        const userId = req.user.claims.sub;
        member = await storage.getMemberByUserId(userId);
      }
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      console.error("Error fetching member:", error);
      res.status(500).json({ message: "Failed to fetch member" });
    }
  });

  // Update current member profile
  app.patch('/api/members/me', isAuthenticated, async (req: any, res) => {
    try {
      let member;
      // Use memberId if available (custom login)
      if (req.user.memberId) {
        member = await storage.getMember(req.user.memberId);
      } else {
        // For Replit OAuth login
        const userId = req.user.claims.sub;
        member = await storage.getMemberByUserId(userId);
      }
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      const updateData = {
        name: req.body.name,
        email: req.body.email || null,
        mobile: req.body.mobile || null,
        birthday: req.body.birthday || null,
        gDay: req.body.gDay || null,
      };

      const updated = await storage.updateMember(member.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating member:", error);
      res.status(500).json({ message: "Failed to update member" });
    }
  });

  // Get all members (admin only)
  app.get('/api/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const members = await storage.getMembers();
      res.json(members);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  // Create member (admin only)
  app.post('/api/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertMemberSchema.parse(req.body);
      const member = await storage.createMember(validatedData);
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating member:", error);
      res.status(500).json({ message: "Failed to create member" });
    }
  });

  // Update member (admin only)
  app.patch('/api/members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const member = await storage.updateMember(req.params.id, req.body);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      console.error("Error updating member:", error);
      res.status(500).json({ message: "Failed to update member" });
    }
  });

  // Delete member (admin only)
  app.delete('/api/members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteMember(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting member:", error);
      res.status(500).json({ message: "Failed to delete member" });
    }
  });

  // Export members as Excel (admin only)
  app.get('/api/members/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const members = await storage.getMembers();
      const data = members.map(m => ({
        'MHT ID': m.mhtId,
        'Name': m.name,
        'Email': m.email || '',
        'Mobile': m.mobile || '',
        'Birthday': m.birthday || '',
        'G-Day': m.gDay || '',
        'Is Admin': m.isAdmin ? 'YES' : 'NO',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Members');
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="members.xlsx"');
      res.send(XLSX.write(wb, { type: 'buffer' }));
    } catch (error) {
      console.error("Error exporting members:", error);
      res.status(500).json({ message: "Failed to export members" });
    }
  });

  // Import members from Excel (admin only)
  app.post('/api/members/import', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (!req.files || !req.files.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const file = req.files.file;
      const wb = XLSX.read(file.data, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const row of data) {
        try {
          const memberData = {
            mhtId: (row['MHT ID'] || '').toString().trim(),
            name: (row['Name'] || '').toString().trim(),
            email: (row['Email'] || '').toString().trim() || null,
            mobile: (row['Mobile'] || '').toString().trim() || null,
            birthday: (row['Birthday'] || '').toString().trim() || null,
            gDay: (row['G-Day'] || '').toString().trim() || null,
            isAdmin: (row['Is Admin'] || 'NO').toString().toUpperCase() === 'YES',
          };

          if (!memberData.mhtId || !memberData.name) {
            results.failed++;
            results.errors.push(`Row with MHT ID ${memberData.mhtId || 'N/A'}: MHT ID and Name are required`);
            continue;
          }

          const existingMembers = await storage.getMembers();
          if (existingMembers.some(m => m.mhtId === memberData.mhtId)) {
            results.failed++;
            results.errors.push(`MHT ID ${memberData.mhtId}: Already exists`);
            continue;
          }

          await storage.createMember({
            mhtId: memberData.mhtId,
            name: memberData.name,
            email: memberData.email,
            mobile: memberData.mobile,
            birthday: memberData.birthday,
            gDay: memberData.gDay,
            isAdmin: memberData.isAdmin,
          });
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Error processing row: ${(error as Error).message}`);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error importing members:", error);
      res.status(500).json({ message: "Failed to import members" });
    }
  });

  // Stories
  app.get('/api/stories', isAuthenticated, async (req, res) => {
    try {
      const stories = await storage.getStories();
      res.json(stories);
    } catch (error) {
      console.error("Error fetching stories:", error);
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  });

  app.get('/api/stories/with-characters', isAuthenticated, async (req, res) => {
    try {
      const stories = await storage.getStoriesWithCharacters();
      res.json(stories);
    } catch (error) {
      console.error("Error fetching stories with characters:", error);
      res.status(500).json({ message: "Failed to fetch stories" });
    }
  });

  app.post('/api/stories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertStorySchema.parse(req.body);
      const story = await storage.createStory(validatedData);
      res.status(201).json(story);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating story:", error);
      res.status(500).json({ message: "Failed to create story" });
    }
  });

  app.patch('/api/stories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const story = await storage.updateStory(req.params.id, req.body);
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }
      res.json(story);
    } catch (error) {
      console.error("Error updating story:", error);
      res.status(500).json({ message: "Failed to update story" });
    }
  });

  app.delete('/api/stories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteStory(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting story:", error);
      res.status(500).json({ message: "Failed to delete story" });
    }
  });

  // Characters
  app.get('/api/stories/:storyId/characters', isAuthenticated, async (req, res) => {
    try {
      const characters = await storage.getCharactersByStory(req.params.storyId);
      res.json(characters);
    } catch (error) {
      console.error("Error fetching characters:", error);
      res.status(500).json({ message: "Failed to fetch characters" });
    }
  });

  app.post('/api/stories/:storyId/characters', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertCharacterSchema.parse({
        ...req.body,
        storyId: req.params.storyId,
      });
      const character = await storage.createCharacter(validatedData);
      res.status(201).json(character);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating character:", error);
      res.status(500).json({ message: "Failed to create character" });
    }
  });

  app.delete('/api/characters/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteCharacter(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting character:", error);
      res.status(500).json({ message: "Failed to delete character" });
    }
  });

  // Roles
  app.get('/api/roles', isAuthenticated, async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  // Attendance
  app.get('/api/attendance/my', isAuthenticated, async (req: any, res) => {
    try {
      let member;
      // Use memberId if available (custom login)
      if (req.user.memberId) {
        member = await storage.getMember(req.user.memberId);
      } else {
        // For Replit OAuth login
        const userId = req.user.claims.sub;
        member = await storage.getMemberByUserId(userId);
      }
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      const attendance = await storage.getAttendanceByMember(member.id);
      res.json(attendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.get('/api/attendance/all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const attendance = await storage.getAttendanceWithDetails();
      res.json(attendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.post('/api/attendance', isAuthenticated, async (req: any, res) => {
    try {
      let member;
      // Use memberId if available (custom login)
      if (req.user.memberId) {
        member = await storage.getMember(req.user.memberId);
      } else {
        // For Replit OAuth login
        const userId = req.user.claims.sub;
        member = await storage.getMemberByUserId(userId);
      }
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      // Convert empty strings to null for optional time fields
      const cleanedData = {
        ...req.body,
        memberId: member.id,
        timeIn: req.body.timeIn || null,
        timeOut: req.body.timeOut || null,
        storyId: req.body.storyId || null,
        roleId: req.body.roleId || null,
        reason: req.body.reason || null,
        replacedMemberId: req.body.replacedMemberId || null,
      };

      const validatedData = insertAttendanceSchema.parse(cleanedData);
      const attendance = await storage.createAttendance(validatedData);
      res.status(201).json(attendance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating attendance:", error);
      res.status(500).json({ message: "Failed to create attendance" });
    }
  });

  app.post('/api/attendance/admin', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden - Admin access required" });
      }

      const validatedData = insertAttendanceSchema.parse(req.body);
      const attendance = await storage.createAttendance(validatedData);
      res.status(201).json(attendance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating attendance:", error);
      res.status(500).json({ message: "Failed to create attendance" });
    }
  });

  // Shows
  app.get('/api/shows', isAuthenticated, async (req, res) => {
    try {
      const shows = await storage.getShowsWithDetails();
      res.json(shows);
    } catch (error) {
      console.error("Error fetching shows:", error);
      res.status(500).json({ message: "Failed to fetch shows" });
    }
  });

  app.get('/api/shows/recent', isAuthenticated, async (req, res) => {
    try {
      const shows = await storage.getShowsWithDetails();
      res.json(shows.slice(0, 5));
    } catch (error) {
      console.error("Error fetching shows:", error);
      res.status(500).json({ message: "Failed to fetch shows" });
    }
  });

  app.post('/api/shows', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertShowSchema.parse({
        ...req.body,
        createdById: currentMember.id,
      });
      const show = await storage.createShow(validatedData);
      res.status(201).json(show);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating show:", error);
      res.status(500).json({ message: "Failed to create show" });
    }
  });

  app.patch('/api/shows/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const show = await storage.updateShow(req.params.id, req.body);
      if (!show) {
        return res.status(404).json({ message: "Show not found" });
      }
      res.json(show);
    } catch (error) {
      console.error("Error updating show:", error);
      res.status(500).json({ message: "Failed to update show" });
    }
  });

  app.delete('/api/shows/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteShow(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting show:", error);
      res.status(500).json({ message: "Failed to delete show" });
    }
  });

  // Notifications
  app.get('/api/notifications', isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getNotifications();
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/active', isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getActiveNotifications();
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { pollOptions, ...notificationData } = req.body;
      
      const validatedData = insertNotificationSchema.parse({
        ...notificationData,
        createdById: currentMember.id,
      });
      const notification = await storage.createNotification(validatedData);
      
      // If it's a poll, create poll with options
      if (notificationData.type === "poll" && pollOptions && pollOptions.length >= 2) {
        const pollData = {
          question: notificationData.title,
          options: pollOptions.filter((o: string) => o.trim()),
          notificationId: notification.id,
          createdById: currentMember.id,
        };
        
        const poll = await storage.createPoll({
          question: pollData.question,
          options: pollData.options,
          notificationId: pollData.notificationId,
          createdById: pollData.createdById,
        });
        
        console.log(`✓ Poll created: ${poll.id} with ${poll.options.length} options`);
      }
      
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating notification:", error);
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  app.delete('/api/notifications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteNotification(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Reports (user to admin)
  app.get('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember) {
        return res.status(404).json({ message: "Member not found" });
      }

      if (currentMember.isAdmin) {
        const reports = await storage.getReports();
        res.json(reports);
      } else {
        const reports = await storage.getReportsByMember(currentMember.id);
        res.json(reports);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.post('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const member = await storage.getMemberByUserId(userId);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }

      const validatedData = insertReportSchema.parse({
        ...req.body,
        memberId: member.id,
      });
      const report = await storage.createReport(validatedData);
      res.status(201).json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating report:", error);
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  app.patch('/api/reports/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.markReportAsRead(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking report as read:", error);
      res.status(500).json({ message: "Failed to mark report as read" });
    }
  });

  // Practice Links
  app.get('/api/practice-links', isAuthenticated, async (req, res) => {
    try {
      const links = await storage.getPracticeLinksWithStory();
      res.json(links);
    } catch (error) {
      console.error("Error fetching practice links:", error);
      res.status(500).json({ message: "Failed to fetch practice links" });
    }
  });

  app.post('/api/practice-links', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertPracticeLinkSchema.parse({
        ...req.body,
        createdById: currentMember.id,
      });
      const link = await storage.createPracticeLink(validatedData);
      res.status(201).json(link);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating practice link:", error);
      res.status(500).json({ message: "Failed to create practice link" });
    }
  });

  app.patch('/api/practice-links/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const link = await storage.updatePracticeLink(req.params.id, req.body);
      if (!link) {
        return res.status(404).json({ message: "Practice link not found" });
      }
      res.json(link);
    } catch (error) {
      console.error("Error updating practice link:", error);
      res.status(500).json({ message: "Failed to update practice link" });
    }
  });

  app.delete('/api/practice-links/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deletePracticeLink(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting practice link:", error);
      res.status(500).json({ message: "Failed to delete practice link" });
    }
  });

  // Stats
  app.get('/api/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/reports/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const stats = await storage.getReportStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching report stats:", error);
      res.status(500).json({ message: "Failed to fetch report stats" });
    }
  });

  // Polls
  app.get('/api/polls/active', isAuthenticated, async (req, res) => {
    try {
      const polls = await storage.getPolls();
      const activePollsWithResponses = await Promise.all(
        polls.filter(p => p.isActive).map(async (poll) => {
          const responses = await storage.getPollResponsesByPollId(poll.id);
          return { ...poll, responses };
        })
      );
      res.json(activePollsWithResponses);
    } catch (error) {
      console.error("Error fetching polls:", error);
      res.status(500).json({ message: "Failed to fetch polls" });
    }
  });

  app.get('/api/polls/results', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const polls = await storage.getPolls();
      const pollsWithResponses = await Promise.all(
        polls.map(async (poll) => {
          const responses = await storage.getPollResponsesByPollId(poll.id);
          return { ...poll, responses };
        })
      );
      res.json(pollsWithResponses);
    } catch (error) {
      console.error("Error fetching poll results:", error);
      res.status(500).json({ message: "Failed to fetch poll results" });
    }
  });

  app.get('/api/polls/by-notification/:notificationId', isAuthenticated, async (req, res) => {
    try {
      const polls = await storage.getPolls();
      const poll = polls.find(p => p.notificationId === req.params.notificationId);
      res.json(poll || null);
    } catch (error) {
      console.error("Error fetching poll:", error);
      res.status(500).json({ message: "Failed to fetch poll" });
    }
  });

  app.post('/api/polls', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const { question, options, notificationId } = req.body;
      const poll = await storage.createPoll({ question, options, notificationId, createdById: currentMember.id });
      res.status(201).json(poll);
    } catch (error) {
      console.error("Error creating poll:", error);
      res.status(500).json({ message: "Failed to create poll" });
    }
  });

  app.post('/api/polls/:pollId/respond', isAuthenticated, async (req: any, res) => {
    try {
      let member;
      // Use memberId if available (custom login)
      if (req.user.memberId) {
        member = await storage.getMember(req.user.memberId);
      } else {
        // For Replit OAuth login
        const userId = req.user.claims.sub;
        member = await storage.getMemberByUserId(userId);
      }
      if (!member) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const response = await storage.createPollResponse({
        pollId: req.params.pollId,
        memberId: member.id,
        selectedOption: req.body.selectedOption,
      });
      res.status(201).json(response);
    } catch (error) {
      console.error("Error recording poll response:", error);
      res.status(500).json({ message: "Failed to record response" });
    }
  });

  app.post('/api/polls/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { pollId, format } = req.body;
      const polls = await storage.getPolls();
      const poll = polls.find(p => p.id === pollId);
      if (!poll) {
        return res.status(404).json({ message: "Poll not found" });
      }

      if (format === 'excel') {
        const XLSX = (await import('xlsx')).default;
        const responses = await storage.db?.query?.pollResponses?.findMany?.({ where: { pollId } }) || [];
        const members = await storage.getMembers();
        
        const data = responses.map(r => ({
          'Member Name': members.find(m => m.id === r.memberId)?.name || 'Unknown',
          'Selected Option': poll.options[r.selectedOption] || 'Unknown',
          'Response Time': new Date(r.createdAt).toLocaleString(),
        }));

        const ws = XLSX.utils.json_to_sheet([
          { 'Poll Question': poll.question },
          { 'Total Responses': responses.length },
          {},
          ...data
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Poll Results');
        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=poll-results.xlsx');
        res.send(buffer);
      } else if (format === 'pdf') {
        const PDFDocument = (await import('pdfkit')).default;
        const doc = new PDFDocument();
        const responses = await storage.db?.query?.pollResponses?.findMany?.({ where: { pollId } }) || [];
        const members = await storage.getMembers();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=poll-results.pdf');
        doc.pipe(res);
        doc.fontSize(16).text(poll.question, 50, 50);
        doc.fontSize(10).text(`Total Responses: ${responses.length}`, 50, 100).text(`Generated: ${new Date().toLocaleString()}\n`);
        
        let y = 150;
        responses.slice(0, 100).forEach((r) => {
          const member = members.find(m => m.id === r.memberId);
          if (y > 700) { doc.addPage(); y = 50; }
          doc.text(`${member?.name || 'Unknown'}: ${poll.options[r.selectedOption] || 'Unknown'}`, 50, y);
          y += 20;
        });
        doc.end();
      } else if (format === 'image') {
        const canvas = (await import('canvas')).createCanvas(1200, 1600);
        const ctx = canvas.getContext('2d');
        const responses = await storage.db?.query?.pollResponses?.findMany?.({ where: { pollId } }) || [];
        const members = await storage.getMembers();
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1200, 1600);
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 30, 1140, 1540);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 32px Arial';
        ctx.fillText('Poll Results', 50, 80);
        ctx.font = '18px Arial';
        ctx.fillText(poll.question, 50, 120);
        
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666666';
        ctx.fillText(`Total Responses: ${responses.length} | Generated: ${new Date().toLocaleString()}`, 50, 160);
        
        let y = 220;
        const lineHeight = 35;
        poll.options.forEach((option, idx) => {
          const count = responses.filter(r => r.selectedOption === idx).length;
          const pct = responses.length > 0 ? Math.round((count / responses.length) * 100) : 0;
          ctx.fillStyle = '#333333';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(`${option}: ${count} votes (${pct}%)`, 50, y);
          
          const barWidth = (pct / 100) * 800;
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(50, y + 10, barWidth, 15);
          ctx.strokeStyle = '#cccccc';
          ctx.strokeRect(50, y + 10, 800, 15);
          
          y += lineHeight;
        });

        ctx.font = '11px Arial';
        ctx.fillStyle = '#999999';
        ctx.fillText('GNC Puppet - Poll Management System', 50, 1560);
        
        const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Disposition', 'attachment; filename=poll-results.jpg');
        res.send(buffer);
      }
    } catch (error) {
      console.error("Error exporting poll:", error);
      res.status(500).json({ message: "Failed to export poll" });
    }
  });

  // Export reports
  app.post('/api/reports/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentMember = await storage.getMemberByUserId(userId);
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { format, filters } = req.body;
      const allAttendance = await storage.getAllAttendance();
      const members = await storage.getMembers();
      const stories = await storage.getStories();

      let filtered = allAttendance;
      if (filters) {
        filtered = filtered.filter((record) => {
          if (filters.dateFrom && new Date(record.date) < new Date(filters.dateFrom)) return false;
          if (filters.dateTo && new Date(record.date) > new Date(filters.dateTo)) return false;
          if (filters.statusFilter !== 'all' && record.status !== filters.statusFilter) return false;
          if (filters.storyFilter !== 'all' && record.storyId !== filters.storyFilter) return false;
          if (filters.memberFilter !== 'all' && record.memberId !== filters.memberFilter) return false;
          return true;
        });
      }

      if (format === 'excel') {
        const XLSX = await import('xlsx');
        const ws_data = [['Date', 'Member', 'Story', 'Role', 'Status', 'Replaced By']];
        filtered.forEach((record) => {
          const member = members.find(m => m.id === record.memberId);
          const story = stories.find(s => s.id === record.storyId);
          ws_data.push([
            new Date(record.date).toLocaleDateString(),
            member?.name || '',
            story?.name || '',
            record.role || '',
            record.status,
            record.replacedBy || '',
          ]);
        });
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.xlsx');
        res.send(buffer);
      } else if (format === 'pdf') {
        const PDFDocument = (await import('pdfkit')).default;
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.pdf');
        doc.pipe(res);
        doc.fontSize(16).text('Attendance Report', 50, 50);
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}\n\n`);
        doc.fontSize(10);
        filtered.slice(0, 100).forEach((record, idx) => {
          const member = members.find(m => m.id === record.memberId);
          const story = stories.find(s => s.id === record.storyId);
          if (idx % 10 === 0 && idx > 0) doc.addPage();
          doc.text(`${new Date(record.date).toLocaleDateString()} - ${member?.name || 'Unknown'} - ${story?.name || 'Unknown'} - ${record.status.toUpperCase()}`);
        });
        doc.end();
      } else if (format === 'image') {
        const canvas = (await import('canvas')).createCanvas(1200, 1600);
        const ctx = canvas.getContext('2d');
        
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1200, 1600);
        
        // Border
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 30, 1140, 1540);
        
        // Title
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 32px Arial';
        ctx.fillText('Attendance Report', 50, 80);
        
        // Date
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666666';
        ctx.fillText(`Generated: ${new Date().toLocaleString()}`, 50, 110);
        
        // Summary stats
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#000000';
        ctx.fillText(`Total Records: ${filtered.length}`, 50, 160);
        
        const presentCount = filtered.filter(r => r.status === 'present').length;
        const absentCount = filtered.filter(r => r.status === 'absent').length;
        const replacedCount = filtered.filter(r => r.status === 'replaced').length;
        
        ctx.font = '14px Arial';
        ctx.fillStyle = '#000000';
        ctx.fillText(`Present: ${presentCount} | Absent: ${absentCount} | Replaced: ${replacedCount}`, 50, 190);
        
        // Table header
        ctx.font = 'bold 13px Arial';
        ctx.fillStyle = '#333333';
        let y = 240;
        ctx.fillText('Date', 50, y);
        ctx.fillText('Member', 200, y);
        ctx.fillText('Story', 450, y);
        ctx.fillText('Role', 800, y);
        ctx.fillText('Status', 950, y);
        ctx.fillText('Replaced By', 1050, y);
        
        // Divider line
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, 255);
        ctx.lineTo(1150, 255);
        ctx.stroke();
        
        // Table rows
        ctx.font = '12px Arial';
        ctx.fillStyle = '#000000';
        y = 280;
        const lineHeight = 25;
        let rowCount = 0;
        
        filtered.forEach((record) => {
          if (y > 1500) return;
          
          const member = members.find(m => m.id === record.memberId);
          const story = stories.find(s => s.id === record.storyId);
          const date = new Date(record.date).toLocaleDateString();
          const memberName = member?.name || 'Unknown';
          const storyName = story?.name || '-';
          const role = record.role || '-';
          const status = record.status;
          const replacedBy = record.replacedBy || '-';
          
          // Truncate long text
          const truncate = (text: string, maxLen: number) => text.length > maxLen ? text.substring(0, maxLen - 2) + '..' : text;
          
          ctx.fillText(truncate(date, 15), 50, y);
          ctx.fillText(truncate(memberName, 20), 200, y);
          ctx.fillText(truncate(storyName, 25), 450, y);
          ctx.fillText(truncate(role, 12), 800, y);
          ctx.fillText(truncate(status, 10), 950, y);
          ctx.fillText(truncate(replacedBy, 15), 1050, y);
          
          y += lineHeight;
          rowCount++;
        });
        
        // Footer
        ctx.font = '11px Arial';
        ctx.fillStyle = '#999999';
        ctx.fillText('GNC Puppet - Attendance Management System', 50, 1560);
        
        const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.jpg');
        res.send(buffer);
      }
    } catch (error) {
      console.error("Error exporting report:", error);
      res.status(500).json({ message: "Failed to export report" });
    }
  });
}
