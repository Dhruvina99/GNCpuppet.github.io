import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Attendance from "@/pages/Attendance";
import AttendanceForm from "@/pages/AttendanceForm";
import AdminAttendance from "@/pages/AdminAttendance";
import AdminAttendanceForm from "@/pages/AdminAttendanceForm";
import Members from "@/pages/Members";
import Stories from "@/pages/Stories";
import Shows from "@/pages/Shows";
import Notifications from "@/pages/Notifications";
import NotificationsUser from "@/pages/NotificationsUser";
import PollResults from "@/pages/PollResults";
import PracticeLinks from "@/pages/PracticeLinks";
import Reports from "@/pages/Reports";
import UserReports from "@/pages/UserReports";
import NotFound from "@/pages/not-found";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-2xl mx-auto">
          SA
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-3 w-24 mx-auto" />
        </div>
      </div>
    </div>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <header className="flex h-14 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/attendance" component={Attendance} />
        <Route path="/attendance/form" component={AttendanceForm} />
        <Route path="/attendance/all" component={AdminAttendance} />
        <Route path="/attendance/admin-form" component={AdminAttendanceForm} />
        <Route path="/members" component={Members} />
        <Route path="/stories" component={Stories} />
        <Route path="/shows" component={Shows} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/announcements" component={NotificationsUser} />
        <Route path="/polls/results" component={PollResults} />
        <Route path="/practice-links" component={PracticeLinks} />
        <Route path="/reports" component={Reports} />
        <Route path="/user-reports" component={UserReports} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
