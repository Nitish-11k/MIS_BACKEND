from collections import Counter


CANDIDATES = [
    "|",
    "==",
    "\t",
    ",",
    ";",
    ":",
    "::"
]

def detect_delimiters(lines):
    """
    Detects possible delimiters by structurally analyzing multiple lines.
    Calculates frequency, occurrence consistency, and estimated column count.
    """
    results = {}
    
    if not lines:
        return results

    total_lines = len(lines)

    for delimiter in CANDIDATES:
        counts = [line.count(delimiter) for line in lines]
        positive_counts = [count for count in counts if count > 0]

        if not positive_counts:
            results[delimiter] = {
                "score": 0.0,
                "confidence": 0.0,
                "avg_count": 0,
                "consistency": 0.0,
                "estimated_columns": 0
            }
            continue

        # Percentage of lines containing the delimiter
        frequency = len(positive_counts) / total_lines
        avg_count = sum(positive_counts) / len(positive_counts)
        
        # Occurrence consistency (what percentage of positive lines have the mode count)
        count_freq = Counter(positive_counts)
        most_common_count, most_common_freq = count_freq.most_common(1)[0]
        consistency = most_common_freq / len(positive_counts)
        
        estimated_columns = most_common_count + 1
        
        # Calculate confidence based on frequency and consistency
        # A good delimiter appears in most lines and has a consistent count
        confidence = (frequency * 0.4) + (consistency * 0.6)
        
        # Only assign high confidence if it's consistently appearing and there are multiple columns
        if most_common_count == 0:
            confidence = 0.0
            estimated_columns = 0

        results[delimiter] = {
            "score": frequency,
            "confidence": confidence,
            "avg_count": avg_count,
            "consistency": consistency,
            "estimated_columns": estimated_columns,
            "mode_count": most_common_count
        }

    return results
