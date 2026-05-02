import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { AcademicYearProvider } from "@/lib/academic-year";
import { SchoolProfileProvider } from "@/lib/school-profile";
import RequireAuth from "@/components/RequireAuth";
import RequireAcademicYear from "@/components/RequireAcademicYear";
import AppLayout from "@/components/AppLayout";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import {
  AcademicYears, Classes, Subjects, Teachers, Parents,
  Attendance, Exams, ExamResults, ReportCards, Staff,
  BookLoans, TransportRoutes, Events,
  Discipline, Health, StaffPoints, StudentParents,
} from "./pages/Crud";
import IdCards from "./pages/IdCards";
import StudentList from "./pages/StudentList";
import StudentsPage from "./pages/StudentsPage";
import DiscountsPage from "./pages/DiscountsPage";
import PaymentsPage from "./pages/PaymentsPage";
import SalaryPaymentsPage from "./pages/SalaryPaymentsPage";
import LibraryPage from "./pages/LibraryPage";
import UniformsPage from "./pages/UniformsPage";
import TransportListPage from "./pages/TransportListPage";
import AccountingPage from "./pages/AccountingPage";
import ExpensesPage from "./pages/ExpensesPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import BookLoansPage from "./pages/BookLoansPage";
import RevenuePage from "./pages/RevenuePage";
import UsersPage from "./pages/UsersPage";

const queryClient = new QueryClient();

const Protected = ({ children }: { children: React.ReactNode }) => (
  <RequireAuth><AppLayout>{children}</AppLayout></RequireAuth>
);

const ProtectedWithYear = ({ children }: { children: React.ReactNode }) => (
  <RequireAuth>
    <AppLayout>
      <RequireAcademicYear>{children}</RequireAcademicYear>
    </AppLayout>
  </RequireAuth>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" richColors />
      <BrowserRouter>
        <AuthProvider>
          <AcademicYearProvider>
            <SchoolProfileProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Protected><Dashboard /></Protected>} />
              <Route path="/academic-years" element={<Protected><AcademicYears /></Protected>} />
              <Route path="/settings" element={<Protected><Settings /></Protected>} />

              <Route path="/classes" element={<ProtectedWithYear><Classes /></ProtectedWithYear>} />
              <Route path="/subjects" element={<ProtectedWithYear><Subjects /></ProtectedWithYear>} />
              <Route path="/teachers" element={<ProtectedWithYear><Teachers /></ProtectedWithYear>} />
              <Route path="/students" element={<ProtectedWithYear><StudentsPage /></ProtectedWithYear>} />
              <Route path="/parents" element={<ProtectedWithYear><Parents /></ProtectedWithYear>} />
              <Route path="/attendance" element={<ProtectedWithYear><Attendance /></ProtectedWithYear>} />
              <Route path="/exams" element={<ProtectedWithYear><Exams /></ProtectedWithYear>} />
              <Route path="/exam-results" element={<ProtectedWithYear><ExamResults /></ProtectedWithYear>} />
              <Route path="/report-cards" element={<ProtectedWithYear><ReportCards /></ProtectedWithYear>} />
              <Route path="/discounts" element={<ProtectedWithYear><DiscountsPage /></ProtectedWithYear>} />
              <Route path="/payments" element={<ProtectedWithYear><PaymentsPage /></ProtectedWithYear>} />
              <Route path="/salary-payments" element={<ProtectedWithYear><SalaryPaymentsPage /></ProtectedWithYear>} />
              <Route path="/uniforms" element={<ProtectedWithYear><UniformsPage /></ProtectedWithYear>} />
              <Route path="/staff-points" element={<ProtectedWithYear><StaffPoints /></ProtectedWithYear>} />
              <Route path="/student-parents" element={<ProtectedWithYear><StudentParents /></ProtectedWithYear>} />
              <Route path="/id-cards" element={<ProtectedWithYear><IdCards /></ProtectedWithYear>} />
              <Route path="/student-list" element={<ProtectedWithYear><StudentList /></ProtectedWithYear>} />
              <Route path="/staff" element={<ProtectedWithYear><Staff /></ProtectedWithYear>} />
              <Route path="/library-books" element={<ProtectedWithYear><LibraryPage /></ProtectedWithYear>} />
              <Route path="/book-loans" element={<ProtectedWithYear><BookLoans /></ProtectedWithYear>} />
              <Route path="/book-loans-history" element={<ProtectedWithYear><BookLoansPage /></ProtectedWithYear>} />
              <Route path="/transport-routes" element={<ProtectedWithYear><TransportRoutes /></ProtectedWithYear>} />
              <Route path="/transport-list" element={<ProtectedWithYear><TransportListPage /></ProtectedWithYear>} />
              <Route path="/accounting" element={<ProtectedWithYear><AccountingPage /></ProtectedWithYear>} />
              <Route path="/expenses" element={<ProtectedWithYear><ExpensesPage /></ProtectedWithYear>} />
              <Route path="/revenue" element={<ProtectedWithYear><RevenuePage /></ProtectedWithYear>} />
              <Route path="/users" element={<Protected><UsersPage /></Protected>} />
              <Route path="/events" element={<ProtectedWithYear><Events /></ProtectedWithYear>} />
              <Route path="/announcements" element={<ProtectedWithYear><AnnouncementsPage /></ProtectedWithYear>} />
              <Route path="/discipline" element={<ProtectedWithYear><Discipline /></ProtectedWithYear>} />
              <Route path="/health" element={<ProtectedWithYear><Health /></ProtectedWithYear>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </SchoolProfileProvider>
          </AcademicYearProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
