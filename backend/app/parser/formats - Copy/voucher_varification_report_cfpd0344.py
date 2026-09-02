import re
from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]

    records = []
    current_record = []
    
    # Collect multiline records
    for line in lines:
        if '-----' in line or 'VOUCHER  VERIFICATION' in line or 'PAGE NO' in line or 'REPORT ID' in line or 'AREA:' in line:
            continue
        if 'ACCOUNT      CUSTOMER NAME' in line or 'NUMBER                                       BRNCH' in line:
            continue
        if 'TELLER NAME  :' in line or 'CURRENCY : INR' in line or 'CHECKER ID :' in line or 'BRANCH CODE :' in line:
            continue
            
        if not line.strip():
            continue
            
        # Check if line starts with an account number (spaces + 10-16 digits)
        if re.match(r'^\s{0,5}\d{10,16}', line[:20]):
            if current_record:
                records.append(current_record)
            current_record = [line]
        elif current_record:
            current_record.append(line)
            
    if current_record:
        records.append(current_record)

    rows = []
    for record_lines in records:
        line1 = record_lines[0]
        
        account_no = line1[0:16].strip()
        customer_name = line1[16:48].strip()
        home_branch = line1[48:54].strip()
        value_date = line1[54:64].strip()
        txn_desc = line1[64:81].strip()
        cheque_no = line1[81:111].strip()
        debit = line1[111:125].strip()
        credit = line1[125:143].strip()
        user_id = line1[143:151].strip()
        chk1 = line1[151:159].strip()
        chk2 = line1[159:167].strip()
        sup = line1[167:175].strip()
        product_desc = line1[175:].strip()
        
        for line in record_lines[1:]:
            # It's a continuation of the customer name
            customer_name += " " + line[16:48].strip()
            customer_name = customer_name.strip()
                
        row = {
            "ACCOUNT_NUMBER": account_no,
            "CUSTOMER_NAME": customer_name,
            "HOME_BRANCH": home_branch,
            "VALUE_DATE": value_date,
            "TXN_DESC": txn_desc,
            "CHEQUE_NO": cheque_no,
            "DEBIT": debit,
            "CREDIT": credit,
            "USER_ID": user_id,
            "CHK1_ID": chk1,
            "CHK2_ID": chk2,
            "SUP_ID": sup,
            "PRODUCT_DESC": product_desc,
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", "")
        }
        
        if row["ACCOUNT_NUMBER"]:
            rows.append(row)

    if not rows:
        rows.append({
            "ACCOUNT_NUMBER": "", "CUSTOMER_NAME": "", "HOME_BRANCH": "", 
            "VALUE_DATE": "", "TXN_DESC": "", "CHEQUE_NO": "", 
            "DEBIT": "", "CREDIT": "", "USER_ID": "", 
            "CHK1_ID": "", "CHK2_ID": "", "SUP_ID": "", "PRODUCT_DESC": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })
        
    return rows
