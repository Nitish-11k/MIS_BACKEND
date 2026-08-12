from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    # Clean lines
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    
    for line in no_boiler:
        # A data row starts with S1# which is a 5-digit number
        s1 = line[0:5].strip()
        if s1.isdigit():
            branch = line[5:14].strip()
            term = line[14:20].strip()
            user = line[20:31].strip()
            txn_code = line[31:40].strip()
            post_date = line[40:53].strip()
            trace_no = line[53:67].strip()
            amount_dr = line[67:90].strip()
            amount_cr = line[90:113].strip()
            balance = line[113:137].strip()
            statement_narrative = line[137:190].strip()
            ref_no = line[190:].strip()
            
            row = {
                "S1_NO": s1,
                "BRANCH": branch,
                "TERM": term,
                "USER": user,
                "TXN_CODE": txn_code,
                "POST_DATE": post_date,
                "TRACE_NO": trace_no,
                "AMOUNT_DR": amount_dr,
                "AMOUNT_CR": amount_cr,
                "BALANCE": balance,
                "STATEMENT_NARRATIVE": statement_narrative,
                "REFERENCE_NO": ref_no,
                
                "REPORT_ID": metadata.get("REPORT_ID", ""),
                "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                "PROC_DATE": metadata.get("PROC_DATE", ""),
            }
            rows.append(row)

    return rows
