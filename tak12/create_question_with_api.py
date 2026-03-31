import requests
import time
import random

BASE_URL = "https://datademo.tienganhk12.com/api/services/app/Quiz/CreateQuestion"  # replace with your API
HEADERS = {
    "Content-Type": "application/json",
    "Cookie": "_ga=GA1.1.150811419.1773384140; _fbp=fb.1.1773384140542.595778420143528331; _hjSessionUser_3264799=eyJpZCI6IjcyZGI4NTk3LTFkYjctNTdjYi1iZTc0LWU3MDgwYTQyYmYzYyIsImNyZWF0ZWQiOjE3NzMzODQxNDA2MTEsImV4aXN0aW5nIjp0cnVlfQ==; kc_session=CfDJ8J6W53FtDJ1IhTPHm0vbN3dltWiCVebCGknucN0TGYLgASCnOXIH8T2d1CnKajtoxuXGtP3YCZ9_bO6xMuhtP2uARcAmpadNruQ9GUGanA6W8U75WcMvLhKE_iVampPXt4b-fH0XrNUOyi9-ZqHLw5K9YseRCLUtNyOaD66FCachobAfsAG0lSXHakSfCOC9vO1GimpcLWhf7duduJfKQlkEqXhB7cknSDtQeecGuqWxRnHAsLs5WDjT_N_Xmi4wY46y5bH9CtaqUFd98h9fvqcOKMyjg1jlIgd8Pmywfn65NlG3wgRfXujcItUNIlLOY4fmyKtww8ksLV-f9SbVET8G1fTqPZiF6XTQErkkWKheajGtA5W7vfgqF9E-NgokoqnBu0EGIufbwcbuJTw9koc6bQ60M__XRjayMF7gw630jyHfKD6sFwbppAxYJqlrocwo4dqy3l3IvaqZQ82z6nuQGwWIKdbV_kiyvs9XRotTalBXP-cxk3Y1V3dkTkDJPwDdy9ij1OJdnhm45wC9iXP3Y73zWQQxe0ZMknyKXYdm3IKB8bUsG9SquNTE-0RtdyAQrzSemGXin8nr_iSpaZkKKvUhYry_im4GHKqODv-YkhSyQpvR5OBNaIyx4EKCowPW4NcycNVLSE2JDIkzqP9qA6T0lTdDljUjhklhSJI_cATOkLpWtcmboh-AE_7ybjq5RzFYfB9sASdtdsxlLXOrQpDiGIAaJLg8_3QJg8i13Y7wjZQOJ08W6Rhb2ZWAVgkm4ZRujBMZMl-WJFTqjCQ; _gcl_au=1.1.1778981222.1773384140.2058210105.1774929664.1774929916; _ga_2WVBCVR6K5=GS2.1.s1774929662$o43$g1$t1774929916$j59$l0$h0 "
}


def create_reading_text(question_text, question_name):
    payload = {
        "questionText": f"<p>{question_text}</p>",
        "questionName": str(question_name),
        "questionType": 8
    }

    response = requests.post(BASE_URL, json=payload, headers=HEADERS)
    response.raise_for_status()

    data = response.json()
    question_id = data["result"]["id"]

    print(f"Created reading text ID: {question_id}")
    return question_id



def create_multiple_choice(parent_id, question_text, question_name, answers):
    payload = {
        "questionText": f"<p>{question_text}</p>",
        "questionName": str(question_name),
        "questionType": 1,
        "answerList": answers
    }
    if parent_id is not None:
        payload["parentQuestionId"] = parent_id

    response = requests.post(BASE_URL, json=payload, headers=HEADERS)
    response.raise_for_status()

    data = response.json()
    print(f"Created MCQ ID: {data['result']['id']}")
    return data["result"]["id"]



# Random text generators

# Use a simple word list for random generation
WORD_LIST = [
    'apple', 'banana', 'cat', 'dog', 'elephant', 'fish', 'grape', 'house', 'ice', 'jungle',
    'kite', 'lemon', 'monkey', 'notebook', 'orange', 'pencil', 'queen', 'river', 'sun', 'tree',
    'umbrella', 'vase', 'window', 'xylophone', 'yarn', 'zebra', 'car', 'book', 'phone', 'star',
    'cloud', 'mountain', 'lake', 'road', 'flower', 'bird', 'music', 'light', 'chair', 'table',
    'cup', 'shoe', 'shirt', 'hat', 'ball', 'game', 'train', 'plane', 'boat', 'city'
]

def random_text(num_words=10):
    words = random.choices(WORD_LIST, k=num_words)
    sentence = ' '.join(words).capitalize() + '.'
    return sentence


def random_question():
    return random_text(random.randint(5, 12))


def random_reading():
    return random_text(random.randint(15, 30))


def random_answers():
    correct = random.randint(0, 3)
    answers = []
    for i in range(4):
        answers.append({
            "text": random_text(random.randint(1, 3)),
            "correct": i == correct
        })
    return answers


def format_answers(answer_list):
    return [
        {
            "answerText": a["text"],
            "isCorrectAnswer": a["correct"],
            "isHtml": False,
            "isSpeak": False
        }
        for a in answer_list
    ]




def run():
    try:
        num_questions = int(input("How many questions do you want to generate? "))
    except Exception:
        print("Invalid input. Using 2 questions.")
        num_questions = 2

    try:
        mcq_only = input("Generate MCQ without parent question? (y/n): ").strip().lower() == 'y'
    except Exception:
        mcq_only = False

    question_counter = 1
    for _ in range(num_questions):
        question = random_question()
        answers = random_answers()

        if mcq_only:
            # Only create MCQ without parent
            create_multiple_choice(
                None,
                question,
                f"18916-1-{question_counter}",
                format_answers(answers)
            )
            question_counter += 1
        else:
            reading = random_reading()
            # Step 1: Create reading text
            parent_id = create_reading_text(
                reading,
                f"18916-1-{question_counter}"
            )
            time.sleep(0.5)
            question_counter += 1

            # Step 2: Create MCQ
            create_multiple_choice(
                parent_id,
                question,
                f"18916-1-{question_counter}",
                format_answers(answers)
            )
            question_counter += 1


if __name__ == "__main__":
    run()