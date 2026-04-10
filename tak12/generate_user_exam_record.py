import random
from datetime import datetime, timedelta

# Config
GUIDS = [
    "f7da097b-af43-4004-b447-ed5ec38e6555",
    "28a86a25-bea9-4a13-8f6e-a04f2787af61",
    "375ba49f-8c3c-47f4-9e54-8804aab55ae3",
    "fcefaa17-de9e-4b96-b494-6ebd2c3d9877",
    "65eae1a2-37b5-4d0a-aedd-474c702c050d",
    "38c5fec9-9d1c-471b-905b-f4d9bb37731a",
    "5db50745-5856-4f00-93c4-013642fa7e0b",
    "e24ef156-9aad-411d-adaf-6de8941b9921",
    "cd4769ce-a00a-4ca7-8dd1-a65099cba628"
]

NUM_DAYS = 10
TODAY = datetime(2026, 4, 10)

def generate_insert():
    inserts = []

    for customer_guid in GUIDS:   # loop directly over your GUIDs
        for i in range(NUM_DAYS):
            date = TODAY - timedelta(days=i)

            year = date.year
            month = date.month
            day = date.day

            correct_count = random.randint(0, 5)
            wrong_count = random.randint(0, 2) if correct_count > 0 else 0

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

    for stmt in sql_statements:
        print(stmt)

    with open("user_exam_records.sql", "w") as f:
        f.write("\n\n".join(sql_statements))