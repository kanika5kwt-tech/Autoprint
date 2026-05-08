import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000',
});

// Auth
export const register = (data) => API.post('/auth/register', data);
export const sendOTP = (phone) => API.post('/auth/send-otp', { phone_number: phone });
export const verifyOTP = (phone, otp) => API.post('/auth/verify-otp', { phone_number: phone, otp_code: otp });

// Jobs
export const uploadPDF = (formData) => API.post('/jobs/upload', formData);
export const createJob = (data) => API.post('/jobs/create', data);
export const confirmJob = (jobId) => API.post(`/jobs/${jobId}/confirm`);
export const cancelJob = (jobId) => API.delete(`/jobs/${jobId}`);

// Payments
export const createPaymentOrder = (jobId) => API.post(`/payments/create-order/${jobId}`);
export const verifyPayment = (data) => API.post('/payments/verify', data);
export const getPaymentStatus = (jobId) => API.get(`/payments/status/${jobId}`);