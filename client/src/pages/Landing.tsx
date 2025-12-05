import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ClipboardCheck, 
  Users, 
  BarChart3, 
  Bell, 
  Shield,
  ArrowRight,
  Theater
} from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: ClipboardCheck,
      title: "Track Attendance",
      description: "Mark your attendance with detailed status - Present, Absent, or Replaced with role and character tracking."
    },
    {
      icon: Users,
      title: "Member Management",
      description: "Manage all sevarthis with MHT ID, contact details, and role assignments."
    },
    {
      icon: Theater,
      title: "Story & Character",
      description: "Organize shows by stories with complete character management for each performance."
    },
    {
      icon: BarChart3,
      title: "Reports & Analytics",
      description: "Generate detailed reports with filtering, export to PDF, Excel, or Image formats."
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Stay updated with announcements, polls, and meeting notifications from admins."
    },
    {
      icon: Shield,
      title: "Role-Based Access",
      description: "Secure system with different access levels for admins and regular members."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
        
        <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
              GP
            </div>
            <span className="font-semibold text-lg">GNC - Puppet</span>
          </div>
          <Button asChild data-testid="button-login-nav">
            <a href="/login">Sign In</a>
          </Button>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Theater className="h-4 w-4" />
              GNC Puppet (DBF) Attendance System
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Manage Your GNC
              <span className="text-primary block mt-2">Puppet Shows</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              A comprehensive attendance management system for sevarthis. Track attendance, 
              manage stories and characters, generate reports, and stay connected with your team.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gap-2" asChild data-testid="button-login-hero">
                <a href="/login">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-learn-more">
                <a href="#features">Learn More</a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete solution for managing your GNC - Puppet show attendance and operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="hover-elevate transition-all duration-200"
                data-testid={`card-feature-${index}`}
              >
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-card">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Sign in with your account to access the attendance management system.
            Contact your admin if you need to be registered as a sevarthi.
          </p>
          <Button size="lg" className="gap-2" asChild data-testid="button-login-cta">
            <a href="/api/login">
              Sign In Now
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              GP
            </div>
            <span className="text-sm text-muted-foreground">
              GNC - Puppet Attendance (DBF)
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Sevarthi Attendance Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
