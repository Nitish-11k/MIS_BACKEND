import React, { useEffect, useRef, useState } from 'react';
import {
  UploadCloud,
  FolderSync,
  AlertTriangle,
  CheckCircle,
  Play,
  Square,
  FileText,
  Search,
  Database,
  FolderOpen,
  RefreshCw,
  Clock3,
  XCircle,
  Activity,
  FileCheck2,
  Table2,
  Zap,
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const UploadTab = () => {
  const [folderPath, setFolderPath] = useState(
    'C:\\Users\\dell\\Desktop\\MIS_TOOL\\20250425\\20250425'
  );

  const [scanState, setScanState] = useState('IDLE');
  // IDLE | SCANNING | SCANNED

  const [scanResults, setScanResults] = useState(null);

  const [status, setStatus] = useState({
    is_running: false,
    total_files: 0,
    processed_files: 0,
    failed_files: 0,
    errors: [],
    progress_logs: [],
    current_file: '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [singleFile, setSingleFile] = useState(null);
  const [isUploadingSingle, setIsUploadingSingle] = useState(false);

  const logsEndRef = useRef(null);

  // ============================================================
  // FETCH UPLOAD STATUS
  // ============================================================

  const fetchStatus = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/upload-status`
      );

      if (!response.ok) {
        throw new Error('Unable to fetch upload status');
      }

      const data = await response.json();

      setStatus(data);
    } catch (error) {
      console.error(
        'Error fetching upload status:',
        error
      );
    }
  };

  // ============================================================
  // INITIAL STATUS + POLLING
  // ============================================================

  useEffect(() => {
    fetchStatus();

    let interval;

    if (status.is_running) {
      interval = setInterval(() => {
        fetchStatus();
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [status.is_running]);

  // ============================================================
  // AUTO SCROLL LOGS
  // ============================================================

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [status.progress_logs]);

  // ============================================================
  // BROWSE FOLDER
  // ============================================================

  const handleBrowse = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(
        `${API_BASE}/api/browse-folder`
      );

      const data = await response.json();

      if (data.folder_path) {
        setFolderPath(data.folder_path);
      }
    } catch (error) {
      console.error('Browse error:', error);

      setErrorMsg(
        'Unable to open folder browser. Please enter the folder path manually.'
      );
    }
  };

  // ============================================================
  // SCAN FOLDER
  // ============================================================

  const handleScan = async () => {
    if (!folderPath.trim()) {
      setErrorMsg(
        'Please enter a valid folder path before scanning.'
      );
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setScanState('SCANNING');
    setScanResults(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/scan-folder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            folder_path: folderPath.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            'Failed to scan folder.'
        );
      }

      setScanResults(data);
      setScanState('SCANNED');

      setSuccessMsg(
        'Folder scanned successfully. Review the scan summary before processing.'
      );
    } catch (error) {
      console.error('Scan error:', error);

      setScanState('IDLE');

      setErrorMsg(
        error.message ||
          'Network error while scanning folder.'
      );
    }
  };

  // ============================================================
  // START UPLOAD / PROCESSING
  // ============================================================

  const handleStart = async () => {
    if (!folderPath.trim()) {
      setErrorMsg(
        'Please select a folder before starting processing.'
      );
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(
        `${API_BASE}/api/upload-folder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            folder_path: folderPath.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            'Failed to start upload.'
        );
      }

      setSuccessMsg(
        'Data processing started successfully.'
      );

      await fetchStatus();
    } catch (error) {
      console.error(
        'Upload start error:',
        error
      );

      setErrorMsg(
        error.message ||
          'Network error while starting upload.'
      );
    }
  };

  const handleSingleFileUpload = async () => {
    if (!singleFile) {
      setErrorMsg('Please select a file first.');
      return;
    }
    
    setErrorMsg('');
    setSuccessMsg('');
    setIsUploadingSingle(true);
    
    try {
      const formData = new FormData();
      formData.append('files', singleFile);
      
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload file.');
      }
      
      setSuccessMsg(`File ${singleFile.name} processed successfully!`);
      setSingleFile(null);
      const fileInput = document.getElementById('single-file-input');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Single upload error:', error);
      setErrorMsg(error.message || 'Error uploading file.');
    } finally {
      setIsUploadingSingle(false);
    }
  };

  // ============================================================
  // STOP UPLOAD
  // ============================================================

  const handleStop = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await fetch(
        `${API_BASE}/api/upload-stop`,
        {
          method: 'POST',
        }
      );

      setSuccessMsg(
        'Processing stop request sent.'
      );

      await fetchStatus();
    } catch (error) {
      console.error(
        'Stop upload error:',
        error
      );

      setErrorMsg(
        'Unable to stop the processing job.'
      );
    }
  };

  // ============================================================
  // RESET SCAN
  // ============================================================

  const handleResetScan = () => {
    if (status.is_running) {
      return;
    }

    setScanState('IDLE');
    setScanResults(null);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // ============================================================
  // CALCULATIONS
  // ============================================================

  const totalFiles =
    Number(status.total_files) || 0;

  const processedFiles =
    Number(status.processed_files) || 0;

  const failedFiles =
    Number(status.failed_files) || 0;

  const completedFiles =
    processedFiles + failedFiles;

  const percent =
    totalFiles > 0
      ? Math.min(
          100,
          Math.round(
            (completedFiles / totalFiles) *
              100
          )
        )
      : 0;

  const isRunning = Boolean(
    status.is_running
  );

  const isScanning =
    scanState === 'SCANNING';

  const isScanned =
    scanState === 'SCANNED';

  const existingTables =
    scanResults?.existing_tables || [];

  const newTables =
    scanResults?.new_tables || [];

  const unsupportedFiles =
    scanResults?.unsupported_files || [];

  const progressLogs =
    Array.isArray(status.progress_logs)
      ? status.progress_logs
      : [];

  // ============================================================
  // STATUS TEXT
  // ============================================================

  let statusText = 'Ready';
  let statusColor = '#64748B';
  let statusBackground = '#F8FAFC';
  let statusIcon = <Clock3 size={18} />;

  if (isScanning) {
    statusText = 'Scanning';
    statusColor = '#2563EB';
    statusBackground = '#EFF6FF';
    statusIcon = (
      <RefreshCw
        size={18}
        className="animate-spin"
      />
    );
  } else if (isRunning) {
    statusText = 'Processing';
    statusColor = '#2563EB';
    statusBackground = '#EFF6FF';
    statusIcon = (
      <Activity size={18} />
    );
  } else if (
    totalFiles > 0 &&
    percent === 100 &&
    failedFiles === 0
  ) {
    statusText = 'Completed';
    statusColor = '#15803D';
    statusBackground = '#F0FDF4';
    statusIcon = (
      <CheckCircle size={18} />
    );
  } else if (
    totalFiles > 0 &&
    percent === 100 &&
    failedFiles > 0
  ) {
    statusText = 'Completed with Errors';
    statusColor = '#B45309';
    statusBackground = '#FFFBEB';
    statusIcon = (
      <AlertTriangle size={18} />
    );
  }

  // ============================================================
  // SMALL REUSABLE COMPONENTS
  // ============================================================

  const MetricCard = ({
    label,
    value,
    icon,
    background,
    border,
    valueColor,
    labelColor,
  }) => (
    <div
      style={{
        background,
        border: `1px solid ${border}`,
        borderRadius: '12px',
        padding: '18px',
        minHeight: '105px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: '700',
            color: labelColor,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </span>

        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FFFFFF',
            border: `1px solid ${border}`,
            color: valueColor,
          }}
        >
          {icon}
        </div>
      </div>

      <div
        style={{
          fontSize: '27px',
          lineHeight: 1,
          fontWeight: '700',
          color: valueColor,
        }}
      >
        {value.toLocaleString('en-IN')}
      </div>
    </div>
  );

  const ResultCard = ({
    title,
    count,
    icon,
    color,
    background,
    border,
    items,
    emptyText,
  }) => (
    <div
      style={{
        background: '#FFFFFF',
        border: `1px solid ${border}`,
        borderRadius: '10px',
        padding: '16px',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color,
            fontSize: '13px',
            fontWeight: '700',
          }}
        >
          {icon}
          {title}
        </div>

        <div
          style={{
            minWidth: '28px',
            height: '28px',
            padding: '0 8px',
            borderRadius: '14px',
            background,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '700',
          }}
        >
          {count}
        </div>
      </div>

      <div
        style={{
          maxHeight: '115px',
          overflowY: 'auto',
          fontSize: '12px',
          color: '#475569',
          lineHeight: 1.7,
        }}
      >
        {items.length > 0 ? (
          items.map((item, index) => (
            <div
              key={`${item}-${index}`}
              style={{
                padding: '4px 0',
                borderBottom:
                  index === items.length - 1
                    ? 'none'
                    : '1px solid #F1F5F9',
                wordBreak: 'break-word',
              }}
            >
              {item}
            </div>
          ))
        ) : (
          <div
            style={{
              color: '#94A3B8',
              padding: '10px 0',
            }}
          >
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '24px 32px',
        background: '#F8FAFC',
      }}
    >
      <div
        style={{
          maxWidth: '1600px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* ======================================================
            PAGE HEADER
        ====================================================== */}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '20px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UploadCloud size={22} />
              </div>

              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: '22px',
                    lineHeight: 1.2,
                    fontWeight: '700',
                    color: '#0F172A',
                  }}
                >
                  Upload Data
                </h1>

                <p
                  style={{
                    margin:
                      '5px 0 0 0',
                    fontSize: '13px',
                    color: '#64748B',
                  }}
                >
                  Import and process branch-wise
                  MIS reports into the database.
                </p>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 13px',
              borderRadius: '20px',
              background: statusBackground,
              color: statusColor,
              border: `1px solid ${
                statusColor
              }22`,
              fontSize: '12px',
              fontWeight: '700',
            }}
          >
            {statusIcon}
            {statusText}
          </div>
        </div>

        {/* ======================================================
            SOURCE / FOLDER CARD
        ====================================================== */}

        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '22px',
            boxShadow:
              '0 1px 3px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              marginBottom: '18px',
            }}
          >
            <FolderSync
              size={18}
              color="#2563EB"
            />

            <div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: '#0F172A',
                }}
              >
                Select Data Source
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: '#64748B',
                  marginTop: '3px',
                }}
              >
                Select the folder containing
                date-wise branch report files.
              </div>
            </div>
          </div>

          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              color: '#334155',
              marginBottom: '7px',
            }}
          >
            Source Folder
          </label>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                flex: 1,
                position: 'relative',
              }}
            >
              <FolderOpen
                size={17}
                color="#94A3B8"
                style={{
                  position: 'absolute',
                  left: '13px',
                  top: '12px',
                }}
              />

              <input
                type="text"
                value={folderPath}
                onChange={(e) =>
                  setFolderPath(
                    e.target.value
                  )
                }
                disabled={
                  isRunning ||
                  isScanning
                }
                placeholder="Enter absolute folder path..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding:
                    '11px 14px 11px 40px',
                  border:
                    '1px solid #CBD5E1',
                  borderRadius: '8px',
                  outline: 'none',
                  fontSize: '13px',
                  color: '#0F172A',
                  background:
                    isRunning ||
                    isScanning
                      ? '#F8FAFC'
                      : '#FFFFFF',
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleBrowse}
              disabled={
                isRunning ||
                isScanning
              }
              style={{
                height: '42px',
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                borderRadius: '8px',
                border:
                  '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                fontSize: '13px',
                fontWeight: '600',
                cursor:
                  isRunning ||
                  isScanning
                    ? 'not-allowed'
                    : 'pointer',
                opacity:
                  isRunning ||
                  isScanning
                    ? 0.6
                    : 1,
              }}
            >
              <FolderOpen size={16} />
              Browse
            </button>

            {!isRunning ? (
              <button
                type="button"
                onClick={handleScan}
                disabled={isScanning}
                style={{
                  height: '42px',
                  padding: '0 19px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: isScanning
                    ? 'not-allowed'
                    : 'pointer',
                  opacity: isScanning
                    ? 0.7
                    : 1,
                  boxShadow:
                    '0 2px 5px rgba(37, 99, 235, 0.20)',
                }}
              >
                {isScanning ? (
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Search size={16} />
                )}

                {isScanning
                  ? 'Scanning...'
                  : 'Scan Folder'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStop}
                style={{
                  height: '42px',
                  padding: '0 19px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow:
                    '0 2px 5px rgba(239, 68, 68, 0.20)',
                }}
              >
                <XCircle size={16} />
                Stop
              </button>
            )}
          </div>
          
          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '20px 0' }} />
          
          {/* Single File Upload Temporary Option */}
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              color: '#334155',
              marginBottom: '7px',
            }}
          >
            Single File Upload (Temporary)
          </label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <input
                id="single-file-input"
                type="file"
                accept=".txt,.gz"
                disabled={isRunning || isUploadingSingle}
                onChange={(e) => setSingleFile(e.target.files[0])}
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  background: isRunning || isUploadingSingle ? '#F8FAFC' : '#FFFFFF',
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleSingleFileUpload}
              disabled={isRunning || isUploadingSingle || !singleFile}
              style={{
                height: '42px',
                padding: '0 19px',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                borderRadius: '8px',
                border: 'none',
                background: '#10B981',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: '700',
                cursor: (isRunning || isUploadingSingle || !singleFile) ? 'not-allowed' : 'pointer',
                opacity: (isRunning || isUploadingSingle || !singleFile) ? 0.7 : 1,
                boxShadow: '0 2px 5px rgba(16, 185, 129, 0.20)',
              }}
            >
              {isUploadingSingle ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <UploadCloud size={16} />
              )}
              {isUploadingSingle ? 'Uploading...' : 'Upload File'}
            </button>
          </div>

          {/* Helper text */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '9px',
              fontSize: '11px',
              color: '#94A3B8',
            }}
          >
            <FileText size={13} />

            Example:
            C:\MIS_TOOL\20250425\20250425
          </div>

          {/* Error */}
          {errorMsg && (
            <div
              style={{
                marginTop: '14px',
                padding: '11px 13px',
                borderRadius: '8px',
                background: '#FEF2F2',
                border:
                  '1px solid #FECACA',
                color: '#B91C1C',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '12px',
                lineHeight: 1.5,
              }}
            >
              <AlertTriangle
                size={16}
                style={{
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              />

              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success */}
          {successMsg && (
            <div
              style={{
                marginTop: '14px',
                padding: '11px 13px',
                borderRadius: '8px',
                background: '#F0FDF4',
                border:
                  '1px solid #BBF7D0',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
              }}
            >
              <CheckCircle size={16} />

              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* ======================================================
            METRICS
        ====================================================== */}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(4, minmax(0, 1fr))',
            gap: '14px',
          }}
        >
          <MetricCard
            label="Total Files"
            value={totalFiles}
            icon={
              <FileText size={17} />
            }
            background="#EFF6FF"
            border="#BFDBFE"
            valueColor="#1D4ED8"
            labelColor="#2563EB"
          />

          <MetricCard
            label="Processed OK"
            value={processedFiles}
            icon={
              <FileCheck2 size={17} />
            }
            background="#F0FDF4"
            border="#BBF7D0"
            valueColor="#15803D"
            labelColor="#16A34A"
          />

          <MetricCard
            label="Failed / Skipped"
            value={failedFiles}
            icon={
              <XCircle size={17} />
            }
            background="#FEF2F2"
            border="#FECACA"
            valueColor="#B91C1C"
            labelColor="#DC2626"
          />

          <MetricCard
            label="Completion"
            value={percent}
            icon={
              <Activity size={17} />
            }
            background="#F8FAFC"
            border="#E2E8F0"
            valueColor="#334155"
            labelColor="#64748B"
          />
        </div>

        {/* ======================================================
            SCAN SUMMARY
        ====================================================== */}

        {isScanned &&
          scanResults &&
          !isRunning && (
            <div
              style={{
                background: '#FFFFFF',
                border:
                  '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '22px',
                boxShadow:
                  '0 1px 3px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  gap: '15px',
                  marginBottom: '18px',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: '#0F172A',
                    }}
                  >
                    <Database
                      size={18}
                      color="#2563EB"
                    />
                    Scan Summary
                  </div>

                  <div
                    style={{
                      marginTop: '4px',
                      fontSize: '12px',
                      color: '#64748B',
                    }}
                  >
                    Review detected data before
                    starting the import process.
                  </div>
                </div>

                <div
                  style={{
                    padding:
                      '6px 10px',
                    borderRadius: '16px',
                    background:
                      '#F0FDF4',
                    color: '#15803D',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <CheckCircle size={13} />
                  Scan Complete
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(3, minmax(0, 1fr))',
                  gap: '14px',
                }}
              >
                <ResultCard
                  title="Existing Tables"
                  count={
                    existingTables.length
                  }
                  icon={
                    <Table2 size={16} />
                  }
                  color="#15803D"
                  background="#F0FDF4"
                  border="#BBF7D0"
                  items={
                    existingTables
                  }
                  emptyText="No existing tables found."
                />

                <ResultCard
                  title="New Tables"
                  count={
                    newTables.length
                  }
                  icon={
                    <Zap size={16} />
                  }
                  color="#B45309"
                  background="#FFFBEB"
                  border="#FDE68A"
                  items={newTables}
                  emptyText="No new tables required."
                />

                <ResultCard
                  title="Unsupported Files"
                  count={
                    unsupportedFiles.length
                  }
                  icon={
                    <AlertTriangle
                      size={16}
                    />
                  }
                  color="#B91C1C"
                  background="#FEF2F2"
                  border="#FECACA"
                  items={
                    unsupportedFiles
                  }
                  emptyText="No unsupported files."
                />
              </div>

              {/* Approval Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'flex-end',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '18px',
                  paddingTop: '18px',
                  borderTop:
                    '1px solid #E2E8F0',
                }}
              >
                <button
                  type="button"
                  onClick={
                    handleResetScan
                  }
                  style={{
                    height: '38px',
                    padding:
                      '0 15px',
                    borderRadius: '7px',
                    border:
                      '1px solid #CBD5E1',
                    background:
                      '#FFFFFF',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleStart
                  }
                  style={{
                    height: '38px',
                    padding:
                      '0 17px',
                    borderRadius: '7px',
                    border: 'none',
                    background:
                      '#10B981',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                  }}
                >
                  <Play size={15} />
                  Approve & Start Processing
                </button>
              </div>
            </div>
          )}

        {/* ======================================================
            PROCESSING PROGRESS
        ====================================================== */}

        <div
          style={{
            background: '#FFFFFF',
            border:
              '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '22px',
            boxShadow:
              '0 1px 3px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'flex-start',
              gap: '20px',
              marginBottom: '13px',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '15px',
                  fontWeight: '700',
                  color: '#0F172A',
                }}
              >
                <Activity
                  size={18}
                  color="#2563EB"
                />
                Processing Progress
              </div>

              <div
                style={{
                  marginTop: '4px',
                  fontSize: '12px',
                  color: '#64748B',
                }}
              >
                {status.current_file
                  ? `Processing: ${status.current_file}`
                  : 'No file is currently being processed.'}
              </div>
            </div>

            <div
              style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#0F172A',
              }}
            >
              {percent}%
            </div>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '10px',
              background: '#E2E8F0',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${percent}%`,
                height: '100%',
                background:
                  percent === 100
                    ? '#10B981'
                    : '#2563EB',
                borderRadius: '999px',
                transition:
                  'width 0.35s ease',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              marginTop: '9px',
              fontSize: '11px',
              color: '#64748B',
            }}
          >
            <span>
              {completedFiles.toLocaleString(
                'en-IN'
              )}{' '}
              of{' '}
              {totalFiles.toLocaleString(
                'en-IN'
              )}{' '}
              files completed
            </span>

            <span>
              {failedFiles > 0
                ? `${failedFiles} failed/skipped`
                : 'No failures'}
            </span>
          </div>
        </div>

        {/* ======================================================
            LIVE ACTIVITY
        ====================================================== */}

        <div
          style={{
            background: '#FFFFFF',
            border:
              '1px solid #E2E8F0',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow:
              '0 1px 3px rgba(15, 23, 42, 0.04)',
            minHeight: '310px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Console Header */}
          <div
            style={{
              padding:
                '15px 20px',
              borderBottom:
                '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'space-between',
              background: '#F8FAFC',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
              }}
            >
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '7px',
                  background:
                    '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    'center',
                }}
              >
                <FileText
                  size={16}
                />
              </div>

              <div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#0F172A',
                  }}
                >
                  Processing Activity
                </div>

                <div
                  style={{
                    fontSize: '11px',
                    color: '#64748B',
                    marginTop: '2px',
                  }}
                >
                  Live upload and processing
                  events
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                color: '#64748B',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background:
                    isRunning
                      ? '#22C55E'
                      : '#94A3B8',
                }}
              />

              {progressLogs.length}{' '}
              events
            </div>
          </div>

          {/* Logs */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px 20px',
              background: '#FFFFFF',
              minHeight: '245px',
              maxHeight: '360px',
            }}
          >
            {progressLogs.length ===
            0 ? (
              <div
                style={{
                  height: '220px',
                  display: 'flex',
                  flexDirection:
                    'column',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  color: '#94A3B8',
                  gap: '8px',
                }}
              >
                <Activity
                  size={28}
                />

                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                  }}
                >
                  No processing activity
                  yet
                </div>

                <div
                  style={{
                    fontSize: '11px',
                  }}
                >
                  Logs will appear here
                  when processing starts.
                </div>
              </div>
            ) : (
              progressLogs.map(
                (log, index) => {
                  const isError =
                    Boolean(
                      log?.is_error
                    );

                  return (
                    <div
                      key={`${log?.timestamp || index}-${index}`}
                      style={{
                        display: 'flex',
                        alignItems:
                          'flex-start',
                        gap: '10px',
                        padding:
                          '8px 0',
                        borderBottom:
                          index ===
                          progressLogs.length -
                            1
                            ? 'none'
                            : '1px solid #F1F5F9',
                      }}
                    >
                      <div
                        style={{
                          marginTop:
                            '2px',
                          flexShrink: 0,
                          color: isError
                            ? '#DC2626'
                            : '#16A34A',
                        }}
                      >
                        {isError ? (
                          <AlertTriangle
                            size={14}
                          />
                        ) : (
                          <CheckCircle
                            size={14}
                          />
                        )}
                      </div>

                      <div
                        style={{
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            fontSize:
                              '12px',
                            lineHeight:
                              1.5,
                            color:
                              isError
                                ? '#B91C1C'
                                : '#334155',
                            wordBreak:
                              'break-word',
                          }}
                        >
                          {log?.message ||
                            'Processing event'}
                        </div>

                        {log?.timestamp && (
                          <div
                            style={{
                              fontSize:
                                '10px',
                              color:
                                '#94A3B8',
                              marginTop:
                                '3px',
                            }}
                          >
                            {new Date(
                              log.timestamp
                            ).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )
            )}

            <div
              ref={logsEndRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadTab;