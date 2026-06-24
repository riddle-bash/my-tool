import requests
import string
from datetime import datetime

BASE_URL = "http://localhost:3002/api/services/app"

COOKIE = "kc_session=CfDJ8FbiYLZVrUpDrMQ9Gw-G3en2GctWsmlD19u81GcXIMbsm60nt0j-B7TRU13_XdLCdyW4QQesBnpmmVHEptavtWmtWmpPcOYN1D1cKu3ThnCxNHKbKeAAWcCSEVD_o2hU2vKBaxUJbrmeedUGFReJUki2xTvdLdVz5qKqGt8g6tN0tITkQXfhENMFR5_VD6JDzJHzQoy5Ec0Qm_QbjlcXDj2zBsdvX4LSrwGSPa2KtL6Ghvo4SZhfNgCJHhpseY3bFr665UQWTpC4T1QSEGFTaLWd1NKLJy-e6VjQj7TGk0Gvmwylvgz72HoruCp0KgWkswia-S0KDH9A4C0ZQb1eE5N25y3ijBznKC3-93aD8VJaXFi9zOPHtjcUwat2lnAXtkaObo2AaqMf0EwPEOvz4npvI9YiVjrlYz6QR7DlKHtpXtSVRIcvcNhC9LaNH2FM5-2WinIvgpYd8LEJ1896aUIrPQ39s3diCQ6iP5oodfrUFYMFRHDdCcnImdIgse7CdcPaK4oekxO7_RyIdmx6RfhNnp9hdviymzXc_WCfYEjCxblrcpI33ykyng8WSVJF7PLlyFIgxA-_-75J1JEWj7ShDx6eo4UZvBhAmsVD60rJ0D848ZRpV6QtAztu5yU8G-mPJOcJzPDBZr2m4jovZoEesE15nzO2HvaB3mKKee4g310a_bbfRBjpjMXBUIkr_lTRfFL0AczZL5JE6B1phcQNTT6jro0JHpZ1glncvinhOHJZzAIfmILv-K66LS72Hd4-kTy8RoWI3vfVQKUUMjU; Path=/; HttpOnly;"          # Paste entire Cookie header here
XSRF_TOKEN = "XSRF-TOKEN=CfDJ8FbiYLZVrUpDrMQ9Gw-G3eksQr7l05aLTJnZazoXGT2yMYQWBGD2yRK5XdDz6QKLiwh85emHgh1euJk8eNK87dhIF_lZ0-9e9KSDCg5O-F4A56khC7MyjioVkXbm5QBMZME66GNbe4vQT2Q76kRJV6E2t7cAHGMciBWKtdei6PShbO43VtJjxvn4oGTCDwfSfw; Path=/;"      # Optional

HEADERS = {
    "Content-Type": "application/json",
    "Cookie": COOKIE,
    "X-XSRF-TOKEN": XSRF_TOKEN,
}

def post(endpoint, payload):
    r = requests.post(
        BASE_URL + endpoint,
        json=payload,
        headers=HEADERS
    )

    r.raise_for_status()

    data = r.json()

    # ABP usually wraps response inside result
    return data["result"]


# ----------------------------------------
# Create Exam
# ----------------------------------------

def create_exam(letter):
    payload = {
        "examName": f"Exam {letter}",
        "feature": False,
        "cefrExam": False,
        "numOfQuizzes": 0,
        "enableSubExam": False,
        "isLearnEnabled": False,
        "imagePath": f"https://github.com/riddle-bash/my-tool/blob/main/assets/exam/letter-{letter.lower()}.png?raw=true"
    }

    result = post("/Exam/Create", payload)

    print("Created Exam:", result["id"])

    return result["id"]


# ----------------------------------------
# Create Quiz Category
# ----------------------------------------

