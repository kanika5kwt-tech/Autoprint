import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createPaymentOrder, verifyPayment } from '../services/api';
import './PaymentPage.css';

export default function PaymentPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);

  const job_id = state?.job_id;
  const job_code = state?.job_code;
  const total_amount = state?.total_amount;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!job_id) {
      navigate('/dashboard');
      return;
    }
    loadOrder();
  }, [job_id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const res = await createPaymentOrder(job_id);
      setOrder(res.data.payment_order);
    } catch (err) {
      toast.error('Failed to create payment order');
    }
    setLoading(false);
  };

  // DEMO MODE - always mock, no real payment
  const handleRazorpay = () => {
    if (!order) return;

    const mockOrderId = order.order_id.includes('mock')
      ? order.order_id
      : `order_mock_${Date.now()}`;

    verifyPayment({
      job_id: job_id,
      order_id: mockOrderId,
      payment_id: 'pay_mock_demo123',
      signature: 'mock_signature'
    }).then(res => {
      toast.success('Payment successful!');
      navigate('/status', { state: { ...res.data } });
    }).catch(err => {
      console.error(err);
      toast.error('Payment verification failed');
    });
  };

  if (!job_id) return null;

  return (
    <div className="payment-page">
      <header className="dash-header">
        <div className="dash-logo">🖨️ <span>AutoPrint</span></div>
        <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back</button>
      </header>

      <div className="payment-content">
        <h1>Complete Payment</h1>
        <p className="subtitle">Secure payment powered by Razorpay</p>

        <div className="payment-card">
          <div className="payment-amount">
            <span className="amount-label">Total Amount</span>
            <span className="amount-value">Rs. {total_amount}</span>
          </div>

          <div className="payment-detail">
            <span>Job Code</span>
            <span className="job-code">{job_code}</span>
          </div>

          <div className="payment-detail">
            <span>Payment Method</span>
            <span>UPI / Card / NetBanking</span>
          </div>

          <div className="payment-secure">
            🔒 100% Secure Payment via Razorpay
          </div>

          {loading ? (
            <div className="payment-loading">
              <div className="spinner" />
              <p>Preparing payment...</p>
            </div>
          ) : (
            <button className="btn-pay-now" onClick={handleRazorpay}>
              Pay Rs. {total_amount} Now →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}