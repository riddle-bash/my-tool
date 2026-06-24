import random
from datetime import datetime, timedelta

from create_user_exam_record import TODAY

HISTORY_DAYS = 180
USER_IDS = list(range(86, 6, -1))


def simulate_streak_history():
	current_streak = 0
	max_streak = 0
	running_streak = 0
	last_learned_date = None

	for day_offset in range(HISTORY_DAYS - 1, -1, -1):
		current_date = TODAY - timedelta(days=day_offset)
		studied = random.random() >= 0.25

		if studied:
			running_streak += 1
			max_streak = max(max_streak, running_streak)
			last_learned_date = current_date

			if day_offset == 0:
				current_streak = running_streak
		else:
			if day_offset == 0:
				current_streak = 0
			running_streak = 0

	if last_learned_date is None:
		last_learned_date = TODAY - timedelta(days=random.randint(7, 30))

	return current_streak, max_streak, last_learned_date


def generate_streak_inserts():
	inserts = []

	for user_id in USER_IDS:
		streak, max_streak, last_learned_date = simulate_streak_history()
		streak_freeze_count = random.randint(0, 5)
		last_learned_date_sql = last_learned_date.strftime("%Y-%m-%d")

		sql = f"""
INSERT INTO [QuizSystem].[dbo].[UserStreaks]
([UserId], [Streak], [MaxStreak], [LastLearnedDate], [StreakFreezeCount])
VALUES
({user_id}, {streak}, {max_streak}, '{last_learned_date_sql}', {streak_freeze_count});
""".strip()

		inserts.append(sql)

	return inserts


if __name__ == "__main__":
	sql_statements = generate_streak_inserts()

	print(f"Total inserts: {len(sql_statements)}")

	with open("user_streak_records.sql", "w") as file_handle:
		file_handle.write("\n\n".join(sql_statements))
