import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { uploadPDF, createJob } from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [settings, setSettings] = useState({
    colour_mode: 'bw',
    sides: 'single',
    copies: 1,
    paper_size: 'A4',
    stapling: false,
    page_range_start: 1,
    page_range_end: null
  });

  const fullName = localStorage.getItem('full_name') || 'Student';

  const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.bmp', '.docx'];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file extension
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExts.includes(fileExt)) {
      return toast.error('Only PDF, JPG, PNG, WEBP, TIFF, BMP, DOCX files allowed');
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 20) {
      return toast.error(`File too large (${sizeMB.toFixed(1)}MB). Max 20MB allowed.`);
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadPDF(formData);
      setUploadedFile({
        ...res.data,
        original_filename: file.name
      });
      setSettings(prev => ({
        ...prev,
        page_range_end: res.data.total_pages
      }));

      const isImage = res.data.converted_to_pdf;
      toast.success(
        isImage
          ? `Image converted to PDF! ${res.data.total_pages} page(s) detected`
          : `File uploaded! ${res.data.total_pages} pages detected`
      );
    } catch (err) {
      toast.error('Upload failed. Try again.');
    }
    setUploading(false);
  };

  const handleCreateJob = async () => {
    if (!uploadedFile) return toast.error('Please upload a file first');

    try {
      const res = await createJob({
        file_id: uploadedFile.file_id,
        file_name: uploadedFile.original_filename,
        total_pages: uploadedFile.total_pages,
        ...settings
      });
      navigate('/job-preview', { state: { job: res.data, file: uploadedFile } });
    } catch (err) {
      toast.error('Failed to create job');
    }
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-logo">🖨️ <span>AutoPrint</span></div>
        <div className="dash-user">
          <span>👤 {fullName}</span>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="dash-content">
        <h1>New Print Job</h1>
        <p className="subtitle">Upload your file and configure print settings</p>

        {/* Upload Area */}
        <div
          className={`upload-area ${uploadedFile ? 'uploaded' : ''}`}
          onClick={() => !uploadedFile && fileRef.current.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.tif,.bmp,.docx"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          {uploading ? (
            <div className="upload-loading">
              <div className="spinner" />
              <p>Processing file...</p>
            </div>
          ) : uploadedFile ? (
            <div className="upload-success">
              <span className="upload-icon">✅</span>
              <div>
                <p className="file-name">{uploadedFile.original_filename}</p>
                <p className="file-info">
                  {uploadedFile.total_pages} pages •
                  {uploadedFile.has_colour_pages ? ' Has colour pages' : ' Black & White'}
                  {uploadedFile.converted_to_pdf && ' • Converted from image'}
                </p>
              </div>
              <button className="btn-change" onClick={(e) => {
                e.stopPropagation();
                setUploadedFile(null);
                fileRef.current.click();
              }}>Change</button>
            </div>
          ) : (
            <div className="upload-prompt">
              <span className="upload-icon">📄</span>
              <p>Click to upload PDF or Image</p>
              <span>PDF, JPG, PNG, WEBP, TIFF, BMP · Max 20MB</span>
            </div>
          )}
        </div>

        {/* Settings */}
        {uploadedFile && (
          <div className="settings-grid">
            {/* Colour Mode */}
            <div className="setting-card">
              <label>Print Mode</label>
              <div className="toggle-group">
                <button
                  className={settings.colour_mode === 'bw' ? 'active' : ''}
                  onClick={() => setSettings(p => ({ ...p, colour_mode: 'bw' }))}
                >⬛ B&W</button>
                <button
                  className={settings.colour_mode === 'colour' ? 'active' : ''}
                  onClick={() => setSettings(p => ({ ...p, colour_mode: 'colour' }))}
                >🌈 Colour</button>
              </div>
            </div>

            {/* Sides */}
            <div className="setting-card">
              <label>Sides</label>
              <div className="toggle-group">
                <button
                  className={settings.sides === 'single' ? 'active' : ''}
                  onClick={() => setSettings(p => ({ ...p, sides: 'single' }))}
                >Single</button>
                <button
                  className={settings.sides === 'double' ? 'active' : ''}
                  onClick={() => setSettings(p => ({ ...p, sides: 'double' }))}
                >Double</button>
              </div>
            </div>

            {/* Copies */}
            <div className="setting-card">
              <label>Copies</label>
              <div className="counter">
                <button onClick={() => setSettings(p => ({ ...p, copies: Math.max(1, p.copies - 1) }))}>−</button>
                <span>{settings.copies}</span>
                <button onClick={() => setSettings(p => ({ ...p, copies: Math.min(10, p.copies + 1) }))}>+</button>
              </div>
            </div>

            {/* Paper Size */}
            <div className="setting-card">
              <label>Paper Size</label>
              <div className="toggle-group">
                {['A4', 'A3', 'Letter'].map(size => (
                  <button
                    key={size}
                    className={settings.paper_size === size ? 'active' : ''}
                    onClick={() => setSettings(p => ({ ...p, paper_size: size }))}
                  >{size}</button>
                ))}
              </div>
            </div>

            {/* Page Range */}
            <div className="setting-card full-width">
              <label>Page Range</label>
              <div className="page-range">
                <input
                  type="number"
                  min={1}
                  max={uploadedFile.total_pages}
                  value={settings.page_range_start}
                  onChange={e => setSettings(p => ({ ...p, page_range_start: parseInt(e.target.value) || 1 }))}
                />
                <span>to</span>
                <input
                  type="number"
                  min={1}
                  max={uploadedFile.total_pages}
                  value={settings.page_range_end || uploadedFile.total_pages}
                  onChange={e => setSettings(p => ({ ...p, page_range_end: parseInt(e.target.value) || uploadedFile.total_pages }))}
                />
                <span className="page-total">of {uploadedFile.total_pages} pages</span>
              </div>
            </div>

            {/* Stapling */}
            <div className="setting-card">
              <label>Stapling</label>
              <div className="toggle-group">
                <button
                  className={!settings.stapling ? 'active' : ''}
                  onClick={() => setSettings(p => ({ ...p, stapling: false }))}
                >No</button>
                <button
                  className={settings.stapling ? 'active' : ''}
                  onClick={() => setSettings(p => ({ ...p, stapling: true }))}
                >Yes</button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Button */}
        {uploadedFile && (
          <button className="btn-proceed" onClick={handleCreateJob}>
            Calculate Cost & Preview →
          </button>
        )}
      </div>
    </div>
  );
}