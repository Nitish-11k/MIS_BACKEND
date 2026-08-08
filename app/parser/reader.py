import gzip

def read_report_lines(filepath):
    if(filepath.endswith(".gz")):
        opener = gzip.open
    else:
        opener = open

    with opener(filepath, "rt" , encoding="utf-8", errors="replace") as f:
        lines =f.readlines()

    return lines