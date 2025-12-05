import { Link, useLocation } from "wouter";
import {
  Home,
  Users,
  Calendar,
  BookOpen,
  Bell,
  BarChart3,
  Settings,
  ClipboardCheck,
  PlayCircle,
  FileText,
  Theater,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { Member } from "@shared/schema";

const normalUserItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Attendance", url: "/attendance", icon: ClipboardCheck },
  { title: "Announcements", url: "/announcements", icon: Bell },
  { title: "Practice Links", url: "/practice-links", icon: PlayCircle },
  { title: "Profile", url: "/profile", icon: Settings },
];

const adminItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Attendance", url: "/attendance", icon: ClipboardCheck },
  { title: "All Members Attendance", url: "/attendance/all", icon: Users },
  { title: "Record Member Attendance", url: "/attendance/admin-form", icon: ClipboardCheck },
  { title: "Members", url: "/members", icon: Users },
  { title: "Stories", url: "/stories", icon: BookOpen },
  { title: "Shows", url: "/shows", icon: Theater },
  { title: "Announcements", url: "/announcements", icon: Bell },
  { title: "Notifications (Admin)", url: "/notifications", icon: Bell },
  { title: "Poll Results", url: "/polls/results", icon: BarChart3 },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Practice Links", url: "/practice-links", icon: PlayCircle },
  { title: "User Reports", url: "/user-reports", icon: FileText },
  { title: "Profile", url: "/profile", icon: Settings },
];

const normalUserAdditionalItems = [
  { title: "Announcements", url: "/announcements", icon: Bell },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const { data: currentMember } = useQuery<Member>({
    queryKey: ["/api/members/me"],
    enabled: !!user,
  });

  const isAdmin = currentMember?.isAdmin ?? false;
  const menuItems = isAdmin ? adminItems : normalUserItems;

  const getInitials = () => {
    if (currentMember?.name) {
      return currentMember.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.firstName) {
      return `${user.firstName[0]}${user.lastName?.[0] || ''}`.toUpperCase();
    }
    return 'U';
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            GP
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">GNC - Puppet</span>
            <span className="text-xs text-muted-foreground">Attendance System (DBF)</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide">
            {isAdmin ? "Admin Menu" : "Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage 
              src={user?.profileImageUrl || undefined} 
              alt={currentMember?.name || "User"} 
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate">
              {currentMember?.name || user?.firstName || 'User'}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {currentMember?.mhtId || 'Not Registered'}
            </span>
          </div>
          {isAdmin && (
            <Badge variant="secondary" className="text-xs shrink-0">
              Admin
            </Badge>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
