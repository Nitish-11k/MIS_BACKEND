from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata
import re

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]
    
    rows = []
    
    current_customer_name = ""
    current_cif = ""
    
    local_branch_code = metadata.get("BRANCH_CODE", "")
    local_branch_name = metadata.get("BRANCH_NAME", "")
    
    in_address_block = False
    address_lines = []
    
    in_table = False
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        if "RACPC/ BR.NO" in line:
            local_branch_code = line.split(":")[-1].strip()
        if "RACPC/ BR.NAME" in line:
            local_branch_name = line.split(":")[-1].strip()
            
        if stripped == "To,":
            in_address_block = True
            address_lines = []
            continue
            
        if in_address_block:
            if not stripped:
                if len(address_lines) > 0:
                    # End of address block
                    in_address_block = False
                    
                    # Try to extract name and CIF
                    current_customer_name = address_lines[0]
                    current_cif = ""
                    for al in address_lines:
                        if len(al) >= 10 and al.isdigit():
                            current_cif = al
                            break
                continue
            else:
                address_lines.append(stripped)
                continue
                
        if "Sr.       Account No.      Drawing Power" in line:
            in_table = True
            continue
            
        if in_table:
            if "Your early action will be highly appreciated" in line or "Yours faithfully" in line:
                in_table = False
                continue
                
            if set(stripped) <= {'-', ' '}:
                continue
                
            if not stripped:
                continue
                
            if "No." in stripped and "(Rs.)" in stripped:
                continue
                
            # Data row: 1      809070073988        1,87,323.00        2,60,723.00         73,400.00
            parts = re.split(r'\s{2,}', stripped)
            if len(parts) >= 5:
                sr_no = parts[0]
                acct = parts[1]
                dp = parts[2]
                outstandings = parts[3]
                irregular = parts[4]
                
                if sr_no.isdigit():
                    rows.append({
                        "CUSTOMER_NAME": current_customer_name,
                        "CIF_NO": current_cif,
                        "SR_NO": sr_no,
                        "ACCOUNT_NO": acct,
                        "DRAWING_POWER": dp,
                        "OUTSTANDINGS": outstandings,
                        "IRREGULAR_BY": irregular,
                        
                        "REPORT_ID": "OVERDUE_NOTICE",
                        "BRANCH_CODE": local_branch_code,
                        "BRANCH_NAME": local_branch_name,
                        "PROC_DATE": metadata.get("PROC_DATE", "")
                    })
                    
    if not rows:
        rows.append({
            "CUSTOMER_NAME": "",
            "CIF_NO": "",
            "SR_NO": "",
            "ACCOUNT_NO": "",
            "DRAWING_POWER": "",
            "OUTSTANDINGS": "",
            "IRREGULAR_BY": "",
            
            "REPORT_ID": "OVERDUE_NOTICE",
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
