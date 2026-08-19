/*******************************************************************************
 * 01_normalization_functions.sql
 * Banking MIS Data Warehouse — Field Normalization Functions
 *
 * Creates 5 deterministic scalar functions in [dw] schema:
 *   1. dw.fn_NormalizeCustomerID   — strips noise, removes leading zeros
 *   2. dw.fn_NormalizeAccountNo    — strips hyphens, spaces, control chars
 *   3. dw.fn_NormalizeBranchCode   — pads to 5-digit zero-padded string
 *   4. dw.fn_ParseFinancialAmount  — Indian/Western commas, trailing signs
 *   5. dw.fn_ParseDate             — multi-format date parser
 *
 * Additionally:
 *   6. dw.fn_NormalizeAssetClass    — IRAC/NPA classification normalizer
 *   7. dw.fn_NormalizeAccountStatus — Account status normalizer
 *
 * All functions are deterministic for index compatibility.
 * Idempotent: Uses CREATE OR ALTER.
 *
 * Target: MIS_DATABASE on DESKTOP-CNDH3DO
 ******************************************************************************/

USE MIS_DATABASE;
GO

-- ============================================================================
-- 1. fn_NormalizeCustomerID
--    Strips non-alphanumeric characters.
--    For purely numeric IDs: removes leading zeros.
--    For alphanumeric IDs: preserves as-is after cleaning.
--    Examples:
--      '0000123456789'  -> '123456789'
--      '  CIF-00456  '  -> 'CIF00456'
--      NULL / ''        -> NULL
-- ============================================================================
CREATE OR ALTER FUNCTION dw.fn_NormalizeCustomerID (@raw_val VARCHAR(500))
RETURNS VARCHAR(50)
WITH SCHEMABINDING
AS
BEGIN
    IF @raw_val IS NULL OR LTRIM(RTRIM(@raw_val)) = ''
        RETURN NULL;

    DECLARE @cleaned VARCHAR(500) = '';
    DECLARE @i INT = 1;
    DECLARE @len INT = LEN(LTRIM(RTRIM(@raw_val)));
    DECLARE @trimmed VARCHAR(500) = LTRIM(RTRIM(@raw_val));
    DECLARE @ch CHAR(1);

    -- Strip everything except A-Z, a-z, 0-9
    WHILE @i <= @len
    BEGIN
        SET @ch = SUBSTRING(@trimmed, @i, 1);
        IF @ch LIKE '[A-Za-z0-9]'
            SET @cleaned = @cleaned + @ch;
        SET @i = @i + 1;
    END

    IF @cleaned = ''
        RETURN NULL;

    -- Check if purely numeric
    DECLARE @is_numeric BIT = 1;
    SET @i = 1;
    SET @len = LEN(@cleaned);
    WHILE @i <= @len
    BEGIN
        IF SUBSTRING(@cleaned, @i, 1) NOT LIKE '[0-9]'
        BEGIN
            SET @is_numeric = 0;
            BREAK;
        END
        SET @i = @i + 1;
    END

    -- If purely numeric, strip leading zeros
    IF @is_numeric = 1
    BEGIN
        DECLARE @result VARCHAR(50);
        -- Cast to BIGINT to strip leading zeros, then back to VARCHAR
        -- Guard against overflow for very long numeric strings
        IF @len <= 18
            SET @result = CAST(CAST(@cleaned AS BIGINT) AS VARCHAR(50));
        ELSE
        BEGIN
            -- Manual leading zero strip for >18 digit numbers
            DECLARE @start INT = 1;
            WHILE @start < @len AND SUBSTRING(@cleaned, @start, 1) = '0'
                SET @start = @start + 1;
            SET @result = SUBSTRING(@cleaned, @start, @len - @start + 1);
        END
        RETURN @result;
    END

    RETURN @cleaned;
END;
GO

