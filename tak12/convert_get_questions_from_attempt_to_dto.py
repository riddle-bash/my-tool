import argparse
import json
import sys


MISSING = object()


def get_value(payload, *keys, default=MISSING):
    for key in keys:
        if key in payload:
            return payload[key]
    return default


def add_if_present(target, key, value):
    if value is not MISSING:
        target[key] = value


def normalize_speaking_answer(user_answers):
    if isinstance(user_answers, dict) and user_answers.get("audioPath"):
        return json.dumps(user_answers, separators=(",", ":"))
    return None


def is_parent_question(question):
    question_type = get_value(question, "questionTypeName", default=None)
    parent_question_id = get_value(question, "parentQuestionId", default=None)
    return question_type in {"Description", "PointAtPicture", "PlaceInPicture"} and parent_question_id == 0


def build_base_dto(question, take_time=0):
    dto = {}
    add_if_present(dto, "quizAttemptId", get_value(question, "quizAttemptId"))
    question_id = get_value(question, "id", "questionId")
    if question_id is not MISSING:
        dto["questionId"] = question_id
    dto["takeTime"] = take_time
    add_if_present(dto, "unSure", get_value(question, "unSure", "unsure"))
    return dto


def convert_question(question, take_time=0, remaining_seconds=MISSING):
    if not isinstance(question, dict):
        raise ValueError("Each question must be an object.")

    question_id = get_value(question, "id", "questionId")
    quiz_attempt_id = get_value(question, "quizAttemptId")

    if is_parent_question(question):
        dto = {}
        add_if_present(dto, "quizAttemptId", quiz_attempt_id)
        if question_id is not MISSING:
            dto["questionId"] = question_id
        return dto

    question_type = get_value(question, "questionTypeName", default=None)
    user_answers = get_value(question, "userAnswers", "useranswers")
    fill_blank_short_answer = get_value(question, "fillBlankShortAnswer")

    dto = build_base_dto(question, take_time=take_time)

    if question_type in {"MultipleChoice", "TrueFalse", "CheckBox"}:
        dto["muptipleChoiseAnswer"] = user_answers
    elif question_type == "FillBlank":
        dto["fillBlankAnswer"] = user_answers
        add_if_present(dto, "fillBlankShortAnswer", fill_blank_short_answer)
    elif question_type == "Matching":
        dto["matchingAnswer"] = user_answers
    elif question_type == "WordOrder":
        dto["wordOrderAnswer"] = [] if user_answers is MISSING or user_answers is None else user_answers
    elif question_type == "WordUnscramble":
        dto["wordUnscrambleAnswer"] = [] if user_answers is MISSING or user_answers is None else user_answers
    elif question_type == "ShortAnswer":
        dto["shortAnswer"] = "" if user_answers is MISSING or user_answers is None else user_answers
    elif question_type == "ErrorCorrection":
        dto["errorCorrectionAnswer"] = {} if user_answers is MISSING or user_answers is None else user_answers
    elif question_type == "DragDropOnPicture":
        dto["dragDropOnPictureAnswer"] = {} if user_answers is MISSING or user_answers is None else user_answers
    elif question_type == "Essay":
        dto["essayAnswer"] = "" if user_answers is MISSING or user_answers is None else user_answers
    elif question_type == "Speaking":
        dto["speakingAnswerData"] = normalize_speaking_answer(None if user_answers is MISSING else user_answers)
    elif question_type == "PointAtPicture":
        dto["pointAtPictureAnswer"] = [] if user_answers is MISSING or user_answers is None else user_answers
    elif question_type == "PlaceInPicture":
        dto["placeInPictureAnswer"] = {} if user_answers is MISSING or user_answers is None else user_answers

    if remaining_seconds is not MISSING and dto:
        dto["remainingSeconds"] = remaining_seconds

    return dto


def extract_questions(payload):
    if isinstance(payload, list):
        return payload

    if not isinstance(payload, dict):
        raise ValueError("Input payload must be an object or a list of questions.")

    result = payload.get("result")
    if isinstance(result, dict) and isinstance(result.get("questions"), list):
        return result["questions"]

    if isinstance(payload.get("questions"), list):
        return payload["questions"]

    raise ValueError("Could not find questions. Expected payload.questions or payload.result.questions.")


def convert_payload(payload, take_time=0, remaining_seconds=MISSING):
    questions = extract_questions(payload)
    return [
        convert_question(question, take_time=take_time, remaining_seconds=remaining_seconds)
        for question in questions
    ]


def parse_args(argv):
    parser = argparse.ArgumentParser(
        description="Convert quiz questions into the same DTO shape as checkAnswerInputDto.js."
    )
    parser.add_argument(
        "input",
        nargs="?",
        default="input.json",
        help="Path to a JSON file. Defaults to input.json.",
    )
    parser.add_argument(
        "--take-time",
        type=int,
        default=0,
        help="Value to use for takeTime when building each DTO.",
    )
    parser.add_argument(
        "--remaining-seconds",
        type=int,
        default=None,
        help="Optional remainingSeconds value to append to each DTO.",
    )
    return parser.parse_args(argv)


def load_payload(input_path):
    with open(input_path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def main(argv=None):
    args = parse_args(argv or sys.argv[1:])
    payload = load_payload(args.input)
    remaining_seconds = args.remaining_seconds if args.remaining_seconds is not None else MISSING
    result = convert_payload(payload, take_time=args.take_time, remaining_seconds=remaining_seconds)
    json.dump(result, sys.stdout, ensure_ascii=True, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()