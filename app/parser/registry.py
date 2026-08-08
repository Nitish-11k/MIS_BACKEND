from app.parser.formats import simple_fixed_width, pipe_delimited, account_alteration
from app.parser.formats import gl7046_01, gl7044_01, gl7044_02

REGISTRY = {
    "ACTCLS-01": simple_fixed_width.parse,
    "ACTOPN-01": simple_fixed_width.parse,
    "AU0035-01": account_alteration.parse,
    "GL7046-01": gl7046_01.parse,
    "GL7044-01": gl7044_01.parse,
    "GL7044-02": gl7044_02.parse,
}
