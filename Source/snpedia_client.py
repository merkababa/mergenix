"""SNPedia API client for single-SNP deep-dive lookups.

Used for "Learn more" functionality in the UI.
NOT for batch analysis - use curated trait_snps.json instead.
"""

import re
import html
from typing import Optional
import requests


class SNPediaClient:
    """Client for querying SNPedia's MediaWiki API."""

    API_ENDPOINT = "https://bots.snpedia.com/api.php"
    TIMEOUT = 10  # seconds

    def __init__(self):
        """Initialize client with in-memory cache."""
        self._cache = {}

    def get_snp_summary(self, rsid: str) -> Optional[str]:
        """Get human-readable summary for a single rsID.

        Args:
            rsid: SNP identifier (e.g., "rs1234567")

        Returns:
            Plain text summary or None if not found/error
        """
        details = self.get_snp_details(rsid)
        return details["summary"] if details else None

    def get_snp_details(self, rsid: str) -> Optional[dict]:
        """Get detailed information for a single rsID.

        Args:
            rsid: SNP identifier (e.g., "rs1234567")

        Returns:
            Dict with {rsid, summary, url} or None if not found/error
        """
        # Normalize rsID
        rsid = rsid.strip().lower()
        if not rsid.startswith("rs"):
            return None

        # Check cache
        if rsid in self._cache:
            return self._cache[rsid]

        try:
            # Query SNPedia API
            params = {
                "action": "parse",
                "page": rsid,
                "format": "json",
                "prop": "text"
            }

            response = requests.get(
                self.API_ENDPOINT,
                params=params,
                timeout=self.TIMEOUT
            )
            response.raise_for_status()
            data = response.json()

            # Check for errors
            if "error" in data:
                return None

            # Extract HTML content
            if "parse" not in data or "text" not in data["parse"]:
                return None

            html_content = data["parse"]["text"]["*"]

            # Convert HTML to plain text
            summary = self._html_to_text(html_content)

            # Build result
            result = {
                "rsid": rsid,
                "summary": summary,
                "url": f"https://www.snpedia.com/index.php/{rsid}"
            }

            # Cache and return
            self._cache[rsid] = result
            return result

        except requests.RequestException:
            # Network error, timeout, etc.
            return None
        except (KeyError, ValueError):
            # JSON parsing error
            return None
        except Exception:
            # Any other error - never crash
            return None

    def _html_to_text(self, html_content: str) -> str:
        """Convert HTML to plain text (basic stripping).

        Args:
            html_content: Raw HTML string

        Returns:
            Plain text with tags removed
        """
        # Unescape HTML entities
        text = html.unescape(html_content)

        # Remove script and style elements
        text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)

        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)

        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()

        # Truncate to reasonable length for summary
        max_length = 500
        if len(text) > max_length:
            text = text[:max_length] + "..."

        return text
