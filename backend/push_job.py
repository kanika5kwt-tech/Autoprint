from app.database import engine
from sqlalchemy import text
import redis, os
from dotenv import load_dotenv

load_dotenv('.env')

with engine.connect() as conn:
    result = conn.execute(text("SELECT id FROM print_jobs WHERE status::text = 'IN_QUEUE' ORDER BY created_at DESC LIMIT 1"))
    row = result.fetchone()
    if row:
        job_id = str(row[0])
        print(f'Job ID: {job_id}')
        r = redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379'))
        r.rpush('autoprint:print_queue', job_id)
        print('Job pushed to queue!')
    else:
        print('No IN_QUEUE jobs found')