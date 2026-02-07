"""
ClinVar E-utilities API Client

A client for querying variant pathogenicity from NCBI ClinVar database.
Supports batch queries, rate limiting, caching, and retry logic.
"""

import logging
import time

import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ClinVarClient:
    """Client for querying ClinVar via NCBI E-utilities API."""

    BASE_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"

    # Rate limits (requests per second)
    RATE_LIMIT_NO_KEY = 3
    RATE_LIMIT_WITH_KEY = 10

    # Retry configuration
    MAX_RETRIES = 3
    RETRY_BACKOFF_BASE = 2

    def __init__(self, api_key: str | None = None):
        """
        Initialize ClinVar client.

        Args:
            api_key: Optional NCBI API key for higher rate limits (10 req/sec vs 3 req/sec)
        """
        self.api_key = api_key
        self.rate_limit = self.RATE_LIMIT_WITH_KEY if api_key else self.RATE_LIMIT_NO_KEY
        self.min_interval = 1.0 / self.rate_limit
        self.last_request_time = 0.0

        # In-memory cache for session
        self._cache: dict[str, dict | None] = {}

    def _wait_for_rate_limit(self):
        """Enforce rate limiting between requests."""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self.last_request_time = time.time()

    def _make_request(self, url: str, params: dict) -> requests.Response | None:
        """
        Make HTTP request with retry logic and exponential backoff.

        Args:
            url: Request URL
            params: Query parameters

        Returns:
            Response object or None on failure
        """
        if self.api_key:
            params['api_key'] = self.api_key

        for attempt in range(self.MAX_RETRIES):
            try:
                self._wait_for_rate_limit()
                response = requests.get(url, params=params, timeout=10)
                response.raise_for_status()
                return response
            except requests.exceptions.RequestException as e:
                logger.warning(f"Request failed (attempt {attempt + 1}/{self.MAX_RETRIES}): {e}")
                if attempt < self.MAX_RETRIES - 1:
                    backoff_time = self.RETRY_BACKOFF_BASE ** attempt
                    time.sleep(backoff_time)
                else:
                    logger.error(f"All retry attempts failed for URL: {url}")
                    return None

        return None

    def _search_clinvar(self, rsid: str) -> list[str] | None:
        """
        Search ClinVar for variant by rsID.

        Args:
            rsid: dbSNP rsID (e.g., 'rs334')

        Returns:
            List of ClinVar UID(s) or None on failure
        """
        url = f"{self.BASE_URL}esearch.fcgi"
        params = {
            'db': 'clinvar',
            'term': rsid,
            'retmode': 'json'
        }

        response = self._make_request(url, params)
        if not response:
            return None

        try:
            data = response.json()
            id_list = data.get('esearchresult', {}).get('idlist', [])
            return id_list if id_list else None
        except Exception as e:
            logger.error(f"Failed to parse esearch response for {rsid}: {e}")
            return None

    def _fetch_clinvar_summary(self, clinvar_ids: list[str]) -> dict | None:
        """
        Fetch ClinVar summary information for given IDs.

        Args:
            clinvar_ids: List of ClinVar UIDs

        Returns:
            Dictionary of ClinVar data or None on failure
        """
        url = f"{self.BASE_URL}esummary.fcgi"
        params = {
            'db': 'clinvar',
            'id': ','.join(clinvar_ids),
            'retmode': 'json'
        }

        response = self._make_request(url, params)
        if not response:
            return None

        try:
            data = response.json()
            return data.get('result', {})
        except Exception as e:
            logger.error(f"Failed to parse esummary response: {e}")
            return None

    def _parse_clinvar_result(self, rsid: str, clinvar_data: dict) -> dict | None:
        """
        Parse ClinVar summary data into structured result.

        Args:
            rsid: Original rsID queried
            clinvar_data: Raw ClinVar summary data

        Returns:
            Structured dictionary with variant information
        """
        try:
            # Get the first UID's data (skip metadata entries)
            uid = None
            for key in clinvar_data.keys():
                if key not in ['uids']:
                    uid = key
                    break

            if not uid:
                return None

            variant = clinvar_data[uid]

            # Extract clinical significance
            clinical_sig = variant.get('clinical_significance', {})
            if isinstance(clinical_sig, dict):
                significance = clinical_sig.get('description', 'Unknown')
            else:
                significance = str(clinical_sig) if clinical_sig else 'Unknown'

            # Extract condition/trait
            trait_set = variant.get('trait_set', [])
            condition = trait_set[0].get('trait_name', 'Unknown') if trait_set else 'Unknown'

            # Extract gene information
            genes = variant.get('genes', [])
            gene = genes[0].get('symbol', 'Unknown') if genes else 'Unknown'

            # Review status
            review_status = variant.get('review_status', 'Unknown')

            return {
                'rsid': rsid,
                'clinical_significance': significance,
                'condition': condition,
                'gene': gene,
                'review_status': review_status
            }
        except Exception as e:
            logger.error(f"Failed to parse ClinVar data for {rsid}: {e}")
            return None

    def query_variant(self, rsid: str) -> dict | None:
        """
        Query single variant by rsID.

        Args:
            rsid: dbSNP rsID (e.g., 'rs334')

        Returns:
            Dictionary with keys: rsid, clinical_significance, condition, gene, review_status
            Returns None if variant not found or query fails
        """
        # Normalize rsID
        rsid = rsid.strip().lower()
        if not rsid.startswith('rs'):
            rsid = f'rs{rsid}'

        # Check cache
        if rsid in self._cache:
            return self._cache[rsid]

        # Search ClinVar
        clinvar_ids = self._search_clinvar(rsid)
        if not clinvar_ids:
            logger.info(f"No ClinVar entries found for {rsid}")
            self._cache[rsid] = None
            return None

        # Fetch summary
        clinvar_data = self._fetch_clinvar_summary(clinvar_ids)
        if not clinvar_data:
            self._cache[rsid] = None
            return None

        # Parse result
        result = self._parse_clinvar_result(rsid, clinvar_data)
        self._cache[rsid] = result
        return result

    def query_variants_batch(self, rsids: list[str]) -> dict[str, dict | None]:
        """
        Query multiple variants in batch.

        Args:
            rsids: List of dbSNP rsIDs

        Returns:
            Dictionary mapping rsID to result dict (or None if not found)
        """
        results = {}

        for rsid in rsids:
            result = self.query_variant(rsid)
            results[rsid] = result

        return results

    def is_pathogenic(self, rsid: str) -> bool:
        """
        Check if variant is pathogenic or likely pathogenic.

        Args:
            rsid: dbSNP rsID

        Returns:
            True if pathogenic or likely pathogenic, False otherwise
        """
        result = self.query_variant(rsid)
        if not result:
            return False

        significance = result.get('clinical_significance', '').lower()
        return 'pathogenic' in significance and 'benign' not in significance

    def get_carrier_status(
        self,
        rsid: str,
        genotype: str,
        pathogenic_allele: str
    ) -> str:
        """
        Determine carrier status based on genotype and pathogenic allele.

        Args:
            rsid: dbSNP rsID
            genotype: Genotype string (e.g., 'AA', 'AG', 'GG')
            pathogenic_allele: The pathogenic allele (e.g., 'T')

        Returns:
            One of: "homozygous_pathogenic", "carrier", "normal", "unknown"
        """
        if not self.is_pathogenic(rsid):
            return "unknown"

        genotype = genotype.upper().strip()
        pathogenic_allele = pathogenic_allele.upper().strip()

        if not genotype or len(genotype) != 2:
            return "unknown"

        allele1, allele2 = genotype[0], genotype[1]
        pathogenic_count = sum([
            1 for allele in [allele1, allele2]
            if allele == pathogenic_allele
        ])

        if pathogenic_count == 2:
            return "homozygous_pathogenic"
        elif pathogenic_count == 1:
            return "carrier"
        else:
            return "normal"

    def clear_cache(self):
        """Clear the in-memory cache."""
        self._cache.clear()
        logger.info("Cache cleared")

    def get_cache_stats(self) -> dict:
        """Get cache statistics."""
        total_cached = len(self._cache)
        pathogenic_cached = sum(
            1 for result in self._cache.values()
            if result and self.is_pathogenic(result['rsid'])
        )

        return {
            'total_entries': total_cached,
            'pathogenic_variants': pathogenic_cached
        }


# Example usage
if __name__ == "__main__":
    # Initialize client (optionally with API key)
    client = ClinVarClient()

    # Single variant query
    result = client.query_variant("rs334")
    if result:
        print(f"Variant: {result['rsid']}")
        print(f"Clinical Significance: {result['clinical_significance']}")
        print(f"Condition: {result['condition']}")
        print(f"Gene: {result['gene']}")
        print(f"Review Status: {result['review_status']}")
        print(f"Is Pathogenic: {client.is_pathogenic('rs334')}")

    # Batch query
    rsids = ["rs334", "rs7412", "rs429358"]
    batch_results = client.query_variants_batch(rsids)
    print(f"\nBatch query returned {len(batch_results)} results")

    # Carrier status
    status = client.get_carrier_status("rs334", "AT", "T")
    print(f"\nCarrier status: {status}")

    # Cache stats
    stats = client.get_cache_stats()
    print(f"\nCache stats: {stats}")
