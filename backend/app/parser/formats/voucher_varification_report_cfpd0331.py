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
        if 'ACCOUNT    CUSTOMER NAME' in line or 'NUMBER                                            BRANCH' in line:
            continue
        if 'TELLER NAME  :' in line or 'CURRENCY : INR' in line or 'CHECKER ID :' in line or 'BRANCH CODE :' in line:
            continue
            
        if not line.strip():
            continue
            
        # Check if line starts with an account number (e.g. spaces followed by 10-16 digits)
        if re.match(r'^\s{2,10}\d{10,16}', line[:20]):
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
        
        account_no = line1[0:21].strip()
        customer_name = line1[21:61].strip()
        home_branch = line1[61:69].strip()
        product_desc = line1[195:].strip() if len(line1) > 195 else ""

        value_date = ""
        txn_desc = ""
        cheque_no = ""
        debit = ""
        credit = ""
        user_id = ""
        chk1 = ""
        chk2 = ""
        sup = ""
        
        for line in record_lines[1:]:
            # Check if this line contains the transaction details (Date is usually around index 69)
            if len(line) > 75 and re.match(r'\d{2}/\d{2}/\d{4}', line[69:79].strip()):
                value_date = line[69:81].strip()
                txn_desc = line[81:103].strip()
                cheque_no = line[103:120].strip()
                debit = line[120:144].strip()
                credit = line[144:165].strip()
                user_id = line[165:179].strip()
                chk1 = line[179:184].strip() if len(line) > 175 else ""
                chk2 = line[184:195].strip() if len(line) > 184 else ""
                sup = line[195:202].strip() if len(line) > 195 else ""
            else:
                # It's a continuation of the customer name
                customer_name += " " + line[21:61].strip()
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
