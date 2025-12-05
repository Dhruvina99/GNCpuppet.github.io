import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Check,
  X,
  Users,
  Clock,
  Calendar,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { Story, Character, Role, Member } from "@shared/schema";
import { EventSelector } from "@/components/EventSelector";

const attendanceSchema = z.object({
  date: z.string().min(1, "Date is required"),
  status: z.enum(["present", "absent", "replaced"]),
  storyId: z.string().optional(),
  timeIn: z.string().optional(),
  timeOut: z.string().optional(),
  roleId: z.string().optional(),
  characterIds: z.array(z.string()).optional(),
  reason: z.string().optional(),
  reasonVisibleToAdmins: z.boolean().default(false),
  replacedMemberId: z.string().optional(),
  eventType: z.string().optional(),
  eventCustom: z.string().optional(),
});

type AttendanceFormData = z.infer<typeof attendanceSchema>;

export default function AttendanceForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);

  const { data: member } = useQuery<Member>({
    queryKey: ["/api/members/me"],
  });

  const { data: stories, isLoading: storiesLoading } = useQuery<Story[]>({
    queryKey: ["/api/stories"],
  });

  const { data: roles, isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const { data: members, isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    enabled: !!member?.isAdmin,
  });

  const form = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      status: "present",
      storyId: "",
      timeIn: "",
      timeOut: "",
      roleId: "",
      characterIds: [],
      reason: "",
      reasonVisibleToAdmins: false,
      replacedMemberId: "",
      eventType: "",
      eventCustom: "",
    },
  });

  const watchStatus = form.watch("status");
  const watchStoryId = form.watch("storyId");
  const watchRoleId = form.watch("roleId");

  const { data: characters } = useQuery<Character[]>({
    queryKey: [`/api/stories/${watchStoryId}/characters`],
    enabled: !!watchStoryId,
  });

  const selectedRole = roles?.find(r => r.id === watchRoleId);
  const isCharacterRole = selectedRole?.name?.toLowerCase() === "character";

  const handleCharacterToggle = (charId: string) => {
    setSelectedCharacters(prev =>
      prev.includes(charId) ? prev.filter(c => c !== charId) : [...prev, charId]
    );
  };

  const createMutation = useMutation({
    mutationFn: async (data: AttendanceFormData) => {
      return apiRequest("POST", "/api/attendance", {
        ...data,
        timeIn: data.timeIn ? data.timeIn : null,
        timeOut: data.timeOut ? data.timeOut : null,
        characterIds: isCharacterRole ? selectedCharacters : [],
        eventType: data.eventType || null,
        eventCustom: data.eventCustom || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({
        title: "Attendance Marked",
        description: "Your attendance has been recorded successfully.",
      });
      navigate("/attendance");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Mark Attendance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AttendanceFormData) => {
    createMutation.mutate(data);
  };

  const toggleCharacter = (characterId: string) => {
    setSelectedCharacters(prev => 
      prev.includes(characterId)
        ? prev.filter(id => id !== characterId)
        : [...prev, characterId]
    );
  };

  const getMaxDate = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - daysToLastSunday);
    return lastSunday.toISOString().split('T')[0];
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/attendance")} className="gap-2 mb-4" data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
          Back to Attendance
        </Button>
        <h1 className="text-3xl font-bold">Mark Attendance</h1>
        <p className="text-muted-foreground">Record your attendance for a show</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attendance Status</CardTitle>
              <CardDescription>Select your attendance type</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                      >
                        <Label
                          htmlFor="present"
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            field.value === "present"
                              ? "border-green-500 bg-green-500/10"
                              : "border-border hover-elevate"
                          }`}
                          data-testid="radio-present"
                        >
                          <RadioGroupItem value="present" id="present" className="sr-only" />
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            field.value === "present" ? "bg-green-500 text-white" : "bg-muted"
                          }`}>
                            <Check className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">Present</p>
                            <p className="text-xs text-muted-foreground">In your turn</p>
                          </div>
                        </Label>

                        <Label
                          htmlFor="absent"
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            field.value === "absent"
                              ? "border-red-500 bg-red-500/10"
                              : "border-border hover-elevate"
                          }`}
                          data-testid="radio-absent"
                        >
                          <RadioGroupItem value="absent" id="absent" className="sr-only" />
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            field.value === "absent" ? "bg-red-500 text-white" : "bg-muted"
                          }`}>
                            <X className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">Absent</p>
                            <p className="text-xs text-muted-foreground">Missing your turn</p>
                          </div>
                        </Label>

                        <Label
                          htmlFor="replaced"
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            field.value === "replaced"
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-border hover-elevate"
                          }`}
                          data-testid="radio-replaced"
                        >
                          <RadioGroupItem value="replaced" id="replaced" className="sr-only" />
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            field.value === "replaced" ? "bg-blue-500 text-white" : "bg-muted"
                          }`}>
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">Replaced</p>
                            <p className="text-xs text-muted-foreground">Covering for someone</p>
                          </div>
                        </Label>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Date & Time</CardTitle>
              <CardDescription>When did the show take place?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        max={getMaxDate()}
                        {...field} 
                        data-testid="input-date"
                      />
                    </FormControl>
                    <FormDescription>Can only fill till last week</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(watchStatus === "present" || watchStatus === "replaced") && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="timeIn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Time In
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="time" 
                            {...field} 
                            data-testid="input-time-in"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="timeOut"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Time Out
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="time" 
                            {...field} 
                            data-testid="input-time-out"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event</CardTitle>
              <CardDescription>Select the event type for this attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <EventSelector
                eventType={form.watch("eventType")}
                eventCustom={form.watch("eventCustom")}
                onEventTypeChange={(value) => form.setValue("eventType", value)}
                onEventCustomChange={(value) => form.setValue("eventCustom", value)}
              />
            </CardContent>
          </Card>

          {(watchStatus === "present" || watchStatus === "replaced") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Show Details</CardTitle>
                <CardDescription>Story and role information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="storyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Story</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-story">
                            <SelectValue placeholder="Select a story" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {storiesLoading ? (
                            <div className="p-2">Loading...</div>
                          ) : (
                            stories?.map((story) => (
                              <SelectItem key={story.id} value={story.id}>
                                {story.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-role">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rolesLoading ? (
                            <div className="p-2">Loading...</div>
                          ) : (
                            roles?.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isCharacterRole && watchStoryId && (
                  <div>
                    <Label className="mb-3 block">Select Characters</Label>
                    <div className="flex flex-wrap gap-2">
                      {characters?.map((character) => (
                        <Badge
                          key={character.id}
                          variant={selectedCharacters.includes(character.id) ? "default" : "outline"}
                          className="cursor-pointer transition-all"
                          onClick={() => handleCharacterToggle(character.id)}
                          data-testid={`badge-character-${character.id}`}
                        >
                          {selectedCharacters.includes(character.id) && (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          {character.name}
                        </Badge>
                      ))}
                    </div>
                    {characters?.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        No characters found for this story
                      </p>
                    )}
                  </div>
                )}

                {watchStatus === "replaced" && (
                  <FormField
                    control={form.control}
                    name="replacedMemberId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Replaced Member</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-replaced-member">
                              <SelectValue placeholder="Who did you replace?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {membersLoading ? (
                              <div className="p-2">Loading...</div>
                            ) : (
                              members?.filter(m => m.id !== member?.id).map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name} ({m.mhtId})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {watchStatus === "absent" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Absence Details</CardTitle>
                <CardDescription>Please provide a reason</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Absence</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter your reason..."
                          className="resize-none"
                          rows={3}
                          {...field}
                          data-testid="textarea-reason"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reasonVisibleToAdmins"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox 
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-visible-to-admins"
                        />
                      </FormControl>
                      <div>
                        <FormLabel className="cursor-pointer">Visible to admins only</FormLabel>
                        <FormDescription className="text-xs">
                          Only admins will be able to see your reason
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/attendance")}
              className="flex-1"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
              className="flex-1 gap-2"
              data-testid="button-submit"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Submit Attendance
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
