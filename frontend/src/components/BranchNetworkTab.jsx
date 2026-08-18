import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Building2, Store, Search, MapPin, Building } from 'lucide-react';

const BranchNetworkTab = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRegions, setExpandedRegions] = useState({});
  const [headOfficeExpanded, setHeadOfficeExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/branch-network')
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

  const groupedData = filteredData.reduce((acc, branch) => {
    if (!acc[branch.REGIONAL_OFFICE]) acc[branch.REGIONAL_OFFICE] = [];
    acc[branch.REGIONAL_OFFICE].push(branch);
    return acc;
  }, {});

  const headOfficeBranches = groupedData['Head Office'] || [];

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
        borderRadius: '12px', 
        border: '1px solid #E5E7EB', 
        padding: '24px',
        boxShadow: 'var(--shadow-premium)' 
      }}>
        
        {/* ROOT: Bank Node */}
        <div 
          onClick={() => setHeadOfficeExpanded(!headOfficeExpanded)}
          style={{ 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#1E3A8A',
            userSelect: 'none'
          }}
        >
          {headOfficeExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <Building2 size={24} />
          <span style={{ fontSize: '18px', fontWeight: '700' }}>Jammu Central Co-op Bank Ltd.</span>
          <span style={{ fontSize: '12px', background: '#DBEAFE', color: '#1E40AF', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
            {data.length} Total Branches
          </span>
        </div>

        {headOfficeExpanded && (
          <div style={{ marginLeft: '10px', paddingLeft: '24px', borderLeft: '2px solid #E2E8F0', marginTop: '8px' }}>
            
            {/* LEVEL 1: Regions */}
            {sortedRegions.map((region, index) => {
              const branches = groupedData[region];
              const isExpanded = expandedRegions[region];
              const isHeadOffice = region === 'Head Office';

              return (
                <div key={region} style={{ marginTop: '16px' }} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s`, marginTop: '16px' }}>
                  
                  {/* Region Node */}
                  <div 
                    onClick={() => toggleRegion(region)}
                    style={{ 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      color: isHeadOffice ? '#10B981' : '#F97316',
                      userSelect: 'none',
                      padding: '8px 0',
                      borderRadius: '6px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    {isHeadOffice ? <Building size={20} /> : <MapPin size={20} />}
                    <span style={{ fontSize: '15px', fontWeight: '600', color: '#1E293B' }}>{region}</span>
                    <span style={{ fontSize: '12px', background: '#F1F5F9', color: '#64748B', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                      {branches.length} Branch{branches.length !== 1 ? 'es' : ''}
                    </span>
                  </div>

                  {/* LEVEL 2: Branches */}
                  {isExpanded && (
                    <div style={{ marginLeft: '10px', paddingLeft: '24px', borderLeft: '2px dashed #CBD5E1', marginTop: '4px', paddingBottom: '8px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', paddingTop: '8px' }}>
                        {branches.map(branch => (
                          <div 
                            key={branch.ID} 
                            style={{ 
                              background: '#ffffff',
                              border: '1px solid #E2E8F0',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              transition: 'all 0.2s',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#94A3B8';
                              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#E2E8F0';
                              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            <Store size={16} color="#94A3B8" />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>
                                {branch.BRANCH_NAME}
                              </span>
                              <span style={{ fontSize: '10px', color: '#64748B' }}>
                                Code: {branch.BRANCH_CODE || 'N/A'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}

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

