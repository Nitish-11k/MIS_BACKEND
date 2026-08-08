import re 

def extract_metadata(lines):

    metadata = {
        "BRANCH_CODE" : "UNKNOWN",
        "BRANCH_NAME" : "UNKNOWN",
        "PROC_DATE" : "UNKNOWN"
    }

    for line in lines[:20]:
        line_upper = line.upper()

        if "DATE" in line_upper:
            date_match = re.search(r"\d{2}/\d{2}/\d{4}", line_upper)

            if date_match:
                metadata["PROC_DATE"] = date_match.group()
        
        branch_match = re.search(r"BRANCH[^\d]+(\d+)\s+([A-Za-z ]+)", line_upper)
        if branch_match:
            metadata["BRANCH_CODE"] = branch_match.group(1).strip()

            name = branch_match.group(2).split(" ")[0].strip()
            name = name.split("PROC")[0].strip()
            metadata["BRANCH_NAME"] = name

    return metadata
