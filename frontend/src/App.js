import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import JobPreview from './pages/JobPreview';
import PaymentPage from './pages/PaymentPage';
import StatusPage from './pages/StatusPage';

function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/job-preview" element={<JobPreview />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/status" element={<StatusPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
