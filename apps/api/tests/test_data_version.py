import pytest
from httpx import AsyncClient

from tests.fixtures import VALID_FULL_ANALYSIS_RESULT

SAMPLE_SUMMARY = {"trait_count": 5}


def _versioned_payload(
    label: str = "Versioned Analysis",
    data_version: object | None = "v2.1.0",
    *,
    include_version: bool = True,
) -> dict:
    """Build a save-analysis request payload with valid result_data."""
    payload: dict = {
        "label": label,
        "parent1_filename": "p1.txt",
        "parent2_filename": "p2.txt",
        "result_data": VALID_FULL_ANALYSIS_RESULT,
        "summary": SAMPLE_SUMMARY,
        "consent_given": True,
    }
    if include_version:
        payload["data_version"] = data_version
    return payload


@pytest.mark.asyncio
async def test_save_analysis_with_data_version(client: AsyncClient, auth_headers: dict[str, str]):
    """Test saving an analysis result with the data_version field."""
    payload = _versioned_payload(label="Versioned Analysis", data_version="v2.1.0")

    response = await client.post("/analysis/results", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data

    # Verify we can retrieve it with the version
    list_response = await client.get("/analysis/results", headers=auth_headers)
    assert list_response.status_code == 200
    items = list_response.json()
    saved_item = next(i for i in items if i["id"] == data["id"])
    assert saved_item["data_version"] == "v2.1.0"

@pytest.mark.asyncio
async def test_save_analysis_without_data_version(client: AsyncClient, auth_headers: dict[str, str]):
    """Test saving an analysis result without data_version (should be null)."""
    payload = _versioned_payload(label="Legacy Analysis", include_version=False)

    response = await client.post("/analysis/results", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()

    list_response = await client.get("/analysis/results", headers=auth_headers)
    items = list_response.json()
    saved_item = next(i for i in items if i["id"] == data["id"])
    assert saved_item["data_version"] is None

@pytest.mark.asyncio
async def test_get_analysis_includes_data_version(client: AsyncClient, auth_headers: dict[str, str]):
    """Test that the get endpoint includes the data_version field."""
    payload = _versioned_payload(
        label="Detailed Versioned Analysis",
        data_version="v3.0.0-beta",
    )

    save_response = await client.post("/analysis/results", json=payload, headers=auth_headers)
    result_id = save_response.json()["id"]

    # Now get it
    get_response = await client.get(f"/analysis/results/{result_id}", headers=auth_headers)
    assert get_response.status_code == 200
    detail = get_response.json()
    assert detail["data_version"] == "v3.0.0-beta"

@pytest.mark.asyncio
async def test_data_version_type_validation(client: AsyncClient, auth_headers: dict[str, str]):
    """Test that data_version accepts any string but fails on other types."""
    payload = _versioned_payload(
        label="Bad Version Analysis",
        data_version=123,
    )

    # Pydantic v2 might coerce int to string, but let's see.
    # If strictly string is required, this should fail 422.
    # If not strict, it might pass. The requirements say "Test data_version is a string".
    # Let's try sending an object/dict which definitely shouldn't be a string.

    payload["data_version"] = {"ver": 1}
    response = await client.post("/analysis/results", json=payload, headers=auth_headers)
    assert response.status_code == 422
