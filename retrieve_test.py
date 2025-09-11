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

def parse_open_ended_writing_activities_from_lines(lines, all_answers_lines):
    activity_blocks = []
    current = []
    for line in lines:
        if line.startswith("No.:") and current:
            activity_blocks.append(current)
            current = [line]
        else:
            current.append(line)
    if current:
        activity_blocks.append(current)
    activities = []
    for blockIdx, block in enumerate(activity_blocks):
        no = None
        title = None
        lexile = None
        question = None
        question_text = []
        submitted_on = None
        for idx, line in enumerate(block):
            if line == "There is no data available.":
                return {"activities_completed": 0, "data": []}
            if line.startswith("No.:"):
                m = re.search(r"No\.:\s*(\d+)", line)
                no = int(m.group(1)) if m else None
            elif line.startswith("Title:"):
                title = line.replace("Title:", "").strip()
            elif line.startswith("Lexile"):
                m = re.search(r"Lexile.*?:\s*(\S+)", line)
                lexile = m.group(1) if m else None
            elif line.startswith("Question:"):
                m = re.match(r"Question:\s*(\d+)(?:\s*Submitted on:\s*(.*))?", line)
                if m:
                    question = m.group(1)
                    submitted_on = m.group(2).strip() if m.group(2) else None
            elif ((blockIdx >= len(all_answers_lines)) or not any(ans == line for ans in all_answers_lines[blockIdx])) and len(line.split()) > 1:
                if (line == "There is no data available."): 
                    continue
                question_text.append(line)
        activities.append({
            "no": no,
            "title": title,
            "lexile": lexile,
            "question": question,
            "question_text": " ".join(question_text).strip(),
            "submitted_on": submitted_on,
            "answer": ", ".join(all_answers_lines[blockIdx]) if blockIdx < len(all_answers_lines) else ""
        })
    return {"activities_completed": len(activities), "data": activities}

def parse_writing_assignments_from_lines(lines, all_answers_lines):
    if len(lines) < 3:
        return {"assignments_completed": 0, "data": []}
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
    return {"assignments_completed": len(all_answers_lines), "data": assignments}

def parse_student(pdf, start_page, num_pages):
    pages_text = [pdf.pages[start_page + i].extract_text() for i in range(num_pages)]
    student = parse_student_info(pages_text[0])
    student['reading_activities'] = parse_reading_table(pages_text[1]) if len(pages_text) > 1 else {"activities_completed": 0, "data": []}

    open_ended_lines = []
    last_open_ended_page = -1
    open_ended_answers_lines = []

    for idx, page in enumerate(pages_text):
        if ("Open-ended Writing Activities" in page):
            lines = [ln.strip() for ln in page.splitlines() if ln.strip()]
            if len(lines) > 7:
                # Remove first 6 and last 2 lines (header/footer)
                lines = lines[6:-1]
            else:
                lines = []
            open_ended_lines.extend(lines)
            # Extract highlighted lines (answers) from the page
            highlighted_lines = extract_highlighted_lines(pdf.pages[start_page + idx])
            if highlighted_lines:
                open_ended_answers_lines.append(highlighted_lines)
            else:
                open_ended_answers_lines.append([])
        elif ("Writing Assignments" in page):
            last_open_ended_page = idx
            break

    student['open_ended_writing_activities'] = parse_open_ended_writing_activities_from_lines(open_ended_lines, open_ended_answers_lines) if open_ended_lines else {"activities_completed": 0, "data": []}

    writing_lines = []
    all_answers_lines = []
    for idx, page in enumerate(pages_text[last_open_ended_page:]):
        if ("Writing Assignments" in page):
            lines = [ln.strip() for ln in page.splitlines() if ln.strip()]
            if len(lines) > 7:
                if start_page + idx == len(pages_text) - 1:
                    lines = lines[6:-2]
                else:
                    lines = lines[6:-1]
            else:
                lines = []
            writing_lines.extend(lines)
            # Extract highlighted lines (answers) from the page
            highlighted_lines = extract_highlighted_lines2(pdf.pages[start_page + last_open_ended_page + idx])
            if highlighted_lines:
                all_answers_lines.extend(highlighted_lines)
            else:
                all_answers_lines.append([])
            if any("810L" in name for name in lines):
                print(all_answers_lines)

    student['writing_assignments'] = parse_writing_assignments_from_lines(writing_lines, all_answers_lines) if writing_lines else {"assignments_completed": 0, "data": []}
    return student

def extract_highlighted_lines2(page, highlight_color=(0, 0, 1)):
    # Get all lines from the page text
    text_lines = [ln.strip() for ln in (page.extract_text() or "").splitlines() if ln.strip()]
    # Get highlighted lines as text
    words = page.extract_words(extra_attrs=["non_stroking_color"])
    lines = {}
    for word in words:
        color = word.get("non_stroking_color")
        if color == highlight_color:
            y0 = round(word["top"], 1)
            if y0 not in lines:
                lines[y0] = []
            lines[y0].append(word["text"])
    # Join words for each y0 to get highlighted line text
    highlighted_lines = [" ".join(lines[y]) for y in sorted(lines.keys())]
    # Find indices of highlighted lines in text_lines
    hl_indices = []
    for hl in highlighted_lines:
        try:
            idx = text_lines.index(hl)
            hl_indices.append((idx, hl))
        except ValueError:
            continue  # highlighted line not found in text_lines
    # Sort by index and group consecutive indices
    hl_indices.sort()
    grouped_answers = []
    current_group = []
    prev_idx = None
    for idx, hl in hl_indices:
        if prev_idx is not None and idx != prev_idx + 1:
            if current_group:
                grouped_answers.append(current_group)
                current_group = []
        current_group.append(hl)
        prev_idx = idx
    if current_group:
        grouped_answers.append(current_group)
    return grouped_answers

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
        # 1. Find all student start pages
        student_starts = []
        for idx in range(total_pages):
            text = pdf.pages[idx].extract_text()
            if text and re.search(r"Student ID:\s*", text):
                student_starts.append(idx)
        # 2. For each student, determine their page range
        for i, start_idx in enumerate(student_starts):
            end_idx = student_starts[i + 1] - 1 if i + 1 < len(student_starts) else total_pages - 1
            num_pages = end_idx - start_idx + 1
            try:
                student = parse_student(pdf, start_idx, num_pages)
                data.append(student)
            except Exception as e:
                print(f"Error parsing student at pages {start_idx}-{end_idx}: {e}")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Exported to {output_path}")

if __name__ == "__main__":
    pdf_to_json("./in/literacy.pdf", "out/literacy_data_test.json")
