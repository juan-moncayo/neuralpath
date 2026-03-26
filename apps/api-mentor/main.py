import os
import logging
from pathlib import Path

from dotenv import load_dotenv

# Load .env from repo root (two levels up from apps/api-mentor/)
_root_env = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=_root_env)

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from api.sessions import handle_session
from db import turso as db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

NEXTJS_URL = os.getenv("NEXTJS_URL", "http://localhost:3002")

app = FastAPI(title="NeuralPath api-mentor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[NEXTJS_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "api-mentor"}


@app.get("/mentors")
async def get_mentors() -> list[dict]:
    return await db.get_all_mentors()


@app.get("/sessions/child/{child_id}")
async def get_child_sessions(child_id: str) -> list[dict]:
    """Returns the last 20 MentorSession records for a child, ordered by startedAt desc,
    each enriched with the mentor's name and emoji."""
    import libsql_client

    database_url = os.getenv("DATABASE_URL", "")
    database_auth_token = os.getenv("DATABASE_AUTH_TOKEN", "")

    async with libsql_client.create_client(
        url=database_url, auth_token=database_auth_token
    ) as client:
        result = await client.execute(
            """
            SELECT
                s.id, s.childId, s.mentorId, s.status,
                s.startedAt, s.endedAt, s.durationSecs, s.scoreTotal,
                m.name AS mentorName, m.emoji AS mentorEmoji
            FROM MentorSession s
            LEFT JOIN Mentor m ON m.id = s.mentorId
            WHERE s.childId = ?
            ORDER BY s.startedAt DESC
            LIMIT 20
            """,
            [child_id],
        )
        cols = [col.name for col in result.columns]
        return [dict(zip(cols, row)) for row in result.rows]


@app.websocket("/ws/session/{mentor_id}")
async def websocket_session(websocket: WebSocket, mentor_id: str) -> None:
    await handle_session(websocket, mentor_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3003, reload=True)
