"""
Mergenix — About Page

Science methodology, data sources, and team information.
"""

import streamlit as st
from Source.ui.components import render_page_hero, render_section_header

render_page_hero(
    "About Mergenix",
    "The Science Behind Genetic Offspring Analysis",
)

# ---------------------------------------------------------------------------
# Methodology
# ---------------------------------------------------------------------------
render_section_header("\U0001f52c Scientific Methodology", "How Mergenix predicts genetic outcomes")

mc1, mc2, mc3 = st.columns(3)
methods = [
    (mc1, "\U0001f9ec", "Mendelian Genetics",
     "Our analysis is built on Gregor Mendel's laws of inheritance. We model "
     "autosomal recessive, autosomal dominant, and X-linked inheritance patterns "
     "to calculate carrier risk and offspring probabilities."),
    (mc2, "\U0001f4ca", "Punnett Square Analysis",
     "For each genetic variant, we construct Punnett squares from both parents' "
     "genotypes to compute the statistical probability of each possible offspring "
     "genotype and corresponding phenotype."),
    (mc3, "\U0001f50d", "Variant Classification",
     "Each disease-associated SNP is classified against known pathogenic alleles "
     "from peer-reviewed databases. Carrier status (normal, carrier, affected) is "
     "determined by comparing the user's genotype to reference and pathogenic alleles."),
]
for col, icon, title, desc in methods:
    with col:
        st.markdown(
            f"""<div style="background:linear-gradient(135deg,#0c1220,#1a2236);border:1px solid rgba(148,163,184,0.12);
                border-radius:16px;padding:24px;text-align:center;height:100%;animation:cardReveal 0.5s ease-out both;">
                <div style="font-size:2.2rem;margin-bottom:0.8rem;">{icon}</div>
                <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:#e2e8f0;margin:0 0 10px;">{title}</h4>
                <p style="font-family:'Lexend',sans-serif;color:#94a3b8;font-size:0.9rem;line-height:1.65;margin:0;">{desc}</p>
            </div>""",
            unsafe_allow_html=True,
        )

# ---------------------------------------------------------------------------
# Data Sources
# ---------------------------------------------------------------------------
st.markdown("---")
render_section_header("\U0001f4da Data Sources", "Curated from leading genetics databases")

sources = [
    ("\U0001f3e5", "ClinVar (NCBI)", "NIH's public archive of genomic variation and its relationship to human health. We cross-reference carrier variants against ClinVar's clinical significance annotations."),
    ("\U0001f4d6", "SNPedia", "A wiki-based bioinformatics resource documenting the effects of human genetic variations. Used for detailed SNP descriptions and population-level insights."),
    ("\U0001f9ec", "OMIM", "Online Mendelian Inheritance in Man -- the authoritative compendium of human genes and genetic phenotypes. Disease entries link directly to OMIM for clinical detail."),
    ("\U0001f4ca", "Published Literature", "Trait prediction models are built from peer-reviewed GWAS (Genome-Wide Association Studies) and validated against known genotype-phenotype correlations."),
]
for icon, title, desc in sources:
    st.markdown(
        f"""<div style="background:linear-gradient(135deg,#0c1220,#1a2236);border:1px solid rgba(148,163,184,0.1);
            border-radius:14px;padding:20px;margin-bottom:12px;display:flex;gap:16px;align-items:flex-start;">
            <div style="font-size:1.8rem;flex-shrink:0;">{icon}</div>
            <div>
                <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:#e2e8f0;margin:0 0 6px;">{title}</h4>
                <p style="font-family:'Lexend',sans-serif;color:#94a3b8;font-size:0.9rem;line-height:1.6;margin:0;">{desc}</p>
            </div>
        </div>""",
        unsafe_allow_html=True,
    )

# ---------------------------------------------------------------------------
# Limitations
# ---------------------------------------------------------------------------
st.markdown("---")
render_section_header("\u26a0\ufe0f Important Limitations")

st.markdown(
    """
    <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:16px;padding:24px;">
        <ul style="font-family:'Lexend',sans-serif;color:#cbd5e1;font-size:0.92rem;line-height:1.8;margin:0;padding-left:20px;">
            <li>Mergenix is an <b style="color:#f59e0b;">educational tool</b> and does not provide medical advice, diagnosis, or treatment.</li>
            <li>Many human traits are <b>polygenic</b> (influenced by multiple genes) and affected by environmental factors. Our single-gene models provide probabilities, not certainties.</li>
            <li>Carrier risk analysis is based on known pathogenic alleles. Novel or rare variants may not be captured.</li>
            <li><b>Always consult a certified genetic counselor</b> or healthcare professional for clinical interpretation of genetic data.</li>
            <li>Results are only as accurate as the input data. Raw data quality varies across platforms (23andMe, AncestryDNA, etc.).</li>
        </ul>
    </div>
    """,
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# File format support
# ---------------------------------------------------------------------------
st.markdown("---")
render_section_header("\U0001f4c1 Supported File Formats")

fc1, fc2, fc3, fc4 = st.columns(4)
formats = [
    (fc1, "23andMe", ".txt", "Raw data download from 23andMe account"),
    (fc2, "AncestryDNA", ".txt / .csv", "Raw DNA data from Ancestry"),
    (fc3, "MyHeritage/FTDNA", ".csv", "Raw data from MyHeritage or FTDNA"),
    (fc4, "VCF", ".vcf", "Variant Call Format from WGS/WES"),
]
for col, name, ext, desc in formats:
    with col:
        st.markdown(
            f"""<div style="background:linear-gradient(135deg,#0c1220,#1a2236);border:1px solid rgba(148,163,184,0.12);
                border-radius:14px;padding:20px;text-align:center;">
                <h4 style="font-family:'Sora',sans-serif;font-weight:700;color:#06d6a0;margin:0 0 6px;font-size:1rem;">{name}</h4>
                <p style="font-family:'Lexend',sans-serif;color:#06b6d4;font-size:0.85rem;margin:0 0 6px;"><code>{ext}</code></p>
                <p style="font-family:'Lexend',sans-serif;color:#94a3b8;font-size:0.82rem;margin:0;">{desc}</p>
            </div>""",
            unsafe_allow_html=True,
        )
