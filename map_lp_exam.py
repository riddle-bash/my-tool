import json
import os
from datetime import datetime

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def slug_distance(s1, s2):
    import difflib
    return 1 - difflib.SequenceMatcher(None, s1, s2).ratio()

def find_closest_exam(slug, exams):
    best = None
    best_score = float('inf')
    for exam in exams:
        if not exam.get('seo') or exam.get('id') is None:
            continue
        score = slug_distance(slug, exam['seo'])
        if score < best_score:
            best_score = score
            best = exam
    return best

def main():
    result_path = os.path.join('in', 'result.json')
    exam_path = os.path.join('in', 'exam.json')
    result_data = load_json(result_path)
    exam_data = load_json(exam_path)
    landing_pages = result_data['result']['items']
    exams = exam_data
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    user_id = 420092
    sql_lines = ["USE [QuizSystem];\n", "GO\n\n"]
    used_exam_ids = set()
    for lp in landing_pages:
        slug = lp.get('slug')
        if not slug:
            continue
        exam = find_closest_exam(slug, exams)
        if not exam:
            continue
        exam_id = exam['id']
        if exam_id is None or exam_id in used_exam_ids:
            continue
        used_exam_ids.add(exam_id)
        def nstr(val):
            if val is None:
                return 'NULL'
            val = str(val)
            if val == '':
                return 'NULL'
            if val.startswith("N'"):
                return val if val.endswith("'") else val + "'"
            return f"N'{val.replace("'", "''")}'"
        image_val = lp.get('image', '')
        image_sql = 'NULL' if not image_val else f"N'{image_val.replace("'", "''")}"  # NULL if empty
        sql = f"""
INSERT INTO [dbo].[LandingPages]
([CreationTime],[CreatorUserId],[LastModificationTime],[LastModifierUserId],[IsDeleted],[DeleterUserId],[DeletionTime],[Slug],[Title],[Description],[Content],[MetaTitle],[MetaDescription],[MetaKeywords],[Image],[IsActive],[DisplayOrder],[ExamId])
VALUES
('{now}',{user_id},'{now}',{user_id},0,NULL,NULL,N'{lp.get('slug','').replace("'", "''")}',\
{nstr(lp.get('title',''))},\
{nstr(lp.get('description',''))},\
{nstr(lp.get('content',''))},\
{nstr(lp.get('metaTitle',''))},\
{nstr(lp.get('metaDescription',''))},\
{nstr(lp.get('metaKeywords',''))},\
{image_sql},\
{1 if lp.get('isActive',True) else 0},{lp.get('displayOrder',0)},{exam_id});
GO\n"""
        sql_lines.append(sql)
    with open('landingpages_insert.sql', 'w', encoding='utf-8-sig') as f:
        f.writelines(sql_lines)
    print(f"Exported {len(sql_lines)-2} insert queries to landingpages_insert.sql")

if __name__ == '__main__':
    main()

# sqlcmd -S 125.212.225.164,31433 -d QuizSystem -U contuhocweb -P contuhoc123@Abc -i "c:\Workspace\tool\landingpages_insert.sql"