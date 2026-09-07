import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './contexts/SettingsContext';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Invoice from './pages/Invoice';
import CRM from './pages/CRM';
import Blog from './pages/Blog';
import Statistics from './pages/Statistics';
import Data from './pages/Data';
import Chart from './pages/Chart';
import Users from './pages/Users';
import Customers from './pages/Customers';

function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
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
          </Route>
        </Routes>
      </SettingsProvider>
    </BrowserRouter>
  );
}

export default App;
