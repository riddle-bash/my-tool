import pandas as pd
import os

# === CONFIGURATION ===
excel_file = r"C:\Workspace\tool\quizquestions.xlsx"   # Path to your Excel file
output_sql_file = r"C:\Workspace\tool\landingpages_insert.sql"  # Output SQL script path
table_name = "[QuizSystem].[dbo].[QuizQuestions]"      # Target table

# === READ EXCEL ===
df = pd.read_excel(excel_file)

# Optional: ensure correct column order
expected_cols = ["Id", "QuizId", "QuestionId", "SortOrder", "Page", "MinusPoint", "PositivePoint"]
df = df[expected_cols]

# === GENERATE SQL INSERTS ===
sql_lines = [
    f"USE [QuizSystem];",
    f"GO",
    f"SET IDENTITY_INSERT {table_name} ON;",
]

for _, row in df.iterrows():
    values = []
    for col in expected_cols:
        val = row[col]
        if pd.isna(val):
            values.append("NULL")
        elif isinstance(val, str):
            val = val.replace("'", "''")  # Escape single quotes
            values.append(f"'{val}'")
        else:
            values.append(str(val))
    sql_lines.append(f"INSERT INTO {table_name} ({', '.join(expected_cols)}) VALUES ({', '.join(values)});")

sql_lines += [
    f"SET IDENTITY_INSERT {table_name} OFF;",
    f"GO"
]

# === SAVE TO FILE ===
os.makedirs(os.path.dirname(output_sql_file), exist_ok=True)
with open(output_sql_file, "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines))

print(f"✅ SQL insert file generated at: {output_sql_file}")
print(f"👉 You can now run:\n"
      f'sqlcmd -S 125.212.225.164,31433 -d QuizSystem -U contuhocweb -P "contuhoc123@Abc" -i "{output_sql_file}"')
