import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  Users,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Download,
  Upload,
} from "lucide-react";
import type { Member } from "@shared/schema";
import * as XLSX from "xlsx";

const memberSchema = z.object({
  mhtId: z.string().min(1, "MHT ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email").optional().or(z.literal('')),
  mobile: z.string().optional(),
  birthday: z.string().optional(),
  gDay: z.string().optional(),
  isAdmin: z.boolean().default(false),
});

type MemberFormData = z.infer<typeof memberSchema>;

export default function MembersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const { data: currentMember } = useQuery<Member>({
    queryKey: ["/api/members/me"],
  });

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    enabled: currentMember?.isAdmin,
  });

  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      mhtId: "",
      name: "",
      email: "",
      mobile: "",
      birthday: "",
      gDay: "",
      isAdmin: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MemberFormData) => {
      return apiRequest("POST", "/api/members", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Member Added", description: "New member has been added successfully." });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Add Member", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: MemberFormData & { id: string }) => {
      const { id, ...rest } = data;
      return apiRequest("PATCH", `/api/members/${id}`, rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Member Updated", description: "Member information has been updated." });
      setIsDialogOpen(false);
      setEditingMember(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Update Member", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Member Deleted", description: "Member has been removed." });
      setDeletingMember(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Delete Member", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: MemberFormData) => {
    if (editingMember) {
      updateMutation.mutate({ ...data, id: editingMember.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    form.reset({
      mhtId: member.mhtId,
      name: member.name,
      email: member.email || "",
      mobile: member.mobile || "",
      birthday: member.birthday || "",
      gDay: member.gDay || "",
      isAdmin: member.isAdmin || false,
    });
    setIsDialogOpen(true);
  };

  const handleOpenDialog = () => {
    setEditingMember(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/members/export', {
        method: 'GET',
      });
      
      if (!response.ok) throw new Error('Failed to download');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'members.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "Downloaded", description: "Members template downloaded successfully" });
    } catch (error) {
      toast({ 
        title: "Download Failed", 
        description: "Could not download members template",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/members/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      
      if (result.success > 0) {
        toast({ 
          title: "Import Successful", 
          description: `${result.success} member(s) imported successfully${result.errors.length > 0 ? `. ${result.failed} failed: ${result.errors.slice(0, 2).join(', ')}` : ''}`
        });
      } else {
        toast({ 
          title: "Import Failed", 
          description: result.errors.join('; '),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({ 
        title: "Upload Failed", 
        description: "Could not import members",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const filteredMembers = members?.filter((member) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchLower) ||
      member.mhtId.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!currentMember?.isAdmin) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="font-semibold mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground">You need admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Members</h1>
          <p className="text-muted-foreground">Manage sevarthi registrations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleDownloadTemplate} variant="outline" className="gap-2" data-testid="button-download-template">
            <Download className="h-4 w-4" />
            Download Template
          </Button>
          <label>
            <Button 
              disabled={isImporting}
              className="gap-2 cursor-pointer" 
              variant="outline"
              asChild
              data-testid="button-import-members"
            >
              <span>
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import Members
              </span>
            </Button>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isImporting}
              className="hidden"
              data-testid="input-import-file"
            />
          </label>
          <Button onClick={handleOpenDialog} className="gap-2" data-testid="button-add-member">
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-members"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : filteredMembers.length > 0 ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMembers.map((member) => (
                <Card key={member.id} className="hover-elevate" data-testid={`card-member-${member.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{member.name}</h3>
                            {member.isAdmin && (
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <Shield className="h-3 w-3" />
                                Admin
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">MHT: {member.mhtId}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-member-menu-${member.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(member)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setDeletingMember(member)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {member.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                      )}
                      {member.mobile && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {member.mobile}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Members Found</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {searchQuery ? "No members match your search" : "Add your first member to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={handleOpenDialog}>Add Member</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMember ? "Edit Member" : "Add New Member"}</DialogTitle>
            <DialogDescription>
              {editingMember ? "Update member information" : "Register a new sevarthi"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="mhtId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MHT ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter MHT ID" {...field} data-testid="input-mht-id" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} data-testid="input-member-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email" {...field} data-testid="input-member-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile</FormLabel>
                      <FormControl>
                        <Input placeholder="Mobile" {...field} data-testid="input-member-mobile" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="birthday"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Birthday</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-member-birthday" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>G-Day</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-member-gday" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isAdmin"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox 
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-is-admin"
                      />
                    </FormControl>
                    <div>
                      <FormLabel className="cursor-pointer">Admin Access</FormLabel>
                      <FormDescription className="text-xs">
                        Grant admin privileges to this member
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-member"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingMember ? "Update" : "Add"} Member
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingMember} onOpenChange={() => setDeletingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingMember?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingMember(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deletingMember && deleteMutation.mutate(deletingMember.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
