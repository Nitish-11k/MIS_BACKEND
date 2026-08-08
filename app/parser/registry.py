from app.parser.formats import simple_fixed_width , pipe_delimited

REGISTRY = {
    "ACTCLS-01": simple_fixed_width.parse,
    "ACTOPN-01": simple_fixed_width.parse,
    "AU0035-01": pipe_delimited.parse,
}
