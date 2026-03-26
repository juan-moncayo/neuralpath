import os
import uuid
from datetime import datetime, timezone
from typing import Any

import libsql_client

DATABASE_URL = os.getenv("DATABASE_URL", "")
DATABASE_AUTH_TOKEN = os.getenv("DATABASE_AUTH_TOKEN", "")


async def get_mentor(mentor_id: str) -> dict[str, Any] | None:
    async with libsql_client.create_client(
        url=DATABASE_URL, auth_token=DATABASE_AUTH_TOKEN
    ) as client:
        result = await client.execute(
            "SELECT * FROM Mentor WHERE id = ?", [mentor_id]
        )
        if not result.rows:
            return None
        row = result.rows[0]
        cols = [col.name for col in result.columns]
        return dict(zip(cols, row))


async def get_all_mentors() -> list[dict[str, Any]]:
    async with libsql_client.create_client(
        url=DATABASE_URL, auth_token=DATABASE_AUTH_TOKEN
    ) as client:
        result = await client.execute(
            "SELECT * FROM Mentor WHERE isActive = 1"
        )
        cols = [col.name for col in result.columns]
        return [dict(zip(cols, row)) for row in result.rows]


async def get_child(child_id: str) -> dict[str, Any] | None:
    async with libsql_client.create_client(
        url=DATABASE_URL, auth_token=DATABASE_AUTH_TOKEN
    ) as client:
        result = await client.execute(
            "SELECT * FROM ChildProfile WHERE id = ?", [child_id]
        )
        if not result.rows:
            return None
        row = result.rows[0]
        cols = [col.name for col in result.columns]
        return dict(zip(cols, row))


async def get_parent_email(parent_id: str) -> str | None:
    async with libsql_client.create_client(
        url=DATABASE_URL, auth_token=DATABASE_AUTH_TOKEN
    ) as client:
        result = await client.execute(
            "SELECT email FROM User WHERE id = ?", [parent_id]
        )
        if not result.rows:
            return None
        return str(result.rows[0][0])


async def count_sessions_this_month(child_id: str) -> int:
    now = datetime.now(timezone.utc)
    first_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()
    async with libsql_client.create_client(
        url=DATABASE_URL, auth_token=DATABASE_AUTH_TOKEN
    ) as client:
        result = await client.execute(
            "SELECT COUNT(*) FROM MentorSession WHERE childId = ? AND status = 'completed' AND startedAt >= ?",
            [child_id, first_of_month],
        )
        if not result.rows:
            return 0
        return int(result.rows[0][0])


async def create_session(child_id: str, mentor_id: str) -> str:
    session_id = "c" + uuid.uuid4().hex[:20]
    now = datetime.now(timezone.utc).isoformat()
    async with libsql_client.create_client(
        url=DATABASE_URL, auth_token=DATABASE_AUTH_TOKEN
    ) as client:
        await client.execute(
            "INSERT INTO MentorSession (id, childId, mentorId, status, startedAt, createdAt, updatedAt) "
            "VALUES (?, ?, ?, 'active', ?, ?, ?)",
            [session_id, child_id, mentor_id, now, now, now],
        )
    return session_id


async def update_session(
    session_id: str, status: str, score: int, duration: int
) -> None:
    now = datetime.now(timezone.utc).isoformat()
    async with libsql_client.create_client(
        url=DATABASE_URL, auth_token=DATABASE_AUTH_TOKEN
    ) as client:
        await client.execute(
            "UPDATE MentorSession SET status = ?, scoreTotal = ?, durationSecs = ?, endedAt = ?, updatedAt = ? "
            "WHERE id = ?",
            [status, score, duration, now, now, session_id],
        )


async def save_feedback(
    session_id: str,
    strengths: str,
    improvements: str,
    recommendations: str,
) -> None:
    feedback_id = "c" + uuid.uuid4().hex[:20]
    now = datetime.now(timezone.utc).isoformat()
    async with libsql_client.create_client(
        url=DATABASE_URL, auth_token=DATABASE_AUTH_TOKEN
    ) as client:
        await client.execute(
            "INSERT INTO SessionFeedback (id, sessionId, strengths, improvements, recommendations, createdAt, updatedAt) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            [feedback_id, session_id, strengths, improvements, recommendations, now, now],
        )
