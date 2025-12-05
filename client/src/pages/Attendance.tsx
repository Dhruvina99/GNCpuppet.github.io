import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileImage,
  FileText,
} from "lucide-react";
import type { Attendance, Story, Role, Member } from "@shared/schema";

interface AttendanceWithRelations extends Attendance {
  story?: Story;
  role?: Role;
  member?: Member;
  replacedMember?: Member;
}

export default function AttendancePage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: currentMember } = useQuery<Member>({
    queryKey: ["/api/members/me"],
  });

  const { data: attendanceRecords, isLoading } = useQuery<AttendanceWithRelations[]>({
    queryKey: ["/api/attendance", currentMember?.isAdmin ? "all" : "my"],
    enabled: !!currentMember,
  });

  const { data: stories } = useQuery<Story[]>({
    queryKey: ["/api/stories"],
  });

  const isAdmin = currentMember?.isAdmin ?? false;

  const filteredRecords = attendanceRecords?.filter((record) => {
    if (statusFilter !== "all" && record.status !== statusFilter) return false;
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Manage all attendance records" : "View and mark your attendance"}
          </p>
        </div>
        <Button asChild className="gap-2" data-testid="button-mark-attendance">
          <Link href="/attendance/form">
            <Plus className="h-4 w-4" />
            Mark Attendance
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by story or member..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-attendance"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="replaced">Replaced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-export-pdf">
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-export-excel">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-export-image">
                  <FileImage className="h-4 w-4" />
                  Image
                </Button>
              </div>
            )}
          </div>
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
                    {isAdmin && <TableHead>Member</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>Story</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Details</TableHead>
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
                      {isAdmin && (
                        <TableCell>
                          {record.member?.name || 'Unknown'}
                        </TableCell>
                      )}
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>{record.story?.name || '-'}</TableCell>
                      <TableCell>{record.role?.name || '-'}</TableCell>
                      <TableCell>
                        {record.timeIn && record.timeOut ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {record.timeIn} - {record.timeOut}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {record.status === 'absent' && record.reason ? (
                          <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
                            {record.reason}
                          </span>
                        ) : record.status === 'replaced' && record.replacedMember ? (
                          <span className="text-sm text-muted-foreground">
                            For: {record.replacedMember.name}
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
              <h3 className="font-semibold mb-2">No Attendance Records</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "No records match your filters"
                  : "Start marking your attendance to see records here"
                }
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button asChild>
                  <Link href="/attendance/form">Mark Attendance</Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
