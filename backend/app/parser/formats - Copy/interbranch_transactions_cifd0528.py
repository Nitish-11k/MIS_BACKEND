from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    data_started = False
    dash_count = 0
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        # Stop on 'TOTAL:' or similar footer
        if "TOTAL:" in stripped:
            continue
        if "INTERNET BANKING" in stripped.upper():
            continue
        if "No Internet Banking Transactions" in stripped:
            continue
        if "BGL TRANSACTIONS" in stripped.upper():
            continue
        if "No BGL Transactions" in stripped:
            continue
            
        if set(stripped) <= {'-', '_'}:
            dash_count += 1
            if dash_count >= 2:
                data_started = True
            continue
            
        if not data_started:
            continue
            
        # Header lines inside the data block
        if "SR.NO" in stripped and "CUSTOMER NAME" in stripped:
            continue
            
        # Printer control chars
        if any(ord(c) < 32 and c not in '\t' for c in stripped):
            continue

        # Column positions from raw file:
        # SR.NO [0:8]
        # OTH BRCH [8:17]
        # CUSTOMER NAME [17:43]
        # ACCOUNT NO [43:59]
        # PRODUCT NAME [59:93]
        # TXN-CODE [93:105]
        # T-DR-AMT [105:133]
        # T-CR-AMT [133:149]
        # MK-ID [149:159]
        # CK-ID [159:]
        
        row = {
            "SR_NO": line[0:8].strip(),
            "OTH_BRCH": line[8:17].strip(),
            "CUSTOMER_NAME": line[17:43].strip(),
            "ACCOUNT_NO": line[43:59].strip(),
            "PRODUCT_NAME": line[59:90].strip(),
            "TXN_CODE": line[90:108].strip(),
            "T_DR_AMT": line[108:133].strip(),
            "T_CR_AMT": line[133:149].strip(),
            "MK_ID": line[149:159].strip(),
            "CK_ID": line[159:].strip(),
            
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", "")
        }
        
        if not row["SR_NO"] and not row["ACCOUNT_NO"]:
            continue
            
        rows.append(row)

    if not rows:
        rows.append({
            "SR_NO": "",
            "OTH_BRCH": "",
            "CUSTOMER_NAME": "",
            "ACCOUNT_NO": "",
            "PRODUCT_NAME": "",
            "TXN_CODE": "",
            "T_DR_AMT": "",
            "T_CR_AMT": "",
            "MK_ID": "",
            "CK_ID": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows
