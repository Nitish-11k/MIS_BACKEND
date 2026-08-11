from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata
import re

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
            
        # Stop at ==== headers and ----- lines. Wait for TRAN-CODE header.
        if set(stripped) <= {'=', '-', '_'}:
            continue
            
        if "TRAN-CODE" in stripped and "RESULT" in stripped:
            data_started = True
            continue
            
        if not data_started:
            continue
            
        if "EXCEPTION" in stripped and "REPORT" in stripped:
            continue
            
        row = {
            "TRAN_CODE": line[0:9].strip(),
            "RESULT": line[10:16].strip(),
            "JRNL_NO": line[17:33].strip(),
            "ACCOUNT_NO": line[34:59].strip(),
            "AMOUNT": line[60:69].strip(),
            "SUP_ID": line[70:76].strip(),
            "SUP_ERR_NO": line[77:93].strip(),
            "ERROR_DESC": line[94:122].strip(),
            "OUTSTANDING": line[123:146].strip(),
            "LIMIT_AMOUNT": line[147:178].strip(),
            "CUSTOMER_NAME": line[179:].strip(),
        }
        
        # skip lines that are obviously empty or headers
        if not row['TRAN_CODE'].strip() and not row['JRNL_NO'].strip():
            continue
            
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        
        rows.append(row)

    if not rows:
        rows.append({
            "TRAN_CODE": "",
            "RESULT": "",
            "JRNL_NO": "",
            "ACCOUNT_NO": "",
            "AMOUNT": "",
            "SUP_ID": "",
            "SUP_ERR_NO": "",
            "ERROR_DESC": "",
            "OUTSTANDING": "",
            "LIMIT_AMOUNT": "",
            "CUSTOMER_NAME": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows
