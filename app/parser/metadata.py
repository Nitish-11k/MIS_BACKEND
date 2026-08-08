import re

def extract_metadata(lines):
    metadata = {
        "REPORT_ID": "UNKNOWN",
        "BRANCH_CODE": "UNKNOWN",
        "BRANCH_NAME": "UNKNOWN",
        "PROC_DATE": "UNKNOWN"
    }

    for line in lines[:20]:
        if metadata["REPORT_ID"] == "UNKNOWN":
            m = re.search(r"REPORT ID\s*:\s*([A-Z0-9\-]+)", line, re.IGNORECASE)
            if m:
                metadata["REPORT_ID"] = m.group(1).upper()

        if metadata["PROC_DATE"] == "UNKNOWN" and "DATE" in line.upper():
            m = re.search(r"\d{2}/\d{2}/\d{4}", line)
            if m:
                metadata["PROC_DATE"] = m.group()

        if metadata["BRANCH_CODE"] == "UNKNOWN":
            m = re.search(r"BRANCH[- ]?NO\.?\s*:?-?\s*(\d+)", line, re.IGNORECASE)
            if m:
                metadata["BRANCH_CODE"] = m.group(1)

        if metadata["BRANCH_NAME"] == "UNKNOWN":
            m = re.search(r"BRANCH[- ]?NAME\s*:?-?\s*([A-Za-z0-9&.,() ]+?)(?:\s{2,}|$)", line, re.IGNORECASE)
            if m:
                metadata["BRANCH_NAME"] = m.group(1).strip()

    return metadata