-- ============================================================================
-- 2. fn_NormalizeAccountNo
--    Strips whitespace, hyphens, control chars (ASCII 0-31), invisible Unicode.
--    Examples:
--      '4020-0029-4534'       -> '402000294534'
--      ' 00000809190003298 '  -> '00000809190003298'
--      '402 000 294 534'      -> '402000294534'
--      NULL / ''              -> NULL
-- ============================================================================
CREATE OR ALTER FUNCTION dw.fn_NormalizeAccountNo (@raw_val VARCHAR(500))
RETURNS VARCHAR(30)
WITH SCHEMABINDING
AS
BEGIN
    IF @raw_val IS NULL OR LTRIM(RTRIM(@raw_val)) = ''
        RETURN NULL;

    DECLARE @cleaned VARCHAR(500) = '';
    DECLARE @i INT = 1;
    DECLARE @len INT = LEN(@raw_val);
    DECLARE @ch CHAR(1);
    DECLARE @ascii_val INT;

    WHILE @i <= @len
    BEGIN
        SET @ch = SUBSTRING(@raw_val, @i, 1);
        SET @ascii_val = ASCII(@ch);
        -- Keep only printable alphanumeric characters (skip space, hyphen, control chars)
        IF @ch LIKE '[A-Za-z0-9]' AND @ascii_val > 31
            SET @cleaned = @cleaned + @ch;
        SET @i = @i + 1;
    END

    IF @cleaned = ''
        RETURN NULL;

    RETURN @cleaned;
END;
GO

-- ============================================================================
-- 3. fn_NormalizeBranchCode
--    Pads numeric branch codes to fixed-width 5-digit zero-padded strings.
--    Extracts numeric portion first, then pads.
--    Examples:
--      '1'     -> '00001'
--      '7'     -> '00007'
--      '61'    -> '00061'
--      '00061' -> '00061'
--      NULL    -> NULL
-- ============================================================================
CREATE OR ALTER FUNCTION dw.fn_NormalizeBranchCode (@raw_val VARCHAR(500))
RETURNS VARCHAR(10)
WITH SCHEMABINDING
AS
BEGIN
    IF @raw_val IS NULL OR LTRIM(RTRIM(@raw_val)) = ''
        RETURN NULL;

    DECLARE @trimmed VARCHAR(500) = LTRIM(RTRIM(@raw_val));
    DECLARE @numeric VARCHAR(500) = '';
    DECLARE @i INT = 1;
    DECLARE @len INT = LEN(@trimmed);
    DECLARE @ch CHAR(1);

    -- Extract only digit characters
    WHILE @i <= @len
    BEGIN
        SET @ch = SUBSTRING(@trimmed, @i, 1);
        IF @ch LIKE '[0-9]'
            SET @numeric = @numeric + @ch;
        SET @i = @i + 1;
    END

    IF @numeric = ''
        RETURN @trimmed;  -- Non-numeric branch code: return cleaned original

    -- Right-pad with leading zeros to 5 digits
    RETURN RIGHT('00000' + @numeric, 5);
END;
GO

