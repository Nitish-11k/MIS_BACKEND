from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata
import re

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]
    
    rows = []
    
    current_product = ""
    current_category = ""
    
    local_branch_code = metadata.get("BRANCH_CODE", "")
    local_branch_name = metadata.get("BRANCH_NAME", "")
    
    for line in lines:
        stripped = line.strip()
        
        # Branch parsing
        if "BRANCH CODE" in line and "BRANCH NAME" in line:
            parts = line.split("BRANCH NAME")
            local_branch_code = parts[0].replace("BRANCH CODE :", "").replace("BRANCH CODE", "").strip()
            # Remove trailing numbers or artifacts from branch name
            local_branch_name = re.sub(r'\d+$', '', parts[1]).strip()
        
        if "PRODUCT TYPE:" in line and "ACCOUNT CATEGORY:" in line:
            parts = line.split("ACCOUNT CATEGORY:")
            current_product = parts[0].replace("PRODUCT TYPE:", "").strip()
            current_category = parts[1].strip()
            continue
            
        if not stripped or set(stripped) <= {'-', ' ', '='}:
            continue
            
        if "REPORT ID:" in stripped or "AREA:" in stripped or "TERM DEPOSIT MATURITY REPORT" in stripped or "BRANCH CODE" in stripped:
            continue
            
        if "ACCOUNT NUMBER CURRENCY" in stripped:
            continue
            
        if "CUSTOMER TOTAL" in stripped or "PRODUCT TOTAL" in stripped or "BRANCH TOTAL" in stripped or "GRAND TOTAL" in stripped:
            continue
            
        # Data row: 809070069144    INR     Mrs. SABIYA JAN (MINOR)                      31,740.00           5.2000     27/04/2025
        # We can split by 2 or more spaces, or use fixed widths
        # Fixed width estimation:
        # 0-17: ACCT (809070069144)
        # 17-25: CURR (INR)
        # 25-70: NAME (Mrs. SABIYA JAN (MINOR))
        # 70-90: AMOUNT (31,740.00)
        # 90-107: RATE (5.2000)
        # 107+: DATE (27/04/2025)
        
        # Let's try regex split first, as it's cleaner if Name doesn't contain multiple spaces
        if len(line) > 60:
            acct = line[0:17].strip()
            if acct.isdigit():
                curr = line[17:25].strip()
                name = line[25:70].strip()
                amt = line[70:90].strip()
                rate = line[90:101].strip()
                mat_date = line[101:].strip()
                
                rows.append({
                    "PRODUCT_TYPE": current_product,
                    "ACCOUNT_CATEGORY": current_category,
                    "ACCOUNT_NUMBER": acct,
                    "CURRENCY": curr,
                    "CUSTOMER_NAME": name,
                    "DEPOSIT_AMOUNT": amt,
                    "INTEREST_RATE": rate,
                    "MATURITY_DATE": mat_date,
                    
                    "REPORT_ID": metadata.get("REPORT_ID", ""),
                    "BRANCH_CODE": local_branch_code,
                    "BRANCH_NAME": local_branch_name,
                    "PROC_DATE": metadata.get("PROC_DATE", "")
                })
                
    if not rows:
        rows.append({
            "PRODUCT_TYPE": "",
            "ACCOUNT_CATEGORY": "",
            "ACCOUNT_NUMBER": "",
            "CURRENCY": "",
            "CUSTOMER_NAME": "",
            "DEPOSIT_AMOUNT": "",
            "INTEREST_RATE": "",
            "MATURITY_DATE": "",
            
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
