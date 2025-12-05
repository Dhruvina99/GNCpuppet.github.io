import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3,
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  Filter,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { Member, Attendance, Story } from "@shared/schema";
import { getEventDisplayName } from "@/components/EventSelector";

interface AttendanceWithRelations extends Attendance {
  member?: Member;
  story?: Story;
}

const EVENT_TYPES = ["JJ", "Janmashtami", "Holi", "Other"] as const;

export default function ReportsPage() {
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [storyFilter, setStoryFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");

  const { data: currentMember } = useQuery<Member>({
    queryKey: ["/api/members/me"],
  });

  const { data: allAttendance, isLoading: attendanceLoading } = useQuery<AttendanceWithRelations[]>({
    queryKey: ["/api/attendance", "all"],
    enabled: !!currentMember?.isAdmin,
  });

  const { data: members } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    enabled: !!currentMember?.isAdmin,
  });

  const { data: stories } = useQuery<Story[]>({
    queryKey: ["/api/stories"],
    enabled: !!currentMember?.isAdmin,
  });

  const { data: stats } = useQuery<{
    totalMembers: number;
    averageAttendance: number;
    topPerformers: { name: string; percentage: number }[];
    lowPerformers: { name: string; percentage: number }[];
  }>({
    queryKey: ["/api/reports/stats"],
    enabled: !!currentMember?.isAdmin,
  });

  const isAdmin = currentMember?.isAdmin ?? false;

  const filteredAttendance = allAttendance?.filter((record) => {
    if (dateFrom && new Date(record.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(record.date) > new Date(dateTo)) return false;
    if (statusFilter !== "all" && record.status !== statusFilter) return false;
    if (storyFilter !== "all" && record.storyId !== storyFilter) return false;
    if (memberFilter !== "all" && record.memberId !== memberFilter) return false;
    if (eventFilter !== "all" && record.eventType !== eventFilter) return false;
    return true;
  }) || [];

  const handleExport = async (format: 'pdf' | 'excel' | 'image') => {
    try {
      toast({
        title: "Export Started",
        description: `Generating ${format.toUpperCase()} report...`,
      });

      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          filters: {
            dateFrom,
            dateTo,
            statusFilter,
            storyFilter,
            memberFilter,
            eventFilter,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extensions: Record<string, string> = {
        pdf: 'pdf',
        excel: 'xlsx',
        image: 'jpg',
      };
      a.download = `attendance-report.${extensions[format] || format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `${format.toUpperCase()} report downloaded successfully`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">Present</Badge>;
      case 'absent':
        return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">Absent</Badge>;
      case 'replaced':
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">Replaced</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="font-semibold mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground">You need admin privileges to view reports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate and download attendance reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleExport('pdf')} className="gap-2" data-testid="button-export-pdf">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')} className="gap-2" data-testid="button-export-excel">
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={() => handleExport('image')} className="gap-2" data-testid="button-export-image">
            <FileImage className="h-4 w-4" />
            Image
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">{stats?.totalMembers || members?.length || 0}</p>
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
                <p className="text-sm text-muted-foreground">Average Attendance</p>
                <p className="text-2xl font-bold">{stats?.averageAttendance || 0}%</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-chart-2/10 text-chart-2 flex items-center justify-center">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top Performer</p>
                <p className="text-lg font-bold truncate">
                  {stats?.topPerformers?.[0]?.name || 'N/A'}
                </p>
                {stats?.topPerformers?.[0] && (
                  <p className="text-sm text-green-600">{stats.topPerformers[0].percentage}%</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
                <p className="text-lg font-bold truncate">
                  {stats?.lowPerformers?.[0]?.name || 'N/A'}
                </p>
                {stats?.lowPerformers?.[0] && (
                  <p className="text-sm text-red-600">{stats.lowPerformers[0].percentage}%</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                data-testid="input-date-from"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                data-testid="input-date-to"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Event</Label>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger data-testid="select-event-filter">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {EVENT_TYPES.map((event) => (
                    <SelectItem key={event} value={event}>
                      {getEventDisplayName(event, null)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="replaced">Replaced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Story</Label>
              <Select value={storyFilter} onValueChange={setStoryFilter}>
                <SelectTrigger data-testid="select-story-filter">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stories</SelectItem>
                  {stories?.map((story) => (
                    <SelectItem key={story.id} value={story.id}>
                      {story.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Member</Label>
              <Select value={memberFilter} onValueChange={setMemberFilter}>
                <SelectTrigger data-testid="select-member-filter">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {members?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Attendance Records</CardTitle>
              <CardDescription>
                {filteredAttendance.length} records found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {attendanceLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredAttendance.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Story</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {new Date(record.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        {record.eventType 
                          ? getEventDisplayName(record.eventType, record.eventCustom)
                          : '-'}
                      </TableCell>
                      <TableCell>{record.member?.name || 'Unknown'}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>{record.story?.name || '-'}</TableCell>
                      <TableCell>
                        {record.timeIn && record.timeOut 
                          ? `${record.timeIn} - ${record.timeOut}`
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Records Found</h3>
              <p className="text-muted-foreground text-sm">
                No attendance records match your filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