-- ============================================================================
-- 4. fn_ParseFinancialAmount
--    Handles Indian comma notation (12,00,000.00), Western commas,
--    currency symbols (₹, $), trailing +/- signs.
--    Examples:
--      '12,00,000.00-'    -> -1200000.00
--      '97,885.00+'       -> 97885.00
--      '12,00,000.00'     -> 1200000.00
--      '-322338.8'        -> -322338.80
--      '₹ 1,500.00'      -> 1500.00
--      '0.00'             -> 0.00
--      ''  / NULL         -> NULL
--      'N/A'              -> NULL
-- ============================================================================
CREATE OR ALTER FUNCTION dw.fn_ParseFinancialAmount (@raw_val VARCHAR(500))
RETURNS DECIMAL(18,2)
WITH SCHEMABINDING
AS
BEGIN
    IF @raw_val IS NULL
        RETURN NULL;

    DECLARE @trimmed VARCHAR(500) = LTRIM(RTRIM(@raw_val));

    IF @trimmed = '' OR @trimmed = 'N/A' OR @trimmed = '-' OR @trimmed = '.'
        RETURN NULL;

    -- Step 1: Detect and handle trailing sign
    DECLARE @is_negative BIT = 0;
    DECLARE @last_char CHAR(1) = RIGHT(@trimmed, 1);
    DECLARE @first_char CHAR(1) = LEFT(@trimmed, 1);

    IF @last_char = '-'
    BEGIN
        SET @is_negative = 1;
        SET @trimmed = LEFT(@trimmed, LEN(@trimmed) - 1);
    END
    ELSE IF @last_char = '+'
        SET @trimmed = LEFT(@trimmed, LEN(@trimmed) - 1);

    -- Step 2: Handle leading negative sign
    IF @first_char = '-'
    BEGIN
        SET @is_negative = 1;
        SET @trimmed = SUBSTRING(@trimmed, 2, LEN(@trimmed) - 1);
    END
    ELSE IF @first_char = '+'
        SET @trimmed = SUBSTRING(@trimmed, 2, LEN(@trimmed) - 1);

    -- Step 3: Remove currency symbols, commas, spaces
    -- Remove ₹ (may be multi-byte), $, commas, spaces
    SET @trimmed = REPLACE(@trimmed, ',', '');
    SET @trimmed = REPLACE(@trimmed, ' ', '');
    SET @trimmed = REPLACE(@trimmed, '$', '');
    SET @trimmed = REPLACE(@trimmed, NCHAR(8377), '');  -- ₹ Unicode
    SET @trimmed = REPLACE(@trimmed, N'₹', '');

    -- Step 4: Trim again after cleanup
    SET @trimmed = LTRIM(RTRIM(@trimmed));

    IF @trimmed = '' OR @trimmed = '.'
        RETURN NULL;

    -- Step 5: Attempt conversion
    DECLARE @result DECIMAL(18,2);
    -- TRY_CAST is not available in scalar functions; use manual validation
    IF ISNUMERIC(@trimmed + 'e0') = 1
    BEGIN
        SET @result = CAST(@trimmed AS DECIMAL(18,2));
        IF @is_negative = 1
            SET @result = @result * -1;
        RETURN @result;
    END

    RETURN NULL;
END;
GO

