from app.parser.formats import interestratechangeloans_cfpd0337, irregular_excess_draw_lond2397cpc, list_of_npa_accounts, loansbalancefile_lond2390, loan_irregular_report, non_home_branch_cifd0363, probable_npa_report_lond2463, report_high_value_transactions, report_maturing_securities_lond2443, rupee_drawing_list_cfpd0388, supplimentary_control_gend7484, supplimentary_control_gend7516, supplimentary_report_gend7484, transfer_supplementary_gend7484, transfer_supplementary_gend7516, voucher_varification_report_cfpd0331, voucher_varification_report_cfpd0344, interbranch_transactions_cifd0528
from app.parser.formats import simple_fixed_width, pipe_delimited, account_alteration
from app.parser.formats import bal_in_gl_acc_glcc_wise_det, bal_in_loan_acc_glcc_wise_det, bal_in_loan_acc_glcc_wise_sum, arrears_break_up_lond2498
from app.parser.formats import bgl_txn_enquiry_gend0600, cc_od_balance_file_depd0580, coll_matured_sec_lond2444
from app.parser.formats import gl_daybook_gend0807, homebranchusers_cfpd0300, id_least_transaction_lond2482
from app.parser.formats import credit_balance_in_expense_account_gend7042, customer_member_report
from app.parser.formats import daily_productwise_report_loan_dep_clearing_gnbd7376
from app.parser.formats import debit_balance_in_income_account_gend7041, debit_transactions_on_income_acct_gend7045
from app.parser.formats import deposits_balance_file_depd0586, drawing_power_lond2388, exception_report_depd0670
from app.parser.formats import exception_report_for_interest_rates_variation_depd0650, gend1012_prt
from app.parser.formats import gend1012_prt2, dep_shadow_file, glcc_wise_bal_rep, glcc_wise_sum_rep
from app.parser.formats import npa_stmt
from app.parser.formats import account_opened_report, account_closed_report
from app.parser.formats import id_users_logged_no_transactions_lond2482, id_users_terminals_not_logged_lond2482
from app.parser.formats import listof_npa_accounts_lond2572
from app.parser.formats import agewise_report_of_sys_susp_gend7053, advicefortd
from app.parser.formats import loans_sanction_letter

REGISTRY = {
    "ACTCLS-01": account_closed_report.parse,
    "ACTOPN-01": account_opened_report.parse,
    "AU0035-01": account_alteration.parse,
    "BR2572-01": listof_npa_accounts_lond2572.parse,
    "GL7046-01": bal_in_gl_acc_glcc_wise_det.parse,
    "GL7044-01": bal_in_loan_acc_glcc_wise_det.parse,
    "GL7044-02": bal_in_loan_acc_glcc_wise_sum.parse,
    "BR2498-01": arrears_break_up_lond2498.parse,
    "GL0600-01": bgl_txn_enquiry_gend0600.parse,
    "IN0580-01": cc_od_balance_file_depd0580.parse,
    "BR2444-01": coll_matured_sec_lond2444.parse,
    "GL0807-01": gl_daybook_gend0807.parse,
    "SY0300-01": homebranchusers_cfpd0300.parse,
    "BR2482-01": id_least_transaction_lond2482.parse,
    "GL7042-01": credit_balance_in_expense_account_gend7042.parse,
    "customer_member": customer_member_report.parse,
    "GB7376": daily_productwise_report_loan_dep_clearing_gnbd7376.parse,
    "GL7041-01": debit_balance_in_income_account_gend7041.parse,
    "GL7045-01": debit_transactions_on_income_acct_gend7045.parse,
    "IN0586-01": deposits_balance_file_depd0586.parse,
    "BR2388-01": drawing_power_lond2388.parse,
    "IN0670-01": exception_report_depd0670.parse,
    "IN0650-01": exception_report_for_interest_rates_variation_depd0650.parse,
    "GL1012-01": gend1012_prt.parse,
    "GL1012-02": gend1012_prt2.parse,
    "shadow_file": dep_shadow_file.parse,
    "GL7043-01": glcc_wise_bal_rep.parse,
    "GL7043-02": glcc_wise_sum_rep.parse,
    "gend7041": debit_balance_in_income_account_gend7041.parse,
    "gend7045": debit_transactions_on_income_acct_gend7045.parse,
    "NPAD0001": npa_stmt.parse,
    "SY0337-01": interestratechangeloans_cfpd0337.parse,
    "BR2397-01": irregular_excess_draw_lond2397cpc.parse,
    "NPALIST1": list_of_npa_accounts.parse,
    "BR2390-01": loansbalancefile_lond2390.parse,
    "BR2490-01": loan_irregular_report.parse,
    "SY0363-01": non_home_branch_cifd0363.parse,
    "BR2463-01": probable_npa_report_lond2463.parse,
    "BR2599-01": report_high_value_transactions.parse,
    "BR2443-01": report_maturing_securities_lond2443.parse,
    "SY0388-01": rupee_drawing_list_cfpd0388.parse,
    "GN7484": supplimentary_control_gend7484.parse,
    "GN7516": supplimentary_control_gend7516.parse,
    "GN7484_2": supplimentary_report_gend7484.parse,
    "GN7484_3": transfer_supplementary_gend7484.parse,
    "GN7516_2": transfer_supplementary_gend7516.parse,
    "SY0331-01": voucher_varification_report_cfpd0331.parse,
    "SY0344-01": voucher_varification_report_cfpd0344.parse,
    "CIFD0528": interbranch_transactions_cifd0528.parse,
    "BR2482-02": id_users_logged_no_transactions_lond2482.parse,
    "BR2482-03": id_users_terminals_not_logged_lond2482.parse,
    "GL7053-01": agewise_report_of_sys_susp_gend7053.parse,
    "ADVICEFORTD": advicefortd.parse,
    "LOANS_SANCTION_LETTER": loans_sanction_letter.parse,
}
