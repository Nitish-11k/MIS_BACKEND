import re

def extract_metadata(lines):
    metadata = {
        "REPORT_ID": "",
        "BRANCH_CODE": "",
        "BRANCH_NAME": "",
        "PROC_DATE": ""
    }

    for line in lines[:20]:
        if metadata["REPORT_ID"] == "":
            m = re.search(r"REPORT[- ]?ID\s*:\s*([A-Z0-9\-]+)", line, re.IGNORECASE)
            if m:
                metadata["REPORT_ID"] = m.group(1).upper()

        if metadata["PROC_DATE"] == "" and "DATE" in line.upper():
            m = re.search(r"\d{2}/\d{2}/\d{4}", line)
            if m:
                metadata["PROC_DATE"] = m.group()

        if metadata["BRANCH_CODE"] == "":
            m = re.search(r"BRANCH[- _]?(?:NO|CODE)?\.?\s*:?-?\s*(\d+)", line, re.IGNORECASE)
            if m:
                metadata["BRANCH_CODE"] = m.group(1)
            else:
                m_alt = re.search(r"BRANCH\s*:\s*(\d+)", line, re.IGNORECASE)
                if m_alt:
                    metadata["BRANCH_CODE"] = m_alt.group(1)

        if metadata["BRANCH_NAME"] == "":
            m = re.search(r"BRANCH[- ]?NAME\s*:?-?\s*([A-Za-z0-9&.,() ]+?)(?:\s{2,}|$)", line, re.IGNORECASE)
            if m:
                metadata["BRANCH_NAME"] = m.group(1).strip()
            else:
                m_alt = re.search(r"BRANCH\s*:\s*\d+\s+([A-Za-z0-9&.,() ]+?)(?:\s{2,}|$)", line, re.IGNORECASE)
                if m_alt:
                    metadata["BRANCH_NAME"] = m_alt.group(1).strip()

    # Fallback for reports that omit branch name
    if metadata["BRANCH_NAME"] == "":
        if metadata["BRANCH_CODE"] == "00001":
            metadata["BRANCH_NAME"] = "HEAD OFFICE"

    return metadata