import React, { useRef, useState } from 'react';
import { Calendar, MapPin, Upload, Loader2 } from 'lucide-react';

const FilterBar = ({
  branches,
  selectedBranch,
  setSelectedBranch,
  selectedPeriod,
  setSelectedPeriod,
  exactDate,
  setExactDate
}) => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        alert('Folder uploaded and parsed successfully!');
        window.location.reload();
      } else {
        alert('Error uploading folder.');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  return (
    <div className="dashboard-header sticky-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingTop: '20px', paddingBottom: '16px', borderBottom: '1px solid #E5E7EB', background: '#FFFFFF', position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="header-title-section">
        <h1 className="header-title" style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#111827' }}>Banking MIS Dashboard</h1>
        <p className="header-subtitle" style={{ margin: '0', color: '#6B7280', fontSize: '13px' }}>As of 12 Aug 2026, 14:35 IST</p>
      </div>
      
      <div className="header-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Exact Date Picker */}
        <div className="branch-selector-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F9FAFB', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <Calendar size={16} color="#6B7280" />
          <input 
            type="date"
            value={exactDate}
            onChange={(e) => {
              setExactDate(e.target.value);
              if (e.target.value) setSelectedPeriod('ALL');
            }}
            style={{ outline: 'none', border: 'none', background: 'transparent', fontWeight: '500', color: '#374151', fontSize: '14px', cursor: 'pointer' }}
          />
        </div>

        {/* Period Dropdown */}
        <div className="branch-selector-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F9FAFB', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', opacity: exactDate ? 0.5 : 1, pointerEvents: exactDate ? 'none' : 'auto' }}>
          <select 
            className="branch-selector" 
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              setExactDate('');
            }}
            style={{ outline: 'none', border: 'none', background: 'transparent', fontWeight: '500', color: '#374151', fontSize: '14px', cursor: 'pointer' }}
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="7D">7D</option>
            <option value="30D">30D</option>
            <option value="YTD">YTD</option>
          </select>
        </div>

        {/* Branch Dropdown */}
        <div className="branch-selector-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F9FAFB', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <select 
            className="branch-selector" 
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{ outline: 'none', border: 'none', background: 'transparent', fontWeight: '500', color: '#374151', fontSize: '14px', minWidth: '120px', cursor: 'pointer' }}
          >
            <option value="ALL">All Branches</option>
            {branches.map((b, i) => (
              <option key={i} value={b.code}>{b.code} - {b.name}</option>
            ))}
          </select>
        </div>
        
        {/* Upload Folder Button */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          webkitdirectory="true" 
          directory="true" 
          multiple 
          onChange={handleFileChange} 
        />
        <button 
          onClick={handleUploadClick}
          disabled={isUploading}
          style={{ 
            background: isUploading ? '#9CA3AF' : '#10B981', 
            color: '#fff', 
            border: 'none', 
            padding: '9px 20px', 
            borderRadius: '8px', 
            fontWeight: '500', 
            fontSize: '14px', 
            cursor: isUploading ? 'not-allowed' : 'pointer', 
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {isUploading ? 'Uploading...' : 'Upload Reports'}
        </button>

        {/* Apply Button */}
        <button 
          style={{ background: '#F97316', color: '#fff', border: 'none', padding: '9px 24px', borderRadius: '8px', fontWeight: '500', fontSize: '14px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default FilterBar;
