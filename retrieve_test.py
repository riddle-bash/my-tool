import pdfplumber
import re
import json

def parse_student_info(text):
    info = {}
    info['studentName'] = re.search(r"Student:\s*(.*)", text).group(1).strip() if re.search(r"Student:\s*(.*)", text) else None
    info['studentId'] = re.search(r"Student ID:\s*(.*)", text).group(1).strip() if re.search(r"Student ID:\s*(.*)", text) else None
    info['grade'] = re.search(r"Grade:\s*(\\d+)", text).group(1).strip() if re.search(r"Grade:\s*(\\d+)", text) else None
    info['scaffolds'] = re.search(r"Scaffolds:\s*(.*)", text).group(1).strip() if re.search(r"Scaffolds:\s*(.*)", text) else None
    info['district'] = re.search(r"District:\s*(.*)", text).group(1).strip() if re.search(r"District:\s*(.*)", text) else None
    info['school'] = re.search(r"School:\s*(.*)", text).group(1).strip() if re.search(r"School:\s*(.*)", text) else None
    info['generatedOn'] = re.search(r"Generated on\s*(.*)", text).group(1).strip() if re.search(r"Generated on\s*(.*)", text) else None
    return info

def parse_reading_table(page_text):
    lines = [ln.strip() for ln in page_text.splitlines() if ln.strip()]
    if len(lines) < 10:
        print("Not enough lines for reading table.")
        return {"activities_completed": 0, "data": []}
    # Remove first 4 lines (header) and last line (footer)
    lines = lines[4:-1]
    # 5th line: activities_completed and average_score
    summary_line = lines[0]
    m = re.search(r"Activities Completed: (\d+)", summary_line)
    activities_completed = int(m.group(1)) if m else 0
    # Remove next 6 lines (column headers)
    data_lines = lines[7:]
    records = []
    for line in data_lines:
        tokens = line.split()
        # Fix: If first token is like '1Voters', split into index and first word of title
        if tokens and re.match(r"^\d+\D+", tokens[0]):
            m = re.match(r"^(\d+)(\D+)$", tokens[0])
            if m:
                idx = m.group(1)
                first_word = m.group(2)
                tokens = [idx, first_word] + tokens[1:]
        # Heuristic: find lexile token
        lexile_idx = next((i for i, t in enumerate(tokens) if re.match(r"^\d{3,4}L$", t)), None)
        if lexile_idx is not None and lexile_idx >= 4:
            record = {
                "#": tokens[0],
                "title": " ".join(tokens[1:lexile_idx-2]),
                "activity_type": tokens[lexile_idx-2],
                "date": tokens[lexile_idx-1],
                "lexile": tokens[lexile_idx],
                "part1_first_try": tokens[lexile_idx+1] if len(tokens) > lexile_idx+1 else None,
                "part1_second_try": tokens[lexile_idx+2] if len(tokens) > lexile_idx+2 else None,
                "part2_first_try": tokens[lexile_idx+3] if len(tokens) > lexile_idx+3 else None,
                "part2_second_try": tokens[lexile_idx+4] if len(tokens) > lexile_idx+4 else None
            }
            records.append(record)
            
    return {"activities_completed": activities_completed, "data": records}

def parse_writing_assignments_from_lines(lines, all_answers_lines):          
    assignments_completed = len(lines)
    # The rest are assignment blocks
    assignment_blocks = []
    current = []
    for line in lines:
        if line.startswith("No.:") and current:
            assignment_blocks.append(current)
            current = [line]
        else:
            current.append(line)
    if current:
        assignment_blocks.append(current)
    assignments = []
    for assignmentIdx, block in enumerate(assignment_blocks):
        block = [ln for ln in block if ln]
        no = None
        title = None
        date = None
        lexile = None
        assignment_text_start_line = 0
        for idx, line in enumerate(block):
            if line.startswith("No.:"):
                m = re.search(r"No\.:\s*(\d+)", line)
                no = int(m.group(1)) if m else None
            elif line.startswith("Title:"):
                title = line.replace("Title:", "").strip()
            elif line.startswith("Date:"):
                date = line.replace("Date:", "").strip()
            elif line.startswith("Lexile"):
                m = re.search(r"Lexile.*?:\s*(\S+)", line)
                lexile = m.group(1) if m else None
            elif line.startswith("Assignment:"):
                assignment_text_start_line = idx + 1
        # Safely get the answer lines for this assignment
        answer_lines = all_answers_lines[assignmentIdx] if assignmentIdx < len(all_answers_lines) else []
        assignments.append({
            "no": no,
            "title": title,
            "date": date,
            "lexile": lexile,
            "assignment": " ".join(block[assignment_text_start_line:]),
            "student_response": " ".join(answer_lines)
        })
    return {"assignments_completed": assignments_completed, "data": assignments}

