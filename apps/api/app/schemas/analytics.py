"""
Analytics schemas — request and response models for anonymous conversion analytics.

Decision #138: Zero PII in analytics events.
"""

from __future__ import annotations

import datetime
from typing import Literal

from pydantic import BaseModel, Field

# Type alias for the literal union of allowed event types (whitelist to prevent abuse)
EventType = Literal[
    "page_view",
    "signup_completed",
    "file_upload",
    "analysis_started",
    "preview_opened",
    "checkout_initiated",
    "checkout_completed",
]


class TrackEventRequest(BaseModel):
    """Request to track a single anonymous conversion event.

    The event_type is validated against a strict whitelist of known types.
    """

    event_type: EventType = Field(
        ...,
        description="The type of event to track. Must be one of the known event types.",
    )


class EventCountResponse(BaseModel):
    """A single event count for a specific type and date."""

    event_type: str
    event_date: datetime.date
    count: int


class AnalyticsSummaryResponse(BaseModel):
    """Aggregated analytics summary for a date range."""

    events: list[EventCountResponse]
    period_start: datetime.date
    period_end: datetime.date
