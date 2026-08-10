from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    # Clean lines
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    
    # The file is currently empty of data rows, but we will scan for any lines starting with a digit (SR-NO)
    for line in no_boiler:
        stripped = line.strip()
        if stripped and stripped.split()[0].isdigit() and len(stripped.split()[0]) <= 5:
            # We found a data row!
            sr_no = line[0:10].strip()
            account_no = line[10:23].strip()
            customer_name = line[23:53].strip()
            description = line[53:74].strip()
            collateral_no = line[74:89].strip()
            issue_date = line[89:102].strip()
            value_of_security = line[102:113].strip()
            maturity_period = line[113:124].strip()
            maturity_date = line[124:].strip()
            
            row = {
                "SR_NO": sr_no,
                "ACCOUNT_NO": account_no,
                "CUSTOMER_NAME": customer_name,
                "DESCRIPTION": description,
                "COLLATERAL_NO": collateral_no,
                "ISSUE_DATE": issue_date,
                "VALUE_OF_SECURITY": value_of_security,
                "MATURITY_PERIOD": maturity_period,
                "MATURITY_DATE": maturity_date,
                
                "REPORT_ID": metadata.get("REPORT_ID", ""),
                "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                "PROC_DATE": metadata.get("PROC_DATE", ""),
            }
            rows.append(row)

    if not rows:
        rows.append({
            "SR_NO": "",
            "ACCOUNT_NO": "",
            "CUSTOMER_NAME": "",
            "DESCRIPTION": "",
            "COLLATERAL_NO": "",
            "ISSUE_DATE": "",
            "VALUE_OF_SECURITY": "",
            "MATURITY_PERIOD": "",
            "MATURITY_DATE": "",
            "REPORT_ID": metadata.get("REPORT_ID", ""),
            "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
            "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
            "PROC_DATE": metadata.get("PROC_DATE", ""),
            "_IS_SCHEMA_ONLY": True
        })

    return rows
