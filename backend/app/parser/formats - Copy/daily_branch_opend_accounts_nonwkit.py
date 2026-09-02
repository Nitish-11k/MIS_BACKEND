import re
from app.parser.metadata import extract_metadata
from app.parser.cleaner import remove_boilerplate_lines

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)
    
    rows = []
    data_started = False
    
    # Regex for data row
    regex = r'^\s*(\d+)\s+([\d-]+)\s+(\d+)\s+(.+?)\s+(\d{2}/\d{2}/\d{4})\s+(\d+)\s*$'
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        if set(stripped) <= {'-', '='}:
            data_started = True
            continue
            
        if not data_started:
            continue
            
        if "S. NO." in stripped or "PAGE TOTAL" in stripped or "TOTAL BRANCH ACCOUNTS" in stripped:
            continue
            
        m = re.match(regex, line)
        if m:
            row = {
                "S_NO": m.group(1),
                "TYPE_OF_ACCOUNT": m.group(2),
                "ACCOUNT_NUMBER": m.group(3),
                "ACCOUNT_NAME": m.group(4).strip(),
                "DATE_OF_OPENING": m.group(5),
                "VERIFYING_OFFICIAL": m.group(6),
                "REPORT_ID": metadata.get("REPORT_ID", ""),
                "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                "PROC_DATE": metadata.get("PROC_DATE", "")
            }
            rows.append(row)
            
    if not rows:
        rows.append({
            "S_NO": "", "TYPE_OF_ACCOUNT": "", "ACCOUNT_NUMBER": "",
            "ACCOUNT_NAME": "", "DATE_OF_OPENING": "", "VERIFYING_OFFICIAL": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