def create_category(exam_id, letter, number):
    payload = {
        "name": f"{letter}-QC{number}",
        "sortOrder": number,
        "quizMaxPoint": 10,
        "description": "",
        "isLearn": False,
        "isSortAsc": False,
        "includeInPracticeSuggestions": True,
        "metaTitle": "",
        "metaDescription": "",
        "metaKeywords": "",
        "examId": exam_id
    }

    result = post("/QuizCategory/Create", payload)

    print("Created Category:", result["id"])

    return result["id"]


# ----------------------------------------
# Create Quiz
# ----------------------------------------

def create_quiz(category_id, letter, number):
    payload = {
        "quizName": f"{letter}-Q{number}",
        "description": "",
        "imagePath": "",
        "totalPoint": 10,
        "timeLimit": 0,
        "scoringType": 0,
        "questionPerPage": 1,
        "shuffleQuestion": False,
        "shuffleAnswer": False,
        "quizType": 0,
        "showResultType": 0,
        "isPremium": False,
        "requireCode": False,
        "code": "",
        "attemptAllowed": 0,
        "showFeedBackForFreeUser": False,
        "publish": 1,
        "quizCategoryId": category_id,
        "inputNewsTags": [],
        "feedBackMessage": "",
        "articleLink": "",
        "quizFeedbackMode": 0,
        "metaKeywords": "",
        "metaDescription": "",
        "metaTitle": "",
        "author": "",
        "subjectId": 1,
        "showToUserRoles": [],
        "isSpeakingQuiz": False,
        "speakingGradingMode": 0,
        "speakingAllowReRecord": True,
        "publishedDate": datetime.utcnow().isoformat() + "Z"
    }

    result = post("/Quiz/CreateQuiz", payload)

    print("Created Quiz:", result["id"])

    return result["id"]


# ----------------------------------------
# Create Question
# ----------------------------------------

def create_question(quiz_id, index):
    payload = {
        "quizId": quiz_id,
        "questionText": "<p>What is his name that start with letter P?</p>",
        "questionName": str(index),
        "questionType": 1,
        "questionStatus": 0,
        "questionState": 0,
        "vocabLevel": 1,
        "difficulty": 1,
        "cognitiveLevel": 1,
        "grade": 1,
        "defaultMark": 1,
        "hint": "",
        "feedbackMessage": "<p>He is Peter</p>",
        "showOnQuizOnly": False,
        "displayNote": False,
        "displayNotePosition": 3,
        "showRelatedTopicDetail": False,
        "displayAllChildren": False,
        "showExplanationSideBySide": True,
        "dragDrop": False,
        "enableShortAnswer": False,
        "essayAnswerLines": 5,
        "note": "",
        "enableStepByStepGuide": False,
        "stepByStepGuide": "",
        "subjectId": 1,
        "questionTaxonomyIds": [],
        "selectedTopicIds": [],
        "inputQuestionTags": [],
        "answerList": [
            {
                "answerText": "Peter",
                "isCorrectAnswer": True,
                "isHtml": False,
                "isSpeak": False,
                "feedback": ""
            },
            {
                "answerText": "Thomas",
                "isCorrectAnswer": False,
                "isHtml": False,
                "isSpeak": False,
                "feedback": ""
            },
            {
                "answerText": "Anderson",
                "isCorrectAnswer": False,
                "isHtml": False,
                "isSpeak": False,
                "feedback": ""
            }
        ]
    }

    result = post("/Quiz/CreateQuestion", payload)

    print("Created Question:", result["id"])


# ----------------------------------------
# Build entire exam
# ----------------------------------------

def build_exam(letter):
    exam_id = create_exam(letter)

    for category_number in [1, 2]:
        category_id = create_category(
            exam_id,
            letter,
            category_number
        )

        quiz_id = create_quiz(
            category_id,
            letter,
            category_number
        )

        create_question(quiz_id, 1)
        create_question(quiz_id, 2)


if __name__ == "__main__":
  # Create exams A-L, except B
  for letter in string.ascii_uppercase[:12]:  # A-L
      if letter == "B":
          continue

      print(f"\n=== Creating Exam {letter} ===")
      build_exam(letter)