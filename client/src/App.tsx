import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Login from "@/pages/login";
import PatientDashboard from "@/pages/patient";
import AmbulanceDashboard from "@/pages/ambulance";
import AmbulanceNavigation from "@/pages/ambulance-navigation";
import HospitalDashboard from "@/pages/hospital";
import NotFound from "@/pages/not-found";
import { WebSocketProvider } from "@/hooks/use-websocket";
import { RoleHeader } from "@/components/role-header";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <WebSocketProvider>
      <div className="min-h-screen bg-neutral-50">
        <RoleHeader user={user} />
        <Switch>
          <Route path="/ambulance/navigate/:requestId" component={AmbulanceNavigation} />
          <Route path="/" component={() => {
            switch (user.role) {
              case 'patient':
                return <PatientDashboard />;
              case 'ambulance':
                return <AmbulanceDashboard />;
              case 'hospital':
                return <HospitalDashboard />;
              default:
                return <NotFound />;
            }
          }} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </WebSocketProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
