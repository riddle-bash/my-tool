import pandas as pd
import os

# === CONFIGURATION ===
excel_file = os.path.join(os.path.dirname(__file__), '..', 'in', 'examid_imagepath.xlsx')
output_sql_file = os.path.join(os.path.dirname(__file__), '..', 'in', 'update_exam_image.sql')
table_name = "[QuizSystem].[dbo].[Exams]"

# === READ EXCEL ===
# Expected columns: Id, ImagePath
df = pd.read_excel(excel_file)

if 'id' not in df.columns or 'imagepath' not in df.columns:
    raise ValueError("Excel file must contain 'id' and 'imagepath' columns.")

# === GENERATE SQL UPDATES ===
sql_lines = [
    "USE [QuizSystem];",
    "GO",
    "",
]

for _, row in df.iterrows():
    exam_id = row['id']
    image_path = row['imagepath']

    if pd.isna(exam_id):
        continue

    exam_id = int(exam_id)

    if pd.isna(image_path) or str(image_path).strip() == '':
        image_val = "NULL"
    else:
        escaped = str(image_path).replace("'", "''")
        image_val = f"N'{escaped}'"

    sql_lines.append(
        f"UPDATE {table_name} SET [ImagePath] = {image_val} WHERE [Id] = {exam_id};"
    )

sql_lines += ["", "GO"]

# === SAVE TO FILE ===
os.makedirs(os.path.dirname(output_sql_file), exist_ok=True)
with open(output_sql_file, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print(f"✅ SQL update file generated at: {output_sql_file}")
print(f"👉 You can now run:\n"
      f'sqlcmd -S 125.212.225.164,31433 -d QuizSystem -U contuhocweb -P "contuhoc123@Abc" -i "{output_sql_file}"')
