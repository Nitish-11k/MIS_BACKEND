from app.scanner.profiler import profile_file
from app.scanner.delimiter_detector import detect_delimiters
from app.scanner.classifier import classify
from app.parser.metadata import extract_metadata


file = "../data/incoming/20250425/00001/ACCOUNT_ALTERATION_DETAILS_REPORT.txt.gz"

profile = profile_file(file)

lines = profile["sample_lines"]

metadata = extract_metadata(lines)

delimiter_results = detect_delimiters(lines)

result = classify(
    profile,
    metadata,
    delimiter_results
)

print("PROFILE")
print(profile)

print("\nMETADATA")
print(metadata)

print("\nDELIMITERS")
print(delimiter_results)

print("\nCLASSIFICATION")
print(result)