import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Megaphone, Calendar, Users, BarChart3, Loader2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";

interface Poll {
  id: string;
  question: string;
  options: string[];
  notificationId: string;
  isActive: boolean;
}

interface PollWithResponse extends Poll {
  userResponse?: { selectedOption: number };
}

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

export default function NotificationsUserPage() {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: polls } = useQuery<PollWithResponse[]>({
    queryKey: ["/api/polls/active"],
  });

  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionIndex }: { pollId: string; optionIndex: number }) => {
      return apiRequest("POST", `/api/polls/${pollId}/respond`, {
        selectedOption: optionIndex,
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls/active"] });
      toast({ title: "Vote Recorded", description: "Your response has been saved." });
      setSelectedOptions(prev => {
        const updated = { ...prev };
        delete updated[vars.pollId];
        return updated;
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleVote = (pollId: string) => {
    const optionIndex = parseInt(selectedOptions[pollId]);
    if (optionIndex >= 0) {
      voteMutation.mutate({ pollId, optionIndex });
    }
  };

  const activeNotifications = notifications?.filter(n => n.isActive) || [];
  const pollMap = new Map(polls?.map(p => [p.notificationId, p]) || []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Announcements & Polls</h1>
        <p className="text-muted-foreground">Stay updated with the latest announcements</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Notifications</CardTitle>
          <CardDescription>Current announcements and polls for you</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : activeNotifications.length > 0 ? (
            <div className="divide-y">
              {activeNotifications.map((notification) => {
                const TypeIcon = typeIcons[notification.type as keyof typeof typeIcons] || Bell;
                const typeColor = typeColors[notification.type as keyof typeof typeColors] || "";
                const poll = pollMap.get(notification.id);
                
                return (
                  <div 
                    key={notification.id} 
                    className="p-6 hover:bg-muted/30 transition-colors"
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${typeColor.split(' ')[0]}`}>
                        <TypeIcon className={`h-5 w-5 ${typeColor.split(' ')[1]}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{notification.title}</h3>
                          <Badge className={typeColor}>
                            {notification.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">
                          {notification.content}
                        </p>
                        
                        {poll && (
                          <div className="bg-muted rounded-lg p-4 space-y-3 mt-3">
                            <h4 className="font-medium text-sm">{poll.question}</h4>
                            <RadioGroup 
                              value={selectedOptions[poll.id] ?? ""} 
                              onValueChange={(value) => setSelectedOptions(prev => ({ ...prev, [poll.id]: value }))}
                            >
                              {poll.options.map((option, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <RadioGroupItem value={String(idx)} id={`poll-${poll.id}-${idx}`} />
                                  <Label htmlFor={`poll-${poll.id}-${idx}`} className="cursor-pointer text-sm">
                                    {option}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                            <Button
                              size="sm"
                              onClick={() => handleVote(poll.id)}
                              disabled={!selectedOptions[poll.id] || voteMutation.isPending}
                              className="w-full mt-2"
                              data-testid={`button-vote-poll-${poll.id}`}
                            >
                              {voteMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              Submit Vote
                            </Button>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
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
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Active Notifications</h3>
              <p className="text-muted-foreground text-sm">There are no active announcements at this time.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
