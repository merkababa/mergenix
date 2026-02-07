import requests
import streamlit as st
from cyvcf2 import VCF


# ---- Parse 23andMe file ----
def parse_23andme_txt(file):
    snps = {}
    for line in file:
        line = line.decode("utf-8")
        if line.startswith('#'):
            continue
        parts = line.strip().split('\t')
        if len(parts) >= 4:
            rsid, chrom, pos, genotype = parts
            snps[rsid] = genotype
    return snps

# ---- Query SNPedia ----
def query_snpedia(rsid):
    url = "https://bots.snpedia.com/api.php"
    params = {
        'action': 'parse',
        'page': rsid,
        'format': 'json'
    }
    try:
        r = requests.get(url, params=params, timeout=30)
        if 'parse' in r.json():
            html = r.json()['parse']['text']['*']
            return html.split('<p>')[1].split('</p>')[0]
    except Exception:  # noqa: S110
        pass
    return None

# ---- Load ClinVar ----
@st.cache_data
def load_clinvar(path):
    vcf = VCF(path)
    data = {}
    for v in vcf:
        if "Pathogenic" in v.INFO.get("CLNSIG", ""):
            rsid = v.ID
            if rsid:
                data[rsid] = {
                    'gene': v.INFO.get("GENEINFO", "?"),
                    'condition': v.INFO.get("CLNDN", "?"),
                    'significance': v.INFO.get("CLNSIG", "?")
                }
    return data

# ---- Streamlit App ----
st.title("DNA Trait & Risk Analyzer")

uploaded_file = st.file_uploader("Upload 23andMe TXT file", type="txt")
clinvar_path = st.text_input("Path to ClinVar VCF (GRCh38)", "")

if uploaded_file and clinvar_path:
    with st.spinner("Processing..."):
        user_snps = parse_23andme_txt(uploaded_file)
        clinvar_db = load_clinvar(clinvar_path)

        results = []
        for rsid, genotype in list(user_snps.items())[:500]:  # Limit for speed
            entry = {'rsid': rsid, 'genotype': genotype}
            trait = query_snpedia(rsid)
            if trait:
                entry['trait'] = trait
            if rsid in clinvar_db:
                entry.update(clinvar_db[rsid])
            if 'trait' in entry or 'condition' in entry:
                results.append(entry)

        st.success(f"Found {len(results)} informative SNPs.")
        st.write(results)
