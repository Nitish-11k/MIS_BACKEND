import re
from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata


class ParsedReport(dict):
    """
    A dictionary containing parser metadata and output metrics:
      - report_type: "ARREARS_BREAKUP"
      - proc_date: "..."
      - total_records: int
      - valid_records: int
      - partial_records: int
      - invalid_records: int
      - records: list of record dicts
      - errors: list of global parsing errors

    Implements sequence methods (__len__, __getitem__, __iter__) for backward
    compatibility with legacy callers expecting a list of records.
    """
    def __len__(self):
        return len(self.get("records", []))

    def __getitem__(self, key):
        if isinstance(key, int):
            return self["records"][key]
        return super().__getitem__(key)

    def __iter__(self):
        return iter(self.get("records", []))


def safe_get(parts, idx):
    """Safely return part string or None if missing or empty."""
    if len(parts) > idx and parts[idx].strip():
        return parts[idx].strip()
    return None


def clean_numeric(val, field_name, errors):
    """
    Validate numeric value without silent zero conversion.
    Returns formatted float string or None if field is blank.
    If value is invalid, preserves raw value and records error.
    """
    if val is None or val == "":
        return None
    cleaned = str(val).strip().replace(",", "")
    try:
        f = float(cleaned)
        return f"{f:.2f}"
    except ValueError:
        errors.append(f"Invalid numeric value '{val}' for {field_name}")
        return val


def is_header_or_boilerplate(line: str) -> bool:
    """Check if a line is a header, separator, metadata, or boilerplate line."""
    if not line or not line.strip():
        return True
    stripped = line.strip()
    if re.match(r"^[\-\=\*\+\|]+$", stripped):
        return True
    upper = line.upper()
    header_keywords = [
        "REPORT ID", "REPORT-ID", "RUN DATE", "PROC DATE", "PROC-DATE",
        "BRANCH NO", "BRANCH CODE", "BRANCH NAME", "BRANCH-NO", "BRANCH-NAME",
        "PAGE NO", "PAGE-NO", "JAMMU CENTRL CO-OPERATIVE BANK", "AREA:",
        "LOAN ACCOUNT", "ACCOUNT BALANCE", "ARREARS(", "A/C BAL(",
        "CHECKED BY", "CHECKER ID", "TELLER NAME", "MAKER ID",
        "END OF REPORT", "TOTAL :", "SUB TOTAL", "GRAND TOTAL", "PAGE TOTAL",
        "ABSTRACT(YES)"
    ]
    for kw in header_keywords:
        if kw in upper:
            return True
    return False


def is_account_start(line: str) -> bool:
    """Identify if line starts a valid logical account record (8-18 digit account number)."""
    if not line or is_header_or_boilerplate(line):
        return False
    if "PRODUCT DESCRIPTION:" in line.upper():
        return False
    stripped = line.strip()
    tokens = stripped.split()
    if not tokens:
        return False
    first_token = tokens[0]
    return first_token.isdigit() and 8 <= len(first_token) <= 18


