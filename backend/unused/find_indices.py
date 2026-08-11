import gzip

with gzip.open(r'C:\Users\dell\Desktop\MIS_TOOL\20250425\20250425\00001\NPA_STMT.txt.gz', 'rt') as f:
    lines = f.readlines()
    target_line = lines[9]
    print(target_line)
    ruler1 = "".join([str(i // 10) for i in range(len(target_line))])
    ruler2 = "".join([str(i % 10) for i in range(len(target_line))])
    print(ruler1)
    print(ruler2)
