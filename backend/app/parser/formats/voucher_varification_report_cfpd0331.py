from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata


# ---------------------------------------------------------
# 1. CHECK WHETHER LINE IS A VALID DATA/ACCOUNT ROW
# ---------------------------------------------------------
def is_data_row(line: str) -> bool:
    if len(line) < 20:
        return False

    account = line[0:20].strip()

    if not account:
        return False

    # Your report's account number should be numeric
    if not account.isdigit():
        return False

    if len(account) < 5:
        return False

    return True


# ---------------------------------------------------------
# 2. CHECK REPEATED PAGE HEADER
# ---------------------------------------------------------
def is_header_line(line: str) -> bool:
    s = line.strip().upper()

    if not s:
        return False

    # Your repeated column/header lines
    if "TRANSFER" in s and "ACCOUNT NO" in s:
        return True

    if "CUSTOMER/BGL ACCT NAME" in s:
        return True

    if "CREDITS" in s and "DEBITS" in s:
        return True

    if "ACCOUNT" in s and "CUSTOMER NAME" in s:
        return True

    if "NUMBER" in s and "BRANCH" in s and "DEBIT" in s:
        return True

    if "VOUCHER" in s and "VERIFICATION" in s and "REPORT" in s:
        return True

    return False


# ---------------------------------------------------------
# 3. PAGE / REPORT MARKERS
# ---------------------------------------------------------
def is_page_marker(line: str) -> bool:
    s = line.strip().upper()

    if "PAGE NO" in s:
        return True

    if "PAGE-" in s:
        return True

    if s.startswith("PAGE "):
        return True

    return False


# ---------------------------------------------------------
# 4. SEPARATOR
# ---------------------------------------------------------
def is_separator(line: str) -> bool:
    s = line.strip()

    if not s:
        return True

    return set(s) <= {
        '-', '_', '=', ' ', '<', '>', '|'
    }


# ---------------------------------------------------------
# 5. FOOTER / TOTAL
# ---------------------------------------------------------
def is_footer(line: str) -> bool:
    s = line.strip().upper()

    if "TOT VOUCH" in s:
        return True

    if s == "TOTAL":
        return True

    if s == "!D":
        return True

    return False


# ---------------------------------------------------------
# 6. CONTINUATION LINE
# ---------------------------------------------------------
def is_continuation_row(line: str) -> bool:

    # Never treat headers as continuation
    if is_header_line(line):
        return False

    # Never treat page markers as continuation
    if is_page_marker(line):
        return False

    # Never treat separators as continuation
    if is_separator(line):
        return False

    # Never treat another account as continuation
    if is_data_row(line):
        return False

    # Check actual data columns
    fields = [
        line[20:61].strip(),
        line[61:68].strip(),
        line[68:80].strip(),
        line[80:101].strip(),
        line[101:133].strip(),
        line[133:157].strip(),
        line[157:170].strip(),
        line[170:180].strip(),
        line[180:187].strip(),
        line[187:196].strip(),
        line[196:203].strip(),
        line[203:].strip(),
    ]

    return any(fields)


# ---------------------------------------------------------
# 7. APPEND CONTINUATION DATA
# ---------------------------------------------------------
def append_continuation(row, line):

    fields = {
        "CUSTOMER_NAME": line[20:61].strip(),
        "HOME_BRANCH": line[61:68].strip(),
        "VALUE_DATE": line[68:80].strip(),
        "TXN_DESC": line[80:101].strip(),
        "CHEQUE_NO": line[101:133].strip(),
        "AMOUNT_DEBIT": line[133:157].strip(),
        "AMOUNT_CREDIT": line[157:170].strip(),
        "USER_ID": line[170:180].strip(),
        "CHK1_ID": line[180:187].strip(),
        "CHK2_ID": line[187:196].strip(),
        "SUP_ID": line[196:203].strip(),
        "PRODUCT_DESC": line[203:].strip(),
    }

    for key, value in fields.items():

        if value:

            if row[key]:
                row[key] += " " + value
            else:
                row[key] = value


# ---------------------------------------------------------
# 8. MAIN PARSER
# ---------------------------------------------------------
def parse(raw_lines):

    # Metadata should be extracted once
    metadata = extract_metadata(raw_lines)

    # Remove CR/LF
    lines = [
        line.rstrip("\n\r")
        for line in raw_lines
    ]

    # Remove known boilerplate
    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    current_row = None

    data_started = False

    for line in no_boiler:

        stripped = line.strip()

        # -------------------------------------------------
        # BLANK
        # -------------------------------------------------
        if not stripped:
            continue

        # -------------------------------------------------
        # CONTROL CHARACTERS
        # -------------------------------------------------
        if any(
            ord(c) < 32 and c not in "\t"
            for c in stripped
        ):
            continue

        # -------------------------------------------------
        # PAGE HEADER
        # -------------------------------------------------
        if is_page_marker(line):
            continue

        if is_header_line(line):
            continue

        # -------------------------------------------------
        # SEPARATOR
        # -------------------------------------------------
        if is_separator(line):
            data_started = True
            continue

        # -------------------------------------------------
        # FOOTER
        # -------------------------------------------------
        if is_footer(line):
            continue

        # -------------------------------------------------
        # DATA ROW
        # -------------------------------------------------
        if is_data_row(line):

            data_started = True

            # Save previous record
            if current_row:
                rows.append(current_row)

            # Create new record
            current_row = {
                "ACCOUNT_NUMBER": line[0:20].strip(),
                "CUSTOMER_NAME": line[20:61].strip(),
                "HOME_BRANCH": line[61:68].strip(),
                "VALUE_DATE": line[68:80].strip(),
                "TXN_DESC": line[80:101].strip(),
                "CHEQUE_NO": line[101:133].strip(),
                "AMOUNT_DEBIT": line[133:157].strip(),
                "AMOUNT_CREDIT": line[157:170].strip(),
                "USER_ID": line[170:180].strip(),
                "CHK1_ID": line[180:187].strip(),
                "CHK2_ID": line[187:196].strip(),
                "SUP_ID": line[196:203].strip(),
                "PRODUCT_DESC": line[203:].strip(),

                # Metadata copied to every transaction
                "REPORT_ID": metadata.get(
                    "REPORT_ID", ""
                ),
                "BRANCH_CODE": metadata.get(
                    "BRANCH_CODE", ""
                ),
                "BRANCH_NAME": metadata.get(
                    "BRANCH_NAME", ""
                ),
                "PROC_DATE": metadata.get(
                    "PROC_DATE", ""
                ),
            }

            continue

        # -------------------------------------------------
        # CONTINUATION ROW
        # -------------------------------------------------
        if current_row and is_continuation_row(line):

            append_continuation(
                current_row,
                line
            )

            continue

        # -------------------------------------------------
        # UNKNOWN LINE
        # -------------------------------------------------
        # IMPORTANT:
        # Do NOT append unknown lines to current record.
        continue

    # -----------------------------------------------------
    # SAVE LAST RECORD
    # -----------------------------------------------------
    if current_row:
        rows.append(current_row)

    # -----------------------------------------------------
    # NO DATA
    # -----------------------------------------------------
    if not rows:
        return []

    # -----------------------------------------------------
    # DEBUG
    # -----------------------------------------------------
    print("\n--- PARSER SUMMARY ---")
    print("Metadata:", metadata)
    print("Total rows:", len(rows))

    print("\n--- FIRST 3 ROWS ---")

    for i, row in enumerate(rows[:3], start=1):
        print(f"ROW {i}:", row)

    print("----------------------\n")

    return rows
