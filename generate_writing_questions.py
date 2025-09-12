import json
import random
import os

# Pool of question texts
question_pool = [
    "Some people think that governments should invest more in public transportation, while others believe money should be spent on improving roads and highways. Discuss both views and give your own opinion.",
    "Some people believe that children should start learning a foreign language at primary school rather than secondary school. Do the advantages outweigh the disadvantages?",
    "In many countries, plastic containers have become more common than ever and are used by many food and drink companies. What are the advantages and disadvantages of this trend?",
    "Some people think the best way to reduce crime is to give longer prison sentences. Others believe there are better ways to reduce crime. Discuss both views and give your own opinion."
]

# Rubrics
rubric_pool = [
    {"id": 1, "title": "Task Response", "description": "Addresses all parts of the task with clear position throughout.", "minPoint": 0, "maxPoint": 9},
    {"id": 2, "title": "Coherence and Cohesion", "description": "Logical organisation of ideas with appropriate linking devices.", "minPoint": 0, "maxPoint": 9},
    {"id": 3, "title": "Lexical Resource", "description": "Uses a wide range of vocabulary with precision.", "minPoint": 0, "maxPoint": 9},
    {"id": 4, "title": "Grammatical Range and Accuracy", "description": "Accurate and flexible use of sentence structures.", "minPoint": 0, "maxPoint": 9}
]

# Structures
structure_pool = [
    {"id": 1, "title": "Introduction", "description": "Introduce the essay topic and give a clear thesis statement.", "purposeText": "Set up the context of the essay.", "exampleText": "This essay will discuss both perspectives and argue for..."},
    {"id": 2, "title": "Body Paragraph 1", "description": "Present the first main idea with examples.", "purposeText": "Explain one side of the argument.", "exampleText": "For instance, public transport reduces congestion..."},
    {"id": 3, "title": "Body Paragraph 2", "description": "Present the opposite idea with examples.", "purposeText": "Explain the other side of the argument.", "exampleText": "However, improving roads can also help..."},
    {"id": 4, "title": "Conclusion", "description": "Summarise the discussion and restate position.", "purposeText": "Close the essay with a clear stance.", "exampleText": "In conclusion, while both sides have merits..."}
]

# Compliments and reviews
compliment_texts = [
    "Excellent effort! Your essay demonstrates strong critical thinking.",
    "Well done! You’ve structured your response clearly.",
    "Good job! Your vocabulary usage is impressive."
]
review_texts = [
    "Consider expanding your examples for stronger support.",
    "Work on improving sentence variety to boost grammar range.",
    "Try to make your thesis statement more precise."
]

# Comment authors
comments_pool = [
    {"userId": 1, "email": "teacher@example.com", "name": "Mr. Smith", "role": "teacher"},
    {"userId": 2, "email": "student@example.com", "name": "Anna Lee", "role": "self"},
    {"userId": 3, "email": "peer@example.com", "name": "John Doe", "role": "tak12"}
]

# Comment types
comment_types = [
    {"id": 1, "description": "Grammar error"},
    {"id": 2, "description": "Spelling error"},
    {"id": 3, "description": "Vocabulary usage error"},
    {"id": 4, "description": "Compliment"}
]

# Essay samples
essay_samples = [
    "In today's world, investment in public transportation is crucial to reduce traffic...",
    "Children learning foreign languages early gain cognitive advantages...",
    "Plastic containers provide convenience but also cause environmental harm..."
]

def generate_questions(n=3):
    questions = []
    for i in range(1, n+1):
        question = {
            "id": i,
            "questionText": random.choice(question_pool),
            "rubric": rubric_pool,
            "structure": structure_pool
        }
        questions.append(question)
    return {"questions": questions}

def generate_ai_response(question_id):
    overall_point = random.randint(5, 9)
    max_point = 9
    return {
        "ai_response": {
            "overall": {
                "point": overall_point,
                "max_point": max_point,
                "complimentText": random.choice(compliment_texts),
                "reviewText": random.choice(review_texts)
            },
            "rubric": {
                r["id"]: {
                    "point": random.randint(r["minPoint"], r["maxPoint"]),
                    "reviewText": random.choice(review_texts)
                } for r in rubric_pool
            },
            "comments": [
                {
                    **random.choice(comments_pool),
                    "commentText": random.choice(review_texts),
                    "type": random.choice(comment_types)
                }
                for _ in range(2)
            ],
            "sample_essays": [
                {"id": i, "sourceId": random.choice(["ai", "editor"]), "essayText": random.choice(essay_samples)}
                for i in range(1, 3)
            ]
        }
    }

def generate_data(n=3):
    data = generate_questions(n)
    for q in data["questions"]:
        q["ai_response"] = generate_ai_response(q["id"])["ai_response"]
    return data

# Ensure output folder exists
os.makedirs("out", exist_ok=True)

# Generate data
generated = generate_data(3)

# Write to file
with open("out/dummy_ai_writing.json", "w", encoding="utf-8") as f:
    json.dump(generated, f, indent=2, ensure_ascii=False)

print("✅ Dummy data with comment types written to out/dummy_ai_writing.json")
