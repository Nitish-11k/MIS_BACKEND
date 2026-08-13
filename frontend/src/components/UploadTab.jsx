import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FolderSync, AlertTriangle, CheckCircle, Play, Square, FileText, Search, Database, FolderOpen } from 'lucide-react';

const UploadTab = () => {
  const [folderPath, setFolderPath] = useState('C:\\Users\\dell\\Desktop\\MIS_TOOL\\20250425\\20250425');
  const [scanState, setScanState] = useState('IDLE'); // IDLE, SCANNING, SCANNED
  const [scanResults, setScanResults] = useState(null);
  
  const [status, setStatus] = useState({
    is_running: false,
    total_files: 0,
    processed_files: 0,
    failed_files: 0,
    errors: [],
    progress_logs: [],
    current_file: ""
  });
  const [errorMsg, setErrorMsg] = useState("");
  
  const logsEndRef = useRef(null);

  const fetchStatus = () => {
    fetch('http://localhost:8000/api/upload-status')
      .then(res => res.json())
      .then(data => {
        setStatus(data);
      })
      .catch(err => console.error("Error fetching status:", err));
  };

  useEffect(() => {
    // Poll status every second while running
    let interval;
    if (status.is_running) {
      interval = setInterval(fetchStatus, 1000);
    } else {
      // Just fetch once
      fetchStatus();
    }
    return () => clearInterval(interval);
  }, [status.is_running]);

  useEffect(() => {
    // Auto-scroll logs
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [status.progress_logs]);

  const handleBrowse = () => {
    fetch('http://localhost:8000/api/browse-folder')
      .then(res => res.json())
      .then(data => {
        if (data.folder_path) {
          setFolderPath(data.folder_path);
        }
      })
      .catch(err => {
        console.error("Browse error:", err);
      });
  };

  const handleScan = () => {
    setErrorMsg("");
    setScanState('SCANNING');
    setScanResults(null);
    
    fetch('http://localhost:8000/api/scan-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_path: folderPath })
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || "Failed to scan folder.");
        setScanState('IDLE');
      } else {
        setScanResults(data);
        setScanState('SCANNED');
      }
    })
    .catch(err => {
      setErrorMsg("Network error contacting scan API.");
      setScanState('IDLE');
      console.error(err);
    });
  };

  const handleStart = () => {
    setErrorMsg("");
    fetch('http://localhost:8000/api/upload-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_path: folderPath })
    })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || "Failed to start upload.");
      } else {
        fetchStatus();
      }
    })
    .catch(err => {
      setErrorMsg("Network error contacting upload API.");
      console.error(err);
    });
  };

  const handleStop = () => {
    fetch('http://localhost:8000/api/upload-stop', { method: 'POST' })
      .then(() => fetchStatus());
  };

  const percent = status.total_files > 0 
    ? Math.round(((status.processed_files + status.failed_files) / status.total_files) * 100) 
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderSync size={28} color="#3B82F6" /> Advanced Upload Engine
          </h1>
          <p style={{ color: '#6B7280', marginTop: '8px' }}>
            Directly process gigabytes of raw date-wise branch folders. Paste the absolute server folder path below.
          </p>
        </div>
      </div>

      <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
              Absolute Folder Path (e.g., C:\Users\dell\Desktop\MIS_TOOL\20250425\20250425)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                disabled={status.is_running}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '15px' }}
              />
              <button
                onClick={handleBrowse}
                disabled={status.is_running}
                style={{ background: '#F1F5F9', color: '#334155', border: '1px solid #CBD5E1', padding: '0 16px', borderRadius: '6px', fontWeight: '500', cursor: status.is_running ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FolderOpen size={16} /> Browse
              </button>
            </div>
          </div>
          
          {!status.is_running && scanState !== 'SCANNED' ? (
            <button 
              onClick={handleScan}
              disabled={scanState === 'SCANNING'}
              style={{ background: '#3B82F6', color: '#fff', padding: '10px 24px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: scanState === 'SCANNING' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', opacity: scanState === 'SCANNING' ? 0.7 : 1 }}
            >
              <Search size={18} /> {scanState === 'SCANNING' ? 'Scanning...' : 'Scan Folder'}
            </button>
          ) : (
            <button 
              onClick={handleStop}
              style={{ background: '#EF4444', color: '#fff', padding: '10px 24px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}
            >
              <Square size={18} /> Stop
            </button>
          )}
        </div>
        {errorMsg && <p style={{ color: '#EF4444', fontSize: '14px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={16} /> {errorMsg}</p>}
      </div>

      {/* Scan Results Panel */}
      {scanState === 'SCANNED' && scanResults && !status.is_running && (
        <div className="card" style={{ background: '#F8FAFC', borderRadius: '12px', border: '1px solid #CBD5E1', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F172A', marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={20} color="#3B82F6" /> Scan Summary & Approval
          </h2>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 1, background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
              <div style={{ color: '#16A34A', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} /> Existing Tables ({scanResults.existing_tables?.length})
              </div>
              <div style={{ fontSize: '13px', color: '#475569', maxHeight: '100px', overflowY: 'auto' }}>
                {scanResults.existing_tables?.length > 0 ? scanResults.existing_tables.join(', ') : 'None'}
              </div>
            </div>
            
            <div style={{ flex: 1, background: '#fff', border: '1px solid #FDE047', borderRadius: '8px', padding: '16px' }}>
              <div style={{ color: '#CA8A04', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} /> New Tables to Build ({scanResults.new_tables?.length})
              </div>
              <div style={{ fontSize: '13px', color: '#475569', maxHeight: '100px', overflowY: 'auto' }}>
                {scanResults.new_tables?.length > 0 ? scanResults.new_tables.join(', ') : 'None'}
              </div>
            </div>
            
            <div style={{ flex: 1, background: '#fff', border: '1px solid #FECACA', borderRadius: '8px', padding: '16px' }}>
              <div style={{ color: '#DC2626', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} /> Unsupported Files ({scanResults.unsupported_files?.length})
              </div>
              <div style={{ fontSize: '13px', color: '#475569', maxHeight: '100px', overflowY: 'auto' }}>
                {scanResults.unsupported_files?.length > 0 ? scanResults.unsupported_files.join(', ') : 'None'}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button onClick={() => setScanState('IDLE')} style={{ background: '#E2E8F0', color: '#334155', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: '500', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleStart} style={{ background: '#10B981', color: '#fff', padding: '10px 24px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={18} /> Approve & Build
            </button>
          </div>
        </div>
      )}

      {/* Progress & Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ background: '#F0F9FF', padding: '20px', borderRadius: '12px', border: '1px solid #BAE6FD' }}>
          <div style={{ fontSize: '13px', color: '#0284C7', fontWeight: '600', textTransform: 'uppercase' }}>Total Files</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0369A1', marginTop: '4px' }}>{status.total_files}</div>
        </div>
        <div style={{ background: '#F0FDF4', padding: '20px', borderRadius: '12px', border: '1px solid #BBF7D0' }}>
          <div style={{ fontSize: '13px', color: '#16A34A', fontWeight: '600', textTransform: 'uppercase' }}>Processed OK</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#15803D', marginTop: '4px' }}>{status.processed_files}</div>
        </div>
        <div style={{ background: '#FEF2F2', padding: '20px', borderRadius: '12px', border: '1px solid #FECACA' }}>
          <div style={{ fontSize: '13px', color: '#DC2626', fontWeight: '600', textTransform: 'uppercase' }}>Failed / Skipped</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#B91C1C', marginTop: '4px' }}>{status.failed_files}</div>
        </div>
        <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '13px', color: '#475569', fontWeight: '600', textTransform: 'uppercase' }}>Status</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: status.is_running ? '#3B82F6' : '#64748B', marginTop: '8px' }}>
            {status.is_running ? 'Running...' : 'Idle'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
          <span>Overall Progress {status.current_file && `(Processing: ${status.current_file})`}</span>
          <span>{percent}%</span>
        </div>
        <div style={{ width: '100%', background: '#F1F5F9', borderRadius: '999px', height: '12px', overflow: 'hidden' }}>
          <div style={{ width: `${percent}%`, background: '#3B82F6', height: '100%', transition: 'width 0.3s ease' }}></div>
        </div>
      </div>

      {/* Live Terminal */}
      <div className="card" style={{ background: '#1E293B', borderRadius: '12px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '300px' }}>
        <div style={{ background: '#0F172A', padding: '12px 20px', borderBottom: '1px solid #334155', color: '#94A3B8', fontSize: '13px', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
          <span>LIVE CONSOLE</span>
          <span>{status.progress_logs.length} Lines</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', fontFamily: 'monospace', fontSize: '13px', color: '#E2E8F0' }}>
          {status.progress_logs.map((log, idx) => (
            <div key={idx} style={{ marginBottom: '6px', color: log.is_error ? '#FCA5A5' : '#E2E8F0', display: 'flex', gap: '12px' }}>
              <span style={{ color: '#64748B' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span>
                {log.is_error && <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />}
                {log.message}
              </span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default UploadTab;
