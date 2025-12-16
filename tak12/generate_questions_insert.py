import pandas as pd
import os

# === CONFIGURATION ===
excel_file = r"C:\Workspace\tool\questions.xlsx"   # Path to your Excel file
output_sql_file = r"C:\Workspace\tool\questions_insert.sql"  # Output SQL script path
table_name = "[QuizSystem].[dbo].[Questions]"      # Target table

# === READ EXCEL ===
df = pd.read_excel(excel_file)

# Define the expected columns in the correct order
expected_cols = [
    "Id", "CreationTime", "QuestionText", "ImagePath", "QuestionType", "DefaultMark", "ParentQuestionId", "FeedbackMessage", "QuestionName", "QuestionCategoryId", "QuestionStatus", "CreatorUserId", "LastModificationTime", "LastModifierUserId", "AdminReviewText", "UserReportText", "SortOrder", "VocabLevel", "ReviewFeedbackStatus", "HighLight", "DragDrop", "WordOrderSeeds", "DragDropImageHeight", "DragDropImageUrl", "DragDropImageWidth", "DragDropRedundantAnswer", "Grade", "EnableStepByStepGuide", "DisplayNote", "Note", "ShowRelatedTopicDetail", "StepByStepGuide", "EssayAnswerLines", "EnableShortAnswer", "ShowOnQuizOnly", "Difficulty", "CognitiveLevel", "DisplayNotePosition", "QuestionTextSupplement", "DisplayAllChildren", "AIReviewText", "QuestionState", "Hint"
]
df = df[expected_cols]

# Remove 'Id' and 'CreationTime' from the columns to insert
insert_cols = [col for col in expected_cols if col not in ("Id", "CreationTime")]

# === GENERATE SQL INSERTS ===
sql_lines = [
    f"USE [QuizSystem];",
    f"GO",
]

for _, row in df.iterrows():
    values = []
    for col in insert_cols:
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
    # Insert statement with GETDATE() for CreationTime, exclude Id
    sql_lines.append(f"INSERT INTO {table_name} (CreationTime, {', '.join(insert_cols)}) VALUES (GETDATE(), {', '.join(values)});")

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
