import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CardRaritiesProvider } from "@/contexts/CardRaritiesContext";
import { CardTypesProvider } from "@/contexts/CardTypesContext";

import StudentLogin from "@/pages/student/Login";
import StudentCollection from "@/pages/student/Collection";
import TeacherLogin from "@/pages/teacher/Login";
import TeacherDashboard from "@/pages/teacher/Dashboard";
import TeacherPacks from "@/pages/teacher/Packs";
import TeacherPackDetail from "@/pages/teacher/PackDetail";
import TeacherBoxDetail from "@/pages/teacher/BoxDetail";
import TeacherStudentDetail from "@/pages/teacher/StudentDetail";
import TeacherStudentsMatrix from "@/pages/teacher/StudentsMatrix";
import TeacherAwardPacks from "@/pages/teacher/AwardPacks";
import TeacherClasses from "@/pages/teacher/Classes";
import TeacherStudentCollection from "@/pages/teacher/TeacherStudentCollection";
import TeacherSettings from "@/pages/teacher/Settings";
import TeacherShop from "@/pages/teacher/Shop";
import TeacherAchievements from "@/pages/teacher/Achievements";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={StudentLogin} />
      <Route path="/collection/:id" component={StudentCollection} />

      <Route path="/teacher" component={TeacherLogin} />
      <Route path="/teacher/dashboard" component={TeacherDashboard} />
      <Route path="/teacher/packs" component={TeacherPacks} />
      <Route path="/teacher/packs/:id" component={TeacherPackDetail} />
      <Route path="/teacher/boxes/:id" component={TeacherBoxDetail} />
      <Route path="/teacher/student/:id/collection" component={TeacherStudentCollection} />
      <Route path="/teacher/student/:id" component={TeacherStudentDetail} />
      <Route path="/teacher/award" component={TeacherAwardPacks} />
      <Route path="/teacher/classes" component={TeacherClasses} />
      <Route path="/teacher/matrix" component={TeacherStudentsMatrix} />
      <Route path="/teacher/settings" component={TeacherSettings} />
      <Route path="/teacher/shop" component={TeacherShop} />
      <Route path="/teacher/achievements" component={TeacherAchievements} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CardRaritiesProvider>
        <CardTypesProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </CardTypesProvider>
      </CardRaritiesProvider>
    </QueryClientProvider>
  );
}

export default App;
