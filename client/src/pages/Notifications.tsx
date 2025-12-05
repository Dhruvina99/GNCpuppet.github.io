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
  Bell,
  Megaphone,
  Calendar,
  Users,
  BarChart3,
  Trash2,
  Loader2,
  Clock,
  X,
} from "lucide-react";
import type { Notification, Member } from "@shared/schema";
import { EventSelector, getEventDisplayName } from "@/components/EventSelector";

const notificationSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  content: z.string().min(5, "Content must be at least 5 characters"),
  type: z.enum(["announcement", "planner", "meeting", "poll"]),
  expiresAt: z.string().optional(),
  pollOptions: z.array(z.string()).optional(),
  eventType: z.string().optional(),
  eventCustom: z.string().optional(),
});

type NotificationFormData = z.infer<typeof notificationSchema>;

const typeIcons = {
  announcement: Megaphone,
  planner: Calendar,
  meeting: Users,
  poll: BarChart3,
};

const typeColors = {
  announcement: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  planner: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  meeting: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  poll: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
};

export default function NotificationsAdminPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingNotification, setDeletingNotification] = useState<Notification | null>(null);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const { toast } = useToast();

  const { data: currentMember } = useQuery<Member>({
    queryKey: ["/api/members/me"],
  });

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: "",
      content: "",
      type: "announcement",
      expiresAt: "",
      pollOptions: [],
      eventType: "",
      eventCustom: "",
    },
  });

  const watchType = form.watch("type");

  const createMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      const payload = {
        ...data,
        pollOptions: data.type === "poll" ? pollOptions.filter(o => o.trim()) : undefined,
        eventType: data.eventType || null,
        eventCustom: data.eventCustom || null,
      };
      return apiRequest("POST", "/api/notifications", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Notification Sent", description: "Notification has been published to all members." });
      setIsDialogOpen(false);
      form.reset();
      setPollOptions(["", ""]);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Send Notification", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Notification Deleted", description: "Notification has been removed." });
      setDeletingNotification(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Delete", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: NotificationFormData) => {
    if (data.type === "poll" && pollOptions.filter(o => o.trim()).length < 2) {
      toast({ title: "Error", description: "Poll must have at least 2 options", variant: "destructive" });
      return;
    }
    createMutation.mutate(data);
  };

  const addPollOption = () => {
    setPollOptions([...pollOptions, ""]);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const isAdmin = currentMember?.isAdmin ?? false;

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="font-semibold mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground">You need admin privileges to create notifications.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeNotifications = notifications?.filter(n => n.isActive) || [];
  const expiredNotifications = notifications?.filter(n => !n.isActive) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notifications Management</h1>
          <p className="text-muted-foreground">
            Create announcements, polls, and meetings for all members
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2" data-testid="button-new-notification">
          <Plus className="h-4 w-4" />
          New Notification
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Notifications</CardTitle>
            <CardDescription>Visible to all members</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : activeNotifications.length > 0 ? (
              <div className="divide-y">
                {activeNotifications.map((notification) => {
                  const TypeIcon = typeIcons[notification.type as keyof typeof typeIcons] || Bell;
                  const typeColor = typeColors[notification.type as keyof typeof typeColors] || "";
                  
                  return (
                    <div 
                      key={notification.id} 
                      className="p-6 hover:bg-muted/30 transition-colors"
                      data-testid={`notification-${notification.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${typeColor.split(' ')[0]}`}>
                            <TypeIcon className={`h-5 w-5 ${typeColor.split(' ')[1]}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{notification.title}</h3>
                              <Badge className={typeColor}>
                                {notification.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {notification.content}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {notification.createdAt 
                                  ? new Date(notification.createdAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : 'Unknown'
                                }
                              </span>
                              {notification.expiresAt && (
                                <span>
                                  Expires: {new Date(notification.expiresAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setDeletingNotification(notification)}
                          className="text-destructive hover:text-destructive shrink-0"
                          data-testid={`button-delete-notification-${notification.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Active Notifications</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Create a new notification to engage with members.
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>Create Notification</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {expiredNotifications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-muted-foreground">Expired Notifications</CardTitle>
              <CardDescription>Past announcements</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y opacity-60">
                {expiredNotifications.map((notification) => {
                  const TypeIcon = typeIcons[notification.type as keyof typeof typeIcons] || Bell;
                  
                  return (
                    <div 
                      key={notification.id} 
                      className="p-6"
                      data-testid={`notification-expired-${notification.id}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <TypeIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{notification.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {notification.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Notification</DialogTitle>
            <DialogDescription>
              Send to all members: Announcement, Next Planner, Meeting, or Poll
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Notification title" {...field} data-testid="input-notification-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-notification-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="planner">Next Planner</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="poll">Poll</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter notification content..."
                        className="resize-none"
                        rows={3}
                        {...field} 
                        data-testid="textarea-notification-content" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchType === "poll" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Poll Options</label>
                    <p className="text-xs text-muted-foreground mb-2">Add at least 2 options</p>
                  </div>
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updatePollOption(index, e.target.value)}
                        data-testid={`input-poll-option-${index}`}
                      />
                      {pollOptions.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePollOption(index)}
                          data-testid={`button-remove-option-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPollOption}
                    data-testid="button-add-poll-option"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Option
                  </Button>
                </div>
              )}

              <EventSelector
                eventType={form.watch("eventType")}
                eventCustom={form.watch("eventCustom")}
                onEventTypeChange={(value) => form.setValue("eventType", value)}
                onEventCustomChange={(value) => form.setValue("eventCustom", value)}
              />

              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expires At (Optional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} data-testid="input-expires-at" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  data-testid="button-send-notification"
                >
                  {createMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Send
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingNotification} onOpenChange={() => setDeletingNotification(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Notification</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingNotification?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingNotification(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deletingNotification && deleteMutation.mutate(deletingNotification.id)}
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
