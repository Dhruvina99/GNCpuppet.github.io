import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  ClipboardCheck,
  Users,
  Calendar,
  Bell,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Theater,
  BarChart3,
  Plus,
} from "lucide-react";
import type { Member, Attendance, Notification, Story } from "@shared/schema";

function AttendanceStatusBadge({ percentage }: { percentage: number }) {
  if (percentage >= 90) {
    return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">Very Good</Badge>;
  }
  if (percentage >= 70) {
    return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">Good</Badge>;
  }
  if (percentage >= 30) {
    return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">Average</Badge>;
  }
  return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">Bad</Badge>;
}

function AttendanceStatusCard({ percentage, isLoading }: { percentage: number; isLoading: boolean }) {
  const getColor = () => {
    if (percentage >= 90) return "text-green-600 dark:text-green-400";
    if (percentage >= 70) return "text-blue-600 dark:text-blue-400";
    if (percentage >= 30) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getProgressColor = () => {
    if (percentage >= 90) return "bg-green-500";
    if (percentage >= 70) return "bg-blue-500";
    if (percentage >= 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Skeleton className="h-28 w-28 rounded-full" />
            <div className="space-y-3 flex-1">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-2 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-6">
          <div className="relative h-28 w-28">
            <svg className="h-28 w-28 -rotate-90 transform">
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted/30"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${percentage * 3.02} 302`}
                strokeLinecap="round"
                className={getColor()}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${getColor()}`}>
                {percentage}%
              </span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Your Attendance</h3>
            <AttendanceStatusBadge percentage={percentage} />
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{percentage}%</span>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${getProgressColor()}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: currentMember, isLoading: memberLoading } = useQuery<Member>({
    queryKey: ["/api/members/me"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalMembers: number;
    totalShows: number;
    recentAttendance: number;
    activeNotifications: number;
  }>({
    queryKey: ["/api/stats"],
    enabled: !!currentMember,
  });

  const { data: attendanceRecords, isLoading: attendanceLoading } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", "my"],
    enabled: !!currentMember,
  });

  const { data: notifications, isLoading: notificationsLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", "active"],
    enabled: !!currentMember,
  });

  const { data: recentShows, isLoading: showsLoading } = useQuery<any[]>({
    queryKey: ["/api/shows", "recent"],
    enabled: !!currentMember,
  });

  const isAdmin = currentMember?.isAdmin ?? false;
  
  const calculateAttendancePercentage = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) return 0;
    const presentCount = attendanceRecords.filter(
      a => a.status === 'present' || a.status === 'replaced'
    ).length;
    return Math.round((presentCount / attendanceRecords.length) * 100);
  };

  const attendancePercentage = calculateAttendancePercentage();

  if (!currentMember && !memberLoading) {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto mb-4">
              <Users className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Not Registered</h2>
            <p className="text-muted-foreground mb-4">
              Dear Mahatma, you are not registered as sevarthi in GNC - Puppet (DBF). 
              Please contact Admin to register.
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome, {currentMember?.name?.split(' ')[0] || 'Sevarthi'}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Admin Dashboard" : "Your attendance overview"}
          </p>
        </div>
        <Button asChild className="gap-2" data-testid="button-mark-attendance">
          <Link href="/attendance/form">
            <Plus className="h-4 w-4" />
            Mark Attendance
          </Link>
        </Button>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.totalMembers || 0}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Shows</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.totalShows || 0}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-lg bg-chart-2/10 text-chart-2 flex items-center justify-center">
                  <Theater className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.recentAttendance || 0}%</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-lg bg-chart-3/10 text-chart-3 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Alerts</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.activeNotifications || 0}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-lg bg-chart-4/10 text-chart-4 flex items-center justify-center">
                  <Bell className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceStatusCard 
          percentage={attendancePercentage} 
          isLoading={attendanceLoading}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <div>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" asChild className="justify-start gap-2 h-auto py-3" data-testid="button-view-attendance">
                <Link href="/attendance">
                  <ClipboardCheck className="h-4 w-4" />
                  <span>View Attendance</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="justify-start gap-2 h-auto py-3" data-testid="button-practice-links">
                <Link href="/practice-links">
                  <Calendar className="h-4 w-4" />
                  <span>Practice Links</span>
                </Link>
              </Button>
              {isAdmin && (
                <>
                  <Button variant="outline" asChild className="justify-start gap-2 h-auto py-3" data-testid="button-manage-members">
                    <Link href="/members">
                      <Users className="h-4 w-4" />
                      <span>Manage Members</span>
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="justify-start gap-2 h-auto py-3" data-testid="button-send-notification">
                    <Link href="/notifications/new">
                      <Bell className="h-4 w-4" />
                      <span>Send Notification</span>
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {notifications && notifications.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <div>
              <CardTitle className="text-lg">Active Notifications</CardTitle>
              <CardDescription>Recent announcements and polls</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/notifications">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="space-y-3">
              {notificationsLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))
              ) : (
                notifications.slice(0, 3).map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {notification.content}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {notification.type}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <div>
            <CardTitle className="text-lg">Recent Attendance</CardTitle>
            <CardDescription>Your last 5 attendance records</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/attendance">
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {attendanceLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : attendanceRecords && attendanceRecords.length > 0 ? (
            <div className="space-y-3">
              {attendanceRecords.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  data-testid={`attendance-record-${record.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      record.status === 'present' ? 'bg-green-500' :
                      record.status === 'replaced' ? 'bg-blue-500' :
                      'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium text-sm">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {record.status}
                      </p>
                    </div>
                  </div>
                  {record.timeIn && record.timeOut && (
                    <p className="text-sm text-muted-foreground">
                      {record.timeIn} - {record.timeOut}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No attendance records yet</p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href="/attendance/new">Mark Your First Attendance</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
