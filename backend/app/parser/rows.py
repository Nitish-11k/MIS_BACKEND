def extract_rows(data_lines, columns):
    rows = []
    for line in data_lines:
        if not line.strip():
            continue
        row = {}
        for name, start, end in columns:
            row[name] = line[start:end].strip()

        rows.append(row)

    return rows