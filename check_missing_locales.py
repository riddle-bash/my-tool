import os
import re
import json

def find_localized_keys(root_dir, json_path):
    # Load existing localization keys
    with open(json_path, 'r', encoding='utf-8') as f:
        localization_data = json.load(f)
    
    # Regex patterns to capture:
    # - Keys inside t('key.path') or t("key.path")
    # - Keys of the form Common.<key>
    t_pattern = re.compile(r"t\(['\"]([a-zA-Z0-9_\.]+)['\"],?\s*{?")
    common_pattern = re.compile(r"Common\.([a-zA-Z0-9_]+)")

    missing_keys = {}

    for foldername, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith(('.js', '.jsx', '.ts', '.tsx')):  # Adjust file extensions as needed
                file_path = os.path.join(foldername, filename)

                try:
                    with open(file_path, 'r', encoding='utf-8') as file:
                        content = file.read()

                        # Find t('key.path') matches
                        t_matches = t_pattern.findall(content)
                        for match in t_matches:
                            parts = match.split('.')
                            if len(parts) < 2:
                                continue  # Skip invalid keys
                            category, key = parts[0], '.'.join(parts[1:])
    
                            if not category or not key:  # <- Skip empty category or key
                                continue
                            
                            if category not in localization_data:
                                missing_keys.setdefault(category, {})
                                missing_keys[category][key] = ""
                            elif key not in localization_data[category]:
                                missing_keys.setdefault(category, {})
                                missing_keys[category][key] = ""

                        # Find Common.<key> matches
                        common_matches = common_pattern.findall(content)
                        if "Common" not in localization_data:
                            missing_keys.setdefault("Common", {})

                        for match in common_matches:
                            if "Common" not in localization_data or match not in localization_data["Common"]:
                                missing_keys.setdefault("Common", {})
                                missing_keys["Common"][match] = ""

                except Exception as e:
                    print(f"Error reading {file_path}: {e}")

    return missing_keys

def merge_localizations(existing_data, missing_data):
    # This function ensures that missing keys are added without overwriting existing ones
    for category, keys in missing_data.items():
        if category not in existing_data:
            existing_data[category] = {}
        for key, value in keys.items():
            if key not in existing_data[category]:
                existing_data[category][key] = value
    return existing_data

if __name__ == "__main__":
    root_directory = "../school/src"  # Change this to your project directory
    json_file_path = "../school/src/locales/en.json"  # Path to localization JSON file

    missing = find_localized_keys(root_directory, json_file_path)

    if missing:
        print("Missing keys found:")
        print(json.dumps(missing, indent=2))

        with open(json_file_path, 'r+', encoding='utf-8') as f:
            existing_data = json.load(f)
            updated_data = merge_localizations(existing_data, missing)
            f.seek(0)
            json.dump(updated_data, f, indent=2)
            f.truncate()
    else:
        print("No missing keys found!")
