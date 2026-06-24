import random
from datetime import datetime, timedelta

# Your GUIDs
GUIDS = [
    "2C159F82-DB59-42FD-8000-1CE507998403", "219290A7-92E2-4FB6-801B-56AFF8056394", "676F41E6-B911-42C6-802A-648153BCB1BA", "96126211-D438-4668-8D50-A57451267C7A", "D518B65A-A1E7-4A32-B433-4D767069FEF7", "0C220E21-B190-4F09-BF14-C3C3E6EB2278", "D9B108A2-1E81-4976-95B4-AB6013EEF260", "3E91925B-045C-47A7-AB50-AD8772F042E6", "BF51F976-5B08-403B-A6A1-66AD435DB3EB", "81572935-696F-4722-902F-A6F93A7E6EFD", "2B160A2B-82D0-4B88-B6C3-B478FBC1B51F", "1F24BC6B-A589-4B49-9FFA-2E1DAF31433C", "8F016AFE-4C6A-4F1D-A05A-56246E29DBE6", "AE9EA169-B8E7-4ECD-9773-5856AC8335C3", "17774E00-3A12-40E5-B3FF-2EA80DCB773E", "4BFE365F-C322-407C-BF3B-464515A2A248", "B251134B-5900-428B-A87B-2D0B6E54C861", "EB909A12-977D-4D76-8B99-CBB1A2DEB6F0", "16F47890-9A40-4D51-8F95-159E344A9BAB", "02C13264-15CE-43FD-8D49-BC8CD2EA1AAE", "66FB6778-7A72-4D4E-9FF0-3D01383F5F77", "3211264E-4EAB-4079-9600-292638CCFA85", "7A4AAB5E-34DC-4F2A-97A9-406105300AA5", "D257B567-6B3A-426C-B2A7-1F9128E22EB6", "D2FB5057-3860-4A1D-9FF1-30BC0AB04F54", "7F635D94-2C19-4394-9298-DA869A1A7A9D", "33710C82-E6B5-4F04-91F2-DCA5B7449CBD", "A5DCAC57-1BBC-4544-B6F3-59956ECB4A8D", "FEB06FE1-B24B-4CCC-8BA2-F72293ECBB37", "49A401C6-E49B-4CC6-82DC-3090E0F4F4C3", "80DAD3CD-2E67-4379-A1A9-2F92FB48F478", "86534FEB-96BA-4632-8368-6307DA4D5331", "396F9C47-153E-4617-8AEA-9CE83CB7C2E6", "2ECA5A3F-98F6-4403-805E-C321ED0A1EBD", "A7583AFF-FDF6-4836-965F-5D14F0006713", "E2B2A7FA-16D3-492B-B18F-712E8A262228", "D354D57F-A6E0-42C2-BE6B-8844FCBA8DA6", "97035EB6-8A6F-41A9-8698-20F4303DF679", "79CD43D4-95EB-4D43-A63F-63E22CD0CDFB", "B15E8396-7BA3-4258-B46F-04C9A1F4BDBF", "1940F15D-26DB-4BD2-8F08-6EDE7B9AEBFC", "1A2203A8-E44C-48C9-9212-1245AC5CD0DD", "327B3BCA-C7AB-4074-88F2-4BE87ED20965", "24E9FE05-74FA-41E2-A884-F45E0DFEE166", "334F3759-05EB-47FC-BEA4-8DB63CDE9074", "3A59FD2C-E286-4A07-8285-19C8F1AFE452", "FAA96EBF-A0DF-43AC-8E19-8DC0A6276815", "B6F44CB1-CEE5-4272-95EE-56DDBF0F0A14", "4EE77229-F3AD-45BA-A6EC-2BEED2280F47", "0E40DFCD-B3E4-4E74-BD1C-5EA042886FA8", "3DE29E56-07E9-423A-BC1A-D6CFA128DDDD", "9E76646A-B037-417D-B951-420DAF6BA106", "413111E7-0648-44BD-9ABC-91AF6C65E8AE", "057B6D06-46AA-4290-A9C2-74DD0669F3D1", "DDF8CA5B-E4A8-4B63-99B3-5D3205EAEA14", "C6D2316D-89B5-4552-A7B5-86A6FB609FA7", "FCFD13A2-DBB7-4C8A-9BA7-12DA5B8FC48A", "25E9EAAE-F506-4D38-96B9-87449DB1D2FC", "D59E2156-0543-473B-8349-4B85E5EB047B", "FAC6E572-AA78-40F6-ADEC-E7DDDD6C47F0", "0493F2C8-96F0-4B78-966A-8D5A3D85A389", "701B38D3-5AF2-41F1-BAA6-1CBB60E1D4C8", "589A9A6F-D94A-4733-808B-877370586028", "EAC838FE-9E67-4C7C-B23F-8A597455EFED", "3D5F973A-7B22-47DD-9EBE-A8E770E3205F", "910CFBC5-224B-4374-94F6-809CE8264720", "B17D558F-3C3C-4E97-AEDB-38D6F38C5A22", "CFE89D03-0703-402E-BF99-D88E507A0B4A", "88FF6D00-3697-4398-9EA1-792734A129B0", "82235198-ACE8-457A-8278-360B52F7E28E", "02D28654-C43A-468B-8635-D480864E7D82", "E0EDCA4A-7D97-4BEE-A2BD-9329EE74BF22", "83CD9FD2-687C-4437-81EA-A6DE9132324D", "5B109866-0DFD-46F2-8C72-7D851882C6F8", "05AD9EBC-8663-4204-A94F-4BF578D6E5CA", "2D871DE1-943C-4EC6-B910-CBDBCE47DBD5", "B7F96826-1A50-4E6A-93E8-CCFE2147EFE5", "4942279B-C7BB-4F05-97FB-7CB9D6C8BC5E", "9E82AF01-972E-4CE7-87EC-87D667BAF296", "2AFE6385-84A8-41B9-8520-9F906AF082DE"
]

