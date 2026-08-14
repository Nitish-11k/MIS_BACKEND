from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata
import re

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    lines = [l.rstrip('\n\r') for l in raw_lines]
    
    rows = []
    
    current_customer_name = ""
    current_cif = ""
    current_subject_date = ""
    
    in_table = False
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Look for CIF number pattern e.g. (601020003187)
        cif_match = re.search(r'\(([0-9]{10,14})\)', line)
        if cif_match:
            current_cif = cif_match.group(1)
            # Customer name is everything before the CIF
            current_customer_name = line[:cif_match.start()].strip()
            
        if "SUBJECT : TERM ACCOUNT(S) MATURING ON " in line:
            current_subject_date = line.split("MATURING ON ")[-1].strip()
            
        if "ACCOUNT NO.  RECIEPT-NO  CURRENCY" in line:
            in_table = True
            continue
            
        if in_table:
            if set(stripped) <= {'=', ' ', '-'}:
                # Table divider or end of table
                continue
                
            if "ASSURING YOU OF OUR BEST SERVICES" in stripped or "Yours faithfully," in stripped or "Authorised Signatory" in stripped:
                in_table = False
                continue
                
            if not stripped:
                continue
                
            # If we are in table and it's a data row
            # ACCOUNT NO.  RECIEPT-NO  CURRENCY     TERM-VALUE              MAT-VALUE   MAT-DATE  ACCOUNT-STATUS
            # 402000004072                INR         60882.000              65610.000  25/05/2025  00 - OPEN
            parts = re.split(r'\s{2,}', stripped)
            
            # Since RECIEPT-NO might be empty, regex split by 2+ spaces might be tricky.
            # We can use fixed width or just heuristic.
            # Fixed offsets:
            # 0-13: ACCOUNT NO.
            # 13-25: RECIEPT-NO
            # 25-36: CURRENCY
            # 36-58: TERM-VALUE
            # 58-81: MAT-VALUE
            # 81-91: MAT-DATE
            # 93+: ACCOUNT-STATUS
            
            if len(line) >= 91:
                acct = line[0:15].strip()
                if not acct.isdigit():
                    # Might not be a valid row
                    continue
                    
                receipt = line[15:27].strip()
                curr = line[27:40].strip()
                term_val = line[40:63].strip()
                mat_val = line[63:74].strip()
                mat_date = line[74:86].strip()
                status = line[86:].strip()
                
                row = {
                    "CUSTOMER_NAME": current_customer_name,
                    "CIF_NO": current_cif,
                    "SUBJECT_DATE": current_subject_date,
                    "ACCOUNT_NO": acct,
                    "RECEIPT_NO": receipt,
                    "CURRENCY": curr,
                    "TERM_VALUE": term_val,
                    "MAT_VALUE": mat_val,
                    "MAT_DATE": mat_date,
                    "ACCOUNT_STATUS": status,
                    
                    "REPORT_ID": "ADVICEFORTD",  # No report ID in the file header usually
                    "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                    "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                    "PROC_DATE": metadata.get("PROC_DATE", "")
                }
                rows.append(row)
                
    if not rows:
        rows.append({
            "CUSTOMER_NAME": "",
            "CIF_NO": "",
            "SUBJECT_DATE": "",
            "ACCOUNT_NO": "",
            "RECEIPT_NO": "",
            "CURRENCY": "",
            "TERM_VALUE": "",
            "MAT_VALUE": "",
            "MAT_DATE": "",
            "ACCOUNT_STATUS": "",
            
            "REPORT_ID": "ADVICEFORTD",
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
