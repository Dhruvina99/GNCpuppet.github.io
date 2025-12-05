import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Theater } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailOrMobile, setEmailOrMobile] = useState("");
  const [mhtId, setMhtId] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailOrMobile.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email or mobile number",
        variant: "destructive",
      });
      return;
    }

    if (!mhtId.trim()) {
      toast({
        title: "Error",
        description: "Please enter your MHT ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          emailOrMobile: emailOrMobile.trim(),
          mhtId: mhtId.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast({
          title: "Login Failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Logged in successfully",
      });

      // Ensure the auth query is refetched before redirecting
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      
      setLocation("/");
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
                GP
              </div>
            </div>
            <CardTitle className="text-2xl">GNC - Puppet</CardTitle>
            <CardDescription>
              Sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-mobile" data-testid="label-email-mobile">
                  Email or Mobile Number
                </Label>
                <Input
                  id="email-mobile"
                  data-testid="input-email-mobile"
                  type="text"
                  placeholder="Enter your email or mobile number"
                  value={emailOrMobile}
                  onChange={(e) => setEmailOrMobile(e.target.value.toLowerCase())}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mht-id" data-testid="label-mht-id">
                  MHT ID
                </Label>
                <Input
                  id="mht-id"
                  data-testid="input-mht-id"
                  type="text"
                  placeholder="Enter your MHT ID"
                  value={mhtId}
                  onChange={(e) => setMhtId(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login-submit"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Demo Credentials:</strong>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Email: admin@gnc.org<br />
                MHT ID: MHT001
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>GNC - Puppet (DBF) Attendance System</p>
          <p>Manage your puppet shows with ease</p>
        </div>
      </div>
    </div>
  );
}
