import pandas as pd
import html
from pathlib import Path

# Input / Output files
input_file = "ai_templates.xlsx"
output_file = "ai_templates_decoded.xlsx"

# Read excel file
df = pd.read_excel(input_file)

# Decode HTML entities in Content column
def decode_html(value):
    if pd.isna(value):
        return value

    # Convert to string and decode HTML entities
    decoded = html.unescape(str(value))

    return decoded

# Apply decoding
if "Content" in df.columns:
    df["Content"] = df["Content"].apply(decode_html)
else:
    raise Exception("Content column not found in Excel file.")

# Save result
df.to_excel(output_file, index=False)

print(f"Decoded file saved to: {Path(output_file).resolve()}")