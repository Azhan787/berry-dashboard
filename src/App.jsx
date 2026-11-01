import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './contexts/SettingsContext';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Dashboard from './pages/Dashboard';
import { AuthProvider } from './contexts/AuthContext';

const Analytics = lazy(() => import('./pages/Analytics'));
const Invoice = lazy(() => import('./pages/Invoice'));
const CRM = lazy(() => import('./pages/CRM'));
const Blog = lazy(() => import('./pages/Blog'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Data = lazy(() => import('./pages/Data'));
const Chart = lazy(() => import('./pages/Chart'));
const Users = lazy(() => import('./pages/Users'));
const Customers = lazy(() => import('./pages/Customers'));
const Projects = lazy(() => import('./pages/Projects'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Profile = lazy(() => import('./pages/Profile'));
const OrganizationSettings = lazy(() => import('./pages/OrganizationSettings'));
const Login = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.Login })));
const Register = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.Register })));
const Onboarding = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.Onboarding })));
const AuthCallback = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.AuthCallback })));
const AcceptInvite = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.AcceptInvite })));
const ForgotPassword = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.ResetPassword })));
const AuthRequired = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.AuthRequired })));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <SettingsProvider>
        <Suspense fallback={<div className="auth-loading">Loading page…</div>}><Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/" element={<AuthRequired><DashboardLayout /></AuthRequired>}>
            <Route index element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="invoice" element={<Invoice />} />
            <Route path="crm" element={<CRM />} />
            <Route path="blog" element={<Blog />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="data" element={<Data />} />
            <Route path="chart" element={<Chart />} />
            <Route path="users" element={<Users />} />
            <Route path="customers" element={<Customers />} />
            <Route path="projects" element={<Projects />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="profile" element={<Profile />} />
            <Route path="organization-settings" element={<OrganizationSettings />} />
          </Route>
        </Routes></Suspense>
      </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
