from app.parser.metadata import extract_metadata
from app.parser.smart_fixed_width import parse_fixed_width_with_dashes

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    lines = [l.rstrip('\n\r') for l in raw_lines]
    return parse_fixed_width_with_dashes(lines, metadata)
