import gzip

f1 = r'C:\Users\dell\Desktop\MIS_TOOL\20250425\20250425\00001\Debit_transactions_on_income_acct-gend7045.txt.gz'
f2 = r'C:\Users\dell\Desktop\MIS_TOOL\20250425\20250425\00001\Debit_balance_in_income_account-gend7041.txt.gz'

print("---7045---")
with gzip.open(f1, 'rt') as f:
    for i in range(15):
        print(next(f).rstrip())

print("---7041---")
with gzip.open(f2, 'rt') as f:
    for i in range(15):
        print(next(f).rstrip())
