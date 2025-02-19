import os
import re

def extract_return_blocks(content):
    """
    Extracts blocks of code that start with 'return' and continue until their corresponding ')' is found.
    """
    return_blocks = []
    return_pattern = re.compile(r'\breturn\b')

    stack = []
    start_idx = None

    for match in return_pattern.finditer(content):
        start_idx = match.start()  # Start of the return statement
        stack = []
        i = start_idx

        while i < len(content):
            if content[i] == '(':  # Opening parentheses found
                stack.append('(')
            elif content[i] == ')':  # Closing parentheses found
                if stack:
                    stack.pop()
                if not stack:  # All opened parentheses closed
                    return_blocks.append(content[start_idx:i+1])  # Capture the return block
                    break
            i += 1

    return return_blocks


def find_unlocalized_text(root_dir):
    unlocalized_texts = []

    # Regex to capture text between > and <, avoiding conditions and JSX logic
    text_pattern = re.compile(r'>([^<>{}]*\S[^<>{}]*)<')

    # Common translation patterns to ignore
    translation_patterns = [
        re.compile(r'\{t\([\'"].+?[\'"]\)\}'),  # {t('key')}
        re.compile(r'<FormattedMessage[^>]+id=[\'"].+?[\'"]'),  # <FormattedMessage id="key" />
    ]

    # Regex to detect conditions or JSX expressions using '>'
    condition_pattern = re.compile(r'[><]\s*[\w\(\)]+\s*[><]')  # Match conditions like 'value > 0'

    for foldername, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith(('.js', '.jsx', '.ts', '.tsx', '.html')):  
                file_path = os.path.join(foldername, filename)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as file:
                        content = file.read()

                        # Extract return blocks only
                        return_blocks = extract_return_blocks(content)

                        for block in return_blocks:
                            matches = text_pattern.findall(block)

                            for match in matches:
                                # Ignore the match if it's part of a condition or JSX logic
                                if condition_pattern.search(match):
                                    continue

                                # Check if the match is inside a known translation pattern
                                if any(tp.search(match) for tp in translation_patterns):
                                    continue

                                unlocalized_texts.append((file_path, match.strip()))

                except Exception as e:
                    print(f"Error reading {file_path}: {e}")

    return unlocalized_texts


if __name__ == "__main__":
    root_directory = "../school/src/features"  # Change this to your root directory
    results = find_unlocalized_text(root_directory)

    for file_path, text in results:
        print(f"{file_path}: {text}")
