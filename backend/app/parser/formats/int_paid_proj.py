from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata
import re

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]
    
    rows = []
    
    current_customer_name = ""
    current_pan_no = ""
    current_dob = ""
    current_subject = ""
    
    # We will accumulate address lines
    address_lines = []
    
    looking_for_name = False
    in_table = False
    
    # Local branch overrides
    local_branch_code = metadata.get("BRANCH_CODE", "")
    local_branch_name = metadata.get("BRANCH_NAME", "")
    
    for line in lines:
        stripped = line.strip()
        
        # Extract Branch info if present in header
        if "BRANCH  :" in line:
            # Example: '                                                                                                      BRANCH  : (00007) BANIHAL'
            branch_match = re.search(r'BRANCH\s*:\s*\((.*?)\)\s*(.*)', line)
            if branch_match:
                local_branch_code = branch_match.group(1).strip()
                local_branch_name = branch_match.group(2).strip()
        
        if "DATE    :" in line:
            looking_for_name = True
            current_customer_name = ""
            current_pan_no = ""
            current_dob = ""
            current_subject = ""
            address_lines = []
            continue
            
        if looking_for_name:
            if not stripped:
                continue
            if not current_customer_name:
                current_customer_name = stripped
                continue
                
            if stripped.startswith("BIRTH DATE:"):
                current_dob = stripped.replace("BIRTH DATE:", "").replace("-", "").strip()
                continue
                
            if stripped.startswith("PAN NO:"):
                current_pan_no = stripped.split("FORM")[0].replace("PAN NO:", "").strip()
                # Stop looking for address when PAN NO is found
                looking_for_name = False
                continue
                
            # If it's not DOB and not PAN NO, it must be part of address
            address_lines.append(stripped)
            continue
            
        if stripped.startswith("SUBJECT :"):
            current_subject = stripped.replace("SUBJECT :", "").strip()
            continue
            
        if "ACCOUNT NO.   DEP.DATE    MAT.DATE" in line:
            in_table = True
            continue
            
        if in_table:
            if set(stripped) <= {'=', '-'}:
                continue
                
            if "CUSTOMER TOTAL" in line or "TOTAL INTEREST PAID" in line or "ASSURING YOU OF OUR BEST SERVICES" in line or "REPORT ID" in line:
                in_table = False
                continue
                
            if not stripped:
                continue
                
            parts = re.split(r'\s{2,}', stripped)
            
            if len(parts) >= 11:
                acct = parts[0]
                dep_date = parts[1]
                mat_date = parts[2]
                principal = parts[3]
                rate = parts[4]
                int_paid = parts[5]
                tax = parts[6]
                int_proj = parts[7]
                sts = parts[8]
                descript = parts[9]
                tds = parts[10] if len(parts) > 10 else ""
                
                if acct.isdigit():
                    rows.append({
                        "CUSTOMER_NAME": current_customer_name,
                        "CUSTOMER_ADDRESS": " ".join(address_lines),
                        "DOB": current_dob,
                        "SUBJECT": current_subject,
                        "PAN_NO": current_pan_no,
                        "ACCOUNT_NO": acct,
                        "DEP_DATE": dep_date,
                        "MAT_DATE": mat_date,
                        "PRINCIPAL_AMT": principal,
                        "RATE": rate,
                        "INT_PAID": int_paid,
                        "TAX_DEDUCTED": tax,
                        "INT_PROJECTED": int_proj,
                        "ACC_STS": sts,
                        "DESCRIPT": descript,
                        "TDS_APPLICABLE": tds,
                        
                        "REPORT_ID": metadata.get("REPORT_ID", ""),
                        "BRANCH_CODE": local_branch_code,
                        "BRANCH_NAME": local_branch_name,
                        "PROC_DATE": metadata.get("PROC_DATE", "")
                    })
                    
    if not rows:
        rows.append({
            "CUSTOMER_NAME": "",
            "PAN_NO": "",
            "ACCOUNT_NO": "",
            "DEP_DATE": "",
            "MAT_DATE": "",
            "PRINCIPAL_AMT": "",
            "RATE": "",
            "INT_PAID": "",
            "TAX_DEDUCTED": "",
            "INT_PROJECTED": "",
            "ACC_STS": "",
            "DESCRIPT": "",
            "TDS_APPLICABLE": "",
            
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
