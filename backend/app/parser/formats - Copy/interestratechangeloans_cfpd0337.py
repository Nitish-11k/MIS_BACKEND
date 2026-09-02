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
            
        # Ignore lines made entirely of dashes, equals, or decorators
        if set(stripped) <= {'-', '=', '|', ' '}:
            continue
            
        if any(kw in stripped.upper() for kw in ['REPORT ID', 'BRANCH CODE', 'PAGE NO', 'DATE', 'SL NO.']):
            continue
            
        # Fields: SL_NO, ACCOUNT_NO, CUSTOMER_NAME, AC_TYPE, ACCOUNT_BALANCE, VALUE_DATE, OLD_INT_RATE, NEW_INT_RATE
        pattern = r'^\s*(\d+)\s+(\d{12,16})\s+(.+?)\s+(\d+)\s+([\d,]+\.\d{2})\s+(\d{2}/\d{2}/\d{4})\s+([\d\.]+)\s+([\d\.]+)\s*$'
        m = re.match(pattern, stripped)
        
        row = {}
        if m:
            row['SL_NO'] = m.group(1)
            row['ACCOUNT_NO'] = m.group(2)
            row['CUSTOMER_NAME'] = m.group(3).strip()
            row['AC_TYPE'] = m.group(4)
            row['ACCOUNT_BALANCE'] = m.group(5)
            row['VALUE_DATE'] = m.group(6)
            row['OLD_INT_RATE'] = m.group(7)
            row['NEW_INT_RATE'] = m.group(8)
            
            row["REPORT_ID"] = metadata.get("REPORT_ID", "")
            row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
            row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
            row["PROC_DATE"] = metadata.get("PROC_DATE", "")
            rows.append(row)
            
    if not rows:
        rows.append({
            "SL_NO": "", "ACCOUNT_NO": "", "CUSTOMER_NAME": "", "AC_TYPE": "",
            "ACCOUNT_BALANCE": "", "VALUE_DATE": "", "OLD_INT_RATE": "", "NEW_INT_RATE": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
