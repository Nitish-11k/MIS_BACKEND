from app.parser.cleaner import remove_boilerplate_lines
from app.parser.metadata import extract_metadata

def parse(raw_lines):
    metadata = extract_metadata(raw_lines)
    
    lines = [l.rstrip('\n\r') for l in raw_lines]
    no_boiler = remove_boilerplate_lines(lines)

    rows = []
    for line in no_boiler:
        stripped = line.strip()
        if not stripped: continue
        
        # Highly specialized shadow file parsing
        row = {
            "INSTNO": line[0:3].strip(),
            "ACCNO": line[3:20].strip(),
            "BRNO": line[20:25].strip(),
            "CIFNO": line[25:42].strip(),
            "NAME": line[42:102].strip(),
            "OPNDATE": line[102:110].strip(),
            "CURRENCY": line[110:113].strip(),
            "STATUS": line[113:115].strip(),
            "STPCHQIND": line[115:116].strip(),
            "CURRBAL": line[116:134].strip(),
            "AVLBAL": line[134:152].strip(),
            "UNCLRAMT": line[152:170].strip(),
            "LOANARREAR": line[170:188].strip(),
            "NEXTREPDT": line[188:196].strip(),
            "ACCTYPE": line[196:200].strip(),
            "INTCAT": line[200:204].strip(),
            "ACCCODE": line[204:205].strip(),
            "MTDATE": line[205:213].strip(),
            "INTRATE": line[213:220].strip(),
            "SECIND": line[220:221].strip(),
            "SEGCODE": line[221:225].strip(),
            "ACTCLOSEDT": line[225:233].strip(),
            "SANCDATE": line[233:241].strip(),
            "POSREST": line[241:242].strip(),
            "HOLD": line[242:243].strip(),
            "STOP": line[243:244].strip(),
            "EXTNCTRID": line[244:249].strip(),
            "NEWIRAC": line[249:251].strip(),
            "OLDIRAC": line[251:253].strip(),
            "DEPPRD": line[253: 257].strip(),
            "EMIDUE": line[257:261].strip(),
            "EMIPAID": line[261:265].strip(),
            "EMIOVERDUE": line[265:269].strip(),
            "ODLIMIT": line[269:287].strip(),
            "DATE": line[287:297].strip(),
            "CODE": line[297:302].strip(),
            "NAME1": line[302:362].strip(),
            "REPACCCODE": line[362:363].strip(),
            "SCHEMEDESC": line[363: 388].strip(),
            "ADDRESS1": line[388: 428].strip(),
            "ADDRESS2": line[428:468].strip(),
            "ADDRESS3": line[468:508].strip(),
            "ADDRESS4": line[508:548].strip(),
            "PINCODE": line[548:554].strip(),
        }
        rows.append(row)
        
    if not rows:
        dummy_row = {
            "INSTNO": "",
            "ACCNO": "",
            "BRNO": "",
            "CIFNO": "",
            "NAME": "",
            "OPNDATE": "",
            "CURRENCY": "",
            "STATUS": "",
            "STPCHQIND": "",
            "CURRBAL": "",
            "AVLBAL": "",
            "UNCLRAMT": "",
            "LOANARREAR": "",
            "NEXTREPDT": "",
            "ACCTYPE": "",
            "INTCAT": "",
            "ACCCODE": "",
            "MTDATE": "",
            "INTRATE": "",
            "SECIND": "",
            "SEGCODE": "",
            "ACTCLOSEDT": "",
            "SANCDATE": "",
            "POSREST": "",
            "HOLD": "",
            "STOP": "",
            "EXTNCTRID": "",
            "NEWIRAC": "",
            "OLDIRAC": "",
            "DEPPRD": "",
            "EMIDUE": "",
            "EMIPAID": "",
            "EMIOVERDUE": "",
            "ODLIMIT": "",
            "DATE": "",
            "CODE": "",
            "NAME1": "",
            "REPACCCODE": "",
            "SCHEMEDESC": "",
            "ADDRESS1": "",
            "ADDRESS2": "",
            "ADDRESS3": "",
            "ADDRESS4": "",
            "PINCODE": "",
            "_IS_SCHEMA_ONLY": True
        }
        rows.append(dummy_row)
        
    return rows
