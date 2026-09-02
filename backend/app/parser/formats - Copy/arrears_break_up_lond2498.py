from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    # Clean lines
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    current_product = "UNKNOWN"
    
    i = 0
    while i < len(no_boiler):
        line = no_boiler[i]
        
        # Subgroup tracking
        if line.startswith("PRODUCT DESCRIPTION:"):
            current_product = line.replace("PRODUCT DESCRIPTION:", "").strip()
            i += 1
            continue
        
        # A data block always starts with a line having a loan account number
        # e.g. "     402000172231             298601.00                 0.00 ..."
        # Usually it's padded with spaces. Let's check if it starts with spaces and a 12-16 digit account number.
        stripped = line.strip()
        if stripped and stripped.split()[0].isdigit() and len(stripped.split()[0]) >= 8:
            # We found a data block! It spans exactly 4 lines.
            if i + 3 < len(no_boiler):
                l1 = no_boiler[i]
                l2 = no_boiler[i+1]
                l3 = no_boiler[i+2]
                l4 = no_boiler[i+3]
                
                parts1 = l1.split()
                parts2 = l2.split()
                parts3 = l3.split()
                parts4 = l4.split()
                
                # Default safety extraction
                def safe_get(parts_list, idx):
                    return parts_list[idx].strip() if len(parts_list) > idx else ""

                loan_account = safe_get(parts1, 0)
                account_balance = safe_get(parts1, 1)
                arr_1d_28d = safe_get(parts1, 2)
                ac_bal_1d_28d = safe_get(parts1, 3)
                arr_29d_3m = safe_get(parts1, 4)
                ac_bal_29d_3m = safe_get(parts1, 5)
                arr_3m_6m = safe_get(parts1, 6)
                ac_bal_3m_6m = safe_get(parts1, 7)
                
                arr_6m_1y = safe_get(parts2, 0)
                ac_bal_6m_1y = safe_get(parts2, 1)
                arr_1y_3y = safe_get(parts2, 2)
                ac_bal_1y_3y = safe_get(parts2, 3)
                arr_3y_5y = safe_get(parts2, 4)
                ac_bal_3y_5y = safe_get(parts2, 5)
                
                arr_5y_7y = safe_get(parts3, 0)
                ac_bal_5y_7y = safe_get(parts3, 1)
                arr_7y_10y = safe_get(parts3, 2)
                ac_bal_7y_10y = safe_get(parts3, 3)
                arr_10y_15y = safe_get(parts3, 4)
                ac_bal_10y_15y = safe_get(parts3, 5)
                
                arr_15y_above = safe_get(parts4, 0)
                ac_bal_15y_above = safe_get(parts4, 1)
                
                row = {
                    "LOAN_ACCOUNT": loan_account,
                    "ACCOUNT_BALANCE": account_balance,
                    
                    "ARREARS_1D_28D": arr_1d_28d,
                    "AC_BAL_1D_28D": ac_bal_1d_28d,
                    "ARREARS_29D_3M": arr_29d_3m,
                    "AC_BAL_29D_3M": ac_bal_29d_3m,
                    "ARREARS_3M_6M": arr_3m_6m,
                    "AC_BAL_3M_6M": ac_bal_3m_6m,
                    
                    "ARREARS_6M_1Y": arr_6m_1y,
                    "AC_BAL_6M_1Y": ac_bal_6m_1y,
                    "ARREARS_1Y_3Y": arr_1y_3y,
                    "AC_BAL_1Y_3Y": ac_bal_1y_3y,
                    "ARREARS_3Y_5Y": arr_3y_5y,
                    "AC_BAL_3Y_5Y": ac_bal_3y_5y,
                    
                    "ARREARS_5Y_7Y": arr_5y_7y,
                    "AC_BAL_5Y_7Y": ac_bal_5y_7y,
                    "ARREARS_7Y_10Y": arr_7y_10y,
                    "AC_BAL_7Y_10Y": ac_bal_7y_10y,
                    "ARREARS_10Y_15Y": arr_10y_15y,
                    "AC_BAL_10Y_15Y": ac_bal_10y_15y,
                    
                    "ARREARS_15Y_ABOVE": arr_15y_above,
                    "AC_BAL_15Y_ABOVE": ac_bal_15y_above,
                    
                    "PRODUCT_DESCRIPTION": current_product,
                    
                    "REPORT_ID": metadata.get("REPORT_ID", ""),
                    "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                    "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                    "PROC_DATE": metadata.get("PROC_DATE", ""),
                }
                rows.append(row)
                
                i += 4
                continue
        i += 1

    return rows