-- ============================================================================
-- 5. fn_ParseDate
--    Robust multi-format date parser.
--    Handles: DD/MM/YYYY, DD-MM-YYYY, DD-MON-YY, DD-MON-YYYY, YYYY-MM-DD
--    Examples:
--      '28/10/2024'   -> 2024-10-28
--      '28-10-2024'   -> 2024-10-28
--      '28-OCT-24'    -> 2024-10-28
--      '28-OCT-2024'  -> 2024-10-28
--      '2024-10-28'   -> 2024-10-28
--      NULL / ''      -> NULL
-- ============================================================================
CREATE OR ALTER FUNCTION dw.fn_ParseDate (@raw_val VARCHAR(500))
RETURNS DATE
WITH SCHEMABINDING
AS
BEGIN
    IF @raw_val IS NULL OR LTRIM(RTRIM(@raw_val)) = ''
        RETURN NULL;

    DECLARE @trimmed VARCHAR(100) = LTRIM(RTRIM(@raw_val));
    DECLARE @result DATE = NULL;

    -- Attempt 1: TRY_CONVERT with style 103 (DD/MM/YYYY)
    SET @result = TRY_CONVERT(DATE, @trimmed, 103);
    IF @result IS NOT NULL RETURN @result;

    -- Attempt 2: TRY_CONVERT with style 105 (DD-MM-YYYY)
    SET @result = TRY_CONVERT(DATE, @trimmed, 105);
    IF @result IS NOT NULL RETURN @result;

    -- Attempt 3: ISO format YYYY-MM-DD (style 23)
    SET @result = TRY_CONVERT(DATE, @trimmed, 23);
    IF @result IS NOT NULL RETURN @result;

    -- Attempt 4: DD-MON-YY or DD-MON-YYYY (e.g. '28-OCT-24', '28-OCT-2024')
    -- Manual parsing for month-name formats
    DECLARE @parts_count INT = LEN(@trimmed) - LEN(REPLACE(@trimmed, '-', '')) + 1;

    IF @parts_count = 3
    BEGIN
        DECLARE @p1 VARCHAR(10) = LEFT(@trimmed, CHARINDEX('-', @trimmed) - 1);
        DECLARE @rest VARCHAR(90) = SUBSTRING(@trimmed, CHARINDEX('-', @trimmed) + 1, 90);
        DECLARE @p2 VARCHAR(10) = LEFT(@rest, CHARINDEX('-', @rest) - 1);
        DECLARE @p3 VARCHAR(10) = SUBSTRING(@rest, CHARINDEX('-', @rest) + 1, 10);

        DECLARE @mon_num INT = 0;
        DECLARE @mon_upper VARCHAR(10) = UPPER(@p2);

        SET @mon_num = CASE @mon_upper
            WHEN 'JAN' THEN 1  WHEN 'FEB' THEN 2  WHEN 'MAR' THEN 3
            WHEN 'APR' THEN 4  WHEN 'MAY' THEN 5  WHEN 'JUN' THEN 6
            WHEN 'JUL' THEN 7  WHEN 'AUG' THEN 8  WHEN 'SEP' THEN 9
            WHEN 'OCT' THEN 10 WHEN 'NOV' THEN 11 WHEN 'DEC' THEN 12
            ELSE 0
        END;

        IF @mon_num > 0
        BEGIN
            DECLARE @day INT = TRY_CAST(@p1 AS INT);
            DECLARE @year INT = TRY_CAST(@p3 AS INT);

            IF @day IS NOT NULL AND @year IS NOT NULL
            BEGIN
                -- Handle 2-digit year: pivot at 50 (00-49 -> 2000s, 50-99 -> 1900s)
                IF @year < 100
                BEGIN
                    IF @year <= 49
                        SET @year = 2000 + @year;
                    ELSE
                        SET @year = 1900 + @year;
                END

                -- Validate day range
                IF @day >= 1 AND @day <= 31 AND @year >= 1900 AND @year <= 2099
                BEGIN
                    DECLARE @date_str VARCHAR(20) = CAST(@year AS VARCHAR(4))
                        + '-' + RIGHT('0' + CAST(@mon_num AS VARCHAR(2)), 2)
                        + '-' + RIGHT('0' + CAST(@day AS VARCHAR(2)), 2);
                    SET @result = TRY_CONVERT(DATE, @date_str, 23);
                    IF @result IS NOT NULL RETURN @result;
                END
            END
        END
    END

    -- Attempt 5: Fallback — generic TRY_CONVERT without style
    SET @result = TRY_CONVERT(DATE, @trimmed);
    RETURN @result;
END;
GO

