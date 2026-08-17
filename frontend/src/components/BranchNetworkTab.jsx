import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Building2, Store, Search, ShieldCheck, MapPin } from 'lucide-react';

const BranchNetworkTab = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRegions, setExpandedRegions] = useState({});
  const [headOfficeExpanded, setHeadOfficeExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('http://localhost:8000/api/branch-network')
      .then(res => res.json())
      .then(fetchedData => {
        setData(fetchedData);
        const initialExpandedState = { 'Rail Head Complex': true };
        setExpandedRegions(initialExpandedState);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching branch network", err);
        setLoading(false);
      });
  }, []);

  const toggleRegion = (region) => {
    setExpandedRegions(prev => ({
      ...prev,
      [region]: !prev[region]
    }));
  };

  const filteredData = data.filter(branch => 
    branch.BRANCH_NAME.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.REGIONAL_OFFICE.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by Regional Office
  const groupedData = filteredData.reduce((acc, branch) => {
    if (!acc[branch.REGIONAL_OFFICE]) acc[branch.REGIONAL_OFFICE] = [];
    acc[branch.REGIONAL_OFFICE].push(branch);
    return acc;
  }, {});

  const headOfficeBranches = groupedData['Head Office'] || [];

  // Sort regions: Head Office first, then Rail Head Complex, then alphabetical
  const sortedRegions = Object.keys(groupedData).sort((a, b) => {
    if (a === 'Head Office') return -1;
    if (b === 'Head Office') return 1;
    if (a === 'Rail Head Complex') return -1;
    if (b === 'Rail Head Complex') return 1;
    return a.localeCompare(b);
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: '#6B7280', fontSize: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
          Loading Corporate Network...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            Corporate Branch Network
          </h2>
          <p style={{ color: '#6B7280', margin: '8px 0 0 0', fontSize: '15px' }}>
            Hierarchical view of Head Office, Regional Nodes, and Active Branches.
          </p>
        </div>
        
        <div style={{ position: 'relative' }}>
          <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input 
            type="text" 
            placeholder="Search branches, regions..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.length > 0) {
                setHeadOfficeExpanded(true);
                const allExpanded = {};
                sortedRegions.forEach(r => allExpanded[r] = true);
                setExpandedRegions(allExpanded);
              }
            }}
            style={{
              padding: '10px 16px 10px 40px',
              borderRadius: '10px',
              border: '1px solid #D1D5DB',
              width: '320px',
              outline: 'none',
              fontSize: '14px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#F97316'}
            onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
          />
        </div>
      </div>

      {/* Corporate Tree Container */}
      <div style={{ 
        background: '#ffffff', 
        borderRadius: '16px', 
        border: '1px solid #E5E7EB', 
        overflow: 'hidden', 
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)' 
      }}>
        
        {/* Head Office Node */}
        <div 
          onClick={() => setHeadOfficeExpanded(!headOfficeExpanded)}
          style={{ 
            padding: '20px 24px', 
            background: 'linear-gradient(90deg, #1E3A8A 0%, #1E40AF 100%)', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: headOfficeExpanded ? '1px solid #E5E7EB' : 'none',
            color: 'white'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>
              <Building2 size={24} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700' }}>Jammu Central Co-op Bank Ltd.</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
              {data.length} Total Branches
            </div>
            {headOfficeExpanded ? <ChevronDown size={24} opacity={0.8} /> : <ChevronRight size={24} opacity={0.8} />}
          </div>
        </div>

        {headOfficeExpanded && (
          <div style={{ padding: '20px', background: '#F8FAFC' }}>
            
            {/* Head Office Node (Level 2) */}
            <div style={{ 
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              overflow: 'hidden'
            }}>
              <div 
                onClick={() => toggleRegion('Head Office')}
                style={{ 
                  padding: '20px 24px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#F1F5F9',
                  borderBottom: expandedRegions['Head Office'] ? '1px solid #E2E8F0' : 'none',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#E2E8F0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#F1F5F9'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {expandedRegions['Head Office'] ? <ChevronDown size={24} color="#334155" /> : <ChevronRight size={24} color="#334155" />}
                  <Building2 size={24} color="#3B82F6" />
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.01em' }}>
                      Head Office
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', color: '#64748B', fontWeight: '600' }}>
                  {headOfficeBranches.length} Direct Branch • {sortedRegions.filter(r => r !== 'Head Office').length} Regions
                </div>
              </div>

              {/* Inside Head Office */}
              {expandedRegions['Head Office'] && (
                <div style={{ padding: '24px', background: '#ffffff' }}>
                  
                  {/* Direct Head Office Branches */}
                  {headOfficeBranches.length > 0 && (
                    <div style={{ marginBottom: '32px' }}>
                      <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                        Head Office Branches
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                        {headOfficeBranches.map(branch => (
                          <div key={branch.ID} style={{
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            padding: '14px 16px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            color: '#1E40AF',
                            fontWeight: '700',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}>
                            <Building2 size={18} />
                            {branch.BRANCH_NAME}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regional Offices */}
                  <div>
                    <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                      Regional Offices
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {sortedRegions.filter(r => r !== 'Head Office').map((region) => {
                        const branches = groupedData[region];
                        const isExpanded = expandedRegions[region];
                        
                        return (
                          <div key={region} style={{ 
                            background: '#ffffff',
                            borderRadius: '12px',
                            border: isExpanded ? '1px solid #FDBA74' : '1px solid #E2E8F0',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            overflow: 'hidden'
                          }}>
                            {/* Region Header */}
                            <div 
                              onClick={() => toggleRegion(region)}
                              style={{ 
                                padding: '16px 20px', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: isExpanded ? '#FFF7ED' : '#F8FAFC',
                                borderBottom: isExpanded ? '1px solid #FDBA74' : 'none',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = isExpanded ? '#FFEDD5' : '#F1F5F9'}
                              onMouseLeave={(e) => e.currentTarget.style.background = isExpanded ? '#FFF7ED' : '#F8FAFC'}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {isExpanded ? <ChevronDown size={20} color="#EA580C" /> : <ChevronRight size={20} color="#64748B" />}
                                <MapPin size={20} color={isExpanded ? "#F97316" : "#94A3B8"} />
                                <div>
                                  <div style={{ fontSize: '12px', color: isExpanded ? '#EA580C' : '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                    Regional Office
                                  </div>
                                  <div style={{ fontSize: '16px', fontWeight: '700', color: isExpanded ? '#9A3412' : '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {region}
                                  </div>
                                </div>
                              </div>
                              <div style={{ fontSize: '13px', color: isExpanded ? '#EA580C' : '#64748B', fontWeight: '600' }}>
                                {branches.length} Branch{branches.length !== 1 ? 'es' : ''}
                              </div>
                            </div>

                            {/* Branches Level - Grid Layout */}
                            {isExpanded && (
                              <div style={{ 
                                padding: '20px', 
                                background: '#FFFAF0',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                                gap: '12px'
                              }}>
                                {branches.map((branch) => (
                                  <div 
                                    key={branch.ID} 
                                    style={{ 
                                      background: '#F8FAFC',
                                      border: '1px solid #E2E8F0',
                                      padding: '12px 16px',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                      transition: 'all 0.2s',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.borderColor = '#94A3B8';
                                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                                      e.currentTarget.style.background = '#ffffff';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.borderColor = '#E2E8F0';
                                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
                                      e.currentTarget.style.background = '#F8FAFC';
                                    }}
                                  >
                                    <Store size={16} color="#94A3B8" />
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>
                                      {branch.BRANCH_NAME}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {sortedRegions.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <Store size={48} color="#CBD5E1" style={{ margin: '0 auto 16px auto' }} />
                <h3 style={{ fontSize: '16px', color: '#111827', fontWeight: '600', margin: '0 0 8px 0' }}>No matches found</h3>
                <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
                  No branches or regions match "{searchQuery}"
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchNetworkTab;
