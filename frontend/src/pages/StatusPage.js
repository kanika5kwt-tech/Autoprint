import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './StatusPage.css';

export default function StatusPage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  if (!state?.job_code) {
    navigate('/dashboard');
    return null;
  }

  const {
    job_code,
    status,
    queue_position,
    estimated_wait,
    qr_code,
    message
  } = state;

  return (
    <div className="status-page">
      <header className="dash-header">
        <div className="dash-logo">🖨️ <span>AutoPrint</span></div>
        <button className="btn-new" onClick={() => navigate('/dashboard')}>
          + New Print Job
        </button>
      </header>

      <div className="status-content">
        <div className="status-success">
          <span className="success-icon">✅</span>
          <h1>Payment Successful!</h1>
          <p className="subtitle">{message}</p>
        </div>

        <div className="status-grid">
          {/* Job Info */}
          <div className="status-card">
            <h3>🖨️ Print Job Status</h3>
            <div className="detail-rows">
              <div className="detail-row">
                <span>Job Code</span>
                <span className="job-code">{job_code}</span>
              </div>
              <div className="detail-row">
                <span>Status</span>
                <span className={`status-badge ${status?.toLowerCase()}`}>
                  {status}
                </span>
              </div>
              <div className="detail-row">
                <span>Queue Position</span>
                <span className="queue-pos">#{queue_position}</span>
              </div>
              <div className="detail-row">
                <span>Estimated Wait</span>
                <span>~{estimated_wait} minutes</span>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="status-card qr-card">
            <h3>📱 Collection QR Code</h3>
            <p className="qr-hint">Show this QR code at the printer counter</p>
            {qr_code && (
              <img src={qr_code} alt="Collection QR Code" className="qr-image" />
            )}
            <p className="qr-code-text">{job_code}</p>
          </div>
        </div>

        {/* Steps */}
        <div className="steps-card">
          <h3>📋 Next Steps</h3>
          <div className="steps">
            <div className="step done">
              <span className="step-icon">✅</span>
              <div>
                <p className="step-title">Payment Done</p>
                <p className="step-desc">Your payment was successful</p>
              </div>
            </div>
            <div className="step-line" />
            <div className={`step ${status === 'PRINTING' || status === 'READY' ? 'done' : 'pending'}`}>
              <span className="step-icon">{status === 'PRINTING' || status === 'READY' ? '✅' : '⏳'}</span>
              <div>
                <p className="step-title">Printing in Progress</p>
                <p className="step-desc">Your document is being printed</p>
              </div>
            </div>
            <div className="step-line" />
            <div className={`step ${status === 'READY' ? 'done' : 'pending'}`}>
              <span className="step-icon">{status === 'READY' ? '✅' : '⏳'}</span>
              <div>
                <p className="step-title">Ready for Collection</p>
                <p className="step-desc">Show QR code at counter to collect</p>
              </div>
            </div>
          </div>
        </div>

        <button className="btn-new-job" onClick={() => navigate('/dashboard')}>
          + Print Another Document
        </button>
      </div>
    </div>
  );
}