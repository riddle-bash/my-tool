import random
from datetime import datetime, timedelta

# Your GUIDs
GUIDS = [
    "A202E479-BC1F-41C5-BE2E-F23FD6F86F78",
    "FA8D100B-441E-4730-993F-27DBB24F7EFB",
    "4B1E9C08-1720-4AC0-8099-97BB7CA50633",
    "6995028F-2C47-4722-BDF4-F0267865213A",
    "36A1F8E9-7F92-4901-944C-EF64B138C360",
    "5E10901B-5525-49E2-8B08-F4992A371A70",
    "612FF8D2-AFB2-49D8-B710-78498A58CA42",
    "351ADA42-AD87-42E3-8BB5-39DEE7870423",
    "8148F3C3-72DF-47EC-982C-4E5D6C485D34",
    "E038649D-8094-4828-B93D-97E1B79AB13D"
]

NUM_DAYS = 365
TODAY = datetime(2026, 4, 10)

def generate_insert():
    inserts = []

    for customer_guid in GUIDS:
        streak = 0

        for i in range(NUM_DAYS):
            date = TODAY - timedelta(days=i)

            # 20% chance user skips the day
            if random.random() < 0.2:
                streak = 0
                continue

            # simulate streak growth
            streak += 1

            year = date.year
            month = date.month
            day = date.day

            # base activity
            base_questions = random.randint(5, 20)

            # boost if on streak
            bonus = min(streak, 10)  # cap streak effect
            total_questions = base_questions + bonus

            correct_count = random.randint(int(total_questions * 0.6), total_questions)
            wrong_count = total_questions - correct_count

            update_time = date.strftime('%Y-%m-%d 12:00:00')
            data_date = date.strftime('%Y-%m-%d')

            sql = f"""
INSERT INTO [QuizSystem].[dbo].[UserExamRecords]
([CustomerGuid], [ExamId], [Year], [Month], [Day],
 [CorrectCount], [WrongCount], [UpdateTime], [DataDate])
VALUES
('{customer_guid}', 1, {year}, {month}, {day},
 {correct_count}, {wrong_count}, '{update_time}', '{data_date}');
""".strip()

            inserts.append(sql)

    return inserts


if __name__ == "__main__":
    sql_statements = generate_insert()

    print(f"Total inserts: {len(sql_statements)}")

    with open("user_exam_records_year.sql", "w") as f:
        f.write("\n\n".join(sql_statements))