def parse_student(pdf, start_page, num_pages):
    pages_text = [pdf.pages[start_page + i].extract_text() for i in range(num_pages)]
    student = parse_student_info(pages_text[0])
    student['reading_activities'] = parse_reading_table(pages_text[1]) if len(pages_text) > 1 else {"activities_completed": 0, "data": []}
    # Adaptive writing assignments: last page, and next page if it looks like a continuation
    writing_pages = []
    writing_page_indices = []
    # Always include the last page
    writing_pages.append(pages_text[-1])
    writing_page_indices.append(start_page + num_pages - 1)
    # Check if next page exists and is a writing continuation
    next_page_idx = start_page + num_pages
    if next_page_idx < len(pdf.pages):
        next_page_text = pdf.pages[next_page_idx].extract_text()
        if next_page_text and ("Writing Assignments" in next_page_text or next_page_text.strip().startswith(("No.:", "Title:"))):
            writing_pages.append(next_page_text)
            writing_page_indices.append(next_page_idx)
    writing_lines = []
    all_answers_lines = []
    for idx, wp in enumerate(writing_pages):
        lines = [ln.strip() for ln in wp.splitlines() if ln.strip()]
        if len(lines) > 7:
            if idx == len(writing_pages) - 1:
                # Last writing page: remove first 6 and last 2 lines
                lines = lines[6:-2]
            else:
                # Other writing pages: remove first 6 and last line
                lines = lines[6:-1]
        else:
            lines = []
        writing_lines.extend(lines)
        # Extract highlighted lines (answers) from the page
        highlighted_lines = extract_highlighted_lines(pdf.pages[writing_page_indices[idx]])
        if highlighted_lines:
            all_answers_lines.append(highlighted_lines)
        
        if any("810L" in name for name in lines):
          print(writing_lines)

    student['writing_assignments'] = parse_writing_assignments_from_lines(writing_lines, all_answers_lines) if writing_lines else {"assignments_completed": 0, "data": []}
    return student

def extract_highlighted_lines(page, highlight_color=(0, 0, 1)):
    # highlight_color: (R, G, B) tuple, e.g., (0, 0, 1) for blue
    words = page.extract_words(extra_attrs=["non_stroking_color"])
    # Group words by y0 (line)
    lines = {}
    for word in words:
        color = word.get("non_stroking_color")
        if color == highlight_color:
            y0 = round(word["top"], 1)
            if y0 not in lines:
                lines[y0] = []
            lines[y0].append(word["text"])
    # Sort lines by y0 and join words
    highlighted_lines = [" ".join(lines[y]) for y in sorted(lines.keys())]
    return highlighted_lines

def pdf_to_json(pdf_path, output_path):
    data = []
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        i = 0
        student_idx = 0
        while i < total_pages:
            # Try 4-page student first
            if i + 3 < total_pages:
                first_page_text = pdf.pages[i].extract_text()
                if re.search(r"Student:\s*", first_page_text):
                    try:
                        student = parse_student(pdf, i, 4)
                        data.append(student)
                        i += 4
                        student_idx += 1
                        continue
                    except Exception as e:
                        print(f"Error parsing 4-page student at page {i}: {e}")
            # Try 3-page student fallback
            if i + 2 < total_pages:
                first_page_text = pdf.pages[i].extract_text()
                if re.search(r"Student:\s*", first_page_text):
                    try:
                        student = parse_student(pdf, i, 3)
                        data.append(student)
                        i += 3
                        student_idx += 1
                        continue
                    except Exception as e:
                        print(f"Error parsing 3-page student at page {i}: {e}")
            # If neither, skip this page
            # print(f"Skipping page {i} (no valid student info found)")
            i += 1
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Exported to {output_path}")

if __name__ == "__main__":
    pdf_to_json("./in/literacy.pdf", "out/literacy_data_test.json")
