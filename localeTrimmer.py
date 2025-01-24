import os
import json

def process_json_files(folder_path):
    # List all files in the given folder
    files = [f for f in os.listdir(folder_path) if f.endswith('.json') and f not in ['vi.json', 'en.json']]

    for file_name in files:
        file_path = os.path.join(folder_path, file_name)

        try:
            # Read the JSON file
            with open(file_path, 'r', encoding='utf-8') as file:
                data = file.readlines()

            # Remove lines 757 to 766 (line indices 756 to 765)
            if len(data) >= 766:
                del data[756:766]

            # Remove the comma at the end of line 755 (line index 756)
            if len(data) > 755 and data[755].strip().endswith(','):
                data[755] = data[755].rstrip(',\n') + '\n'

            # Write the modified content back to the file
            with open(file_path, 'w', encoding='utf-8') as file:
                file.writelines(data)

            print(f"Processed: {file_name}")

        except Exception as e:
            print(f"Error processing {file_name}: {e}")

# Replace 'your_folder_path' with the path to your folder containing the JSON files
folder_path = './locales'
process_json_files(folder_path)
