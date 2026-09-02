import re
from app.parser.metadata import extract_metadata
from app.parser.cleaner import remove_boilerplate_lines

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)
    
    rows = []
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        if set(stripped) <= {'-', '='}:
            continue
            
        if any(kw in stripped.upper() for kw in ['REPORT ID', 'BRANCH CODE', 'PAGE NO', 'DATE', 'TOTAL', 'SR_NO']):
            continue
            
        # Example data:
        # 1 00001 CCOD 00000809190003298 00000601190003294 Cash Credit - Rahat Staff Offi          -322338.8                  0                  0                  0           -72338.8 28-OCT-24 31-MAR-24 04 04 NADEEM  CHOUDHARY
        
        m = re.match(r'^\s*(\d+)\s+(\d+)\s+(\w+)\s+(\d+)\s+(\d+)\s+(.+?)\s+([-\d\.]+)\s+([-\d\.]+)\s+([-\d\.]+)\s+([-\d\.]+)\s+([-\d\.]+)\s+(\d{2}-[A-Z]{3}-\d{2})\s+(\d{2}-[A-Z]{3}-\d{2})\s+(\d+)\s+(\d+)\s+(.+)$', stripped)
        
        row = {}
        if m:
            row['SR_NO'] = m.group(1)
            row['BR_NO'] = m.group(2)
            row['SYS'] = m.group(3)
            row['ACCT_NO'] = m.group(4)
            row['CUST_NO'] = m.group(5)
            row['PROD_DESCRIPTION'] = m.group(6).strip()
            row['BAL_OUTSTAND'] = m.group(7)
            row['OVERDUE_INT'] = m.group(8)
            row['INCA'] = m.group(9)
            row['UIPY'] = m.group(10)
            row['IRR_AMT'] = m.group(11)
            row['LST_ARR_D'] = m.group(12)
            row['NPA_DATE'] = m.group(13)
            row['NI'] = m.group(14)
            row['OI'] = m.group(15)
            row['NAME'] = m.group(16).strip()
            
        if 'ACCT_NO' in row:
            row["REPORT_ID"] = metadata.get("REPORT_ID", "")
            row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
            row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
            row["PROC_DATE"] = metadata.get("PROC_DATE", "")
            rows.append(row)
            
    if not rows:
        rows.append({
            "SR_NO": "", "BR_NO": "", "SYS": "", "ACCT_NO": "", "CUST_NO": "",
            "PROD_DESCRIPTION": "", "BAL_OUTSTAND": "", "OVERDUE_INT": "", 
            "INCA": "", "UIPY": "", "IRR_AMT": "", "LST_ARR_D": "",
            "NPA_DATE": "", "NI": "", "OI": "", "NAME": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
