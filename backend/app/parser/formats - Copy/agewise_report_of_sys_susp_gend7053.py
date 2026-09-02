from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata
import re

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    lines = [l.rstrip('\n\r') for l in raw_lines]
    
    rows = []
    
    current_account_no = ""
    current_account_name = ""
    current_currency = ""
    
    for line in lines:
        stripped = line.strip()
        
        # Capture block headers
        if "ACCOUNT NO:" in stripped and "ACCOUNT NAME:" in stripped:
            acct_part = line.split("ACCOUNT NO:")[1].split("ACCOUNT NAME:")[0].strip()
            name_part = line.split("ACCOUNT NAME:")[1].replace('|', '').strip()
            current_account_no = acct_part
            current_account_name = name_part
            
        if "CURRENCY:" in stripped:
            curr_part = line.split("CURRENCY:")[1].replace('|', '').strip()
            current_currency = curr_part
            
        # Detect table headers to start data parsing
        if "| SR. NO." in line or "NO. OF DAYS" in line:
            continue
            
        if not stripped:
            continue
            
        if set(stripped) <= {'|', '-', ' '}:
            continue
            
        if "TOTAL OUTSTANDING AMOUNT" in stripped or "BALANCE THE ABOVE ACCOUNTS" in stripped or "TOTAL BALANCE OF BGL" in stripped:
            continue
            
        if "REPORT ID:" in stripped or "PAGE NO :" in stripped or "BRANCH-CODE:" in stripped:
            continue
            
        if "AGEWISE BREAKUP" in stripped or "BANKER CHEQUE" in stripped:
            continue
            
        # Parse data rows
        if stripped.startswith('|') and stripped.endswith('|'):
            parts = [p.strip() for p in line.split('|')]
            # usually ['', '1', '000000822', '12/07/2024', '809020048180', '97,885.00', '287', '']
            if len(parts) >= 7:
                sr_no = parts[1]
                journal_no = parts[2]
                journal_date = parts[3]
                instrument_acct = parts[4]
                amount = parts[5]
                age = parts[6]
                
                # Validation
                if sr_no.isdigit() or amount:
                    row = {
                        "ACCOUNT_NO": current_account_no,
                        "ACCOUNT_NAME": current_account_name,
                        "CURRENCY": current_currency,
                        "SR_NO": sr_no,
                        "JOURNAL_NO": journal_no,
                        "JOURNAL_DATE": journal_date,
                        "INSTRUMENT_ACCOUNT_NO": instrument_acct,
                        "AMOUNT": amount,
                        "AGE_DAYS": age,
                        
                        "REPORT_ID": metadata.get("REPORT_ID", ""),
                        "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                        "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                        "PROC_DATE": metadata.get("PROC_DATE", "")
                    }
                    rows.append(row)
                    
    if not rows:
        rows.append({
            "ACCOUNT_NO": "",
            "ACCOUNT_NAME": "",
            "CURRENCY": "",
            "SR_NO": "",
            "JOURNAL_NO": "",
            "JOURNAL_DATE": "",
            "INSTRUMENT_ACCOUNT_NO": "",
            "AMOUNT": "",
            "AGE_DAYS": "",
            
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