-- ============================================================================
-- 6. fn_NormalizeAssetClass
--    Normalizes IRAC / NPA asset classification strings.
--    Maps variations to canonical values:
--      STANDARD, SUB_STANDARD, DOUBTFUL, LOSS
--    Also maps numeric IRAC codes (00-04) to labels.
-- ============================================================================
CREATE OR ALTER FUNCTION dw.fn_NormalizeAssetClass (@raw_val VARCHAR(500))
RETURNS VARCHAR(30)
WITH SCHEMABINDING
AS
BEGIN
    IF @raw_val IS NULL OR LTRIM(RTRIM(@raw_val)) = ''
        RETURN NULL;

    DECLARE @upper VARCHAR(200) = UPPER(LTRIM(RTRIM(@raw_val)));

    -- Remove common noise characters
    SET @upper = REPLACE(REPLACE(REPLACE(@upper, '-', ' '), '_', ' '), '  ', ' ');
    SET @upper = LTRIM(RTRIM(@upper));

    -- Strip leading numeric prefix like "00 - " or "01 "
    IF @upper LIKE '[0-9][0-9] %'
        SET @upper = LTRIM(SUBSTRING(@upper, 3, 200));
    IF LEFT(@upper, 2) = '- '
        SET @upper = LTRIM(SUBSTRING(@upper, 3, 200));

    RETURN CASE
        -- Numeric IRAC codes
        WHEN @upper IN ('00', '0')                                              THEN 'STANDARD'
        WHEN @upper IN ('01', '1')                                              THEN 'SUB_STANDARD'
        WHEN @upper IN ('02', '2')                                              THEN 'DOUBTFUL'
        WHEN @upper IN ('03', '3', '04', '4')                                   THEN 'LOSS'

        -- Text variations
        WHEN @upper LIKE '%STANDARD%' AND @upper NOT LIKE '%SUB%'               THEN 'STANDARD'
        WHEN @upper LIKE '%SUB%STANDARD%' OR @upper LIKE '%SUB%STD%'
             OR @upper = 'SUB STD' OR @upper = 'SUBSTANDARD'                    THEN 'SUB_STANDARD'
        WHEN @upper LIKE '%DOUBTFUL%' OR @upper LIKE '%DOUBT%'                  THEN 'DOUBTFUL'
        WHEN @upper LIKE '%LOSS%'                                               THEN 'LOSS'

        ELSE @upper  -- Return cleaned original if no match
    END;
END;
GO

-- ============================================================================
-- 7. fn_NormalizeAccountStatus
--    Normalizes account status strings.
--    Maps variations to canonical values:
--      OPEN, CLOSED, DORMANT, FROZEN, BLOCKED, INOPERATIVE
-- ============================================================================
CREATE OR ALTER FUNCTION dw.fn_NormalizeAccountStatus (@raw_val VARCHAR(500))
RETURNS VARCHAR(20)
WITH SCHEMABINDING
AS
BEGIN
    IF @raw_val IS NULL OR LTRIM(RTRIM(@raw_val)) = ''
        RETURN NULL;

    DECLARE @upper VARCHAR(200) = UPPER(LTRIM(RTRIM(@raw_val)));

    -- Strip leading numeric prefix like "00 - "
    SET @upper = REPLACE(REPLACE(@upper, '-', ' '), '_', ' ');
    SET @upper = LTRIM(RTRIM(@upper));
    IF @upper LIKE '[0-9][0-9] %'
        SET @upper = LTRIM(SUBSTRING(@upper, 3, 200));

    RETURN CASE
        WHEN @upper LIKE '%OPEN%'                                                THEN 'OPEN'
        WHEN @upper LIKE '%CLOSE%' OR @upper LIKE '%CLSD%'                       THEN 'CLOSED'
        WHEN @upper LIKE '%DORMANT%' OR @upper LIKE '%DRMNT%'                    THEN 'DORMANT'
        WHEN @upper LIKE '%FROZEN%' OR @upper LIKE '%FROZN%'                     THEN 'FROZEN'
        WHEN @upper LIKE '%BLOCK%'                                               THEN 'BLOCKED'
        WHEN @upper LIKE '%INOPER%'                                              THEN 'INOPERATIVE'
        ELSE @upper
    END;
END;
GO

PRINT '============================================================';
PRINT '  01_normalization_functions.sql completed successfully.';
PRINT '  Created 7 functions: fn_NormalizeCustomerID,';
PRINT '    fn_NormalizeAccountNo, fn_NormalizeBranchCode,';
PRINT '    fn_ParseFinancialAmount, fn_ParseDate,';
PRINT '    fn_NormalizeAssetClass, fn_NormalizeAccountStatus';
PRINT '============================================================';
GO
