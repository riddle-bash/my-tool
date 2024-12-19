import json

def dumpquote(file_path):
    # Read the JSON file
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()

    # Remove every double quote from the content
    content_without_quotes = content.replace('"', '')

    # Write the modified content back to the file
    with open(file_path, 'w', encoding='utf-8') as file:
        file.write(content_without_quotes)

# Example usage
dumpquote('./alternative.json')
dumpquote('./optional.json')