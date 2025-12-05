import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Search,
  Theater,
  Users,
  Calendar,
  MapPin,
  GraduationCap,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import type { Show, Story, Member } from "@shared/schema";
import { EventSelector, getEventDisplayName } from "@/components/EventSelector";

interface ShowWithDetails extends Show {
  story?: Story;
  createdBy?: Member;
}

const showSchema = z.object({
  date: z.string().min(1, "Date is required"),
  storyId: z.string().min(1, "Story is required"),
  numberOfShows: z.coerce.number().min(1, "At least 1 show required"),
  totalAudience: z.coerce.number().optional(),
  isSchool: z.boolean().default(false),
  schoolName: z.string().optional(),
  schoolPlace: z.string().optional(),
  numberOfStudents: z.coerce.number().optional(),
  asPlanned: z.boolean().default(true),
  notAsPlannedReason: z.string().optional(),
  cancelled: z.boolean().default(false),
  cancelledReason: z.string().optional(),
  eventType: z.string().optional(),
  eventCustom: z.string().optional(),
});

type ShowFormData = z.infer<typeof showSchema>;

export default function ShowsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShow, setEditingShow] = useState<ShowWithDetails | null>(null);
  const [deletingShow, setDeletingShow] = useState<ShowWithDetails | null>(null);
  const { toast } = useToast();

  const { data: currentMember } = useQuery<Member>({
    queryKey: ["/api/members/me"],
  });

  const { data: shows, isLoading } = useQuery<ShowWithDetails[]>({
    queryKey: ["/api/shows"],
    enabled: currentMember?.isAdmin,
  });

  const { data: stories } = useQuery<Story[]>({
    queryKey: ["/api/stories"],
    enabled: currentMember?.isAdmin,
  });

  const form = useForm<ShowFormData>({
    resolver: zodResolver(showSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      storyId: "",
      numberOfShows: 1,
      totalAudience: 0,
      isSchool: false,
      schoolName: "",
      schoolPlace: "",
      numberOfStudents: 0,
      asPlanned: true,
      notAsPlannedReason: "",
      cancelled: false,
      cancelledReason: "",
      eventType: "",
      eventCustom: "",
    },
  });

  const watchIsSchool = form.watch("isSchool");
  const watchAsPlanned = form.watch("asPlanned");
  const watchCancelled = form.watch("cancelled");

  const createMutation = useMutation({
    mutationFn: async (data: ShowFormData) => {
      return apiRequest("POST", "/api/shows", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shows"] });
      toast({ title: "Show Added", description: "Show details have been recorded." });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Add Show", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ShowFormData & { id: string }) => {
      const { id, ...rest } = data;
      return apiRequest("PATCH", `/api/shows/${id}`, rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shows"] });
      toast({ title: "Show Updated", description: "Show details have been updated." });
      setIsDialogOpen(false);
      setEditingShow(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Update Show", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/shows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shows"] });
      toast({ title: "Show Deleted", description: "Show has been removed." });
      setDeletingShow(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Delete Show", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: ShowFormData) => {
    if (editingShow) {
      updateMutation.mutate({ ...data, id: editingShow.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (show: ShowWithDetails) => {
    setEditingShow(show);
    form.reset({
      date: show.date,
      storyId: show.storyId,
      numberOfShows: show.numberOfShows || 1,
      totalAudience: show.totalAudience || 0,
      isSchool: show.isSchool || false,
      schoolName: show.schoolName || "",
      schoolPlace: show.schoolPlace || "",
      numberOfStudents: show.numberOfStudents || 0,
      asPlanned: show.asPlanned ?? true,
      notAsPlannedReason: show.notAsPlannedReason || "",
      cancelled: !!show.cancelledReason,
      cancelledReason: show.cancelledReason || "",
      eventType: show.eventType || "",
      eventCustom: show.eventCustom || "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenDialog = () => {
    setEditingShow(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const filteredShows = shows?.filter((show) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      show.story?.name?.toLowerCase().includes(searchLower) ||
      show.schoolName?.toLowerCase().includes(searchLower)
    );
  }) || [];

  if (!currentMember?.isAdmin) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <Theater className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="font-semibold mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground">You need admin privileges to manage shows.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Show Details</h1>
          <p className="text-muted-foreground">Record and manage puppet show performances</p>
        </div>
        <Button onClick={handleOpenDialog} className="gap-2" data-testid="button-add-show">
          <Plus className="h-4 w-4" />
          Add Show
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search shows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-shows"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredShows.length > 0 ? (
            <div className="divide-y">
              {filteredShows.map((show) => (
                <div 
                  key={show.id} 
                  className="p-6 hover:bg-muted/30 transition-colors"
                  data-testid={`show-item-${show.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Theater className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{show.story?.name || 'Unknown Story'}</h3>
                          {show.cancelledReason && (
                            <Badge variant="destructive" className="gap-1">
                              <X className="h-3 w-3" />
                              Cancelled
                            </Badge>
                          )}
                          {show.isSchool && (
                            <Badge variant="secondary" className="gap-1">
                              <GraduationCap className="h-3 w-3" />
                              School
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(show.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Theater className="h-3 w-3" />
                            {show.numberOfShows || 1} shows
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {show.totalAudience || 0} audience
                          </span>
                          {show.isSchool && show.schoolName && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {show.schoolName}
                            </span>
                          )}
                        </div>
                        {!show.asPlanned && show.notAsPlannedReason && (
                          <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {show.notAsPlannedReason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(show)}
                        data-testid={`button-edit-show-${show.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setDeletingShow(show)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-show-${show.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Theater className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Shows Found</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {searchQuery ? "No shows match your search" : "Record your first show to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={handleOpenDialog}>Add Show</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingShow ? "Edit Show" : "Add New Show"}</DialogTitle>
            <DialogDescription>
              {editingShow ? "Update show details" : "Record a puppet show performance"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-show-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="storyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Story</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-show-story">
                            <SelectValue placeholder="Select story" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stories?.map((story) => (
                            <SelectItem key={story.id} value={story.id}>
                              {story.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <EventSelector
                eventType={form.watch("eventType")}
                eventCustom={form.watch("eventCustom")}
                onEventTypeChange={(value) => form.setValue("eventType", value)}
                onEventCustomChange={(value) => form.setValue("eventCustom", value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="numberOfShows"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Shows</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} data-testid="input-number-of-shows" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Audience</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} data-testid="input-total-audience" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="isSchool"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox 
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-is-school"
                      />
                    </FormControl>
                    <div>
                      <FormLabel className="cursor-pointer">School Performance</FormLabel>
                      <FormDescription className="text-xs">
                        Was this show at a school?
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {watchIsSchool && (
                <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="schoolName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>School Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter school name" {...field} data-testid="input-school-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="schoolPlace"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Place</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter location" {...field} data-testid="input-school-place" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="numberOfStudents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Students</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} data-testid="input-number-of-students" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <Separator />

              <FormField
                control={form.control}
                name="cancelled"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox 
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-cancelled"
                      />
                    </FormControl>
                    <div>
                      <FormLabel className="cursor-pointer text-destructive">Show Cancelled</FormLabel>
                      <FormDescription className="text-xs">
                        Was this show cancelled?
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {watchCancelled && (
                <FormField
                  control={form.control}
                  name="cancelledReason"
                  render={({ field }) => (
                    <FormItem className="pl-6 border-l-2 border-destructive/20">
                      <FormLabel>Cancellation Reason</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Why was the show cancelled?"
                          className="resize-none"
                          rows={2}
                          {...field} 
                          data-testid="textarea-cancelled-reason" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {!watchCancelled && (
                <>
                  <FormField
                    control={form.control}
                    name="asPlanned"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 space-y-0">
                        <FormControl>
                          <Checkbox 
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-as-planned"
                          />
                        </FormControl>
                        <div>
                          <FormLabel className="cursor-pointer">Show Went as Planned</FormLabel>
                          <FormDescription className="text-xs">
                            Did everything go according to plan?
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {!watchAsPlanned && (
                    <FormField
                      control={form.control}
                      name="notAsPlannedReason"
                      render={({ field }) => (
                        <FormItem className="pl-6 border-l-2 border-yellow-500/20">
                          <FormLabel>What Happened?</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe what didn't go as planned"
                              className="resize-none"
                              rows={2}
                              {...field} 
                              data-testid="textarea-not-as-planned-reason" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-show"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingShow ? "Update" : "Add"} Show
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingShow} onOpenChange={() => setDeletingShow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Show</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this show record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingShow(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deletingShow && deleteMutation.mutate(deletingShow.id)}
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
