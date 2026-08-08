from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    # Clean lines
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)

    rows = []

    for line in no_boiler:
        # Skip totals, headers, and dividers
        if "====>" in line or "TOTAL" in line or line.strip().startswith("-") or not line.strip():
            # Exception: if it's the actual header row containing "ACT TOTAL", skip it
            if "ACT TOTAL" in line:
                continue
            # If a data line happens to have 'TOTAL' in the name, we shouldn't skip it, 
            # but usually boilerplate lines have '====>' or are empty. Let's rely on '====>' and 'GL CLASS CODE' header
            if "====>" in line or line.startswith("GL CLASS CODE"):
                continue

        # Data line detection (if it has a class code starting after some spaces)
        # e.g., "               00001INR1041010306                6 Staff Education Loan..."
        # So we can check if it has a long alphanumeric code
        if len(line) > 40:
            act_total_str = line[40:51].strip()
                import re
                
                rest = line[51:116].strip()
                parts = re.split(r'\s{2,}', rest)
                
                name = parts[0] if len(parts) > 0 else ""
                total_amount = parts[1] if len(parts) > 1 else ""
                
                total_interest = line[116:].strip()
                
                row = {
                    "GL_CLASS_CODE": gl_class_code,
                    "ACT_TOTAL": act_total,
                    "NAME": name,
                    "TOTAL_AMOUNT": total_amount,
                    "TOTAL_INTEREST": total_interest,
                    
                    "REPORT_ID": metadata.get("REPORT_ID", ""),
                    "BRANCH_CODE": metadata.get("BRANCH_CODE", ""),
                    "BRANCH_NAME": metadata.get("BRANCH_NAME", ""),
                    "PROC_DATE": metadata.get("PROC_DATE", ""),
                }
                rows.append(row)

    return rows
