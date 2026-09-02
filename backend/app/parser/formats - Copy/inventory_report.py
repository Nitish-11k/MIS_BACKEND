from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata
import re

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]
    
    rows = []
    
    current_instrument_type = ""
    in_table = False
    
    local_branch_code = metadata.get("BRANCH_CODE", "")
    local_branch_name = metadata.get("BRANCH_NAME", "")
    
    # Helper dictionary for missing branch names
    branch_map = {
        "00002": "RAIL HEAD COMPLEX",
        "00005": "ARNAS",
        "00007": "BANIHAL",
        "00001": "HEAD OFFICE"
    }
    
    for line in lines:
        stripped = line.strip()
        
        if stripped.startswith("BRANCH NO :"):
            # Extract number and pad it to 5 digits
            b_code = stripped.replace("BRANCH NO :", "").replace("|", "").strip()
            if b_code.isdigit():
                local_branch_code = b_code.zfill(5)
            
        if stripped.startswith("INSTRUMENT TYPE:"):
            current_instrument_type = stripped.replace("INSTRUMENT TYPE:", "").replace("|", "").strip()
            continue
            
        if "SR. NO.|  PREFIX  |" in line:
            in_table = True
            continue
            
        if in_table:
            if set(stripped) <= {'-', '|', '='}:
                continue
                
            if "INSTRUMENT TYPE:" in line or "BRANCH NO :" in line or "REPORT-ID:" in line:
                in_table = False
                # re-process this line if it's instrument type
                if stripped.startswith("INSTRUMENT TYPE:"):
                    current_instrument_type = stripped.replace("INSTRUMENT TYPE:", "").replace("|", "").strip()
                elif stripped.startswith("BRANCH NO :"):
                    b_code = stripped.replace("BRANCH NO :", "").replace("|", "").strip()
                    if b_code.isdigit():
                        local_branch_code = b_code.zfill(5)
                continue
                
            if not stripped:
                continue
                
            # Data row:      1 -CC03      -               1001-     50 -  01 -    01   - 000000000- HELD       -   INR     -     429                       |
            parts = [p.strip() for p in re.split(r'[-|]', line)]
            # Filter out empty string at the end from the trailing |
            parts = [p for p in parts if p or p == ""]
            
            if len(parts) >= 10:
                sr_no = parts[0]
                prefix = parts[1]
                serial_no = parts[2]
                leaves = parts[3]
                cat = parts[4]
                sub_cat = parts[5]
                micr = parts[6]
                status = parts[7]
                currency = parts[8]
                teller_no = parts[9]
                
                if not local_branch_name and local_branch_code in branch_map:
                    local_branch_name = branch_map[local_branch_code]
                
                if sr_no.isdigit():
                    rows.append({
                        "INSTRUMENT_TYPE": current_instrument_type,
                        "SR_NO": sr_no,
                        "PREFIX": prefix,
                        "SERIAL_NO": serial_no,
                        "LEAVES": leaves,
                        "CAT": cat,
                        "SUB_CAT": sub_cat,
                        "MICR": micr,
                        "STATUS": status,
                        "CURRENCY": currency,
                        "TELLER_NO": teller_no,
                        
                        "REPORT_ID": metadata.get("REPORT_ID", ""),
                        "BRANCH_CODE": local_branch_code,
                        "BRANCH_NAME": local_branch_name,
                        "PROC_DATE": metadata.get("PROC_DATE", "")
                    })
                    
    if not rows:
        rows.append({
            "INSTRUMENT_TYPE": "",
            "SR_NO": "",
            "PREFIX": "",
            "SERIAL_NO": "",
            "LEAVES": "",
            "CAT": "",
            "SUB_CAT": "",
            "MICR": "",
            "STATUS": "",
            "CURRENCY": "",
            "TELLER_NO": "",
            
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