def parse(raw_lines):
    """
    Robust 4-line Arrears Breakup Report Parser (BR2498-01).
    Extracts 22 financial fields per account record along with product description
    and metadata, validating 4-line blocks and flagging PARTIAL / INVALID records.
    """
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip("\n\r") for l in raw_lines]

    records = []
    global_errors = []
    current_product = "UNKNOWN"

    i = 0
    while i < len(lines):
        line = lines[i]

        # Update product section
        if "PRODUCT DESCRIPTION:" in line.upper():
            parts = line.split("PRODUCT DESCRIPTION:", 1)
            if len(parts) > 1:
                current_product = parts[1].strip()
            i += 1
            continue

        # Skip headers / boilerplate
        if is_header_or_boilerplate(line):
            i += 1
            continue

        # Detect account start
        if is_account_start(line):
            block = [line]
            j = i + 1
            while j < len(lines) and len(block) < 4:
                next_line = lines[j]
                if "PRODUCT DESCRIPTION:" in next_line.upper() or is_account_start(next_line) or is_header_or_boilerplate(next_line):
                    break
                if next_line.strip():
                    block.append(next_line)
                j += 1

            rec_errors = []
            parts1 = block[0].split()
            loan_acc_raw = safe_get(parts1, 0)

            if not loan_acc_raw or not loan_acc_raw.isdigit() or not (8 <= len(loan_acc_raw) <= 18):
                rec_errors.append(f"Malformed LOAN_ACCOUNT: {loan_acc_raw}")

            acct_bal = clean_numeric(safe_get(parts1, 1), "ACCOUNT_BALANCE", rec_errors)
            arr_1d_28d = clean_numeric(safe_get(parts1, 2), "ARREARS_1D_28D", rec_errors)
            ac_bal_1d_28d = clean_numeric(safe_get(parts1, 3), "AC_BAL_1D_28D", rec_errors)
            arr_29d_3m = clean_numeric(safe_get(parts1, 4), "ARREARS_29D_3M", rec_errors)
            ac_bal_29d_3m = clean_numeric(safe_get(parts1, 5), "AC_BAL_29D_3M", rec_errors)
            arr_3m_6m = clean_numeric(safe_get(parts1, 6), "ARREARS_3M_6M", rec_errors)
            ac_bal_3m_6m = clean_numeric(safe_get(parts1, 7), "AC_BAL_3M_6M", rec_errors)

            if len(block) >= 2:
                parts2 = block[1].split()
                arr_6m_1y = clean_numeric(safe_get(parts2, 0), "ARREARS_6M_1Y", rec_errors)
                ac_bal_6m_1y = clean_numeric(safe_get(parts2, 1), "AC_BAL_6M_1Y", rec_errors)
                arr_1y_3y = clean_numeric(safe_get(parts2, 2), "ARREARS_1Y_3Y", rec_errors)
                ac_bal_1y_3y = clean_numeric(safe_get(parts2, 3), "AC_BAL_1Y_3Y", rec_errors)
                arr_3y_5y = clean_numeric(safe_get(parts2, 4), "ARREARS_3Y_5Y", rec_errors)
                ac_bal_3y_5y = clean_numeric(safe_get(parts2, 5), "AC_BAL_3Y_5Y", rec_errors)
            else:
                arr_6m_1y = ac_bal_6m_1y = arr_1y_3y = ac_bal_1y_3y = arr_3y_5y = ac_bal_3y_5y = None

            if len(block) >= 3:
                parts3 = block[2].split()
                arr_5y_7y = clean_numeric(safe_get(parts3, 0), "ARREARS_5Y_7Y", rec_errors)
                ac_bal_5y_7y = clean_numeric(safe_get(parts3, 1), "AC_BAL_5Y_7Y", rec_errors)
                arr_7y_10y = clean_numeric(safe_get(parts3, 2), "ARREARS_7Y_10Y", rec_errors)
                ac_bal_7y_10y = clean_numeric(safe_get(parts3, 3), "AC_BAL_7Y_10Y", rec_errors)
                arr_10y_15y = clean_numeric(safe_get(parts3, 4), "ARREARS_10Y_15Y", rec_errors)
                ac_bal_10y_15y = clean_numeric(safe_get(parts3, 5), "AC_BAL_10Y_15Y", rec_errors)
            else:
                arr_5y_7y = ac_bal_5y_7y = arr_7y_10y = ac_bal_7y_10y = arr_10y_15y = ac_bal_10y_15y = None

            if len(block) >= 4:
                parts4 = block[3].split()
                arr_15y_above = clean_numeric(safe_get(parts4, 0), "ARREARS_15Y_ABOVE", rec_errors)
                ac_bal_15y_above = clean_numeric(safe_get(parts4, 1), "AC_BAL_15Y_ABOVE", rec_errors)
            else:
                arr_15y_above = ac_bal_15y_above = None

            if len(block) < 4:
                rec_errors.append(f"Incomplete 4-line record: only {len(block)} physical lines found")

            if any("LOAN_ACCOUNT" in e for e in rec_errors):
                status = "INVALID"
            elif rec_errors:
                status = "PARTIAL"
            else:
                status = "VALID"

            row = {
                "LOAN_ACCOUNT": loan_acc_raw,
                "ACCOUNT_BALANCE": acct_bal,

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

                "_status": status,
                "_errors": rec_errors
            }
            records.append(row)
            i = j
        else:
            global_errors.append({"line_no": i + 1, "raw_line": line, "error": "Unrecognized line"})
            i += 1

    valid_cnt = sum(1 for r in records if r["_status"] == "VALID")
    partial_cnt = sum(1 for r in records if r["_status"] == "PARTIAL")
    invalid_cnt = sum(1 for r in records if r["_status"] == "INVALID")

    return ParsedReport({
        "report_type": "ARREARS_BREAKUP",
        "proc_date": metadata.get("PROC_DATE", ""),
        "total_records": len(records),
        "valid_records": valid_cnt,
        "partial_records": partial_cnt,
        "invalid_records": invalid_cnt,
        "records": records,
        "errors": global_errors
    })
