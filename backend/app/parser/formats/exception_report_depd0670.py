import re
from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    data_started = False
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        if set(stripped) <= {'=', '-', '_'}:
            continue
            
        if "TRAN-CODE" in stripped and "RESULT" in stripped:
            data_started = True
            continue
            
        if not data_started:
            continue
            
        if "EXCEPTION" in stripped and "REPORT" in stripped:
            continue
            
        # Example line:
        # 001010    0000    000014039    09020017796       10,000.00    000220    0000                27,911.00+ 00000000000000.00 PARSINO DEI W/ GIRDHARI LAL
        # Or:
        # 021051    0000    000002446    02000293256            1,00,000.00    000803    0000        1,30,000.00+ 00000000000000.00 Mr. SHANKU RAM
        
        # Use regex to extract the fields safely regardless of horizontal shifts
        m = re.match(r'^(\d+)\s+(\d+)\s+(\d+)\s+([\d-]+)\s+([\d,]+\.\d{2})\s+(\d+)\s+(\d+)\s*(.*?)\s+([\d,]+\.\d{2}[+-]?)\s+([\d\.]+)(?:\s+(.*))?$', stripped)
        
        if m:
            row = {
                "TRAN_CODE": m.group(1),
                "RESULT": m.group(2),
                "JRNL_NO": m.group(3),
                "ACCOUNT_NO": m.group(4),
                "AMOUNT": m.group(5),
                "SUP_ID": m.group(6),
                "SUP_ERR_NO": m.group(7),
                "ERROR_DESC": m.group(8),
                "OUTSTANDING": m.group(9),
                "LIMIT_AMOUNT": m.group(10),
                "CUSTOMER_NAME": (m.group(11) or "").strip(),
                "REPORT_ID": metadata.get("REPORT_ID", ""),
                "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                "PROC_DATE": metadata.get("PROC_DATE", "")
            }
            rows.append(row)
        else:
            # Fallback for weird rows
            parts = re.split(r'\s{2,}', stripped)
            if len(parts) >= 8:
                row = {
                    "TRAN_CODE": parts[0],
                    "RESULT": parts[1],
                    "JRNL_NO": parts[2],
                    "ACCOUNT_NO": parts[3],
                    "AMOUNT": parts[4],
                    "SUP_ID": parts[5],
                    "SUP_ERR_NO": parts[6],
                    "ERROR_DESC": "",
                    "OUTSTANDING": parts[-3],
                    "LIMIT_AMOUNT": parts[-2],
                    "CUSTOMER_NAME": parts[-1],
                    "REPORT_ID": metadata.get("REPORT_ID", ""),
                    "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                    "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                    "PROC_DATE": metadata.get("PROC_DATE", "")
                }
                rows.append(row)

    if not rows:
        rows.append({
            "TRAN_CODE": "", "RESULT": "", "JRNL_NO": "", "ACCOUNT_NO": "",
            "AMOUNT": "", "SUP_ID": "", "SUP_ERR_NO": "", "ERROR_DESC": "",
            "OUTSTANDING": "", "LIMIT_AMOUNT": "", "CUSTOMER_NAME": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows
