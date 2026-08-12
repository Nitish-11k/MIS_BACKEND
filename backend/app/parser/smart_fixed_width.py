"""
Smart fixed-width parser that uses dash-separator lines to determine
column boundaries and reads headers from the line above.

Works for files like:
  SR_NO BR_NO SYS  ACCT_NO           CUST_NO           PROD_DESCRIPTION
  ----- ----- ---- ----------------- ----------------- ------------------
  1     00001 CCOD 00000809190003298 00000601190003294 Cash Credit...
"""
import re


def parse_fixed_width_with_dashes(lines, metadata, skip_patterns=None):
    """
    Generic smart parser for fixed-width reports with dash separator lines.
    
    1. Finds the dash-separator line (e.g. "---- ----- ---- ------")
    2. Uses dash groups to determine column start/end positions
    3. Reads the header line(s) above dashes for column names
    4. Merges multi-line headers (e.g. "A/C\\nTYPE" -> "AC_TYPE")
    5. Extracts data rows using those positions
    
    Args:
        lines: list of raw lines (strings)
        metadata: dict with REPORT_ID, BRANCH_CODE, etc.
        skip_patterns: list of strings - skip lines containing these patterns
    """
    if skip_patterns is None:
        skip_patterns = []
    
    # Step 1: Find the FIRST dash-separator line that defines columns
    # (has multiple groups of dashes separated by spaces)
    dash_line_idx = None
    dash_line = None
    
    for i, line in enumerate(lines):
        stripped = line.rstrip()
        # Must contain dashes and spaces, with multiple dash groups
        if not stripped:
            continue
        clean = stripped.replace(' ', '')
        if len(clean) > 10 and all(c == '-' for c in clean):
            # Check it has space-separated groups (not a solid line)
            groups = re.findall(r'-+', stripped)
            if len(groups) >= 3:
                dash_line_idx = i
                dash_line = stripped
                break
    
    if dash_line_idx is None:
        # Fallback: look for solid dash lines
        for i, line in enumerate(lines):
            stripped = line.rstrip()
            if len(stripped) > 20 and set(stripped.strip()) <= {'-', '='}:
                # Look at the lines immediately after this dash line
                # If they are metadata, skip this dash line
                is_metadata_box = False
                for j in range(i + 1, min(i + 5, len(lines))):
                    next_line = lines[j].upper()
                    if any(kw in next_line for kw in ['REPORT ID:', 'PROC DATE', 'RUN DATE', 'BRANCH CODE', 'BRANCH NAME', 'PAGE NO', 'BRANCH NO', 'AREA:']):
                        is_metadata_box = True
                        break
                    if set(lines[j].strip()) <= {'-', '='}:
                        break
                
                if not is_metadata_box:
                    dash_line_idx = i
                    dash_line = stripped
                    break
    
    if dash_line_idx is None:
        return []
    
    # Step 2: Extract column boundaries from the dash line
    col_ranges = []
    in_dash = False
    start = 0
    
    for i, c in enumerate(dash_line):
        if c == '-' and not in_dash:
            in_dash = True
            start = i
        elif c != '-' and in_dash:
            in_dash = False
            col_ranges.append((start, i))
    if in_dash:
        col_ranges.append((start, len(dash_line)))
        
    # Find the second dash line (some formats have header-dash-header-dash pattern)
    second_dash_idx = None
    for i in range(dash_line_idx + 1, min(dash_line_idx + 5, len(lines))):
        stripped = lines[i].rstrip()
        clean = stripped.replace(' ', '')
        if len(clean) > 10 and all(c == '-' for c in clean):
            second_dash_idx = i
            break
            
    # If the dash line was solid (only 1 column range), we MUST infer columns from the header lines.
    if len(col_ranges) == 1:
        header_lines_for_cols = []
        
        # If there are two dash lines enclosing the headers:
        if second_dash_idx is not None:
            header_lines_for_cols = [lines[i].rstrip() for i in range(dash_line_idx + 1, second_dash_idx)]
        else:
            # Otherwise, find the header line above the dash line
            for i in range(dash_line_idx - 1, -1, -1):
                if lines[i].strip() and not set(lines[i].strip()) <= {'-', '=', ' '}:
                    if not any(kw in lines[i].upper() for kw in ['REPORT ID:', 'PROC DATE', 'RUN DATE', 'BRANCH CODE', 'BRANCH NAME', 'PAGE NO', 'AREA:']):
                        header_lines_for_cols.append(lines[i].rstrip())
                        break
        
        if header_lines_for_cols:
            # We'll use the first header line to find boundaries using 2+ spaces
            # But we must find boundaries that are valid for ALL header lines
            header_line = header_lines_for_cols[0]
            
            # Check if there are '|' delimiters
            if '|' in header_line:
                col_ranges = []
                start = 0
                for i, c in enumerate(header_line):
                    if c == '|':
                        col_ranges.append((start, i + 1))
                        start = i + 1
                col_ranges.append((start, len(header_line)))
                col_ranges = [(s, e) for s, e in col_ranges if s < len(header_line)]
            else:
                # Use 2+ spaces to define boundaries. 
                # Find space gaps that exist across all header lines to prevent splitting a multi-line header incorrectly.
                matches = list(re.finditer(r' {2,}', header_line))
                if matches:
                    col_ranges = []
                    start = 0
                    for m in matches:
                        boundary = m.end() - 1
                        # Verify this boundary is also a space (or beyond the line length) in all other header lines
                        valid_boundary = True
                        for hl in header_lines_for_cols[1:]:
                            if boundary < len(hl) and hl[boundary] != ' ':
                                valid_boundary = False
                                break
                        
                        if valid_boundary:
                            col_ranges.append((start, boundary))
                            start = boundary
                            
                    col_ranges.append((start, len(header_line)))
                    
    # Expand the last column to capture remaining data
    if col_ranges:
        s, e = col_ranges[-1]
        col_ranges[-1] = (s, 999)
    
    # Step 3: Read header line(s) to get column names
    header_lines = []
    
    if 'header_lines_for_cols' in locals() and header_lines_for_cols:
        # If we inferred columns from specific header lines (e.g. between two dash lines), use those
        header_lines = header_lines_for_cols
    else:
        # Look up to 4 lines above for headers, merge multi-line headers
        for offset in range(1, 5):
            idx = dash_line_idx - offset
            if idx < 0:
                break
            line = lines[idx].rstrip()
            if not line.strip():
                break
            # Stop if it looks like metadata/title
            if any(kw in line.upper() for kw in ['REPORT ID:', 'PROC DATE', 'RUN DATE', 'BRANCH CODE', 'BRANCH NAME', 'PAGE NO', 'AREA:']):
                break
            # Stop if it's another dash line
            if set(line.strip()) <= {'-', '=', ' '}:
                break
            header_lines.insert(0, line)

    
    # Extract column names from header lines
    headers = []
    for col_idx, (s, e) in enumerate(col_ranges):
        col_parts = []
        for hl in header_lines:
            actual_e = min(e, len(hl))
            if s < len(hl):
                text = hl[s:actual_e].strip()
                if text:
                    col_parts.append(text)
        
        if col_parts:
            merged = '_'.join(col_parts)
        else:
            merged = f"COL_{col_idx}"
        
        # Sanitize: keep only alphanumeric and underscores
        sanitized = re.sub(r'[^A-Za-z0-9]', '_', merged).upper()
        sanitized = re.sub(r'_+', '_', sanitized).strip('_')
        if not sanitized:
            sanitized = f"COL_{col_idx}"
        headers.append(sanitized)
    
    # Disambiguate duplicate column names
    seen = {}
    final_headers = []
    for h in headers:
        if h in seen:
            seen[h] += 1
            final_headers.append(f"{h}_{seen[h]}")
        else:
            seen[h] = 0
            final_headers.append(h)
    headers = final_headers
    
    # Step 4: Extract data rows (everything after the dash line)
    rows = []
    
    # Find the second dash line (some formats have header-dash-header-dash pattern)
    second_dash_idx = None
    for i in range(dash_line_idx + 1, min(dash_line_idx + 5, len(lines))):
        stripped = lines[i].rstrip()
        clean = stripped.replace(' ', '')
        if len(clean) > 10 and all(c == '-' for c in clean):
            second_dash_idx = i
            break
    
    data_start = (second_dash_idx + 1) if second_dash_idx else (dash_line_idx + 1)
    
    for line in lines[data_start:]:
        stripped = line.strip()
        if not stripped:
            continue
        
        # Skip dash/separator lines
        clean = stripped.replace(' ', '').replace('-', '').replace('=', '').replace('|', '')
        if not clean:
            continue
        
        # Skip control characters
        if any(ord(c) < 32 and c not in '\t' for c in stripped):
            continue
            
        # Skip boilerplate
        upper = stripped.upper()
        if any(kw in upper for kw in ['REPORT ID:', 'RUN DATE:', 'PROC DATE', 'PAGE NO', 'AREA:', '** END', 'GRAND TOTAL', 'BRANCH TOTAL']):
            continue
            
        # Skip user-specified patterns  
        if any(pat in upper for pat in skip_patterns):
            continue
            
        # Skip TOTAL/summary lines
        if upper.startswith('TOTAL') or 'TOT VOUCH' in upper:
            continue
        
        # Extract values using column positions
        row = {}
        for col_idx, (s, e) in enumerate(col_ranges):
            actual_e = min(e, len(line)) if e != 999 else len(line)
            if s < len(line):
                val = line[s:actual_e].strip()
            else:
                val = ""
            row[headers[col_idx]] = val
        
        # Check if row has meaningful data (at least one non-empty value beyond metadata)
        has_data = any(v.strip() for k, v in row.items() if k not in ('REPORT_ID', 'BRANCH_CODE', 'BRANCH_NAME', 'PROC_DATE'))
        if not has_data:
            continue
            
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        
        rows.append(row)
    
    # If no data rows, return schema-only
    if not rows:
        row = {h: "" for h in headers}
        row["REPORT_ID"] = metadata.get("REPORT_ID", "")
        row["BRANCH_CODE"] = metadata.get("BRANCH_CODE", "")
        row["BRANCH_NAME"] = metadata.get("BRANCH_NAME", "")
        row["PROC_DATE"] = metadata.get("PROC_DATE", "")
        row["_IS_SCHEMA_ONLY"] = True
        rows.append(row)
    
    return rows
