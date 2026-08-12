"""Show raw headers for remaining problematic files"""
import gzip

files_to_check = [
    ('LOAN_IRREGULAR_REPORT.txt.gz', 'Loan Irregular'),
    ('LoansBalanceFile-lond2390.txt.gz', 'Loans Balance'),
    ('NPA_STMT.txt.gz', 'NPA Statement'),
    ('LIST_OF_NPA_ACCOUNTS.txt.gz', 'List NPA'),
]

for fname, label in files_to_check:
    path = f'data/uploads/{fname}'
    try:
        lines = gzip.open(path, 'rt', encoding='utf-8', errors='replace').readlines()
        print(f"\n{'='*120}")
        print(f"=== {label}: {fname} ===")
        print(f"{'='*120}")
        for i, l in enumerate(lines[:25]):
            print(f"{i:3d}: {repr(l.rstrip()[:200])}")
    except Exception as e:
        print(f"ERROR: {fname}: {e}")
