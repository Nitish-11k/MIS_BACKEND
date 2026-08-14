from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata
import re

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    lines = [l.rstrip('\n\r') for l in raw_lines]
    
    row = {
        "BRANCH_CODE_NAME": "",
        "LETTER_DATE": "",
        "CUSTOMER_NAME": "",
        "CUSTOMER_ADDRESS": "",
        "CUSTOMER_NUMBER": "",
        "ACCOUNT_NUMBER": "",
        "PRODUCT": "",
        "PURPOSE_OF_LOAN": "",
        "AMOUNT_APPLIED": "",
        "AMOUNT_APPROVED": "",
        "DATE_OF_SANCTION": "",
        "LOAN_TERM_MONTHS": "",
        "RATE_OF_INTEREST": "",
        
        "REPORT_ID": "LOANS_SANCTION_LETTER",
        "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
        "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
        "PROC_DATE": metadata.get("PROC_DATE", "")
    }
    
    for line in lines:
        stripped = line.strip()
        
        if stripped.startswith("BRANCH:"):
            row["BRANCH_CODE_NAME"] = stripped.replace("BRANCH:", "").strip()
        elif stripped.startswith("DATE:"):
            row["LETTER_DATE"] = stripped.replace("DATE:", "").strip()
        elif stripped.startswith("Customer Name"):
            row["CUSTOMER_NAME"] = stripped.replace("Customer Name", "").strip()
        elif stripped.startswith("Address"):
            row["CUSTOMER_ADDRESS"] = stripped.replace("Address", "").strip()
            
        elif "1. Customer Number" in stripped:
            row["CUSTOMER_NUMBER"] = stripped.split(":")[-1].strip()
        elif "2. Account Number" in stripped:
            row["ACCOUNT_NUMBER"] = stripped.split(":")[-1].strip()
        elif "3. Name of the Account" in stripped:
            # Already have CUSTOMER_NAME, but can overwrite or ignore
            pass
        elif "4. Product" in stripped:
            row["PRODUCT"] = stripped.split(":")[-1].strip()
        elif "5. Purpose of the Loan" in stripped:
            row["PURPOSE_OF_LOAN"] = stripped.split(":")[-1].strip()
        elif "6. Amount Applied" in stripped:
            row["AMOUNT_APPLIED"] = stripped.split(":")[-1].strip()
        elif "7. Amount Approved" in stripped:
            row["AMOUNT_APPROVED"] = stripped.split(":")[-1].strip()
        elif "8. Date of Sanction" in stripped:
            row["DATE_OF_SANCTION"] = stripped.split(":")[-1].strip()
        elif "9. Loan Term" in stripped:
            row["LOAN_TERM_MONTHS"] = stripped.split(":")[-1].strip()
        elif "10. Rate of Interest" in stripped:
            row["RATE_OF_INTEREST"] = stripped.split(":")[-1].strip()
            
    # Check if this file was empty (just headers)
    if not any([row["CUSTOMER_NUMBER"], row["ACCOUNT_NUMBER"], row["AMOUNT_APPROVED"]]):
        row["_IS_SCHEMA_ONLY"] = True
        
    return [row]
