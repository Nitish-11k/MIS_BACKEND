from app.parser.formats import pipe_delimited

def parse(raw_lines):
    # This report is natively pipe-delimited, so we seamlessly route it 
    # to our robust pipe_delimited parser engine.
    return pipe_delimited.parse(raw_lines)
