import random
from datetime import datetime, timedelta
import uuid

# Config
NUM_USERS = 10
NUM_DAYS = 10
TODAY = datetime(2026, 4, 10)

def generate_insert():
    inserts = []

    for user_id in range(1, NUM_USERS + 1):
        customer_guid = str(uuid.uuid4())  # replace if needed

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


# Generate and print
if __name__ == "__main__":
    sql_statements = generate_insert()
    
    for stmt in sql_statements:
        print(stmt)

    # Optional: save to file
    with open("user_exam_records.sql", "w") as f:
        f.write("\n\n".join(sql_statements))