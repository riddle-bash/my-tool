import json
import random

# Number of questions to generate
QUESTION_COUNT = 10

QUESTION_POOL = json.loads(r'''
[
  {
    "question": "What is the capital of France?",
    "answers": [
      {"text": "Paris", "correct": true, "feedback": "Correct!"},
      {"text": "London", "correct": false},
      {"text": "Berlin", "correct": false},
      {"text": "Rome", "correct": false}
    ]
  },
  {
    "question": "2 + 2 = ?",
    "answers": [
      {"text": "4", "correct": true},
      {"text": "3", "correct": false},
      {"text": "5", "correct": false},
      {"text": "6", "correct": false}
    ]
  },
  {
    "question": "Which animal can fly?",
    "answers": [
      {"text": "Bird", "correct": true},
      {"text": "Dog", "correct": false},
      {"text": "Cat", "correct": false},
      {"text": "Fish", "correct": false}
    ]
  }
]
''')

selected = random.sample(
    QUESTION_POOL,
    min(QUESTION_COUNT, len(QUESTION_POOL))
)

output = []

for i, q in enumerate(selected, 1):

    output.append("==Question type: MC")
    output.append(f"==Tên câu: Question {i}")
    output.append(f"==Câu hỏi: {q['question']}")
    output.append("==Các lựa chọn:")

    for ans in q["answers"]:
        prefix = "[x]" if ans["correct"] else "[ ]"

        line = f"{prefix} {ans['text']}"

        if ans.get("feedback"):
            line += f" |Phản hồi: {ans['feedback']}"

        output.append(line)

    output.append("")

print("\n".join(output))