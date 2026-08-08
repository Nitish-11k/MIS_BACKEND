import re

def extract_table_name(lines):
    for line in lines[:15]:
        stripped = line.strip()
        if not stripped:
            continue

        if "REPORT" in stripped.upper() and len(stripped) > 10:
            name = stripped.upper()
            # Clean out dates
            name = re.sub(r"\d{2}/\d{2}/\d{4}", "", name)
            # Clean out "AS ON"
            name = name.replace("AS ON", "")
            # Clean out "PAGE-NO" and numbers
            name = re.sub(r"PAGE-NO\s*\d+", "", name)
            # Clean out REPORT ID
            name = re.sub(r"REPORT ID\s*:\s*[A-Z0-9-]+", "", name)
            
            return normalize_table_name(name)
            
    return "UNKNOWN_TABLE"

def normalize_table_name(name):
    name = re.sub(r"[^A-Za-z0-9]+", "_", name.strip())
    return name.strip("_").upper()