from collections import Counter


CANDIDATES = [
    "|",
    "==",
    "\t",
    "::",
    ";"
]


def detect_delimiters(lines):

    results = {}

    for delimiter in CANDIDATES:

        counts = []

        for line in lines:

            counts.append(
                line.count(delimiter)
            )

        positive = [
            count for count in counts
            if count > 0
        ]

        if not positive:
            results[delimiter] = {
                "score": 0,
                "avg_count": 0
            }
            continue

        frequency = len(positive) / len(lines)

        avg_count = sum(positive) / len(positive)

        results[delimiter] = {
            "score": frequency,
            "avg_count": avg_count
        }

    return results