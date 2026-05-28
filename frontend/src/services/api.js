import axios from 'axios';

const API = axios.create({
  baseURL: 'https://autoprint-backend-qk6x.onrender.com',
});

// ── JWT Interceptor ───────────────────────────────────────────────────────────
// Har request mein automatically token add hota hai
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ──────────────────────────────────────────────────────
// 401 aaye toh automatically login page pe bhejo
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('full_name');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const register = (data) => API.post('/auth/register', data);
export const sendOTP = (phone) => API.post('/auth/send-otp', { phone_number: phone });
export const verifyOTP = (phone, otp) => API.post('/auth/verify-otp', { phone_number: phone, otp_code: otp });

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const uploadPDF = (formData) => API.post('/jobs/upload', formData);
export const createJob = (data) => API.post('/jobs/create', data);
export const confirmJob = (jobId) => API.post(`/jobs/${jobId}/confirm`);
export const cancelJob = (jobId) => API.delete(`/jobs/${jobId}`);

// ── Payments ──────────────────────────────────────────────────────────────────
export const createPaymentOrder = (jobId) => API.post(`/payments/create-order/${jobId}`);
export const verifyPayment = (data) => API.post('/payments/verify', data);
export const getPaymentStatus = (jobId) => API.get(`/payments/status/${jobId}`);