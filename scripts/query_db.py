import sqlite3
import json

db_path = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/2a9a3ac8ba995003b9274683f627dcf23f9a1afd74921342cbd1d11f9aff4276.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Query jobs
cursor.execute('SELECT id, project_id, status, is_unlocked FROM planning_jobs WHERE id IN (6405, 6407)')
print("Jobs:", cursor.fetchall())

# Query plans status count
cursor.execute('SELECT status, COUNT(*) FROM project_plans WHERE job_id IN (6405, 6407) GROUP BY status')
print("Plans:", cursor.fetchall())

# Query center decisions count
cursor.execute('SELECT action_type, COUNT(*) FROM center_decisions GROUP BY action_type')
print("Decisions:", cursor.fetchall())

conn.close()
