import gzip
from app.parser.formats.voucher_varification_report_cfpd0331 import parse

lines = gzip.open(r'C:\Users\DELL\Desktop\mis\Report_files\20250425\20250425\00001\Voucher_varification_report_cfpd0331.txt.gz', 'rt').readlines()
rows = parse(lines)
print(f"Total rows: {len(rows)}")
for i, r in enumerate(rows[:10]):
    acct = r.get("ACCOUNT_NUMBER", "")
    name = r.get("CUSTOMER_NAME", "")
    date = r.get("VALUE_DATE", "")
    cr = r.get("AMOUNT_CREDIT", "")
    dr = r.get("AMOUNT_DEBIT", "")
    print(f"ROW {i+1}: ACCT={acct}, NAME={name}, DATE={date}, DR={dr}, CR={cr}")
