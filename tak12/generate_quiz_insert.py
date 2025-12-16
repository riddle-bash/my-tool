import pandas as pd
import os

# === CONFIGURATION ===
excel_file = r"C:\Workspace\tool\quizzes.xlsx"   # Path to your Excel file
output_sql_file = r"C:\Workspace\tool\quiz_insert.sql"  # Output SQL script path
table_name = "[QuizSystem].[dbo].[Quizzes]"      # Target table
start_id = 1  # Change this if you want a different starting Id

# === READ EXCEL ===
df = pd.read_excel(excel_file)

# Define the expected columns in the correct order
expected_cols = [
    "Id", "QuizName", "Description", "ImagePath", "CreationTime", "TotalPoint", "ShuffleQuestion", "ShuffleAnswer", "QuestionPerPage", "FeedBackMessage", "ArticleLink", "TimeLimit", "Publish", "PublishedDateUtc", "Author", "MetaDescription", "MetaKeywords", "MetaTitle", "HasQuestionFeedback", "QuizFeedbackId", "QuizFeedbackMode", "QuizCategoryId", "IsPremium", "AttemptAllowed", "CloseAt", "Code"
]
df = df[expected_cols]

# === GENERATE SQL INSERTS ===
sql_lines = [
    f"USE [QuizSystem];",
    f"GO",
]

for _, row in df.iterrows():
    values = []
    for col in expected_cols:
        if col in ("Id", "CreationTime"):
            continue
        val = row[col]
        if pd.isna(val):
            values.append("NULL")
        elif val is True:
            values.append("1")
        elif val is False:
            values.append("0")
        elif isinstance(val, str):
            val = val.replace("'", "''")  # Escape single quotes
            values.append(f"'{val}'")
        else:
            values.append(str(val))
    insert_cols = ["CreationTime"] + [col for col in expected_cols if col not in ("Id", "CreationTime")]
    sql_lines.append(f"INSERT INTO {table_name} ({', '.join(insert_cols)}) VALUES (GETDATE(), {', '.join(values)});")

sql_lines += [
    f"GO"
]

# === SAVE TO FILE ===
os.makedirs(os.path.dirname(output_sql_file), exist_ok=True)
with open(output_sql_file, "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines))

print(f"✅ SQL insert file generated at: {output_sql_file}")
print(f"👉 You can now run:\n"
      f'sqlcmd -S 125.212.225.164,31433 -d QuizSystem -U contuhocweb -P "contuhoc123@Abc" -i "{output_sql_file}"')
