import { useState } from "react";
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
import { ArrowLeft, Check, X, Users, Loader2, AlertCircle } from "lucide-react";
import type { Story, Character, Role, Member } from "@shared/schema";

const adminAttendanceSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  date: z.string().min(1, "Date is required"),
  status: z.enum(["present", "absent", "replaced"]),
  storyId: z.string().optional(),
  timeIn: z.string().optional(),
  timeOut: z.string().optional(),
  roleId: z.string().optional(),
  characterIds: z.array(z.string()).optional(),
  reason: z.string().optional(),
  replacedMemberId: z.string().optional(),
});

type AdminAttendanceFormData = z.infer<typeof adminAttendanceSchema>;

export default function AdminAttendanceForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);

  const { data: currentMember } = useQuery<Member>({
    queryKey: ["/api/members/me"],
  });

  const { data: members, isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: stories, isLoading: storiesLoading } = useQuery<Story[]>({
    queryKey: ["/api/stories"],
  });

  const { data: roles, isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const form = useForm<AdminAttendanceFormData>({
    resolver: zodResolver(adminAttendanceSchema),
    defaultValues: {
      memberId: "",
      date: new Date().toISOString().split('T')[0],
      status: "present",
      storyId: "",
      timeIn: "",
      timeOut: "",
      roleId: "",
      characterIds: [],
      reason: "",
      replacedMemberId: "",
    },
  });

  const watchStatus = form.watch("status");
  const watchStoryId = form.watch("storyId");
  const watchRoleId = form.watch("roleId");
  const watchMemberId = form.watch("memberId");

  const { data: characters } = useQuery<Character[]>({
    queryKey: [`/api/stories/${watchStoryId}/characters`],
    enabled: !!watchStoryId,
  });

  const selectedRole = roles?.find(r => r.id === watchRoleId);
  const isCharacterRole = selectedRole?.name?.toLowerCase() === "character";
  const selectedMemberName = members?.find(m => m.id === watchMemberId)?.name;

  const handleCharacterToggle = (charId: string) => {
    setSelectedCharacters(prev =>
      prev.includes(charId) ? prev.filter(c => c !== charId) : [...prev, charId]
    );
  };

  const createMutation = useMutation({
    mutationFn: async (data: AdminAttendanceFormData) => {
      return apiRequest("POST", "/api/attendance/admin", {
        ...data,
        characterIds: isCharacterRole ? selectedCharacters : [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({ title: "Success", description: "Attendance recorded successfully" });
      navigate("/attendance/all");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: AdminAttendanceFormData) => {
    createMutation.mutate(data);
  };

  if (!currentMember?.isAdmin) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive/50 mx-auto mb-4" />
            <h2 className="font-semibold mb-2">Admin Only</h2>
            <p className="text-muted-foreground">Only admins can fill attendance for other members.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = membersLoading || storiesLoading || rolesLoading;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/attendance/all")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Record Attendance</h1>
            <p className="text-muted-foreground text-sm">Fill attendance for a member</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Attendance Details</CardTitle>
              <CardDescription>
                Select a member and fill their attendance information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="memberId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Member</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-member">
                              <SelectValue placeholder="Select a member" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {members?.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedMemberName && (
                    <Badge className="w-full justify-center p-3 text-base">
                      Recording for: {selectedMemberName}
                    </Badge>
                  )}

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            data-testid="input-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <RadioGroup 
                            value={field.value} 
                            onValueChange={field.onChange}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="present" id="status-present" />
                              <Label htmlFor="status-present" className="cursor-pointer flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-600" />
                                Present
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="absent" id="status-absent" />
                              <Label htmlFor="status-absent" className="cursor-pointer flex items-center gap-2">
                                <X className="h-4 w-4 text-red-600" />
                                Absent
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="replaced" id="status-replaced" />
                              <Label htmlFor="status-replaced" className="cursor-pointer flex items-center gap-2">
                                <Users className="h-4 w-4 text-blue-600" />
                                Replaced
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(watchStatus === "present" || watchStatus === "replaced") && (
                    <>
                      <FormField
                        control={form.control}
                        name="storyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Story</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-story">
                                  <SelectValue placeholder="Select a story" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {stories?.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
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
                        name="roleId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-role">
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {roles?.map((r) => (
                                  <SelectItem key={r.id} value={r.id}>
                                    {r.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {isCharacterRole && characters && characters.length > 0 && (
                        <FormItem>
                          <FormLabel>Characters</FormLabel>
                          <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                            {characters.map((char) => (
                              <div key={char.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`char-${char.id}`}
                                  checked={selectedCharacters.includes(char.id)}
                                  onCheckedChange={() => handleCharacterToggle(char.id)}
                                  data-testid={`checkbox-character-${char.id}`}
                                />
                                <Label htmlFor={`char-${char.id}`} className="cursor-pointer">
                                  {char.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </FormItem>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="timeIn"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Time In</FormLabel>
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
                              <FormLabel>Time Out</FormLabel>
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
                    </>
                  )}

                  {watchStatus === "absent" && (
                    <FormField
                      control={form.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reason for Absence</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Explain reason for absence..."
                              className="resize-none"
                              rows={3}
                              {...field}
                              data-testid="textarea-absence-reason"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {watchStatus === "replaced" && (
                    <FormField
                      control={form.control}
                      name="replacedMemberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Replaced By</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-replaced-by">
                                <SelectValue placeholder="Select replacement member" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {members?.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex gap-2 pt-6">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => navigate("/attendance/all")}
                      className="flex-1"
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending || !watchMemberId}
                      className="flex-1"
                      data-testid="button-save-attendance"
                    >
                      {createMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Record Attendance
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
