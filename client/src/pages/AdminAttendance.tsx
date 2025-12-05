import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import {
  Search,
  Filter,
  Plus,
  Calendar,
  Clock,
  ClipboardCheck,
} from "lucide-react";
import type { Attendance, Story, Role, Member, Character } from "@shared/schema";

interface AttendanceWithRelations extends Attendance {
  story?: Story;
  role?: Role;
  member?: Member;
  replacedMember?: Member;
}

export default function AdminAttendancePage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [storyFilter, setStoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: currentMember } = useQuery<Member>({
    queryKey: ["/api/members/me"],
  });

  const { data: allAttendance, isLoading } = useQuery<AttendanceWithRelations[]>({
    queryKey: ["/api/attendance", "all"],
    enabled: currentMember?.isAdmin,
  });

  const { data: members } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    enabled: currentMember?.isAdmin,
  });

  const { data: stories } = useQuery<Story[]>({
    queryKey: ["/api/stories"],
    enabled: currentMember?.isAdmin,
  });

  const isAdmin = currentMember?.isAdmin ?? false;

  const filteredRecords = allAttendance?.filter((record) => {
    if (statusFilter !== "all" && record.status !== statusFilter) return false;
    if (memberFilter !== "all" && record.memberId !== memberFilter) return false;
    if (storyFilter !== "all" && record.storyId !== storyFilter) return false;
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const storyName = record.story?.name?.toLowerCase() || "";
      const memberName = record.member?.name?.toLowerCase() || "";
      if (!storyName.includes(searchLower) && !memberName.includes(searchLower)) {
        return false;
      }
    }
    return true;
  }) || [];

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
            <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="font-semibold mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground">You need admin privileges to view all attendance records.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Members Attendance</h1>
          <p className="text-muted-foreground">View complete attendance records for all members with all details</p>
        </div>
        <Button asChild className="gap-2" data-testid="button-record-attendance">
          <Link href="/attendance/admin-form">
            <Plus className="h-4 w-4" />
            Record Attendance
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Filter & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or story..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-attendance"
                />
              </div>
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
              <Label className="text-sm">Member</Label>
              <Select value={memberFilter} onValueChange={setMemberFilter}>
                <SelectTrigger data-testid="select-member-filter">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {members?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
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
                  {stories?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Total Records</Label>
              <div className="flex items-center justify-center h-10 bg-secondary/50 rounded-md border">
                <span className="font-semibold">{filteredRecords.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attendance Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Story</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Characters</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Time Out</TableHead>
                    <TableHead>Reason/Replaced By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(record.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {record.member?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{record.story?.name || '-'}</TableCell>
                      <TableCell>{record.role?.name || '-'}</TableCell>
                      <TableCell className="max-w-[150px]">
                        {record.characterIds && record.characterIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {record.characterIds.map((charId, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {charId}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {record.timeIn ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {record.timeIn}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {record.timeOut ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {record.timeOut}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {record.status === 'absent' && record.reason ? (
                          <span className="text-sm text-muted-foreground truncate block">
                            Reason: {record.reason}
                          </span>
                        ) : record.status === 'replaced' && record.replacedMember ? (
                          <span className="text-sm text-muted-foreground">
                            Replaced: {record.replacedMember.name}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
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
