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

# Decode HTML entities in 'ReportContent' and 'ResponseContent' columns if they exist
for col in ['ReportContent', 'ResponseContent']:
    if col in df.columns:
        df[col] = df[col].astype(str).apply(html.unescape)

# Write the decoded DataFrame to a new Excel file
df.to_excel(output_file, index=False)

print(f"Decoded Excel file saved as '{output_file}'")
