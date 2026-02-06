# Tortit - Genetic Offspring Analysis Platform

A Streamlit web application that analyzes genetic data from two parents to predict offspring traits and assess carrier risk for recessive diseases using Mendelian genetics.

## Features

- **Multi-format support** — Upload 23andMe, AncestryDNA, MyHeritage/FTDNA, or VCF (Whole Genome Sequencing) raw data files
- **Carrier risk screening** — Screen against a panel of 100+ genetic diseases with offspring risk calculation
- **Trait prediction** — Predict 60+ offspring traits across appearance, health, behavior, and more using Punnett square genetics
- **Single-parent mode** — Individual carrier screening when only one file is uploaded
- **ClinVar & SNPedia integration** — Optional enrichment with external genetic databases
- **Privacy-first** — All processing happens locally in your browser session. No data is stored or transmitted.

## Quick Start

### Prerequisites
- Python 3.10+
- pip

### Installation

```bash
# Clone the repository
git clone https://github.com/maayango285/Tortit.git
cd Tortit

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Install dev dependencies
pip install ruff pytest pre-commit
pre-commit install
```

### Run the App

```bash
streamlit run app.py
```

The app will open at `http://localhost:8501`.

### Run Tests

```bash
pytest tests/ -v
```

### Run Linting

```bash
ruff check Source/ pages/ tests/ app.py
```

## Project Structure

```
Tortit/
├── app.py                  # Main Streamlit application
├── pages/                  # Streamlit multipage apps
│   ├── 1_Login.py          # Authentication page
│   ├── 2_Disease_Catalog.py # Disease reference catalog
│   └── 3_Subscription.py  # Subscription management
├── Source/                 # Core Python modules
│   ├── auth/               # Authentication system
│   ├── payments/           # Payment processing (Stripe, PayPal)
│   ├── parser.py           # Multi-format genetic file parser
│   ├── carrier_analysis.py # Disease carrier risk engine
│   ├── trait_prediction.py # Trait prediction engine
│   ├── clinvar_client.py   # ClinVar API integration
│   ├── snpedia_client.py   # SNPedia API integration
│   ├── tier_config.py      # Subscription tier configuration
│   └── utils.py            # Shared utilities
├── data/                   # JSON data files
│   ├── carrier_panel.json  # Disease panel (100+ conditions)
│   └── trait_snps.json     # Trait SNP database (60+ traits)
├── tests/                  # Test suite
├── sample_data/            # Sample genetic data files for testing
├── docs/                   # Documentation, PRDs, research
├── CLAUDE.md               # AI assistant project rules
├── PROGRESS.md             # Task tracking & project status
└── README.md               # This file
```

## Development Workflow

We use a feature-branch workflow. See [CLAUDE.md](CLAUDE.md) for full rules.

1. **Pull latest**: `git pull origin main`
2. **Check status**: Read `PROGRESS.md` for current work
3. **Create branch**: `git checkout -b feature/your-feature`
4. **Make changes**: Write code, tests, docs
5. **Quality check**: `ruff check . && pytest tests/ -v`
6. **Commit**: Use conventional commits (`feat:`, `fix:`, etc.)
7. **Push & PR**: Push branch, create PR for review
8. **Update tracking**: Update `PROGRESS.md`

## Configuration

### Optional: NCBI API Key
For ClinVar cross-reference, get a free API key from [NCBI](https://www.ncbi.nlm.nih.gov/account/) and enter it in the app sidebar.

### Environment Variables
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

## Disclaimer

Tortit is an **educational tool** and does not provide medical advice, diagnosis, or treatment. Genetic predictions are probabilistic and based on simplified Mendelian models. Many traits are polygenic and influenced by environment. Always consult a certified genetic counselor or healthcare professional for clinical interpretation.

## Contributors

| Name | Role |
|------|------|
| kukiz | Developer |
| Maayan | Developer / Reviewer |
| Claude | AI Assistant |

## Quick Reference (Don't Forget!)

- **PROGRESS.md** is the single source of truth — check it at every session start
- **CLAUDE.md** has all workflow rules — pull on start, feature branches, conventional commits, quality gates
- **Python on Windows**: Use `py` as the launcher (not `python` or `python3`)
- **Git config**: Set locally per repo — `git config user.name "Your Name"` and `git config user.email "you@users.noreply.github.com"`
- **After first clone**, install dev tools: `py -m pip install ruff pytest pre-commit && py -m pre_commit install`
- **Before every commit**: `py -m ruff check Source/ pages/ tests/ app.py && py -m pytest tests/ -v`

## License

Private repository. All rights reserved.
