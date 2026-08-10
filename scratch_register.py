import os

unparsed_files = {
  "SY0337-01": "interestratechangeloans_cfpd0337",
  "BR2397-01": "irregular_excess_draw_lond2397cpc",
  "NPALIST1": "list_of_npa_accounts",
  "BR2390-01": "loansbalancefile_lond2390",
  "BR2490-01": "loan_irregular_report",
  "SY0363-01": "non_home_branch_cifd0363",
  "BR2463-01": "probable_npa_report_lond2463",
  "BR2599-01": "report_high_value_transactions",
  "BR2443-01": "report_maturing_securities_lond2443",
  "SY0388-01": "rupee_drawing_list_cfpd0388",
  "GN7484": "supplimentary_control_gend7484",
  "GN7516": "supplimentary_control_gend7516",
  "GN7484_2": "supplimentary_report_gend7484",
  "GN7484_3": "transfer_supplementary_gend7484",
  "GN7516_2": "transfer_supplementary_gend7516",
  "SY0331-01": "voucher_varification_report_cfpd0331",
  "SY0344-01": "voucher_varification_report_cfpd0344",
  "CIFD0528": "interbranch_transactions_cifd0528"
}

import_lines = "from app.parser.formats import " + ", ".join(unparsed_files.values()) + "\n"

registry_file = r"C:\Users\dell\Desktop\bank_mis_parser_backend\app\parser\registry.py"

with open(registry_file, "r") as f:
    content = f.read()
    
# insert imports at top
content = import_lines + content

# insert keys into REGISTRY
registry_lines = []
for report_id, module_name in unparsed_files.items():
    registry_lines.append(f'    "{report_id}": {module_name}.parse,')

insert_pos = content.rfind("}")
if insert_pos != -1:
    content = content[:insert_pos] + "\n".join(registry_lines) + "\n" + content[insert_pos:]
    
with open(registry_file, "w") as f:
    f.write(content)

print("Updated registry.py!")
