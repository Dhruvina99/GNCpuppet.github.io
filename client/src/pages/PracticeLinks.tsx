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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  Search,
  PlayCircle,
  Link as LinkIcon,
  ExternalLink,
  Edit,
  Trash2,
  Loader2,
  BookOpen,
} from "lucide-react";
import type { PracticeLink, Story, Member } from "@shared/schema";

interface PracticeLinkWithStory extends PracticeLink {
  story?: Story;
}

const linkSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  url: z.string().url("Please enter a valid URL"),
  storyId: z.string().min(1, "Please select a story"),
});

type LinkFormData = z.infer<typeof linkSchema>;

export default function PracticeLinksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<PracticeLinkWithStory | null>(null);
  const [deletingLink, setDeletingLink] = useState<PracticeLinkWithStory | null>(null);
  const { toast } = useToast();

  const { data: currentMember } = useQuery<Member>({
    queryKey: ["/api/members/me"],
  });

  const { data: practiceLinks, isLoading } = useQuery<PracticeLinkWithStory[]>({
    queryKey: ["/api/practice-links"],
  });

  const { data: stories } = useQuery<Story[]>({
    queryKey: ["/api/stories"],
  });

  const form = useForm<LinkFormData>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      title: "",
      url: "",
      storyId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LinkFormData) => {
      return apiRequest("POST", "/api/practice-links", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice-links"] });
      toast({ title: "Link Added", description: "Practice link has been added." });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Add Link", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: LinkFormData & { id: string }) => {
      const { id, ...rest } = data;
      return apiRequest("PATCH", `/api/practice-links/${id}`, rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice-links"] });
      toast({ title: "Link Updated", description: "Practice link has been updated." });
      setIsDialogOpen(false);
      setEditingLink(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Update Link", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/practice-links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practice-links"] });
      toast({ title: "Link Deleted", description: "Practice link has been removed." });
      setDeletingLink(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Delete Link", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: LinkFormData) => {
    if (editingLink) {
      updateMutation.mutate({ ...data, id: editingLink.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (link: PracticeLinkWithStory) => {
    setEditingLink(link);
    form.reset({
      title: link.title,
      url: link.url,
      storyId: link.storyId,
    });
    setIsDialogOpen(true);
  };

  const handleOpenDialog = () => {
    setEditingLink(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const isAdmin = currentMember?.isAdmin ?? false;

  const linksByStory = practiceLinks?.reduce((acc, link) => {
    const storyId = link.storyId;
    if (!acc[storyId]) {
      acc[storyId] = {
        story: link.story,
        links: [],
      };
    }
    acc[storyId].links.push(link);
    return acc;
  }, {} as Record<string, { story?: Story; links: PracticeLinkWithStory[] }>) || {};

  const filteredStoryGroups = Object.entries(linksByStory).filter(([_, group]) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      group.story?.name?.toLowerCase().includes(searchLower) ||
      group.links.some(l => l.title.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Practice Links</h1>
          <p className="text-muted-foreground">Story-wise practice drive links</p>
        </div>
        {isAdmin && (
          <Button onClick={handleOpenDialog} className="gap-2" data-testid="button-add-link">
            <Plus className="h-4 w-4" />
            Add Link
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search links..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-links"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredStoryGroups.length > 0 ? (
            <Accordion type="multiple" className="px-6 pb-6" defaultValue={filteredStoryGroups.map(([id]) => id)}>
              {filteredStoryGroups.map(([storyId, group]) => (
                <AccordionItem key={storyId} value={storyId} data-testid={`accordion-story-${storyId}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold">{group.story?.name || 'Unknown Story'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {group.links.length} link{group.links.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-4 space-y-3">
                      {group.links.map((link) => (
                        <div
                          key={link.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          data-testid={`link-item-${link.id}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="h-8 w-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <PlayCircle className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-medium text-sm truncate">{link.title}</h4>
                              <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="gap-1"
                              data-testid={`button-open-link-${link.id}`}
                            >
                              <a href={link.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3" />
                                Open
                              </a>
                            </Button>
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(link)}
                                  data-testid={`button-edit-link-${link.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingLink(link)}
                                  className="text-destructive hover:text-destructive"
                                  data-testid={`button-delete-link-${link.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="p-12 text-center">
              <LinkIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Practice Links</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {searchQuery ? "No links match your search" : "No practice links have been added yet"}
              </p>
              {isAdmin && !searchQuery && (
                <Button onClick={handleOpenDialog}>Add Practice Link</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLink ? "Edit Practice Link" : "Add Practice Link"}</DialogTitle>
            <DialogDescription>
              {editingLink ? "Update the practice link details" : "Add a new practice drive link"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="storyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Story</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-link-story">
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

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter link title" {...field} data-testid="input-link-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} data-testid="input-link-url" />
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
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-link"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingLink ? "Update" : "Add"} Link
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingLink} onOpenChange={() => setDeletingLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Practice Link</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingLink?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingLink(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deletingLink && deleteMutation.mutate(deletingLink.id)}
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
