import pandas as pd
import html
import os

# Define input and output file paths
input_file = 'html_excel.xlsx'
output_file = 'html_excel_decoded.xlsx'

# Check if the file exists in the current directory
if not os.path.exists(input_file):
    raise FileNotFoundError(f"Input file '{input_file}' not found in the current directory.")

# Read the Excel file
# Assumes the first sheet contains the data
df = pd.read_excel(input_file)

# Mapping dictionaries for CriticalLevel and UserFeedbackType
critical_level_map = {
    0: "Chưa phân loại",
    1: "Không ảnh hường",
    2: "Thấp",
    3: "Trung bình",
    4: "Cao"
}

user_feedback_type_map = {
    0: "Chưa phân loại",
    1: "Không phải lỗi",
    2: "Lỗi nội dung - Chính tả",
    3: "Lỗi nội dung - Ngữ pháp",
    4: "Lỗi nội dung - Dịch thuật",
    5: "Lỗi phần mềm",
    6: "Lỗi nội dung - Sai đáp án",
    7: "Lỗi nội dung - Thiếu đáp án",
    8: "Lỗi nội dung - Sai giải thích",
    9: "Lỗi phần mềm - UI/UX",
    10: "Lỗi phần mềm - Chức năng",
    11: "Lỗi phần mềm - Chậm/Lag",
    12: "Lỗi phần mềm - Khó tái lặp"
}

# Decode HTML entities in 'ReportContent' and 'ResponseContent' columns if they exist
for col in ['ReportContent', 'ResponseContent']:
    if col in df.columns:
        df[col] = df[col].astype(str).apply(html.unescape)

# Map CriticalLevel and UserFeedbackType to their labels if columns exist
if 'CriticalLevel' in df.columns:
    df['CriticalLevelLabel'] = df['CriticalLevel'].map(lambda x: critical_level_map.get(int(x), str(x)))

if 'UserFeedbackType' in df.columns:
    df['UserFeedbackTypeLabel'] = df['UserFeedbackType'].map(lambda x: user_feedback_type_map.get(int(x), str(x)))

# Write the decoded DataFrame to a new Excel file
df.to_excel(output_file, index=False)

print(f"Decoded Excel file saved as '{output_file}'")
