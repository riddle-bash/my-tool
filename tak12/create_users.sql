-- generate users 21 → 100 automatically
WITH nums AS (
    SELECT 21 AS n
    UNION ALL
    SELECT n + 1 FROM nums WHERE n < 100
)
INSERT INTO [dbo].[AbpUsers] (
    AccessFailedCount, CreationTime, EmailAddress,
    IsActive, IsDeleted, IsEmailConfirmed,
    IsLockoutEnabled, IsPhoneNumberConfirmed, IsTwoFactorEnabled,
    Name, NormalizedEmailAddress, NormalizedUserName,
    Password, Surname, UserName, Guid, SecurityStamp
)
SELECT
    0,
    GETDATE(),
    CONCAT('user', n, '@test.com'),
    1, 0, 0, 0, 0, 0,
    CONCAT(N'User ', n),
    UPPER(CONCAT('user', n, '@test.com')),
    UPPER(CONCAT('user', n)),
    '123456',
    N'Test',
    CONCAT('user', n),
    NEWID(),
    NEWID()
FROM nums
OPTION (MAXRECURSION 0);