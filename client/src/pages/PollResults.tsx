import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, FileSpreadsheet, FileImage, BarChart3, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Member } from "@shared/schema";

interface PollResponse {
  id: string;
  pollId: string;
  memberId: string;
  selectedOption: number;
  createdAt: string;
  member?: { name: string };
}

interface Poll {
  id: string;
  question: string;
  options: string[];
  notificationId: string;
  isActive: boolean;
  createdAt: string;
  responses: PollResponse[];
}

export default function PollResultsPage() {
  const [selectedPollId, setSelectedPollId] = useState<string>("");
  const [exporting, setExporting] = useState<string>("");
  const { toast } = useToast();

  const { data: currentMember } = useQuery<Member>({
    queryKey: ["/api/members/me"],
  });

  const { data: polls, isLoading: pollsLoading } = useQuery<Poll[]>({
    queryKey: ["/api/polls/results"],
    enabled: currentMember?.isAdmin,
  });

  const selectedPoll = polls?.find(p => p.id === selectedPollId);

  const getPollStats = (poll: Poll) => {
    const responses = poll.responses || [];
    const total = responses.length;
    const optionCounts = poll.options.map((_, idx) => 
      responses.filter(r => r.selectedOption === idx).length
    );
    return { total, optionCounts };
  };

  const handleExport = async (format: 'excel' | 'pdf' | 'image') => {
    if (!selectedPoll) return;
    
    try {
      setExporting(format);
      const response = await fetch('/api/polls/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId: selectedPoll.id, format }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extensions: Record<string, string> = { pdf: 'pdf', excel: 'xlsx', image: 'jpg' };
      a.download = `poll-results-${Date.now()}.${extensions[format]}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Success", description: `${format.toUpperCase()} exported successfully` });
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Error", description: "Failed to export", variant: "destructive" });
    } finally {
      setExporting("");
    }
  };

  if (!currentMember?.isAdmin) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="font-semibold mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground">Admin privileges needed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Poll Results</h1>
        <p className="text-muted-foreground">View and export poll responses</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Poll</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedPollId} onValueChange={setSelectedPollId}>
            <SelectTrigger data-testid="select-poll">
              <SelectValue placeholder="Choose a poll to view results" />
            </SelectTrigger>
            <SelectContent>
              {polls?.map((poll) => (
                <SelectItem key={poll.id} value={poll.id}>
                  {poll.question}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedPoll && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <CardTitle>{selectedPoll.question}</CardTitle>
                  <CardDescription>
                    Total Responses: {getPollStats(selectedPoll).total}
                  </CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExport('pdf')} 
                    disabled={exporting === 'pdf'}
                    className="gap-2" 
                    data-testid="button-export-pdf"
                  >
                    {exporting === 'pdf' && <Loader2 className="h-4 w-4 animate-spin" />}
                    <FileText className="h-4 w-4" />
                    PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExport('excel')} 
                    disabled={exporting === 'excel'}
                    className="gap-2" 
                    data-testid="button-export-excel"
                  >
                    {exporting === 'excel' && <Loader2 className="h-4 w-4 animate-spin" />}
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExport('image')} 
                    disabled={exporting === 'image'}
                    className="gap-2" 
                    data-testid="button-export-image"
                  >
                    {exporting === 'image' && <Loader2 className="h-4 w-4 animate-spin" />}
                    <FileImage className="h-4 w-4" />
                    Image
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedPoll.options.map((option, idx) => {
                const { optionCounts, total } = getPollStats(selectedPoll);
                const count = optionCounts[idx];
                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-sm">{option}</label>
                      <Badge variant="outline">{count} votes ({percentage}%)</Badge>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Responses</CardTitle>
            </CardHeader>
            <CardContent>
              {pollsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : selectedPoll.responses.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedPoll.responses.map((response) => (
                    <div key={response.id} className="space-y-1 p-3 bg-muted rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{response.member?.name || "Unknown"}</span>
                        <Badge>{selectedPoll.options[response.selectedOption]}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {response.createdAt ? new Date(response.createdAt).toLocaleString() : ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No responses yet</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
