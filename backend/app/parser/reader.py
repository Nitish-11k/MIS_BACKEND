import gzip


def read_report_lines(filepath):
    """
    Safely streams lines from a .gz or .txt file.
    Does not read the entire file into memory.
    Only strips carriage returns and newlines, preserving internal spacing.
    """
    if filepath.endswith(".gz"):
        try:
            with gzip.open(filepath, "rt", encoding="utf-8", errors="replace") as f:
                f.readline()
            opener = gzip.open
        except (gzip.BadGzipFile, EOFError, OSError):
            opener = open
    else:
        opener = open

    with opener(
        filepath,
        "rt",
        encoding="utf-8",
        errors="replace"
    ) as file:
        for line in file:
            # Only remove \r and \n from the right end, do not use strip() which removes spaces
            yield line.rstrip("\r\n")