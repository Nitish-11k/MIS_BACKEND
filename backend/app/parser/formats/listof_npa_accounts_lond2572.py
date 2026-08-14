import re
from app.parser.metadata import extract_metadata
from app.parser.cleaner import remove_boilerplate_lines

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]
    
    rows = []
    current_branch_code = metadata.get("BRANCH_CODE", "")
    current_branch_name = metadata.get("BRANCH_NAME", "")
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
            
        # Skip control chars
        if stripped.startswith('\x1b') or stripped.startswith('\x0c'):
            continue
        
        # Skip dash/separator lines
        if set(stripped) <= {'-', '=', '<', '>', '|', ' '}:
            continue
        
        # Skip header/boilerplate
        upper = stripped.upper()
        if any(kw in upper for kw in ['REPORT ID', 'AREA:', 'RUN DATE', 'PROC DATE', 'PAGE NO',
                                       'SR-NO', 'IRAC IRAC', 'LIST OF NPA ACCOUNTS',
                                       '** END', 'GRAND TOTAL', 'PAGE-NO:']):
            continue
        
        # Detect branch header lines: "BRANCH-NO:- 00005      BRANCH-NAME:- ARNAS..."
        branch_match = re.match(r'BRANCH-NO:-\s*(\d+)\s+BRANCH-NAME:-\s*(.+?)(?:\s+PAGE-NO|$)', upper)
        if branch_match:
            current_branch_code = branch_match.group(1).strip().zfill(5)
            current_branch_name = branch_match.group(2).strip()
            continue
        
        # Regex to parse the fixed-width line robustly
        m = re.match(r'^\s*(\d+)\s+(\d+)\s+(.*?)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+(\d+)\s+(\d+)\s+(\d{2}-\d{2}-\d{4})\s+([\d,]+\.\d+-?)\s+(\d+)\s+([A-Z/]+)\s+([\d,]+\.\d+)\s+(\d+)', line)
        if m:
            sr, acc, cust, inca, uipy, old_irac, new_irac, npa_date, outst, arr, sys1, int_amt, prod = m.groups()
            row = {
                "SR_NO": sr,
                "ACCOUNT_NUMBER": acc,
                "CUSTOMER_NAME": cust.strip(),
                "INCA": inca,
                "UIPY": uipy,
                "OLD_IRAC": old_irac,
                "NEW_IRAC": new_irac,
                "NPA_DATE": npa_date,
                "OUTSTANDING": outst,
                "ARR_COND": arr,
                "SYS1": sys1,
                "SYS2": "",
                "INT_AMT": int_amt,
                "PRODUCT": prod,
                "REPORT_ID": metadata.get("REPORT_ID", ""),
                "BRANCH_CODE": current_branch_code,
                "BRANCH_NAME": current_branch_name,
                "PROC_DATE": metadata.get("PROC_DATE", "")
            }
            rows.append(row)
            
    if not rows:
        rows.append({
            "SR_NO": "", "ACCOUNT_NUMBER": "", "CUSTOMER_NAME": "",
            "INCA": "", "UIPY": "", "OLD_IRAC": "", "NEW_IRAC": "",
            "NPA_DATE": "", "OUTSTANDING": "", "ARR_COND": "",
            "SYS1": "", "SYS2": "", "INT_AMT": "", "PRODUCT": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
