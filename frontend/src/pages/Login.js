import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { register, sendOTP, verifyOTP } from '../services/api';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState('phone'); // phone | otp | register
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (phone.length !== 10) return toast.error('Enter valid 10-digit phone number');
    setLoading(true);
    try {
      await sendOTP(phone);
      toast.success('OTP sent! Check terminal for test OTP');
      setStep('otp');
    } catch (err) {
      if (err.response?.status === 404) {
        setStep('register');
      } else {
        toast.error('Something went wrong');
      }
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!name || !collegeId) return toast.error('Fill all fields');
    setLoading(true);
    try {
      await register({ full_name: name, phone_number: phone, college_id: collegeId });
      await sendOTP(phone);
      toast.success('Registered! OTP sent');
      setStep('otp');
    } catch (err) {
      toast.error('Registration failed');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return toast.error('Enter 6-digit OTP');
    setLoading(true);
    try {
      const res = await verifyOTP(phone, otp);
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user_id', res.data.user_id);
      localStorage.setItem('full_name', res.data.full_name);
      toast.success(`Welcome, ${res.data.full_name}!`);
      navigate('/dashboard');

    
    } catch (err) {
      toast.error('Invalid OTP');
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">🖨️</span>
          <h1>AutoPrint</h1>
          <p>Smart Campus Printing</p>
        </div>

        {step === 'phone' && (
          <div className="login-form">
            <h2>Welcome Back</h2>
            <p className="subtitle">Enter your phone number to continue</p>
            <div className="input-group">
              <span className="input-prefix">+91</span>
              <input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
            </div>
            <button className="btn-primary" onClick={handleSendOTP} disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        )}

        {step === 'register' && (
          <div className="login-form">
            <h2>Create Account</h2>
            <p className="subtitle">First time here? Register below</p>
            <input className="input-field" type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
            <input className="input-field" type="text" placeholder="College ID" value={collegeId} onChange={e => setCollegeId(e.target.value)} />
            <button className="btn-primary" onClick={handleRegister} disabled={loading}>
              {loading ? 'Registering...' : 'Register & Send OTP'}
            </button>
            <button className="btn-ghost" onClick={() => setStep('phone')}>Back</button>
          </div>
        )}

        {step === 'otp' && (
          <div className="login-form">
            <h2>Enter OTP</h2>
            <p className="subtitle">Sent to +91 {phone}</p>
            <input
              className="input-field otp-input"
              type="tel"
              placeholder="6-digit OTP"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />
            <button className="btn-primary" onClick={handleVerifyOTP} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button className="btn-ghost" onClick={() => setStep('phone')}>Change Number</button>
          </div>
        )}
      </div>
    </div>
  );
}