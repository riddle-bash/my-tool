"""
**Thuật toán phân cụm bảng xếp hạng (Leaderboard Clustering)**

**1. Đầu vào:**
	- week_learn_1304_2004.xlsx: emailaddress, fullname, points (điểm tuần)
	- delta_week_point_from_0604_1304_to_1304_2004.xlsx: emailaddress, fullname, delta
	- year_learn_010126.xlsx: emailaddress, fullname, points (điểm năm)

**2. Tiền xử lý:**
	- Gộp dữ liệu theo emailaddress (vì fullname có thể trùng).
	- Bỏ qua người dùng có điểm tuần hoặc điểm năm = 0.

**3. Tính toán điểm tổng hợp:**
	- Điểm tổng hợp = điểm năm * 0.7 + điểm tuần * 0.3

**4. Phân cụm:**
	- Mỗi cụm gồm ~100 người dùng (1 người + 99 người cùng hạng).
	- Có 6 hạng: diamond, ruby, emerald, gold, silver, bronze (diamond cao nhất).
	- Mỗi hạng có 5 cấp: I, II, III, IV, V (V là cao nhất).
	- Tổng cộng 30 slot (6 hạng x 5 cấp), mỗi slot nhận ~total/30 người dùng.
	- Trong mỗi slot, người dùng được phân bổ round-robin vào các cụm (vị trí lẻ/chẵn luân phiên)
	  để tránh cụm nhỏ hơn không có nghĩa là điểm cao hơn.
	- Mỗi cụm có cluster_id duy nhất (tăng dần từ 1).
	- Người dùng có điểm tổng hợp cao nhất sẽ được đảm bảo ở Diamond V.

**5. Xuất kết quả:**
	- leaderboard_clustered.xlsx: emailaddress, fullname, week_points, delta, year_points, rank, level, cluster_id
"""
import math
import pandas as pd

# Input file paths
WEEK_FILE = 'week_learn_1304_2004.xlsx'
DELTA_FILE = 'delta_week_point_from_0604_1304_to_1304_2004.xlsx'
YEAR_FILE = 'year_learn_010126.xlsx'
OUTPUT_FILE = 'leaderboard_clustered.xlsx'

CLUSTER_SIZE = 100
RANK_NAMES = ['diamond', 'ruby', 'emerald', 'gold', 'silver', 'bronze']
LEVEL_NAMES = ['V', 'IV', 'III', 'II', 'I']  # V is highest
TOTAL_SLOTS = len(RANK_NAMES) * len(LEVEL_NAMES)  # 30

# Read input files
week_df = pd.read_excel(WEEK_FILE)
delta_df = pd.read_excel(DELTA_FILE)
year_df = pd.read_excel(YEAR_FILE)

# Rename points columns to avoid collision
week_df = week_df.rename(columns={'points': 'week_points'})
year_df = year_df.rename(columns={'points': 'year_points'})

# Merge on emailaddress (fullname can be duplicated)
merged = week_df[['emailaddress', 'fullname', 'week_points']].merge(
    delta_df[['emailaddress', 'delta']],
    on='emailaddress',
    how='left'
).merge(
    year_df[['emailaddress', 'year_points']],
    on='emailaddress',
    how='left'
)

# Fill missing values with 0
merged['week_points'] = merged['week_points'].fillna(0)
merged['year_points'] = merged['year_points'].fillna(0)
merged['delta'] = merged['delta'].fillna(0)

# Filter out users with 0 week or year points
merged = merged[(merged['week_points'] > 0) & (merged['year_points'] > 0)].copy()

# Calculate combined score for ranking
merged['combined_score'] = merged['year_points'] * 0.7 + merged['week_points'] * 0.3

# Sort descending by combined score, then year points, then week points
merged = merged.sort_values(
    ['combined_score', 'year_points', 'week_points'],
    ascending=[False, False, False]
).reset_index(drop=True)

# --- Clustering with round-robin distribution within each rank/level slot ---
#
# Step 1: Divide all users into TOTAL_SLOTS (30) groups evenly.
#         Users at positions 0..N-1 → slot = floor(i * TOTAL_SLOTS / N)
#         This ensures Diamond V (slot 0) gets the top ~N/30 users.
#
# Step 2: Within each slot, compute how many clusters are needed:
#         num_clusters = ceil(slot_size / CLUSTER_SIZE)
#
# Step 3: Distribute users in the slot round-robin across its clusters:
#         local_position j → local_cluster = j % num_clusters
#         (odd/even rule when num_clusters=2: position 0,2,4,... → cluster 0,
#                                             position 1,3,5,... → cluster 1)
#         This ensures every cluster within the same rank/level has a spread of
#         scores instead of the first cluster having only the highest scores.
#
# Step 4: Assign a globally unique cluster_id by accumulating offsets per slot.

total = len(merged)

# Assign slot index to each user
merged['slot'] = ((merged.index.to_series() * TOTAL_SLOTS) // total).clip(upper=TOTAL_SLOTS - 1).values

# Compute per-slot number of clusters
slot_sizes = merged.groupby('slot').size()
slot_num_clusters = slot_sizes.apply(lambda n: max(1, math.ceil(n / CLUSTER_SIZE)))

# Compute global cluster_id offset for the first cluster of each slot
slot_offset: dict[int, int] = {}
offset = 0
for slot in range(TOTAL_SLOTS):
    slot_offset[slot] = offset
    offset += slot_num_clusters.get(slot, 0)

# Local position within each slot (used for round-robin)
merged['local_pos'] = merged.groupby('slot').cumcount()

# Assign rank, level, cluster_id
merged['rank'] = merged['slot'].apply(lambda s: RANK_NAMES[s // len(LEVEL_NAMES)])
merged['level'] = merged['slot'].apply(lambda s: LEVEL_NAMES[s % len(LEVEL_NAMES)])
merged['cluster_id'] = merged.apply(
    lambda row: slot_offset[row['slot']]
                + (row['local_pos'] % slot_num_clusters[row['slot']])
                + 1,
    axis=1
)

# Drop helper columns
merged = merged.drop(columns=['combined_score', 'slot', 'local_pos'])

# Reorder output columns
output_cols = ['emailaddress', 'fullname', 'week_points', 'delta', 'year_points', 'rank', 'level', 'cluster_id']
merged = merged[output_cols]

# Output to Excel
merged.to_excel(OUTPUT_FILE, index=False)

total_clusters = merged['cluster_id'].max()
print(f'Clustered leaderboard saved to {OUTPUT_FILE}')
print(f'Total users: {len(merged)}')
print(f'Total clusters: {total_clusters}')
print()

# Summary per rank/level
summary = merged.groupby(['rank', 'level'])['cluster_id'].nunique().reset_index()
summary.columns = ['rank', 'level', 'num_clusters']
print('Rank/Level distribution (number of clusters):')
print(summary.to_string(index=False))
