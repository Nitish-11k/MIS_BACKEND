import os

files_to_fix = [
    "Debit_balance_in_income_account-gend7041.txt.gz",
    "Interbranch_Transactions_by_us_cifd0528.txt.gz",
    "LOANS_SANCTION_LETTER_FOR_AC402000294534.txt.gz",
    "Overdue_Notice_lond2384.txt.gz"
]

metadata_file = r"C:\Users\dell\Desktop\bank_mis_parser_backend\app\parser\metadata.py"

with open(metadata_file, "r") as f:
    content = f.read()

# Add a function wrapper to extract_metadata to handle filenames
# Wait, metadata.py extract_metadata doesn't take filename.
# I will just write a wrapper in main.py or adjust main.py to map filenames to parsers directly!
