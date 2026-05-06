import argparse
from html import unescape
import os
import string

import pandas as pd


def normalize_col(col_name: str) -> str:
    """Normalize a column name for case-insensitive matching."""
    return "".join(ch for ch in str(col_name).lower().strip() if ch.isalnum())


def find_column(columns, candidates):
    """Find the first matching column by normalized candidate names."""
    normalized_map = {normalize_col(col): col for col in columns}
    for candidate in candidates:
        found = normalized_map.get(normalize_col(candidate))
        if found is not None:
            return found
    return None


def alphabet_label(index: int) -> str:
    """Convert 0-based index to alphabetical label: A, B, ..., Z, AA, AB, ..."""
    letters = string.ascii_uppercase
    base = len(letters)
    label = ""
    n = index + 1

    while n > 0:
        n, remainder = divmod(n - 1, base)
        label = letters[remainder] + label

    return label


def build_answers_text(answer_values):
    items = []
    for idx, answer in enumerate(answer_values):
        if pd.isna(answer):
            continue

        text = unescape(str(answer)).strip()
        if not text:
            continue

        items.append(f"{alphabet_label(idx)}. {text}")

    return "\n".join(items)


def merge_questions_answers(questions_path: str, answers_path: str, output_path: str):
    questions_df = pd.read_excel(questions_path)
    answers_df = pd.read_excel(answers_path)

    questions_qid_col = find_column(questions_df.columns, ["QuestionId", "questionid"])
    question_text_col = find_column(questions_df.columns, ["QuestionText", "questiontext"])
    feedback_message_col = find_column(
        questions_df.columns, ["FeedbackMessage", "feedbackmessage"]
    )
    answers_qid_col = find_column(answers_df.columns, ["QuestionId", "questionid"])
    answers_text_col = find_column(answers_df.columns, ["AnswerText", "answertext"])

    if questions_qid_col is None:
        raise ValueError("Could not find QuestionId column in questions file.")
    if answers_qid_col is None:
        raise ValueError("Could not find QuestionId column in answers file.")
    if answers_text_col is None:
        raise ValueError("Could not find AnswerText column in answers file.")

    if question_text_col is not None:
        questions_df[question_text_col] = questions_df[question_text_col].apply(
            lambda value: unescape(str(value)) if pd.notna(value) else value
        )

    if feedback_message_col is not None:
        questions_df[feedback_message_col] = questions_df[feedback_message_col].apply(
            lambda value: unescape(str(value)) if pd.notna(value) else value
        )

    answers_df[answers_text_col] = answers_df[answers_text_col].apply(
        lambda value: unescape(str(value)) if pd.notna(value) else value
    )

    grouped_answers = (
        answers_df.groupby(answers_qid_col, dropna=False)[answers_text_col]
        .apply(lambda series: build_answers_text(series.tolist()))
        .to_dict()
    )

    output_df = questions_df.copy()
    output_df["Answers"] = output_df[questions_qid_col].map(grouped_answers).fillna("")

    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    output_df.to_excel(output_path, index=False)

    print(f"Merged file written to: {output_path}")
    print(f"Total questions: {len(output_df)}")


def main():
    parser = argparse.ArgumentParser(
        description="Merge questions and answers XLSX by QuestionId and append formatted answers."
    )
    parser.add_argument(
        "--questions",
        default="../in/question.xlsx",
        help="Path to question.xlsx (default: ../in/question.xlsx)",
    )
    parser.add_argument(
        "--answers",
        default="../in/answers.xlsx",
        help="Path to answers.xlsx (default: ../in/answers.xlsx)",
    )
    parser.add_argument(
        "--output",
        default="../in/questions_with_answers.xlsx",
        help="Output file path (default: ../in/questions_with_answers.xlsx)",
    )
    args = parser.parse_args()

    merge_questions_answers(args.questions, args.answers, args.output)


if __name__ == "__main__":
    main()