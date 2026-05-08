import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { confirmJob, cancelJob } from '../services/api';
import './JobPreview.css';

export default function JobPreview() {
  const navigate = useNavigate();
  const { state } = useLocation();

  if (!state?.job) {
    navigate('/dashboard');
    return null;
  }

  const { job, file } = state;
  const { cost_breakdown, queue_info } = job;

  const handleConfirm = async () => {
    try {
      await confirmJob(job.job_id);
      toast.success('Job confirmed!');
      navigate('/payment', { state: { job_id: job.job_id, job_code: job.job_code, total_amount: cost_breakdown.total_amount } });
    } catch (err) {
      toast.error('Failed to confirm job');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelJob(job.job_id);
      toast.info('Job cancelled');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Failed to cancel job');
    }
  };

  return (
    <div className="preview-page">
      <header className="dash-header">
        <div className="dash-logo">🖨️ <span>AutoPrint</span></div>
        <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back</button>
      </header>

      <div className="preview-content">
        <h1>Job Preview</h1>
        <p className="subtitle">Review your print job before payment</p>

        <div className="preview-grid">
          {/* File Info */}
          <div className="preview-card">
            <h3>📄 File Details</h3>
            <div className="detail-rows">
              <div className="detail-row">
                <span>File Name</span>
                <span>{file?.original_filename}</span>
              </div>
              <div className="detail-row">
                <span>Total Pages</span>
                <span>{file?.total_pages}</span>
              </div>
              <div className="detail-row">
                <span>Has Colour</span>
                <span>{file?.has_colour_pages ? '✅ Yes' : '❌ No'}</span>
              </div>
            </div>
          </div>

          {/* Print Settings */}
          <div className="preview-card">
            <h3>⚙️ Print Settings</h3>
            <div className="detail-rows">
              <div className="detail-row">
                <span>Print Mode</span>
                <span>{job.colour_mode === 'bw' ? '⬛ Black & White' : '🌈 Colour'}</span>
              </div>
              <div className="detail-row">
                <span>Sides</span>
                <span>{job.sides === 'single' ? 'Single Side' : 'Double Side'}</span>
              </div>
              <div className="detail-row">
                <span>Copies</span>
                <span>{job.copies}</span>
              </div>
              <div className="detail-row">
                <span>Paper Size</span>
                <span>{job.paper_size}</span>
              </div>
              <div className="detail-row">
                <span>Stapling</span>
                <span>{job.stapling ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="preview-card">
            <h3>💰 Cost Breakdown</h3>
            <div className="detail-rows">
              <div className="detail-row">
                <span>Cost per Page</span>
                <span>Rs. {cost_breakdown.cost_per_page}</span>
              </div>
              <div className="detail-row">
                <span>Base Cost</span>
                <span>Rs. {cost_breakdown.base_cost}</span>
              </div>
              {cost_breakdown.a3_surcharge > 0 && (
                <div className="detail-row">
                  <span>A3 Surcharge</span>
                  <span>Rs. {cost_breakdown.a3_surcharge}</span>
                </div>
              )}
              {cost_breakdown.stapling_cost > 0 && (
                <div className="detail-row">
                  <span>Stapling</span>
                  <span>Rs. {cost_breakdown.stapling_cost}</span>
                </div>
              )}
              <div className="detail-row total">
                <span>Total Amount</span>
                <span>Rs. {cost_breakdown.total_amount}</span>
              </div>
            </div>
          </div>

          {/* Queue Info */}
          <div className="preview-card">
            <h3>⏱️ Queue Status</h3>
            <div className="detail-rows">
              <div className="detail-row">
                <span>Jobs in Queue</span>
                <span>{queue_info.jobs_in_queue}</span>
              </div>
              <div className="detail-row">
                <span>Estimated Wait</span>
                <span>~{queue_info.estimated_wait_minutes} minutes</span>
              </div>
              <div className="detail-row">
                <span>Ready By</span>
                <span>{queue_info.estimated_ready_at}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="preview-actions">
          <button className="btn-cancel" onClick={handleCancel}>
            Cancel Job
          </button>
          <button className="btn-pay" onClick={handleConfirm}>
            Confirm & Pay Rs. {cost_breakdown.total_amount} →
          </button>
        </div>
      </div>
    </div>
  );
}