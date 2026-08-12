from collections import Counter
import os
from pathlib import Path

from app.parser.reader import read_report_lines


def profile_file(filepath, sample_size=500):
    lines = []
    blank_lines = 0
    lengths = []

    for line in read_report_lines(filepath):
        if line.strip():
            lines.append(line)
        else:
            blank_lines += 1

        lengths.append(len(line))

        if len(lengths) >= sample_size:
            break

    if not lengths:
        return {
            "filepath": str(filepath),
            "filename": Path(filepath).name,
            "line_count_sample": 0,
            "blank_line_count": 0,
            "min_length": 0,
            "max_length": 0,
            "avg_length": 0,
            "length_distribution": {},
            "sample_lines": []
        }

    valid_lengths = [len(line) for line in lines]
    if not valid_lengths:
        min_len = max_len = avg_len = 0
    else:
        min_len = min(valid_lengths)
        max_len = max(valid_lengths)
        avg_len = sum(valid_lengths) / len(valid_lengths)

    distribution = dict(Counter(valid_lengths))

    return {
        "filepath": str(filepath),
        "filename": Path(filepath).name,
        "line_count_sample": len(lengths),
        "blank_line_count": blank_lines,
        "min_length": min_len,
        "max_length": max_len,
        "avg_length": avg_len,
        "length_distribution": distribution,
        "sample_lines": lines[:20]  # Store first 20 non-empty lines for metadata and structure extraction
    }