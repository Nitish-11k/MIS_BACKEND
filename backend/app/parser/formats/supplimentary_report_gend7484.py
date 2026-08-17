from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata
from app.parser.dynamic_columns import get_column_indices_from_dashes

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    lines = [l.rstrip('\n\r') for l in raw_lines]
    
    # First, find all dash lines
    dash_indices = []
    for i, line in enumerate(lines):
        if set(line.strip()) <= {'-', ' '} and len(line.strip()) > 20:
            dash_indices.append(i)
            
    col_indices = []
    headers = []
    header_lines_for_parsing = []
    
    if dash_indices:
        target_idx = -1
        for idx in dash_indices:
            if idx > 0 and '|' in lines[idx-1]:
                target_idx = idx
                break
                
        if target_idx == -1:
            target_idx = dash_indices[0]
        
        target_line = lines[target_idx]
        
        # Capture up to 4 lines above as header lines
        start_h = max(0, target_idx - 4)
        header_lines_for_parsing = lines[start_h:target_idx]
        
        # Use the immediately preceding line for header names
        if target_idx > 0:
            last_h = lines[target_idx - 1]
            if len(last_h.strip()) > 5:
                if '|' in last_h:
                    headers = [h.strip() for h in last_h.split('|') if h.strip()]
                else:
                    import re
                    headers = [h.strip() for h in re.split(r' {2,}', last_h) if h.strip()]
                    
        col_indices = get_column_indices_from_dashes(target_line, header_lines_for_parsing)

    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    data_started = False
    dash_count = 0
    
    for line in no_boiler:
        stripped = line.strip()
        if not stripped:
            continue
            
        # Ignore lines made entirely of dashes, underscores, equals, or decorators
        if set(stripped) <= {'-', '_', '=', ' ', '<', '>', '|'}:
            dash_count += 1
            if dash_count >= 2:
                data_started = True
            continue
            
        # Explicitly skip header rows that contain common report keywords
        if "TRANSFER" in stripped and "ACCOUNT NO" in stripped:
            continue
        if "CUSTOMER/BGL ACCT NAME" in stripped:
            continue
        if "CASH" in stripped and "CLEARING" in stripped and "TRANSFER" in stripped:
            continue
        if "CREDITS" in stripped and "DEBITS" in stripped:
            continue
        if "SR_NO" in stripped and "ACCT_NO" in stripped:
            continue
        if "TOT VOUCH" in stripped or "TOTAL" in stripped:
            continue
            
        if not data_started:
            continue
            
        if any(ord(c) < 32 and c not in '\t' for c in stripped):
            continue

        custom_headers = [
            "CREDIT_CASH", "CREDIT_CLEARING", "CREDIT_TRANSFER",
            "ACCOUNT_NO", "CUSTOMER_NAME",
            "DEBIT_CASH", "DEBIT_CLEARING", "DEBIT_TRANSFER",
            "CHEQUENO", "MAKERID", "CHK1ID", "CHK2ID"
        ]
        
        row = {}
        # Parse dynamically because fixed offsets fail due to horizontal drift
        import re
        m = re.search(r'(\s+|^)(\d{12,20})(\s+)', line)
        if m:
            acc_val = m.group(2)
            acc_idx = line.find(acc_val)
            
            left = line[:acc_idx]
            right = line[acc_idx + len(acc_val):]
            
            credits = [x.strip() for x in left.split() if x.strip()]
            row["CREDIT_TRANSFER"] = credits[-1] if len(credits) >= 1 else ""
            row["CREDIT_CLEARING"] = credits[-2] if len(credits) >= 2 else ""
            row["CREDIT_CASH"] = credits[-3] if len(credits) >= 3 else ""
            
            row["ACCOUNT_NO"] = acc_val
            
            # The right side is: [Customer Name] [Debit Cash] [Debit Clearing] [Debit Transfer] [Cheque] [Maker] [Chk1] [Chk2]
            # Since Debits are numbers with commas/decimals, and IDs are 3 digits, we can find them.
            # But the Customer name can have spaces.
            
            # Since everything after customer name is generally numbers, we can use fixed offsets on the original line for them:
            dr_cash = line[120:142].strip() if len(line) > 120 else ""
            dr_clr = line[142:155].strip() if len(line) > 142 else ""
            dr_trf = line[155:177].strip() if len(line) > 155 else ""
            chq = line[177:182].strip() if len(line) > 177 else ""
            
            ids_str = line[182:]
            ids = [x.strip() for x in ids_str.split() if x.strip()]
            maker = ids[-3] if len(ids) >= 3 else ""
            chk1 = ids[-2] if len(ids) >= 2 else ids[-1] if len(ids) == 1 else ""
            chk2 = ids[-1] if len(ids) >= 2 else ""
            
            row["DEBIT_CASH"] = dr_cash
            row["DEBIT_CLEARING"] = dr_clr
            row["DEBIT_TRANSFER"] = dr_trf
            row["CHEQUENO"] = chq
            row["MAKERID"] = maker
            row["CHK1ID"] = chk1
            row["CHK2ID"] = chk2
            
            # Customer name is what is left between account and debit cash
            cust_name_end = min(120, len(line))
            cust_name = line[acc_idx + len(acc_val) : cust_name_end].strip()
            row["CUSTOMER_NAME"] = cust_name
        else:
            # Skip summary rows and formatting lines that don't have an account number
            continue
            
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        
        # basic empty check
        if not any(v for v in row.values() if v and str(v).upper() not in ["", "REPORT_ID", "BRANCH_CODE", "BRANCH_NAME", "PROC_DATE"]):
            continue
            
        if row.get("ACCOUNT_NO") and "TOTAL" in str(row.get("ACCOUNT_NO")).upper():
            continue
            
        rows.append(row)

    if not rows:
        # Schema only row
        row = {}
        for col_name in custom_headers:
            row[col_name] = ""
            
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        row["_IS_SCHEMA_ONLY"] = True
        rows.append(row)

    return rows
