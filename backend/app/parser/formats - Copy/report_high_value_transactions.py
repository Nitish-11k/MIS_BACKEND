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
            
        # Ignore decorators like dashes or single control characters
        if set(stripped) <= {'-', '=', '[', 'c', ']'} or len(stripped) <= 2:
            continue
            
        if any(kw in stripped.upper() for kw in ['REPORT ID', 'BRANCH CODE', 'PAGE NO', 'DATE', 'TOTAL', 'SR.NO']):
            continue
            
        # Example data:
        #      1       402000294534 Mr. RAHUL  MOTAN                                              25-04-2025            12,00,000.00-
        #      2       809190002240 Mr. RAHUL  MOTTAN                                             25-04-2025            12,00,000.00   FRM00000402000294534 Mr. RAHUL  MOTAN
        
        m = re.match(r'^\s*(\d+)\s+(\d+)\s+(.+?)\s+(\d{2}-\d{2}-\d{4})\s+([\d,]+\.\d{2}-?)\s*(.*)$', stripped)
        
        row = {}
        if m:
            row['SR_NO'] = m.group(1)
            row['ACCOUNT_NO'] = m.group(2)
            row['ACCOUNT_NAME'] = m.group(3).strip()
            row['TRANS_DATE'] = m.group(4)
            row['AMOUNT'] = m.group(5)
            row['NARRATION'] = m.group(6).strip()
            
        if 'ACCOUNT_NO' in row:
            row["REPORT_ID"] = metadata.get("REPORT_ID", "")
            row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
            row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
            row["PROC_DATE"] = metadata.get("PROC_DATE", "")
            rows.append(row)
            
    if not rows:
        rows.append({
            "SR_NO": "", "ACCOUNT_NO": "", "ACCOUNT_NAME": "", 
            "TRANS_DATE": "", "AMOUNT": "", "NARRATION": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
