def cleaned_lines(lines):
    cleaned = []
    for line in lines:
        # Replace grid characters with spaces to convert grids to fixed-width format
        line = line.replace("|", " ").replace("+", " ")
        
        stripped = line.strip()

        if stripped == "":
            continue

        if stripped.startswith("==="):
            continue

        # Replace hyphens with spaces ONLY IF it's likely a border separator 
        # (Actually, it's safer to just let the space replacement handle it, but wait: 
        # hyphen can be in ACCT-TYPE! Don't replace all hyphens!)
        # We will keep '-' as is, since pure dash lines are skipped above.

        cleaned.append(line)
    return cleaned

BOILERPLATE_KEYWORDS = [
    "JAMMU CENTRL CO-OPERATIVE BANK",
    "AREA:",
    "RUN DATE",
    "PROC DATE",
    "PROC-DATE",
    "BRANCH :",
    "BRANCH-NO:-",
    "BRANCH-NAME:-",
    "BRANCH NAME",
    "PAGE-NO: ",
    "PAGE NO",
]


def remove_boilerplate_lines(lines):
    cleaned = []
    for line in lines:
        upper_line = line.upper()

        is_boilerplate = False
        for keyword in BOILERPLATE_KEYWORDS:
            if keyword in upper_line:
                is_boilerplate = True
                break

        if not is_boilerplate:
            cleaned.append(line)

    return cleaned