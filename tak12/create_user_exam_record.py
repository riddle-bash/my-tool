import random
from datetime import datetime, timedelta

# Your GUIDs
GUIDS = [
    "D000E466-1384-46DE-892E-943F950DB6EA","475ABFA9-2FA7-4FAE-8878-0548BAF000FF","3B2972D3-A019-4BDF-8509-82B8002BB18D","DA32476F-6A63-4CF8-84C6-F27FCCF24F76","EE4BA345-F659-401F-88E6-DC0B98FFA2E3","FF528749-F2B1-4FC9-A470-E1194252AC2E","04F14FD5-7825-49F4-937A-4FD853EF8219","7079B929-8A1E-4CC4-A240-4260AD1A33A7","805264A2-8A04-4DAC-8918-9994F7CFEC55","8B707C31-8B55-4660-95E0-ACD112665E30","AB1F4025-9039-48C9-9DB2-383B0C9B2CAB","7F9ED620-6547-446B-9979-667AFECF9C45","4612E3C8-A9C1-4FFA-8EAF-C6AF4D2C0EB7","78B60547-43AB-4F1D-A50E-F9BBAEA8C319","CA77249A-050B-4B24-9A2E-1C231D12BFF0","726161B4-1FD0-433B-AFB5-6AEA55F54D59","282318D1-6699-4A2D-B047-D060ABD5E0BF","D45BD850-56B6-4E7F-A092-AA6373757F89","D544C9F2-0C1D-4F2D-B602-FB19EF3E0B8F","9E1DB8CC-AA67-49E6-A8F3-A7C683B4BA28","41D9B1B6-937B-472A-A058-4054EEE43A5F","38893015-F79B-4865-9616-BA82B2161639","6D3A4FEA-CF76-4A3D-AD9C-034A2D67B0A4","1826F473-423A-4EFC-8835-89D24E2B62D4","E29F6C7E-EDFA-49AC-8E94-44936FAA896C","7FE3A788-F21B-4669-B050-437C6295239E","D53BCEDB-121C-402C-878E-82C9920CC300","F7260EFF-BEE9-4116-B55D-D3E165D37535","27362032-729F-4D39-BAA3-4D4EFB037399","1DBCDD61-1252-4C37-BB04-248753A5AF26","3A763AEA-4622-4269-9A0B-7960AB83EB44","88BACF58-D610-44EF-818C-7DE7B88D682F","7AD90D2E-4309-43DD-98DE-044621D06213","B304836B-B42D-4F17-9B33-18E30BE5E4E2","FC7DDD8E-2A41-4295-AE3C-3EF7C7F02A71","951B8793-A7DD-4A94-AE94-75083C5B3463","D0C62B85-7F85-4739-B601-F5DAF0095926","1B5D062C-6D12-4366-9D24-5AE83A6963E3","CB417733-64C5-4C28-B13B-3A305D1471A3","FBADDD0D-7768-4B8B-B21C-9A6EA56306D0","2FA2A5AB-A953-4AE8-8B84-0AD3FD81B9CA","72260376-6F77-4B49-8467-7C9534EA6068","A067D48C-D2AE-44D1-A06E-3DA0DEC8573C","0BAB8BC7-B04F-41C2-84D7-A00C8D2FB07C","450642A0-E686-4268-95C6-72B91E36B95E","DD285BEC-D98D-4C02-BBAF-881A5DBC05D8","F8739C4E-1699-42A5-80D4-C424432F0C0E","86511B9D-4088-4164-862B-06BC345C4DE8","198C1CB5-721E-46C3-9E8A-A2D52E36BDB3","7C62FD5D-6BC0-4C5B-80A6-E23CBD5F136B","A6BCF47B-6B9D-4217-9A41-E442B78E0472","4614D826-0BEC-492A-8523-DF52E9D91714","210400C6-13E8-4BB0-A3F3-5BAA4F61B97A","436E471A-759C-464F-AFD0-E48FB4532792","D1E84F7D-A418-4BCA-9A5E-D1FA444FAD45","F9ACC1C8-3230-48B4-8EF5-CF81F4B300DA","F274E399-55EC-4AF2-97D0-CD2435BFBF7C","E484647F-CEB6-41CE-9DEA-D77C609D2505","78A35D08-9F25-4D22-82B3-5C71F106D19A","2AD13DAC-5FA8-4619-BFAA-4EB1D18F47C1","B48B99A1-0186-4AC5-8FA4-4331C6877012","2355BBBA-DCF8-4CED-8257-D09B60702DDD","87D8B494-3457-4A68-A615-2E62C33C5419","C7621A14-B16D-462C-854C-F06037616D98","33A638BB-A2BC-4E0C-AE72-0C7EE177E4AD","64062948-D3B6-4A8A-A42A-0851B47B656E","F33FDAB4-5B84-4331-A15B-87435B3CFCAB","235E0645-1C50-4D2E-B15B-10E35CA63D54","BF171EF4-EAE0-4E1C-9F72-5A13295EB65A","B3A27461-404E-4E67-BD02-FA3333811C81","B01EF04E-D745-428F-BC3B-B84216DC5D61","8DE4CED3-A6B2-45FF-BF45-DBE1077B40D9","416C485E-AB39-4940-9991-9D2F656A45A1","2020D079-0A68-495E-A94F-129DFE1D325A","F07056FB-AC91-410A-BFC6-CFB836F7B60F","69FFC86D-C78E-4D52-970F-F337EBD85FCC","D9F474F6-4703-4987-AD60-C56941218C3B","FB61B642-3078-4C0C-B6DF-975416BB68B5","9A130529-3B8A-46C4-8C2D-01E6B23B7418","0E538305-96E3-4712-80F8-99A9989BB7A8"
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
INSERT INTO [QuizSystem3].[dbo].[UserExamRecords]
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
INSERT INTO [QuizSystem3].[dbo].[UserLearningActivitySnapshots]
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