NUM_DAYS = 365
TODAY = datetime(2026, 5, 29)

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


def generate_insert_2():
    inserts = []

    for customer_guid in GUIDS:
        streak = 0

        for i in range(NUM_DAYS):
            date = TODAY - timedelta(days=i)

            # 25% chance user inactive
            if random.random() < 0.25:
                streak = 0
                continue

            streak += 1

            activity_date = date.strftime('%Y-%m-%d')

            # Simulate subjects (user may study multiple subjects per day)
            subjects = random.sample([1, 2, 3], random.randint(1, 2))

            for subject_id in subjects:
                # base questions
                base_q = random.randint(5, 25)

                # streak bonus
                total_q = base_q + min(streak, 10)

                # time per question: 5–15 seconds
                avg_time = random.randint(5, 15)
                take_time = total_q * avg_time

                # random update time within the day (UTC)
                update_time = date.replace(
                    hour=random.randint(0, 23),
                    minute=random.randint(0, 59),
                    second=random.randint(0, 59)
                ).strftime('%Y-%m-%d %H:%M:%S')

                sql = f"""
INSERT INTO [QuizSystem].[dbo].[UserLearningActivitySnapshots]
([CustomerGuid], [SubjectId], [ActivityDate],
 [QuestionCount], [TakeTimeSeconds], [UpdateTimeUtc])
VALUES
('{customer_guid}', {subject_id}, '{activity_date}',
 {total_q}, {take_time}, '{update_time}');
""".strip()

                inserts.append(sql)

    return inserts



if __name__ == "__main__":
    sql_statements = generate_insert()
    sql_statements += generate_insert_2()

    print(f"Total inserts: {len(sql_statements)}")

    with open("user_exam_records_year.sql", "w") as f:
        f.write("\n\n".join(sql_statements))