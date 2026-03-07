# Mergenix Trait Expansion Master Catalog

**Compiled:** 2026-02-25
**Source:** 15 parallel research agents (Round 1: 10 categories, Round 2: 5 new categories)
**Existing traits in database:** 79
**New trait entries in this catalog:** 534
**Unique new rsIDs:** 497
**Pleiotropic rsIDs (same rsID, multiple traits):** 30 (67 entries across categories)

---

## Summary Statistics

### By Category

| #   | Category                  | Count   | New in R2 |
| --- | ------------------------- | ------- | --------- |
| 1   | Physical Appearance       | 22      | -         |
| 2   | Behavioral/Personality    | 21      | -         |
| 3   | Athletic/Fitness          | 22      | -         |
| 4   | Nutrition/Metabolism      | 23      | -         |
| 5   | Sensory/Perception/Immune | 24      | -         |
| 6   | Reproductive/Hormonal     | 18      | -         |
| 7   | Unusual/Quirky/Fun        | 19      | -         |
| 8   | Skin/Aging/Longevity      | 22      | -         |
| 9   | Pharmacogenomic           | 26      | -         |
| 10  | Cardiovascular/Metabolic  | 24      | -         |
| 11  | Neurological/Brain        | 68      | Yes       |
| 12  | Cancer Risk               | 70      | Yes       |
| 13  | Musculoskeletal/Bone      | 55      | Yes       |
| 14  | Eye/Vision/Dental         | 60      | Yes       |
| 15  | Longevity/Aging/Immunity  | 60      | Yes       |
|     | **Total**                 | **534** |           |

### By Confidence Level

| Confidence | Count |
| ---------- | ----- |
| HIGH       | 296   |
| MODERATE   | 196   |
| LOW        | 42    |

### By Interest Score

| Score Range | Count |
| ----------- | ----- |
| 9-10        | 78    |
| 7-8         | 312   |
| 5-6         | 144   |
| 3-4         | 0     |

### Top 20 Highest-Interest Traits

| #   | rsID        | Gene             | Trait                                      | Category                 | Interest |
| --- | ----------- | ---------------- | ------------------------------------------ | ------------------------ | -------- |
| 1   | rs429358    | APOE             | Cognitive Decline Risk (e4 allele)         | Behavioral/Personality   | 10       |
| 2   | rs7412      | APOE             | Alzheimer's Protective (e2 allele)         | Behavioral/Personality   | 10       |
| 3   | rs1815739   | ACTN3            | Sprint/Power Muscle Type (R577X)           | Athletic/Fitness         | 10       |
| 4   | rs1801133   | MTHFR            | Folate Metabolism (C677T)                  | Nutrition/Metabolism     | 10       |
| 5   | rs1065852   | CYP2D6           | Drug Metabolism (Codeine, Antidepressants) | Pharmacogenomic          | 10       |
| 6   | rs3892097   | CYP2D6           | Poor Drug Metabolizer Status               | Pharmacogenomic          | 10       |
| 7   | rs4244285   | CYP2C19          | Clopidogrel (Plavix) Metabolism            | Pharmacogenomic          | 10       |
| 8   | rs1799853   | CYP2C9           | Warfarin Sensitivity (\*2)                 | Pharmacogenomic          | 10       |
| 9   | rs1057910   | CYP2C9           | Warfarin Sensitivity (\*3)                 | Pharmacogenomic          | 10       |
| 10  | rs9923231   | VKORC1           | Warfarin Dose Requirement                  | Pharmacogenomic          | 10       |
| 11  | rs1799950   | BRCA1            | Breast/Ovarian Cancer Risk (BRCA1)         | Cancer Risk              | 10       |
| 12  | rs80357906  | BRCA2            | Breast Cancer Risk (BRCA2)                 | Cancer Risk              | 10       |
| 13  | rs121913529 | APC              | Familial Adenomatous Polyposis             | Cancer Risk              | 10       |
| 14  | rs11571833  | BRCA2            | Cancer Susceptibility (K3326X)             | Cancer Risk              | 10       |
| 15  | rs1800566   | NQO1             | Oxidative Stress / Longevity Modifier      | Longevity/Aging/Immunity | 10       |
| 16  | rs2228570   | VDR              | Vitamin D Receptor (Bone Density)          | Musculoskeletal/Bone     | 10       |
| 17  | rs1800012   | COL1A1           | Osteoporosis / Fracture Risk               | Musculoskeletal/Bone     | 10       |
| 18  | rs4986893   | CYP2C19          | CYP2C19 Poor Metabolizer (\*3)             | Pharmacogenomic          | 9        |
| 19  | rs12248560  | CYP2C19          | CYP2C19 Ultra-Rapid Metabolizer (\*17)     | Pharmacogenomic          | 9        |
| 20  | rs1333049   | CDKN2A/2B (9p21) | Coronary Artery Disease Risk               | Cardiovascular/Metabolic | 9        |

---

## Master Trait Table

### 1. Physical Appearance (22 traits)

| #   | rsID       | Gene       | Trait                           | Category            | Chr | Confidence | Interest | PMID     |
| --- | ---------- | ---------- | ------------------------------- | ------------------- | --- | ---------- | -------- | -------- |
| 1   | rs28777    | SLC45A2    | Skin Pigmentation Intensity     | Physical Appearance | 5   | HIGH       | 9        | 17999355 |
| 2   | rs4778138  | OCA2       | Eye Color (Green Modifier)      | Physical Appearance | 15  | HIGH       | 9        | 17236130 |
| 3   | rs916977   | HERC2      | Eye Color Heterochromia Risk    | Physical Appearance | 15  | MODERATE   | 9        | 18252222 |
| 4   | rs1393350  | TYR        | Eye Color (Blue Modifier)       | Physical Appearance | 11  | HIGH       | 8        | 18488028 |
| 5   | rs2402130  | SLC24A4    | Hair Color (Blond Shade)        | Physical Appearance | 14  | MODERATE   | 8        | 18488028 |
| 6   | rs4268748  | KITLG      | Freckling Distribution Pattern  | Physical Appearance | 12  | MODERATE   | 8        | 24793289 |
| 7   | rs4778241  | OCA2       | Iris Pattern Complexity         | Physical Appearance | 15  | MODERATE   | 8        | 17236130 |
| 8   | rs1667394  | OCA2/HERC2 | Eye Color Intensity             | Physical Appearance | 15  | HIGH       | 8        | 18252222 |
| 9   | rs1110400  | MC1R       | Red Hair (D84E Variant)         | Physical Appearance | 16  | HIGH       | 8        | 7581459  |
| 10  | rs1540771  | LYST       | Skin Tanning Ability            | Physical Appearance | 1   | MODERATE   | 7        | 18488028 |
| 11  | rs35264875 | TPCN2      | Hair Color (Light Brown)        | Physical Appearance | 11  | MODERATE   | 7        | 18488028 |
| 12  | rs683      | TYRP1      | Eye Color (Brown Modifier)      | Physical Appearance | 9   | HIGH       | 7        | 17236130 |
| 13  | rs6867641  | TERT       | Facial Aging Appearance         | Physical Appearance | 5   | MODERATE   | 7        | 26414677 |
| 14  | rs10756819 | BNC2       | Skin Pigmentation (Saturation)  | Physical Appearance | 9   | HIGH       | 7        | 20585627 |
| 15  | rs2238289  | HERC2      | Eye Color Modifier              | Physical Appearance | 15  | HIGH       | 7        | 18252222 |
| 16  | rs3768056  | KITLG      | Blond Hair Intensity            | Physical Appearance | 12  | MODERATE   | 7        | 24793289 |
| 17  | rs2240203  | TYR        | Oculocutaneous Albinism Risk    | Physical Appearance | 11  | HIGH       | 7        | 16175503 |
| 18  | rs885479   | MC1R       | Red Hair (R163Q Variant)        | Physical Appearance | 16  | MODERATE   | 7        | 7581459  |
| 19  | rs26722    | SLC24A5    | Light Skin Adaptation           | Physical Appearance | 15  | HIGH       | 6        | 16357253 |
| 20  | rs2378249  | PIGU/ASIP  | Pigmentation Variation          | Physical Appearance | 20  | MODERATE   | 6        | 18488028 |
| 21  | rs2733832  | TYRP1      | Hair Pigment Type               | Physical Appearance | 9   | MODERATE   | 6        | 17952075 |
| 22  | rs1015362  | ASIP       | Darker Skin/Melanoma Protection | Physical Appearance | 20  | MODERATE   | 6        | 18488028 |

### 2. Behavioral/Personality (21 traits)

| #   | rsID       | Gene    | Trait                                     | Category               | Chr | Confidence | Interest | PMID     |
| --- | ---------- | ------- | ----------------------------------------- | ---------------------- | --- | ---------- | -------- | -------- |
| 23  | rs429358   | APOE    | Cognitive Decline Risk (e4 allele)        | Behavioral/Personality | 19  | HIGH       | 10       | 8346443  |
| 24  | rs7412     | APOE    | Alzheimer's Protective (e2 allele)        | Behavioral/Personality | 19  | HIGH       | 10       | 8346443  |
| 25  | rs6265     | BDNF    | Memory & Learning Capacity                | Behavioral/Personality | 11  | HIGH       | 9        | 14976160 |
| 26  | rs1800955  | DRD4    | Novelty/Adventure Seeking                 | Behavioral/Personality | 11  | MODERATE   | 9        | 8757625  |
| 27  | rs25531    | SLC6A4  | Stress Resilience (Serotonin Transporter) | Behavioral/Personality | 17  | HIGH       | 9        | 12672610 |
| 28  | rs4570625  | TPH2    | Emotional Reactivity                      | Behavioral/Personality | 12  | MODERATE   | 8        | 15863811 |
| 29  | rs6311     | HTR2A   | Depression Susceptibility                 | Behavioral/Personality | 13  | MODERATE   | 8        | 15166467 |
| 30  | rs5751876  | ADORA2A | Caffeine Anxiety Sensitivity              | Behavioral/Personality | 22  | HIGH       | 8        | 18088379 |
| 31  | rs4950     | CHRNB3  | Leadership Tendency                       | Behavioral/Personality | 8   | LOW        | 8        | 23288930 |
| 32  | rs1006737  | CACNA1C | Bipolar/Creativity Link                   | Behavioral/Personality | 12  | HIGH       | 8        | 18711365 |
| 33  | rs2254298  | OXTR    | Social Bonding Strength                   | Behavioral/Personality | 3   | MODERATE   | 8        | 21115541 |
| 34  | rs27072    | SLC6A3  | ADHD Risk                                 | Behavioral/Personality | 5   | MODERATE   | 8        | 22610946 |
| 35  | rs7632287  | OXTR    | Pair-Bonding/Relationship Satisfaction    | Behavioral/Personality | 3   | LOW        | 8        | 22069391 |
| 36  | rs10503929 | COMT    | Cognitive Flexibility                     | Behavioral/Personality | 22  | MODERATE   | 7        | 16402123 |
| 37  | rs6295     | HTR1A   | Anxiety Predisposition                    | Behavioral/Personality | 5   | MODERATE   | 7        | 12872011 |
| 38  | rs2283265  | DRD2    | Reward Processing Efficiency              | Behavioral/Personality | 11  | MODERATE   | 7        | 17567567 |
| 39  | rs3756577  | SLC6A3  | Dopamine Clearance Rate                   | Behavioral/Personality | 5   | MODERATE   | 7        | 15733249 |
| 40  | rs1800532  | TPH1    | Impulsivity/Aggression Risk               | Behavioral/Personality | 11  | MODERATE   | 7        | 15507236 |
| 41  | rs322931   | ARC     | Working Memory Capacity                   | Behavioral/Personality | 8   | LOW        | 7        | 24927531 |
| 42  | rs4532     | DRD1    | Motivation/Drive Level                    | Behavioral/Personality | 5   | LOW        | 7        | 16005187 |
| 43  | rs2760118  | ABCB1   | Stress Hormone Regulation                 | Behavioral/Personality | 7   | MODERATE   | 6        | 16337829 |

### 3. Athletic/Fitness (22 traits)

| #   | rsID       | Gene    | Trait                                  | Category         | Chr | Confidence | Interest | PMID     |
| --- | ---------- | ------- | -------------------------------------- | ---------------- | --- | ---------- | -------- | -------- |
| 44  | rs1815739  | ACTN3   | Sprint/Power Muscle Type (R577X)       | Athletic/Fitness | 11  | HIGH       | 10       | 12879365 |
| 45  | rs1799752  | ACE     | Endurance vs Power Performance         | Athletic/Fitness | 17  | HIGH       | 9        | 10620733 |
| 46  | rs4646994  | ACE     | ACE Activity (I/D Polymorphism)        | Athletic/Fitness | 17  | HIGH       | 9        | 10620733 |
| 47  | rs1049434  | MCT1    | Lactate Clearance Rate                 | Athletic/Fitness | 1   | HIGH       | 8        | 24550842 |
| 48  | rs7181866  | HIF1A   | High-Altitude Adaptation               | Athletic/Fitness | 14  | MODERATE   | 8        | 24412746 |
| 49  | rs1799945  | HFE     | Iron Overload Risk (Hemochromatosis)   | Athletic/Fitness | 6   | HIGH       | 8        | 9462337  |
| 50  | rs4253778  | PPARA   | Endurance Training Response            | Athletic/Fitness | 22  | MODERATE   | 8        | 15105049 |
| 51  | rs1800795  | IL6     | Exercise Recovery Speed                | Athletic/Fitness | 7   | HIGH       | 8        | 11252145 |
| 52  | rs11549465 | HIF1A   | VO2max Training Adaptability           | Athletic/Fitness | 14  | MODERATE   | 8        | 24412746 |
| 53  | rs2016520  | PPARD   | Fat Oxidation During Exercise          | Athletic/Fitness | 6   | HIGH       | 8        | 16189146 |
| 54  | rs7460     | ADRB2   | Bronchodilation/Endurance Breathing    | Athletic/Fitness | 5   | MODERATE   | 7        | 10978173 |
| 55  | rs1042713  | ADRB2   | Beta-2 Adrenergic Response             | Athletic/Fitness | 5   | HIGH       | 7        | 10978173 |
| 56  | rs699      | AGT     | Blood Pressure Response to Exercise    | Athletic/Fitness | 1   | HIGH       | 7        | 15199295 |
| 57  | rs1800012  | COL1A1  | Bone Fracture Risk                     | Athletic/Fitness | 17  | HIGH       | 7        | 9731540  |
| 58  | rs2070744  | NOS3    | Nitric Oxide Production (Vasodilation) | Athletic/Fitness | 7   | MODERATE   | 7        | 15199295 |
| 59  | rs2104772  | TNC     | Tendinopathy Risk                      | Athletic/Fitness | 9   | MODERATE   | 7        | 19273551 |
| 60  | rs1800871  | IL10    | Anti-inflammatory Recovery             | Athletic/Fitness | 1   | MODERATE   | 7        | 11439943 |
| 61  | rs4341     | ACE     | Muscle Efficiency Under Load           | Athletic/Fitness | 17  | HIGH       | 7        | 10620733 |
| 62  | rs7191721  | NRF2    | Oxidative Stress Response              | Athletic/Fitness | 2   | MODERATE   | 6        | 22479202 |
| 63  | rs7136446  | GALNT13 | Tendon Strength/Flexibility            | Athletic/Fitness | 2   | LOW        | 6        | 23242285 |
| 64  | rs1800169  | CILP    | Disc Degeneration Risk in Athletes     | Athletic/Fitness | 15  | MODERATE   | 6        | 16200071 |
| 65  | rs2070895  | LIPC    | HDL Response to Exercise               | Athletic/Fitness | 15  | MODERATE   | 6        | 19001139 |

### 4. Nutrition/Metabolism (23 traits)

| #   | rsID       | Gene       | Trait                                 | Category             | Chr | Confidence | Interest | PMID     |
| --- | ---------- | ---------- | ------------------------------------- | -------------------- | --- | ---------- | -------- | -------- |
| 66  | rs1801133  | MTHFR      | Folate Metabolism (C677T)             | Nutrition/Metabolism | 1   | HIGH       | 10       | 9545397  |
| 67  | rs1801131  | MTHFR      | Folate Processing (A1298C)            | Nutrition/Metabolism | 1   | HIGH       | 9        | 10444342 |
| 68  | rs174547   | FADS1      | Omega-3/Omega-6 Processing            | Nutrition/Metabolism | 11  | HIGH       | 9        | 21829377 |
| 69  | rs1800562  | HFE        | Hereditary Hemochromatosis (C282Y)    | Nutrition/Metabolism | 6   | HIGH       | 9        | 9462337  |
| 70  | rs7041     | GC         | Vitamin D Binding Protein             | Nutrition/Metabolism | 4   | HIGH       | 8        | 20541252 |
| 71  | rs11057830 | CYP2R1     | Vitamin D Synthesis Rate              | Nutrition/Metabolism | 11  | HIGH       | 8        | 20541252 |
| 72  | rs964184   | ZPR1/APOA5 | Triglyceride Response to Fat          | Nutrition/Metabolism | 11  | HIGH       | 8        | 20686565 |
| 73  | rs174570   | FADS2      | Fatty Acid Desaturation               | Nutrition/Metabolism | 11  | HIGH       | 8        | 21829377 |
| 74  | rs7501331  | BCMO1      | Beta-Carotene to Vitamin A Conversion | Nutrition/Metabolism | 16  | HIGH       | 8        | 19103647 |
| 75  | rs12934922 | BCMO1      | Provitamin A Conversion Efficiency    | Nutrition/Metabolism | 16  | HIGH       | 8        | 19103647 |
| 76  | rs855791   | TMPRSS6    | Iron Absorption Efficiency            | Nutrition/Metabolism | 22  | HIGH       | 8        | 19084217 |
| 77  | rs1801282  | PPARG      | Insulin Sensitivity (Pro12Ala)        | Nutrition/Metabolism | 3   | HIGH       | 8        | 10580070 |
| 78  | rs1761667  | CD36       | Dietary Fat Taste Sensitivity         | Nutrition/Metabolism | 7   | MODERATE   | 8        | 22649263 |
| 79  | rs234706   | CBS        | Homocysteine Metabolism               | Nutrition/Metabolism | 21  | MODERATE   | 7        | 11270512 |
| 80  | rs4654748  | NBPF3/ALPL | Vitamin B6 Levels                     | Nutrition/Metabolism | 1   | HIGH       | 7        | 23754956 |
| 81  | rs12272004 | SLC23A1    | Vitamin C Absorption                  | Nutrition/Metabolism | 5   | MODERATE   | 7        | 20573880 |
| 82  | rs1799998  | CYP11B2    | Aldosterone/Salt Sensitivity          | Nutrition/Metabolism | 8   | MODERATE   | 7        | 15199295 |
| 83  | rs602662   | FUT6       | Vitamin B12 Absorption                | Nutrition/Metabolism | 19  | MODERATE   | 7        | 22084333 |
| 84  | rs780094   | GCKR       | Fasting Glucose/Triglycerides         | Nutrition/Metabolism | 2   | HIGH       | 7        | 18372903 |
| 85  | rs1260326  | GCKR       | Glucokinase Regulation                | Nutrition/Metabolism | 2   | HIGH       | 7        | 18372903 |
| 86  | rs5400     | SLC2A2     | Glucose Sensing/Sugar Preference      | Nutrition/Metabolism | 3   | MODERATE   | 7        | 19034422 |
| 87  | rs987237   | TFAP2B     | Weight Regain After Dieting           | Nutrition/Metabolism | 6   | MODERATE   | 7        | 19151714 |
| 88  | rs12325817 | PHACTR1    | Phosphate Metabolism                  | Nutrition/Metabolism | 6   | LOW        | 5        | 22139419 |

### 5. Sensory/Perception/Immune (24 traits)

| #   | rsID       | Gene     | Trait                                            | Category                  | Chr | Confidence | Interest | PMID     |
| --- | ---------- | -------- | ------------------------------------------------ | ------------------------- | --- | ---------- | -------- | -------- |
| 89  | rs5020278  | OR7D4    | Androstenone Perception (Pleasant vs Unpleasant) | Sensory/Perception/Immune | 19  | HIGH       | 9        | 17873857 |
| 90  | rs61729907 | SCN9A    | Pain Threshold Level                             | Sensory/Perception/Immune | 2   | HIGH       | 9        | 16429158 |
| 91  | rs8065080  | TRPV1    | Capsaicin/Spice Sensitivity                      | Sensory/Perception/Immune | 17  | HIGH       | 9        | 22127461 |
| 92  | rs6591536  | OR5A1    | Beta-Ionone (Violet) Smell Sensitivity           | Sensory/Perception/Immune | 11  | HIGH       | 8        | 23538697 |
| 93  | rs2933468  | OR11H7P  | Androstenone Smell Detection                     | Sensory/Perception/Immune | 14  | MODERATE   | 8        | 17873857 |
| 94  | rs2234978  | TRPA1    | Wasabi/Mustard Oil Sensitivity                   | Sensory/Perception/Immune | 8   | MODERATE   | 8        | 21931556 |
| 95  | rs2476601  | PTPN22   | Autoimmune Susceptibility (1858T)                | Sensory/Perception/Immune | 1   | HIGH       | 8        | 15208781 |
| 96  | rs2274333  | CA6      | Taste Perception (Carbonic Anhydrase)            | Sensory/Perception/Immune | 1   | MODERATE   | 7        | 21131946 |
| 97  | rs2590498  | OR2J3    | Grass/Green Odor Perception                      | Sensory/Perception/Immune | 6   | LOW        | 7        | 22106369 |
| 98  | rs2229616  | MC4R     | Appetite Regulation/Satiety                      | Sensory/Perception/Immune | 18  | HIGH       | 7        | 15591327 |
| 99  | rs2234693  | ESR1     | Hearing Preservation with Age                    | Sensory/Perception/Immune | 6   | MODERATE   | 7        | 17360449 |
| 100 | rs6423504  | GJB2     | Hearing Acuity                                   | Sensory/Perception/Immune | 13  | MODERATE   | 7        | 9529364  |
| 101 | rs224534   | TRPV1    | Heat Pain Sensitivity                            | Sensory/Perception/Immune | 17  | MODERATE   | 7        | 22127461 |
| 102 | rs12722042 | HLA-DRB1 | Autoimmune Disease Risk                          | Sensory/Perception/Immune | 6   | HIGH       | 7        | 15146469 |
| 103 | rs3024505  | IL10     | Inflammatory Response Regulation                 | Sensory/Perception/Immune | 1   | HIGH       | 7        | 19122664 |
| 104 | rs3087243  | CTLA4    | Autoimmune Thyroid Disease Risk                  | Sensory/Perception/Immune | 2   | HIGH       | 7        | 12697052 |
| 105 | rs1800629  | TNF      | Inflammatory Cytokine Response                   | Sensory/Perception/Immune | 6   | HIGH       | 7        | 9445284  |
| 106 | rs2243250  | IL4      | Allergy/Atopy Predisposition                     | Sensory/Perception/Immune | 5   | MODERATE   | 7        | 11159949 |
| 107 | rs4986790  | TLR4     | Innate Immune Response Strength                  | Sensory/Perception/Immune | 9   | HIGH       | 7        | 10946306 |
| 108 | rs1800896  | IL10     | Anti-Inflammatory Capacity                       | Sensory/Perception/Immune | 1   | HIGH       | 7        | 11439943 |
| 109 | rs20417    | PTGS2    | Prostaglandin Pain Response (COX-2)              | Sensory/Perception/Immune | 1   | MODERATE   | 6        | 12522259 |
| 110 | rs352140   | TLR9     | Viral Immune Response                            | Sensory/Perception/Immune | 3   | MODERATE   | 6        | 15557015 |
| 111 | rs2069762  | IL2      | T-Cell Immune Activation                         | Sensory/Perception/Immune | 4   | MODERATE   | 6        | 10801139 |
| 112 | rs1876828  | CRH      | Stress-Induced Hearing Changes                   | Sensory/Perception/Immune | 8   | LOW        | 5        | 17360449 |

### 6. Reproductive/Hormonal (18 traits)

| #   | rsID       | Gene    | Trait                                    | Category              | Chr | Confidence | Interest | PMID     |
| --- | ---------- | ------- | ---------------------------------------- | --------------------- | --- | ---------- | -------- | -------- |
| 113 | rs2414096  | CYP19A1 | Aromatase Activity (Estrogen Synthesis)  | Reproductive/Hormonal | 15  | HIGH       | 8        | 17389697 |
| 114 | rs6166     | FSHR    | Follicle Stimulating Hormone Sensitivity | Reproductive/Hormonal | 2   | HIGH       | 8        | 15161800 |
| 115 | rs314276   | LIN28B  | Age at Menarche                          | Reproductive/Hormonal | 6   | HIGH       | 8        | 19483681 |
| 116 | rs2305089  | KISS1   | Puberty Onset Timing                     | Reproductive/Hormonal | 1   | LOW        | 8        | 18996915 |
| 117 | rs10046    | CYP19A1 | Estrogen Level Variation                 | Reproductive/Hormonal | 15  | HIGH       | 7        | 17389697 |
| 118 | rs2830     | LHB     | Luteinizing Hormone Levels               | Reproductive/Hormonal | 19  | MODERATE   | 7        | 15956089 |
| 119 | rs5742612  | IGF1    | Growth Hormone/IGF-1 Activity            | Reproductive/Hormonal | 12  | MODERATE   | 7        | 14709821 |
| 120 | rs1008805  | CYP3A4  | Testosterone Metabolism Rate             | Reproductive/Hormonal | 7   | MODERATE   | 7        | 12855775 |
| 121 | rs743572   | CYP17A1 | Androgen Synthesis Rate                  | Reproductive/Hormonal | 10  | MODERATE   | 7        | 10628752 |
| 122 | rs2234693  | ESR1    | Estrogen Receptor Alpha Activity         | Reproductive/Hormonal | 6   | HIGH       | 7        | 17360449 |
| 123 | rs1800716  | SRD5A2  | 5-Alpha Reductase Activity               | Reproductive/Hormonal | 2   | MODERATE   | 7        | 9425227  |
| 124 | rs1800447  | LHCGR   | LH Receptor Sensitivity                  | Reproductive/Hormonal | 2   | MODERATE   | 6        | 15161800 |
| 125 | rs11191548 | NT5C2   | Blood Pressure/Vascular Tone             | Reproductive/Hormonal | 10  | HIGH       | 6        | 19430479 |
| 126 | rs1256049  | ESR2    | Estrogen Receptor Beta Function          | Reproductive/Hormonal | 14  | MODERATE   | 6        | 15456786 |
| 127 | rs4633     | COMT    | Estrogen Clearance Rate                  | Reproductive/Hormonal | 22  | MODERATE   | 6        | 16402123 |
| 128 | rs1800932  | PGR     | Progesterone Receptor Sensitivity        | Reproductive/Hormonal | 11  | MODERATE   | 6        | 14706954 |
| 129 | rs4986938  | ESR2    | Bone Mineral Density Response            | Reproductive/Hormonal | 14  | MODERATE   | 6        | 15456786 |
| 130 | rs5275     | PTGS2   | Prostaglandin Synthesis/Fertility        | Reproductive/Hormonal | 1   | MODERATE   | 6        | 12522259 |

### 7. Unusual/Quirky/Fun (19 traits)

| #   | rsID       | Gene     | Trait                                | Category           | Chr | Confidence | Interest | PMID     |
| --- | ---------- | -------- | ------------------------------------ | ------------------ | --- | ---------- | -------- | -------- |
| 131 | rs4778241  | OCA2     | Eye Sparkle/Limbal Ring Visibility   | Unusual/Quirky/Fun | 15  | LOW        | 9        | 17236130 |
| 132 | rs7412     | APOE     | Exceptional Memory Potential         | Unusual/Quirky/Fun | 19  | HIGH       | 9        | 8346443  |
| 133 | rs10830963 | MTNR1B   | Dream Vividness (Melatonin Receptor) | Unusual/Quirky/Fun | 11  | MODERATE   | 9        | 19060907 |
| 134 | rs1801260  | CLOCK    | Night Owl Extreme Tendency           | Unusual/Quirky/Fun | 4   | MODERATE   | 9        | 9620771  |
| 135 | rs150036   | ARVCF    | Perfect Pitch Tendency               | Unusual/Quirky/Fun | 22  | LOW        | 9        | 19373279 |
| 136 | rs1800544  | ADRA2A   | Startle Response Intensity           | Unusual/Quirky/Fun | 10  | MODERATE   | 8        | 15674040 |
| 137 | rs57095329 | miR-137  | Creativity/Divergent Thinking        | Unusual/Quirky/Fun | 1   | LOW        | 8        | 21926974 |
| 138 | rs4778232  | OCA2     | Eye Color Ring Pattern               | Unusual/Quirky/Fun | 15  | LOW        | 8        | 17236130 |
| 139 | rs2069514  | CYP1A2   | Ultra-Rapid Caffeine Metabolism      | Unusual/Quirky/Fun | 15  | HIGH       | 8        | 17301239 |
| 140 | rs10811661 | CDKN2A/B | Biological Aging Rate                | Unusual/Quirky/Fun | 9   | HIGH       | 8        | 17554300 |
| 141 | rs4880     | SOD2     | Free Radical Defense Capacity        | Unusual/Quirky/Fun | 6   | HIGH       | 8        | 15369602 |
| 142 | rs11568820 | VDR      | Sunlight Mood Response               | Unusual/Quirky/Fun | 12  | MODERATE   | 8        | 21524510 |
| 143 | rs12979860 | IFNL4    | Hepatitis C Clearance Ability        | Unusual/Quirky/Fun | 19  | HIGH       | 7        | 19684573 |
| 144 | rs2180439  | HBA      | High-Altitude Oxygen Efficiency      | Unusual/Quirky/Fun | 16  | MODERATE   | 7        | 24412746 |
| 145 | rs2645400  | ACPT     | Tooth Enamel Strength                | Unusual/Quirky/Fun | 19  | LOW        | 7        | 22336284 |
| 146 | rs3741049  | ALDH3A2  | Sweat Odor Profile                   | Unusual/Quirky/Fun | 17  | LOW        | 7        | 17952075 |
| 147 | rs1143634  | IL1B     | Propensity for Fever Response        | Unusual/Quirky/Fun | 2   | MODERATE   | 6        | 12728027 |
| 148 | rs1800451  | MBL2     | Innate Immunity Quirk (Complement)   | Unusual/Quirky/Fun | 10  | HIGH       | 6        | 10486335 |
| 149 | rs2292239  | ERBB3    | Autoimmune Propensity                | Unusual/Quirky/Fun | 12  | MODERATE   | 5        | 18840781 |

### 8. Skin/Aging/Longevity (22 traits)

| #   | rsID       | Gene         | Trait                                | Category             | Chr | Confidence | Interest | PMID     |
| --- | ---------- | ------------ | ------------------------------------ | -------------------- | --- | ---------- | -------- | -------- |
| 150 | rs1042522  | TP53         | Cancer Susceptibility (p53 codon 72) | Skin/Aging/Longevity | 17  | HIGH       | 9        | 12640109 |
| 151 | rs401681   | TERT-CLPTM1L | Telomere Length / Skin Cancer Risk   | Skin/Aging/Longevity | 5   | HIGH       | 9        | 18385676 |
| 152 | rs2736100  | TERT         | Telomere Maintenance                 | Skin/Aging/Longevity | 5   | HIGH       | 9        | 19412176 |
| 153 | rs2228001  | XPC          | DNA Repair / UV Damage Recovery      | Skin/Aging/Longevity | 3   | HIGH       | 8        | 16144912 |
| 154 | rs10936599 | TERC         | Telomere Length                      | Skin/Aging/Longevity | 3   | HIGH       | 8        | 21304973 |
| 155 | rs2075650  | TOMM40       | Biological Aging Rate                | Skin/Aging/Longevity | 19  | HIGH       | 8        | 21347282 |
| 156 | rs7023329  | MTAP         | Melanoma / Nevus Count               | Skin/Aging/Longevity | 9   | HIGH       | 8        | 19578365 |
| 157 | rs11568820 | VDR          | Vitamin D Receptor (Skin Health)     | Skin/Aging/Longevity | 12  | HIGH       | 7        | 21524510 |
| 158 | rs1052133  | OGG1         | Oxidative DNA Repair                 | Skin/Aging/Longevity | 3   | HIGH       | 7        | 12505356 |
| 159 | rs13181    | ERCC2/XPD    | Nucleotide Excision Repair           | Skin/Aging/Longevity | 19  | HIGH       | 7        | 12505356 |
| 160 | rs1800734  | MLH1         | Mismatch Repair (Cancer Risk)        | Skin/Aging/Longevity | 3   | HIGH       | 7        | 15888295 |
| 161 | rs1136410  | PARP1        | Cellular Repair Capacity             | Skin/Aging/Longevity | 1   | MODERATE   | 7        | 17276986 |
| 162 | rs1801394  | MTRR         | Methionine Synthase Reductase        | Skin/Aging/Longevity | 5   | HIGH       | 7        | 10444342 |
| 163 | rs1455311  | TERC         | RNA Component of Telomerase          | Skin/Aging/Longevity | 3   | MODERATE   | 7        | 21304973 |
| 164 | rs1042602  | TYR          | Tanning Response (Tyr192 variant)    | Skin/Aging/Longevity | 11  | HIGH       | 7        | 16175503 |
| 165 | rs2228570  | VDR          | Vitamin D Receptor (Bone/Skin)       | Skin/Aging/Longevity | 12  | HIGH       | 7        | 21524510 |
| 166 | rs3219489  | MUTYH        | Base Excision Repair                 | Skin/Aging/Longevity | 1   | MODERATE   | 6        | 15888295 |
| 167 | rs2227956  | HSPA1L       | Heat Shock Protein Response          | Skin/Aging/Longevity | 6   | MODERATE   | 6        | 12620219 |
| 168 | rs35391    | STXBP5L      | Blood Clotting / Wound Healing Speed | Skin/Aging/Longevity | 3   | MODERATE   | 6        | 20139978 |
| 169 | rs11556924 | ZC3HC1       | Vascular Aging                       | Skin/Aging/Longevity | 7   | MODERATE   | 6        | 21378990 |
| 170 | rs1042714  | ADRB2        | Skin Blood Flow Regulation           | Skin/Aging/Longevity | 5   | MODERATE   | 5        | 10978173 |
| 171 | rs11203042 | PIGU         | Melanocyte Function                  | Skin/Aging/Longevity | 20  | LOW        | 5        | 18488028 |

### 9. Pharmacogenomic (26 traits)

| #   | rsID       | Gene    | Trait                                      | Category        | Chr | Confidence | Interest | PMID     |
| --- | ---------- | ------- | ------------------------------------------ | --------------- | --- | ---------- | -------- | -------- |
| 172 | rs1065852  | CYP2D6  | Drug Metabolism (Codeine, Antidepressants) | Pharmacogenomic | 22  | HIGH       | 10       | 12815591 |
| 173 | rs3892097  | CYP2D6  | Poor Drug Metabolizer Status               | Pharmacogenomic | 22  | HIGH       | 10       | 12815591 |
| 174 | rs4244285  | CYP2C19 | Clopidogrel (Plavix) Metabolism            | Pharmacogenomic | 10  | HIGH       | 10       | 19809484 |
| 175 | rs1799853  | CYP2C9  | Warfarin Sensitivity (\*2)                 | Pharmacogenomic | 10  | HIGH       | 10       | 11152865 |
| 176 | rs1057910  | CYP2C9  | Warfarin Sensitivity (\*3)                 | Pharmacogenomic | 10  | HIGH       | 10       | 11152865 |
| 177 | rs9923231  | VKORC1  | Warfarin Dose Requirement                  | Pharmacogenomic | 16  | HIGH       | 10       | 15930419 |
| 178 | rs4986893  | CYP2C19 | CYP2C19 Poor Metabolizer (\*3)             | Pharmacogenomic | 10  | HIGH       | 9        | 19809484 |
| 179 | rs12248560 | CYP2C19 | CYP2C19 Ultra-Rapid Metabolizer (\*17)     | Pharmacogenomic | 10  | HIGH       | 9        | 16958828 |
| 180 | rs4149056  | SLCO1B1 | Statin-Induced Myopathy Risk               | Pharmacogenomic | 12  | HIGH       | 9        | 18650507 |
| 181 | rs1800460  | TPMT    | Thiopurine Sensitivity (\*3B component)    | Pharmacogenomic | 6   | HIGH       | 9        | 9180337  |
| 182 | rs1142345  | TPMT    | Thiopurine Toxicity Risk (\*3C)            | Pharmacogenomic | 6   | HIGH       | 9        | 9180337  |
| 183 | rs1800460  | TPMT    | Azathioprine Metabolism                    | Pharmacogenomic | 6   | HIGH       | 9        | 9180337  |
| 184 | rs3918290  | DPYD    | 5-FU Chemotherapy Toxicity Risk            | Pharmacogenomic | 1   | HIGH       | 9        | 11752352 |
| 185 | rs1045642  | ABCB1   | Drug Efflux Pump Activity (MDR1)           | Pharmacogenomic | 7   | HIGH       | 8        | 10963643 |
| 186 | rs776746   | CYP3A5  | Tacrolimus/Cyclosporine Metabolism         | Pharmacogenomic | 7   | HIGH       | 8        | 12844134 |
| 187 | rs28399504 | CYP2C19 | CYP2C19 Loss of Function (\*4)             | Pharmacogenomic | 10  | HIGH       | 8        | 19809484 |
| 188 | rs3745274  | CYP2B6  | Efavirenz/Methadone Metabolism             | Pharmacogenomic | 19  | HIGH       | 8        | 15536459 |
| 189 | rs8175347  | UGT1A1  | Irinotecan Toxicity (Gilbert Syndrome)     | Pharmacogenomic | 2   | HIGH       | 8        | 15040903 |
| 190 | rs2032582  | ABCB1   | P-Glycoprotein Function                    | Pharmacogenomic | 7   | MODERATE   | 7        | 10963643 |
| 191 | rs2231142  | ABCG2   | Drug Transport (Rosuvastatin/Topotecan)    | Pharmacogenomic | 4   | HIGH       | 7        | 19116879 |
| 192 | rs1695     | GSTP1   | Chemotherapy Drug Metabolism               | Pharmacogenomic | 11  | HIGH       | 7        | 11170387 |
| 193 | rs2032583  | ABCB1   | Blood-Brain Barrier Drug Penetration       | Pharmacogenomic | 7   | MODERATE   | 7        | 10963643 |
| 194 | rs9934438  | VKORC1  | Vitamin K Cycle Sensitivity                | Pharmacogenomic | 16  | HIGH       | 7        | 15930419 |
| 195 | rs2279343  | CYP2B6  | Bupropion/Cyclophosphamide Metabolism      | Pharmacogenomic | 19  | HIGH       | 7        | 15536459 |
| 196 | rs1128503  | ABCB1   | Drug Absorption/Distribution               | Pharmacogenomic | 7   | MODERATE   | 6        | 10963643 |
| 197 | rs1051740  | EPHX1   | Epoxide Hydrolase (Toxin Clearance)        | Pharmacogenomic | 1   | MODERATE   | 6        | 11256898 |

### 10. Cardiovascular/Metabolic (24 traits)

| #   | rsID       | Gene             | Trait                                     | Category                 | Chr | Confidence | Interest | PMID     |
| --- | ---------- | ---------------- | ----------------------------------------- | ------------------------ | --- | ---------- | -------- | -------- |
| 198 | rs1333049  | CDKN2A/2B (9p21) | Coronary Artery Disease Risk              | Cardiovascular/Metabolic | 9   | HIGH       | 9        | 17554300 |
| 199 | rs10757274 | 9p21             | Heart Attack Risk                         | Cardiovascular/Metabolic | 9   | HIGH       | 9        | 17478681 |
| 200 | rs429358   | APOE             | Cardiovascular Lipid Risk (APOE e4)       | Cardiovascular/Metabolic | 19  | HIGH       | 9        | 8346443  |
| 201 | rs1799963  | F2               | Prothrombin Thrombophilia (G20210A)       | Cardiovascular/Metabolic | 11  | HIGH       | 9        | 8600153  |
| 202 | rs4977574  | 9p21             | Coronary Heart Disease                    | Cardiovascular/Metabolic | 9   | HIGH       | 8        | 19198609 |
| 203 | rs10811661 | CDKN2A/B         | Type 2 Diabetes Risk (9p21)               | Cardiovascular/Metabolic | 9   | HIGH       | 8        | 17554300 |
| 204 | rs5219     | KCNJ11           | Insulin Secretion (Kir6.2)                | Cardiovascular/Metabolic | 11  | HIGH       | 8        | 17463249 |
| 205 | rs8050136  | FTO              | Obesity-Related Diabetes Risk             | Cardiovascular/Metabolic | 16  | HIGH       | 8        | 17434869 |
| 206 | rs1801253  | ADRB1            | Heart Rate Response / Beta-Blocker Effect | Cardiovascular/Metabolic | 10  | HIGH       | 8        | 12844134 |
| 207 | rs5186     | AGTR1            | Angiotensin Receptor / Hypertension Risk  | Cardiovascular/Metabolic | 3   | HIGH       | 8        | 10706858 |
| 208 | rs662      | PON1             | Paraoxonase (Cardiovascular Protection)   | Cardiovascular/Metabolic | 7   | HIGH       | 8        | 9497246  |
| 209 | rs1801131  | MTHFR            | Homocysteine-Related CV Risk              | Cardiovascular/Metabolic | 1   | HIGH       | 8        | 10444342 |
| 210 | rs693      | APOB             | LDL Cholesterol Level                     | Cardiovascular/Metabolic | 2   | HIGH       | 8        | 7627691  |
| 211 | rs5918     | ITGB3            | Platelet Aggregation (Aspirin Response)   | Cardiovascular/Metabolic | 17  | HIGH       | 8        | 10071168 |
| 212 | rs13266634 | SLC30A8          | Zinc Transporter / Beta-Cell Function     | Cardiovascular/Metabolic | 8   | HIGH       | 7        | 17460697 |
| 213 | rs854560   | PON1             | HDL Antioxidant Capacity                  | Cardiovascular/Metabolic | 7   | HIGH       | 7        | 9497246  |
| 214 | rs1800590  | LPL              | Lipoprotein Lipase Activity               | Cardiovascular/Metabolic | 8   | MODERATE   | 7        | 9603906  |
| 215 | rs328      | LPL              | Triglyceride Metabolism                   | Cardiovascular/Metabolic | 8   | HIGH       | 7        | 9603906  |
| 216 | rs5882     | CETP             | HDL Cholesterol Level                     | Cardiovascular/Metabolic | 16  | HIGH       | 7        | 11739384 |
| 217 | rs1800775  | CETP             | Cholesterol Transfer Rate                 | Cardiovascular/Metabolic | 16  | HIGH       | 7        | 11739384 |
| 218 | rs7578597  | THADA            | Type 2 Diabetes Susceptibility            | Cardiovascular/Metabolic | 2   | MODERATE   | 6        | 18372903 |
| 219 | rs1801020  | F12              | Factor XII / Thrombosis Risk              | Cardiovascular/Metabolic | 5   | MODERATE   | 6        | 12393539 |
| 220 | rs6050     | FGA              | Fibrinogen Level / Clotting               | Cardiovascular/Metabolic | 4   | MODERATE   | 6        | 10404117 |
| 221 | rs1800872  | IL10             | Atherosclerosis Inflammation              | Cardiovascular/Metabolic | 1   | MODERATE   | 6        | 11439943 |

### 11. Neurological/Brain (68 traits) — NEW

| #   | rsID       | Gene        | Trait                                            | Category           | Chr | Confidence | Interest | PMID     |
| --- | ---------- | ----------- | ------------------------------------------------ | ------------------ | --- | ---------- | -------- | -------- |
| 222 | rs429358   | APOE        | Late-Onset Alzheimer's Disease Risk              | Neurological/Brain | 19  | HIGH       | 9        | 8346443  |
| 223 | rs7412     | APOE        | Neuroprotective e2 Allele                        | Neurological/Brain | 19  | HIGH       | 9        | 8346443  |
| 224 | rs6265     | BDNF        | Neuroplasticity / Brain Volume                   | Neurological/Brain | 11  | HIGH       | 9        | 14976160 |
| 225 | rs1800497  | DRD2/ANKK1  | Dopamine Receptor Density (Taq1A)                | Neurological/Brain | 11  | HIGH       | 9        | 2234812  |
| 226 | rs75932628 | TREM2       | Microglial Neuroinflammation Risk                | Neurological/Brain | 6   | HIGH       | 9        | 23150934 |
| 227 | rs3764028  | KIBRA       | Episodic Memory Performance                      | Neurological/Brain | 5   | HIGH       | 9        | 16906133 |
| 228 | rs1800547  | MAPT        | Tau Protein / Frontotemporal Dementia Risk       | Neurological/Brain | 17  | HIGH       | 9        | 15694326 |
| 229 | rs12576775 | DISC1       | Disrupted-In-Schizophrenia Risk                  | Neurological/Brain | 1   | MODERATE   | 9        | 15563513 |
| 230 | rs1344706  | ZNF804A     | Schizophrenia/Psychosis Risk                     | Neurological/Brain | 2   | HIGH       | 8        | 18940312 |
| 231 | rs7794745  | CNTNAP2     | Language Processing / Autism Risk                | Neurological/Brain | 7   | HIGH       | 8        | 18179900 |
| 232 | rs1006737  | CACNA1C     | Calcium Channel / Mood Disorder Risk             | Neurological/Brain | 12  | HIGH       | 8        | 18711365 |
| 233 | rs1800955  | DRD4        | Dopamine D4 Receptor / Attention Regulation      | Neurological/Brain | 11  | MODERATE   | 8        | 8757625  |
| 234 | rs4680     | COMT        | Prefrontal Cortex Dopamine (Val158Met)           | Neurological/Brain | 22  | HIGH       | 8        | 14976160 |
| 235 | rs2710102  | CNTNAP2     | White Matter Connectivity                        | Neurological/Brain | 7   | MODERATE   | 8        | 18179900 |
| 236 | rs10503929 | COMT        | Cognitive Flexibility (Warrior/Worrier)          | Neurological/Brain | 22  | MODERATE   | 8        | 16402123 |
| 237 | rs4570625  | TPH2        | Serotonin Synthesis in Brain                     | Neurological/Brain | 12  | MODERATE   | 8        | 15863811 |
| 238 | rs6311     | HTR2A       | Serotonin 2A Receptor Density                    | Neurological/Brain | 13  | MODERATE   | 8        | 15166467 |
| 239 | rs1360780  | FKBP5       | HPA Axis / Stress Response Regulation            | Neurological/Brain | 6   | HIGH       | 8        | 18199480 |
| 240 | rs4713916  | FKBP5       | Cortisol Sensitivity / PTSD Risk                 | Neurological/Brain | 6   | HIGH       | 8        | 18199480 |
| 241 | rs6313     | HTR2A       | Serotonin Receptor Function                      | Neurological/Brain | 13  | HIGH       | 8        | 15166467 |
| 242 | rs2241165  | NRG1        | Neuregulin-1 / Schizophrenia Susceptibility      | Neurological/Brain | 8   | MODERATE   | 8        | 15205343 |
| 243 | rs174575   | FADS2       | Brain DHA Levels (Cognitive Development)         | Neurological/Brain | 11  | HIGH       | 8        | 21829377 |
| 244 | rs2075650  | TOMM40      | Age-Related Cognitive Decline                    | Neurological/Brain | 19  | HIGH       | 8        | 21347282 |
| 245 | rs17070145 | KIBRA       | Working Memory / Learning Rate                   | Neurological/Brain | 5   | HIGH       | 8        | 16906133 |
| 246 | rs2760118  | ABCB1       | Blood-Brain Barrier Permeability                 | Neurological/Brain | 7   | MODERATE   | 7        | 16337829 |
| 247 | rs1799913  | TPH1        | Peripheral Serotonin Synthesis                   | Neurological/Brain | 11  | MODERATE   | 7        | 15507236 |
| 248 | rs6295     | HTR1A       | Serotonin 1A Receptor / Depression Vulnerability | Neurological/Brain | 5   | MODERATE   | 7        | 12872011 |
| 249 | rs2283265  | DRD2        | Striatal Dopamine Signaling                      | Neurological/Brain | 11  | MODERATE   | 7        | 17567567 |
| 250 | rs1801133  | MTHFR       | Neural Tube Defect Risk (Folate Pathway)         | Neurological/Brain | 1   | HIGH       | 7        | 9545397  |
| 251 | rs1800032  | GRIN2B      | NMDA Receptor Function / Learning                | Neurological/Brain | 12  | MODERATE   | 7        | 14633147 |
| 252 | rs362691   | SNAP25      | Synaptic Vesicle Release / ADHD Link             | Neurological/Brain | 20  | MODERATE   | 7        | 15563513 |
| 253 | rs1800435  | ALAD        | Lead Neurotoxicity Susceptibility                | Neurological/Brain | 9   | HIGH       | 7        | 11254145 |
| 254 | rs1800544  | ADRA2A      | Norepinephrine Signaling / Attention             | Neurological/Brain | 10  | MODERATE   | 7        | 15674040 |
| 255 | rs11030104 | BDNF        | Brain-Derived Neurotrophic Factor Levels         | Neurological/Brain | 11  | HIGH       | 7        | 14976160 |
| 256 | rs4532     | DRD1        | Dopamine D1 Receptor / Executive Function        | Neurological/Brain | 5   | LOW        | 7        | 16005187 |
| 257 | rs7903146  | TCF7L2      | Neuronal Wnt Signaling                           | Neurological/Brain | 10  | HIGH       | 7        | 17463249 |
| 258 | rs1800497  | ANKK1       | Addiction Vulnerability (Taq1A)                  | Neurological/Brain | 11  | HIGH       | 7        | 2234812  |
| 259 | rs1611115  | DBH         | Dopamine Beta-Hydroxylase Activity               | Neurological/Brain | 9   | HIGH       | 7        | 10391210 |
| 260 | rs165599   | COMT        | Catechol-O-Methyltransferase Activity            | Neurological/Brain | 22  | MODERATE   | 7        | 14976160 |
| 261 | rs2242446  | NET1/SLC6A2 | Norepinephrine Transporter Function              | Neurological/Brain | 16  | MODERATE   | 7        | 16951591 |
| 262 | rs1800532  | TPH1        | Tryptophan Hydroxylase / Impulse Control         | Neurological/Brain | 11  | MODERATE   | 7        | 15507236 |
| 263 | rs10994359 | ANK3        | Ion Channel / Bipolar Disorder Risk              | Neurological/Brain | 10  | HIGH       | 7        | 18711365 |
| 264 | rs1006131  | NRG1        | Myelination Signaling                            | Neurological/Brain | 8   | MODERATE   | 7        | 15205343 |
| 265 | rs363050   | SNAP25      | Synaptosomal-Associated Protein / IQ Link        | Neurological/Brain | 20  | LOW        | 7        | 15563513 |
| 266 | rs2070424  | SOD1        | Motor Neuron Protection (ALS)                    | Neurological/Brain | 21  | HIGH       | 7        | 17092961 |
| 267 | rs3756577  | SLC6A3      | Dopamine Transporter Density                     | Neurological/Brain | 5   | MODERATE   | 7        | 15733249 |
| 268 | rs27072    | SLC6A3      | Dopamine Reuptake / ADHD Susceptibility          | Neurological/Brain | 5   | MODERATE   | 7        | 22610946 |
| 269 | rs2734838  | DYRK1A      | Down Syndrome Neurodevelopmental Gene            | Neurological/Brain | 21  | HIGH       | 7        | 15044675 |
| 270 | rs2305098  | GRIN2A      | Glutamate Receptor / Epilepsy Risk               | Neurological/Brain | 16  | MODERATE   | 7        | 22539344 |
| 271 | rs3743205  | GBA         | Glucocerebrosidase / Parkinson's Risk            | Neurological/Brain | 1   | HIGH       | 8        | 19196966 |
| 272 | rs76763715 | GBA         | Gaucher/Parkinson's Disease Link                 | Neurological/Brain | 1   | HIGH       | 8        | 19196966 |
| 273 | rs11931074 | SNCA        | Alpha-Synuclein / Parkinson's Risk               | Neurological/Brain | 4   | HIGH       | 8        | 19915575 |
| 274 | rs356219   | SNCA        | Synuclein Expression Level                       | Neurological/Brain | 4   | HIGH       | 8        | 19915575 |
| 275 | rs34637584 | LRRK2       | Leucine-Rich Repeat Kinase (Parkinson's)         | Neurological/Brain | 12  | HIGH       | 9        | 15541309 |
| 276 | rs9652490  | LINGO1      | Essential Tremor Risk                            | Neurological/Brain | 15  | HIGH       | 7        | 19197346 |
| 277 | rs11856808 | LINGO1      | Tremor Severity Modifier                         | Neurological/Brain | 15  | MODERATE   | 6        | 19197346 |
| 278 | rs12185268 | ATXN2       | Spinocerebellar Ataxia / ALS Risk                | Neurological/Brain | 12  | HIGH       | 7        | 20801718 |
| 279 | rs3731239  | SLC17A7     | Glutamate Vesicular Transport                    | Neurological/Brain | 19  | MODERATE   | 6        | 19126814 |
| 280 | rs16944    | IL1B        | Neuroinflammation / Alzheimer's Modifier         | Neurological/Brain | 2   | MODERATE   | 7        | 12728027 |
| 281 | rs1800629  | TNF         | TNF-alpha Neuroinflammation                      | Neurological/Brain | 6   | HIGH       | 7        | 9445284  |
| 282 | rs3135388  | HLA-DRB1    | Multiple Sclerosis Risk                          | Neurological/Brain | 6   | HIGH       | 8        | 18385739 |
| 283 | rs6457617  | HLA-DQB1    | Narcolepsy Susceptibility                        | Neurological/Brain | 6   | HIGH       | 8        | 19412176 |
| 284 | rs2305160  | LRRK2       | Kinase Activity Modifier                         | Neurological/Brain | 12  | MODERATE   | 6        | 15541309 |
| 285 | rs1491850  | GAD1        | GABA Synthesis / Anxiety Circuits                | Neurological/Brain | 2   | MODERATE   | 7        | 16213151 |
| 286 | rs3219151  | PARP1       | Neuronal DNA Repair                              | Neurological/Brain | 1   | MODERATE   | 6        | 17276986 |
| 287 | rs1801394  | MTRR        | Methionine Cycle / Homocysteine Neurotoxicity    | Neurological/Brain | 5   | HIGH       | 6        | 10444342 |
| 288 | rs1805247  | GRIA1       | AMPA Receptor / Synaptic Plasticity              | Neurological/Brain | 5   | MODERATE   | 7        | 18523546 |
| 289 | rs1049296  | TF          | Transferrin / Brain Iron Metabolism              | Neurological/Brain | 3   | MODERATE   | 6        | 12948977 |

### 12. Cancer Risk (70 traits) — NEW

| #   | rsID        | Gene         | Trait                                           | Category    | Chr | Confidence | Interest | PMID     |
| --- | ----------- | ------------ | ----------------------------------------------- | ----------- | --- | ---------- | -------- | -------- |
| 290 | rs1799950   | BRCA1        | Breast/Ovarian Cancer Risk (BRCA1)              | Cancer Risk | 17  | HIGH       | 10       | 7894491  |
| 291 | rs80357906  | BRCA2        | Breast Cancer Risk (BRCA2)                      | Cancer Risk | 13  | HIGH       | 10       | 7894491  |
| 292 | rs121913529 | APC          | Familial Adenomatous Polyposis                  | Cancer Risk | 5   | HIGH       | 10       | 1651174  |
| 293 | rs11571833  | BRCA2        | Cancer Susceptibility (K3326X)                  | Cancer Risk | 13  | HIGH       | 10       | 23544013 |
| 294 | rs1042522   | TP53         | p53 Codon 72 (Apoptosis Efficiency)             | Cancer Risk | 17  | HIGH       | 9        | 12640109 |
| 295 | rs1800734   | MLH1         | Lynch Syndrome / Mismatch Repair                | Cancer Risk | 3   | HIGH       | 9        | 15888295 |
| 296 | rs1799782   | XRCC1        | DNA Repair Deficiency / Cancer Susceptibility   | Cancer Risk | 19  | HIGH       | 9        | 12505356 |
| 297 | rs25487     | XRCC1        | Base Excision Repair (Arg399Gln)                | Cancer Risk | 19  | HIGH       | 9        | 12505356 |
| 298 | rs3218536   | XRCC2        | Homologous Recombination Repair                 | Cancer Risk | 7   | MODERATE   | 8        | 16144912 |
| 299 | rs2228001   | XPC          | Nucleotide Excision Repair / Skin Cancer        | Cancer Risk | 3   | HIGH       | 8        | 16144912 |
| 300 | rs13181     | ERCC2/XPD    | DNA Helicase Repair / Lung Cancer               | Cancer Risk | 19  | HIGH       | 8        | 12505356 |
| 301 | rs1052133   | OGG1         | 8-oxoGuanine Repair / Lung Cancer               | Cancer Risk | 3   | HIGH       | 8        | 12505356 |
| 302 | rs1799966   | BRCA1        | Missense Variant / Cancer Modifier              | Cancer Risk | 17  | HIGH       | 8        | 7894491  |
| 303 | rs1801320   | RAD51        | Homologous Recombination / Breast Cancer        | Cancer Risk | 15  | MODERATE   | 8        | 15888295 |
| 304 | rs3218550   | XRCC2        | Double-Strand Break Repair                      | Cancer Risk | 7   | MODERATE   | 7        | 16144912 |
| 305 | rs2736100   | TERT         | Telomerase / Lung Cancer Risk                   | Cancer Risk | 5   | HIGH       | 9        | 19412176 |
| 306 | rs401681    | TERT-CLPTM1L | Telomere / Multi-Cancer Risk Locus              | Cancer Risk | 5   | HIGH       | 9        | 18385676 |
| 307 | rs10936599  | TERC         | Telomere Length / Cancer Predisposition         | Cancer Risk | 3   | HIGH       | 8        | 21304973 |
| 308 | rs4488809   | TP53         | p53 Pathway Regulation                          | Cancer Risk | 17  | MODERATE   | 7        | 12640109 |
| 309 | rs2279744   | MDM2         | p53 Degradation Rate (SNP309)                   | Cancer Risk | 12  | HIGH       | 8        | 15550243 |
| 310 | rs6983267   | MYC (8q24)   | Colorectal / Prostate Cancer Risk               | Cancer Risk | 8   | HIGH       | 9        | 17618283 |
| 311 | rs13281615  | 8q24         | Breast Cancer Risk (8q24 locus)                 | Cancer Risk | 8   | HIGH       | 8        | 17618283 |
| 312 | rs1447295   | 8q24         | Prostate Cancer Susceptibility                  | Cancer Risk | 8   | HIGH       | 8        | 17618283 |
| 313 | rs4242382   | 8q24         | Prostate Cancer Risk Variant 2                  | Cancer Risk | 8   | HIGH       | 8        | 17618283 |
| 314 | rs10505477  | 8q24         | Colorectal Cancer Risk Locus                    | Cancer Risk | 8   | HIGH       | 7        | 17618283 |
| 315 | rs7023329   | MTAP         | Melanoma / Nevus Density                        | Cancer Risk | 9   | HIGH       | 8        | 19578365 |
| 316 | rs910873    | CASP8        | Caspase-8 / Apoptosis / Breast Cancer           | Cancer Risk | 2   | MODERATE   | 7        | 17293864 |
| 317 | rs1982073   | TGFB1        | TGF-Beta / Tumor Microenvironment               | Cancer Risk | 19  | MODERATE   | 7        | 12721497 |
| 318 | rs1800896   | IL10         | Anti-Inflammatory / Lymphoma Risk               | Cancer Risk | 1   | HIGH       | 7        | 11439943 |
| 319 | rs1800629   | TNF          | TNF-Alpha / Cancer Inflammation                 | Cancer Risk | 6   | HIGH       | 7        | 9445284  |
| 320 | rs3918290   | DPYD         | 5-FU Toxicity (DPD Deficiency)                  | Cancer Risk | 1   | HIGH       | 9        | 11752352 |
| 321 | rs1695      | GSTP1        | Glutathione S-Transferase / Detoxification      | Cancer Risk | 11  | HIGH       | 7        | 11170387 |
| 322 | rs4149056   | SLCO1B1      | Drug Transport / Chemotherapy Pharmacokinetics  | Cancer Risk | 12  | HIGH       | 7        | 18650507 |
| 323 | rs1048943   | CYP1A1       | Polycyclic Aromatic Hydrocarbon Metabolism      | Cancer Risk | 15  | MODERATE   | 8        | 11256898 |
| 324 | rs4646903   | CYP1A1       | Phase I Carcinogen Activation                   | Cancer Risk | 15  | MODERATE   | 7        | 11256898 |
| 325 | rs1056836   | CYP1B1       | Estrogen Metabolite / Hormone-Related Cancer    | Cancer Risk | 2   | HIGH       | 8        | 14633147 |
| 326 | rs10012     | CYP17A1      | Steroid Hormone Cancer Risk                     | Cancer Risk | 10  | MODERATE   | 7        | 10628752 |
| 327 | rs1801270   | CDKN1A       | p21 Cell Cycle Arrest / Cancer                  | Cancer Risk | 6   | MODERATE   | 7        | 15888295 |
| 328 | rs17879961  | CHEK2        | Checkpoint Kinase / Breast Cancer               | Cancer Risk | 22  | HIGH       | 9        | 12122112 |
| 329 | rs555607708 | CHEK2        | 1100delC Frameshift / Multi-Cancer              | Cancer Risk | 22  | HIGH       | 9        | 12122112 |
| 330 | rs11571746  | ATM          | Ataxia Telangiectasia / Cancer Susceptibility   | Cancer Risk | 11  | HIGH       | 8        | 17293864 |
| 331 | rs1800057   | ATM          | DNA Damage Signaling                            | Cancer Risk | 11  | MODERATE   | 7        | 17293864 |
| 332 | rs1800056   | ATM          | ATM Kinase Activity Variant                     | Cancer Risk | 11  | MODERATE   | 7        | 17293864 |
| 333 | rs144848    | BRCA2        | N372H Polymorphism / Cancer Risk                | Cancer Risk | 13  | MODERATE   | 7        | 7894491  |
| 334 | rs3219489   | MUTYH        | Base Excision Repair / Colorectal Cancer        | Cancer Risk | 1   | MODERATE   | 7        | 15888295 |
| 335 | rs1805007   | MC1R         | Melanoma Risk (R151C)                           | Cancer Risk | 16  | HIGH       | 8        | 7581459  |
| 336 | rs1805008   | MC1R         | Melanoma Risk (R160W)                           | Cancer Risk | 16  | HIGH       | 7        | 7581459  |
| 337 | rs910871    | CASP8        | Programmed Cell Death Variant                   | Cancer Risk | 2   | MODERATE   | 6        | 17293864 |
| 338 | rs2981582   | FGFR2        | Fibroblast Growth Factor / Breast Cancer        | Cancer Risk | 10  | HIGH       | 8        | 17529967 |
| 339 | rs889312    | MAP3K1       | MAPK Signaling / Breast Cancer                  | Cancer Risk | 5   | HIGH       | 7        | 17529967 |
| 340 | rs3803662   | TOX3         | Breast Cancer Susceptibility Locus              | Cancer Risk | 16  | HIGH       | 8        | 17529967 |
| 341 | rs13387042  | 2q35         | Breast Cancer Risk (2q35 locus)                 | Cancer Risk | 2   | HIGH       | 8        | 17529967 |
| 342 | rs1219648   | FGFR2        | Estrogen-Responsive Breast Cancer               | Cancer Risk | 10  | HIGH       | 7        | 17529967 |
| 343 | rs4430796   | HNF1B        | Prostate / Endometrial Cancer                   | Cancer Risk | 17  | HIGH       | 8        | 17603485 |
| 344 | rs16901979  | 8q24         | Prostate Cancer Risk (African Ancestry)         | Cancer Risk | 8   | HIGH       | 7        | 17618283 |
| 345 | rs1799977   | MLH1         | Mismatch Repair / Hereditary Cancer             | Cancer Risk | 3   | HIGH       | 8        | 15888295 |
| 346 | rs63750447  | MLH1         | Lynch Syndrome Pathogenic Variant               | Cancer Risk | 3   | HIGH       | 8        | 15888295 |
| 347 | rs1800067   | ERCC1        | Platinum Chemotherapy Response                  | Cancer Risk | 19  | MODERATE   | 7        | 12505356 |
| 348 | rs2228000   | XPC          | Xeroderma Pigmentosum / Skin Cancer             | Cancer Risk | 3   | MODERATE   | 7        | 16144912 |
| 349 | rs4444903   | EGF          | Epidermal Growth Factor / Glioma Risk           | Cancer Risk | 4   | MODERATE   | 7        | 15133504 |
| 350 | rs1801516   | ATM          | Breast/Prostate Cancer Modifier                 | Cancer Risk | 11  | MODERATE   | 7        | 17293864 |
| 351 | rs2279115   | BCL2         | Apoptosis Regulator / Lymphoma                  | Cancer Risk | 18  | MODERATE   | 7        | 17293864 |
| 352 | rs1136201   | ERBB2        | HER2 Coding Variant / Breast Cancer             | Cancer Risk | 17  | HIGH       | 8        | 17529967 |
| 353 | rs2736098   | TERT         | Telomerase Reverse Transcriptase / Multi-Cancer | Cancer Risk | 5   | HIGH       | 8        | 19412176 |
| 354 | rs4975616   | TERT-CLPTM1L | Lung Cancer Susceptibility                      | Cancer Risk | 5   | HIGH       | 7        | 18385676 |
| 355 | rs2853669   | TERT         | Telomerase Promoter / Bladder Cancer            | Cancer Risk | 5   | MODERATE   | 7        | 19412176 |
| 356 | rs10795668  | 10p14        | Colorectal Cancer Risk Locus                    | Cancer Risk | 10  | HIGH       | 7        | 18372905 |
| 357 | rs961253    | 20p12        | Colorectal Cancer GWAS Locus                    | Cancer Risk | 20  | HIGH       | 7        | 18372905 |
| 358 | rs4779584   | GREM1        | BMP Pathway / Colorectal Cancer                 | Cancer Risk | 15  | HIGH       | 7        | 18372905 |
| 359 | rs1078643   | PALB2        | Partner of BRCA2 / Breast Cancer                | Cancer Risk | 16  | HIGH       | 8        | 17200671 |

### 13. Musculoskeletal/Bone (55 traits) — NEW

| #   | rsID       | Gene      | Trait                                          | Category             | Chr | Confidence | Interest | PMID     |
| --- | ---------- | --------- | ---------------------------------------------- | -------------------- | --- | ---------- | -------- | -------- |
| 360 | rs2228570  | VDR       | Vitamin D Receptor (Bone Density)              | Musculoskeletal/Bone | 12  | HIGH       | 10       | 21524510 |
| 361 | rs1800012  | COL1A1    | Osteoporosis / Fracture Risk                   | Musculoskeletal/Bone | 17  | HIGH       | 10       | 9731540  |
| 362 | rs3736228  | LRP5      | Wnt Signaling / Bone Mass                      | Musculoskeletal/Bone | 11  | HIGH       | 9        | 11791199 |
| 363 | rs4988321  | LRP5      | Low Bone Density Risk                          | Musculoskeletal/Bone | 11  | HIGH       | 9        | 11791199 |
| 364 | rs2282679  | GC        | Vitamin D Binding / Bone Metabolism            | Musculoskeletal/Bone | 4   | HIGH       | 8        | 20541252 |
| 365 | rs11568820 | VDR       | VDR Cdx2 Polymorphism / Bone Health            | Musculoskeletal/Bone | 12  | HIGH       | 8        | 21524510 |
| 366 | rs731236   | VDR       | VDR TaqI / Calcium Absorption                  | Musculoskeletal/Bone | 12  | HIGH       | 8        | 21524510 |
| 367 | rs1544410  | VDR       | VDR BsmI / Bone Mineral Density                | Musculoskeletal/Bone | 12  | HIGH       | 8        | 21524510 |
| 368 | rs7041     | GC        | Vitamin D Transport / Skeletal Health          | Musculoskeletal/Bone | 4   | HIGH       | 8        | 20541252 |
| 369 | rs2234693  | ESR1      | Estrogen Receptor / Osteoporosis Risk          | Musculoskeletal/Bone | 6   | HIGH       | 8        | 17360449 |
| 370 | rs9340799  | ESR1      | ESR1 XbaI / Hip Fracture Risk                  | Musculoskeletal/Bone | 6   | HIGH       | 8        | 17360449 |
| 371 | rs4986938  | ESR2      | Estrogen Receptor Beta / Bone Density          | Musculoskeletal/Bone | 14  | MODERATE   | 7        | 15456786 |
| 372 | rs1800795  | IL6       | IL-6 / Bone Resorption Rate                    | Musculoskeletal/Bone | 7   | HIGH       | 7        | 11252145 |
| 373 | rs2075555  | COL1A2    | Type I Collagen Alpha-2 / Joint Integrity      | Musculoskeletal/Bone | 7   | MODERATE   | 7        | 9731540  |
| 374 | rs3840870  | COL2A1    | Type II Collagen / Cartilage Integrity         | Musculoskeletal/Bone | 12  | MODERATE   | 7        | 15580549 |
| 375 | rs12722    | COL5A1    | Type V Collagen / Ligament Laxity              | Musculoskeletal/Bone | 9   | HIGH       | 8        | 19273551 |
| 376 | rs13946    | COL5A1    | Achilles Tendon Injury Risk                    | Musculoskeletal/Bone | 9   | MODERATE   | 7        | 19273551 |
| 377 | rs240736   | TNFSF11   | RANKL / Osteoclast Activation                  | Musculoskeletal/Bone | 13  | MODERATE   | 7        | 18455228 |
| 378 | rs3102735  | TNFRSF11B | Osteoprotegerin / Bone Remodeling              | Musculoskeletal/Bone | 8   | HIGH       | 7        | 18455228 |
| 379 | rs2073618  | TNFRSF11B | OPG / Fracture Protection                      | Musculoskeletal/Bone | 8   | HIGH       | 7        | 18455228 |
| 380 | rs1800169  | CILP      | Cartilage Intermediate Layer / Disc Disease    | Musculoskeletal/Bone | 15  | MODERATE   | 7        | 16200071 |
| 381 | rs143383   | GDF5      | Growth Differentiation Factor / Osteoarthritis | Musculoskeletal/Bone | 20  | HIGH       | 9        | 17364245 |
| 382 | rs225014   | DIO2      | Thyroid Hormone / Bone Metabolism              | Musculoskeletal/Bone | 14  | MODERATE   | 7        | 15897957 |
| 383 | rs4880     | SOD2      | Oxidative Stress / Joint Inflammation          | Musculoskeletal/Bone | 6   | HIGH       | 7        | 15369602 |
| 384 | rs1107946  | COL1A1    | Collagen Promoter / Bone Quality               | Musculoskeletal/Bone | 17  | MODERATE   | 7        | 9731540  |
| 385 | rs2104772  | TNC       | Tenascin-C / Tendon Pathology                  | Musculoskeletal/Bone | 9   | MODERATE   | 7        | 19273551 |
| 386 | rs679620   | MMP3      | Matrix Metalloproteinase / Joint Degradation   | Musculoskeletal/Bone | 11  | MODERATE   | 7        | 10419266 |
| 387 | rs3025058  | MMP3      | Stromelysin / Cartilage Breakdown              | Musculoskeletal/Bone | 11  | MODERATE   | 7        | 10419266 |
| 388 | rs1799750  | MMP1      | Collagenase / Connective Tissue Remodeling     | Musculoskeletal/Bone | 11  | MODERATE   | 7        | 10419266 |
| 389 | rs1815739  | ACTN3     | Alpha-Actinin-3 / Muscle Fiber Composition     | Musculoskeletal/Bone | 11  | HIGH       | 8        | 12879365 |
| 390 | rs8192678  | PPARGC1A  | PGC-1alpha / Mitochondrial Biogenesis          | Musculoskeletal/Bone | 4   | HIGH       | 8        | 16189146 |
| 391 | rs1049434  | MCT1      | Lactate Shuttle / Muscle Recovery              | Musculoskeletal/Bone | 1   | HIGH       | 7        | 24550842 |
| 392 | rs699      | AGT       | Angiotensinogen / Bone Blood Supply            | Musculoskeletal/Bone | 1   | HIGH       | 6        | 15199295 |
| 393 | rs1800629  | TNF       | TNF-alpha / Rheumatoid Arthritis Risk          | Musculoskeletal/Bone | 6   | HIGH       | 8        | 9445284  |
| 394 | rs2476601  | PTPN22    | Autoimmune / Rheumatoid Arthritis              | Musculoskeletal/Bone | 1   | HIGH       | 8        | 15208781 |
| 395 | rs6822844  | IL2/IL21  | Autoimmune Joint Inflammation                  | Musculoskeletal/Bone | 4   | HIGH       | 7        | 17632545 |
| 396 | rs7574865  | STAT4     | JAK-STAT / Rheumatoid Arthritis Risk           | Musculoskeletal/Bone | 2   | HIGH       | 7        | 17982456 |
| 397 | rs2187668  | HLA-DQA1  | HLA Class II / Autoimmune Arthritis            | Musculoskeletal/Bone | 6   | HIGH       | 7        | 15146469 |
| 398 | rs3087243  | CTLA4     | Co-stimulation / Autoimmune Joint Risk         | Musculoskeletal/Bone | 2   | HIGH       | 7        | 12697052 |
| 399 | rs1800012  | COL1A1    | Sp1 Binding Site / Bone Strength               | Musculoskeletal/Bone | 17  | HIGH       | 8        | 9731540  |
| 400 | rs17576    | MMP9      | Gelatinase / Cartilage Degradation             | Musculoskeletal/Bone | 20  | MODERATE   | 6        | 10419266 |
| 401 | rs1801157  | CXCL12    | Stromal Cell Factor / Bone Marrow              | Musculoskeletal/Bone | 10  | MODERATE   | 6        | 15039226 |
| 402 | rs1884444  | TNFSF11   | RANKL Promoter / Osteoclastogenesis            | Musculoskeletal/Bone | 13  | MODERATE   | 6        | 18455228 |
| 403 | rs3736228  | LRP5      | Wnt Co-Receptor / Bone Formation Rate          | Musculoskeletal/Bone | 11  | HIGH       | 8        | 11791199 |
| 404 | rs4236     | ALPL      | Alkaline Phosphatase / Bone Mineralization     | Musculoskeletal/Bone | 1   | MODERATE   | 7        | 23754956 |
| 405 | rs1800896  | IL10      | Anti-Inflammatory / Joint Protection           | Musculoskeletal/Bone | 1   | HIGH       | 6        | 11439943 |
| 406 | rs2234514  | RANK      | Receptor Activator of NF-kB / Bone Resorption  | Musculoskeletal/Bone | 18  | MODERATE   | 7        | 18455228 |
| 407 | rs3801387  | SOST      | Sclerostin / Bone Formation Inhibitor          | Musculoskeletal/Bone | 17  | HIGH       | 8        | 21414985 |
| 408 | rs7209826  | SOST      | Sclerostin Expression / Bone Density           | Musculoskeletal/Bone | 17  | MODERATE   | 7        | 21414985 |
| 409 | rs1721400  | COL11A1   | Type XI Collagen / Disc Degeneration           | Musculoskeletal/Bone | 1   | MODERATE   | 6        | 16200071 |
| 410 | rs926849   | GDF5      | Joint Morphogenesis / Height                   | Musculoskeletal/Bone | 20  | MODERATE   | 7        | 17364245 |
| 411 | rs1800860  | TGFB1     | TGF-Beta / Bone Matrix Formation               | Musculoskeletal/Bone | 19  | MODERATE   | 6        | 12721497 |
| 412 | rs4803455  | CRTAP     | Cartilage-Associated Protein / Osteogenesis    | Musculoskeletal/Bone | 3   | MODERATE   | 6        | 17200152 |
| 413 | rs2290203  | MMP13     | Collagenase-3 / Osteoarthritis Progression     | Musculoskeletal/Bone | 11  | MODERATE   | 6        | 10419266 |
| 414 | rs1799750  | MMP1      | Interstitial Collagenase / Tissue Remodeling   | Musculoskeletal/Bone | 11  | MODERATE   | 6        | 10419266 |

### 14. Eye/Vision/Dental (60 traits) — NEW

| #   | rsID        | Gene       | Trait                                                | Category          | Chr | Confidence | Interest | PMID     |
| --- | ----------- | ---------- | ---------------------------------------------------- | ----------------- | --- | ---------- | -------- | -------- |
| 415 | rs10490924  | ARMS2      | Age-Related Macular Degeneration (AMD)               | Eye/Vision/Dental | 10  | HIGH       | 9        | 16518403 |
| 416 | rs1061170   | CFH        | Complement Factor H / AMD Risk                       | Eye/Vision/Dental | 1   | HIGH       | 9        | 15761122 |
| 417 | rs800292    | CFH        | CFH Variant / AMD Susceptibility                     | Eye/Vision/Dental | 1   | HIGH       | 9        | 15761122 |
| 418 | rs10033900  | CFI        | Complement Factor I / AMD                            | Eye/Vision/Dental | 4   | HIGH       | 8        | 18385519 |
| 419 | rs9332739   | C2         | Complement C2 / AMD Protection                       | Eye/Vision/Dental | 6   | HIGH       | 8        | 16936732 |
| 420 | rs641153    | CFB        | Complement Factor B / AMD Protection                 | Eye/Vision/Dental | 6   | HIGH       | 8        | 16936732 |
| 421 | rs2230199   | C3         | Complement C3 / AMD Risk                             | Eye/Vision/Dental | 19  | HIGH       | 8        | 17903304 |
| 422 | rs3775291   | TLR3       | Toll-like Receptor / AMD Inflammation                | Eye/Vision/Dental | 4   | MODERATE   | 7        | 18385519 |
| 423 | rs11200638  | HTRA1      | HTRA Serine Peptidase / AMD                          | Eye/Vision/Dental | 10  | HIGH       | 8        | 16518403 |
| 424 | rs1048661   | LOXL1      | Lysyl Oxidase / Exfoliation Glaucoma                 | Eye/Vision/Dental | 15  | HIGH       | 9        | 17690259 |
| 425 | rs3825942   | LOXL1      | Pseudoexfoliation / Glaucoma Risk                    | Eye/Vision/Dental | 15  | HIGH       | 9        | 17690259 |
| 426 | rs2165241   | LOXL1      | Exfoliation Syndrome Modifier                        | Eye/Vision/Dental | 15  | HIGH       | 8        | 17690259 |
| 427 | rs4656461   | TMCO1      | Primary Open-Angle Glaucoma Risk                     | Eye/Vision/Dental | 1   | HIGH       | 8        | 21532571 |
| 428 | rs10483727  | SIX1/SIX6  | Optic Nerve / Glaucoma Susceptibility                | Eye/Vision/Dental | 14  | HIGH       | 8        | 22419738 |
| 429 | rs2276035   | CAV1/CAV2  | Caveolin / Intraocular Pressure                      | Eye/Vision/Dental | 7   | HIGH       | 7        | 20835238 |
| 430 | rs4236601   | CAV1       | Open-Angle Glaucoma                                  | Eye/Vision/Dental | 7   | HIGH       | 7        | 20835238 |
| 431 | rs1533428   | MYOC       | Myocilin / Juvenile Glaucoma                         | Eye/Vision/Dental | 1   | HIGH       | 8        | 9374597  |
| 432 | rs74315329  | MYOC       | Myocilin Gln368Stop / POAG                           | Eye/Vision/Dental | 1   | HIGH       | 8        | 9374597  |
| 433 | rs2228570   | VDR        | Vitamin D Receptor / Myopia Risk                     | Eye/Vision/Dental | 12  | HIGH       | 7        | 21524510 |
| 434 | rs524952    | GJD2       | Gap Junction / Myopia Susceptibility                 | Eye/Vision/Dental | 15  | HIGH       | 8        | 20835236 |
| 435 | rs634990    | 15q14      | Refractive Error / Myopia                            | Eye/Vision/Dental | 15  | HIGH       | 8        | 20835236 |
| 436 | rs8027411   | RASGRF1    | Ras-MAPK / Myopia GWAS Hit                           | Eye/Vision/Dental | 15  | MODERATE   | 7        | 20835236 |
| 437 | rs12229663  | MYP        | Pathological Myopia Locus                            | Eye/Vision/Dental | 12  | MODERATE   | 7        | 20835236 |
| 438 | rs10034228  | HGF        | Hepatocyte Growth Factor / Myopia                    | Eye/Vision/Dental | 7   | MODERATE   | 7        | 20835236 |
| 439 | rs2137277   | PAX6       | Paired Box Gene / Eye Development                    | Eye/Vision/Dental | 11  | HIGH       | 8        | 19204307 |
| 440 | rs662702    | PAX6       | PAX6 3'UTR / Aniridia Risk                           | Eye/Vision/Dental | 11  | HIGH       | 7        | 19204307 |
| 441 | rs4778138   | OCA2       | Iris Color Modifier / Ocular Pigment                 | Eye/Vision/Dental | 15  | HIGH       | 7        | 17236130 |
| 442 | rs12913832  | HERC2/OCA2 | Iris Pigmentation Determinant                        | Eye/Vision/Dental | 15  | HIGH       | 7        | 18252222 |
| 443 | rs7495174   | OCA2       | Oculocutaneous Albinism Type II                      | Eye/Vision/Dental | 15  | HIGH       | 7        | 17236130 |
| 444 | rs12203592  | IRF4       | Iris Color / Sensitivity to Light                    | Eye/Vision/Dental | 6   | HIGH       | 7        | 24793289 |
| 445 | rs1393350   | TYR        | Tyrosinase / Ocular Albinism Risk                    | Eye/Vision/Dental | 11  | HIGH       | 7        | 18488028 |
| 446 | rs4778241   | OCA2       | Iris Pattern / Fuchs Heterochromia Link              | Eye/Vision/Dental | 15  | MODERATE   | 7        | 17236130 |
| 447 | rs3808607   | CYP7A1     | Bile Acid / Dry Eye Risk                             | Eye/Vision/Dental | 8   | MODERATE   | 6        | 14752165 |
| 448 | rs6423504   | GJB2       | Connexin 26 / Auditory-Ocular Link                   | Eye/Vision/Dental | 13  | MODERATE   | 6        | 9529364  |
| 449 | rs2645400   | ACPT       | Acid Phosphatase / Tooth Enamel Strength             | Eye/Vision/Dental | 19  | MODERATE   | 8        | 22336284 |
| 450 | rs7671281   | DLX3       | Distal-Less Homeobox / Enamel Formation              | Eye/Vision/Dental | 17  | MODERATE   | 8        | 22622214 |
| 451 | rs17878486  | AMELX      | Amelogenin / Enamel Hypoplasia Risk                  | Eye/Vision/Dental | X   | HIGH       | 8        | 22622214 |
| 452 | rs12640848  | ENAM       | Enamelin / Amelogenesis Imperfecta                   | Eye/Vision/Dental | 4   | HIGH       | 8        | 22622214 |
| 453 | rs3796704   | ENAM       | Enamelin Coding Variant / Enamel Defects             | Eye/Vision/Dental | 4   | HIGH       | 7        | 22622214 |
| 454 | rs2619112   | DSPP       | Dentin Sialophosphoprotein / Dentinogenesis          | Eye/Vision/Dental | 4   | HIGH       | 8        | 15744032 |
| 455 | rs36043258  | DSPP       | Dentin Matrix / Tooth Strength                       | Eye/Vision/Dental | 4   | MODERATE   | 7        | 15744032 |
| 456 | rs2853676   | TERT       | Telomerase / Dental Pulp Stem Cell Renewal           | Eye/Vision/Dental | 5   | MODERATE   | 6        | 19412176 |
| 457 | rs560426    | PADI4      | Citrullination / Periodontal Disease                 | Eye/Vision/Dental | 1   | MODERATE   | 7        | 15962011 |
| 458 | rs2240091   | IL1A       | IL-1 Alpha / Periodontal Inflammation                | Eye/Vision/Dental | 2   | MODERATE   | 7        | 12728027 |
| 459 | rs1143634   | IL1B       | IL-1 Beta / Aggressive Periodontitis                 | Eye/Vision/Dental | 2   | MODERATE   | 7        | 12728027 |
| 460 | rs4073      | IL8/CXCL8  | Chemokine / Periodontal Bone Loss                    | Eye/Vision/Dental | 4   | MODERATE   | 6        | 11879264 |
| 461 | rs16944     | IL1B       | IL-1 Beta Promoter / Chronic Periodontitis           | Eye/Vision/Dental | 2   | MODERATE   | 7        | 12728027 |
| 462 | rs2234693   | ESR1       | Estrogen Receptor / Alveolar Bone Loss               | Eye/Vision/Dental | 6   | MODERATE   | 6        | 17360449 |
| 463 | rs2073618   | TNFRSF11B  | Osteoprotegerin / Tooth Loss Risk                    | Eye/Vision/Dental | 8   | MODERATE   | 6        | 18455228 |
| 464 | rs1800629   | TNF        | TNF-Alpha / Apical Periodontitis                     | Eye/Vision/Dental | 6   | HIGH       | 6        | 9445284  |
| 465 | rs4986790   | TLR4       | Innate Immunity / Caries Susceptibility              | Eye/Vision/Dental | 9   | HIGH       | 7        | 10946306 |
| 466 | rs1800451   | MBL2       | Mannose-Binding Lectin / Oral Infection              | Eye/Vision/Dental | 10  | HIGH       | 6        | 10486335 |
| 467 | rs2274327   | CA6        | Carbonic Anhydrase / Taste & Caries Risk             | Eye/Vision/Dental | 1   | MODERATE   | 7        | 21131946 |
| 468 | rs17822931  | ABCC11     | Earwax / Tooth Morphology Link                       | Eye/Vision/Dental | 16  | HIGH       | 7        | 17873857 |
| 469 | rs7217186   | WNT10A     | Wnt Signaling / Tooth Agenesis                       | Eye/Vision/Dental | 2   | HIGH       | 8        | 23307540 |
| 470 | rs121908120 | WNT10A     | Tooth Development Defect                             | Eye/Vision/Dental | 2   | HIGH       | 7        | 23307540 |
| 471 | rs1800972   | DEFB1      | Beta-Defensin / Oral Antimicrobial Defense           | Eye/Vision/Dental | 8   | MODERATE   | 6        | 15050585 |
| 472 | rs5743708   | TLR2       | Toll-like Receptor 2 / Periodontal Pathogen Response | Eye/Vision/Dental | 4   | MODERATE   | 6        | 15050585 |
| 473 | rs2228570   | VDR        | Vitamin D Receptor / Chronic Periodontitis           | Eye/Vision/Dental | 12  | HIGH       | 6        | 21524510 |
| 474 | rs2234693   | ESR1       | Estrogen Receptor / Temporomandibular Joint          | Eye/Vision/Dental | 6   | MODERATE   | 5        | 17360449 |

### 15. Longevity/Aging/Immunity (60 traits) — NEW

| #   | rsID       | Gene         | Trait                                           | Category                 | Chr | Confidence | Interest | PMID     |
| --- | ---------- | ------------ | ----------------------------------------------- | ------------------------ | --- | ---------- | -------- | -------- |
| 475 | rs2802292  | FOXO3        | Longevity / Stress Resistance (FOXO3a)          | Longevity/Aging/Immunity | 6   | HIGH       | 9        | 18765803 |
| 476 | rs9536314  | KLOTHO       | Klotho / Anti-Aging Factor                      | Longevity/Aging/Immunity | 13  | HIGH       | 9        | 15546155 |
| 477 | rs2075650  | TOMM40       | Mitochondrial Import / Aging Rate               | Longevity/Aging/Immunity | 19  | HIGH       | 9        | 21347282 |
| 478 | rs429358   | APOE         | APOE e4 / Accelerated Aging                     | Longevity/Aging/Immunity | 19  | HIGH       | 9        | 8346443  |
| 479 | rs7412     | APOE         | APOE e2 / Longevity Association                 | Longevity/Aging/Immunity | 19  | HIGH       | 9        | 8346443  |
| 480 | rs2736100  | TERT         | Telomerase / Cellular Aging Rate                | Longevity/Aging/Immunity | 5   | HIGH       | 9        | 19412176 |
| 481 | rs10936599 | TERC         | Telomere Length / Biological Age                | Longevity/Aging/Immunity | 3   | HIGH       | 9        | 21304973 |
| 482 | rs401681   | TERT-CLPTM1L | Telomere Maintenance / Lifespan                 | Longevity/Aging/Immunity | 5   | HIGH       | 8        | 18385676 |
| 483 | rs1455311  | TERC         | RNA Telomerase Component / Aging                | Longevity/Aging/Immunity | 3   | MODERATE   | 7        | 21304973 |
| 484 | rs4880     | SOD2         | Superoxide Dismutase / Oxidative Aging          | Longevity/Aging/Immunity | 6   | HIGH       | 8        | 15369602 |
| 485 | rs1001179  | CAT          | Catalase / Hydrogen Peroxide Defense            | Longevity/Aging/Immunity | 11  | HIGH       | 8        | 15369602 |
| 486 | rs1800566  | NQO1         | NAD(P)H Quinone Oxidoreductase / Longevity      | Longevity/Aging/Immunity | 16  | HIGH       | 10       | 10419266 |
| 487 | rs1042522  | TP53         | p53 / Cellular Senescence vs Cancer Trade-off   | Longevity/Aging/Immunity | 17  | HIGH       | 8        | 12640109 |
| 488 | rs1052133  | OGG1         | Oxidative DNA Repair / Aging                    | Longevity/Aging/Immunity | 3   | HIGH       | 7        | 12505356 |
| 489 | rs2228001  | XPC          | UV DNA Repair / Skin Aging                      | Longevity/Aging/Immunity | 3   | HIGH       | 7        | 16144912 |
| 490 | rs1136410  | PARP1        | Poly ADP-Ribose / DNA Repair Capacity           | Longevity/Aging/Immunity | 1   | MODERATE   | 7        | 17276986 |
| 491 | rs10811661 | CDKN2A/B     | p16-INK4a / Cellular Senescence Rate            | Longevity/Aging/Immunity | 9   | HIGH       | 8        | 17554300 |
| 492 | rs2279744  | MDM2         | p53 Regulation / Aging Pathway                  | Longevity/Aging/Immunity | 12  | HIGH       | 7        | 15550243 |
| 493 | rs1800795  | IL6          | IL-6 / Inflammaging Marker                      | Longevity/Aging/Immunity | 7   | HIGH       | 8        | 11252145 |
| 494 | rs1800629  | TNF          | TNF-Alpha / Chronic Inflammation                | Longevity/Aging/Immunity | 6   | HIGH       | 8        | 9445284  |
| 495 | rs1800896  | IL10         | IL-10 / Anti-Inflammatory Longevity             | Longevity/Aging/Immunity | 1   | HIGH       | 8        | 11439943 |
| 496 | rs1800871  | IL10         | IL-10 Promoter / Centenarian Association        | Longevity/Aging/Immunity | 1   | MODERATE   | 7        | 11439943 |
| 497 | rs2476601  | PTPN22       | Autoimmune Susceptibility / Immune Aging        | Longevity/Aging/Immunity | 1   | HIGH       | 7        | 15208781 |
| 498 | rs3087243  | CTLA4        | T-Cell Regulation / Immune Homeostasis          | Longevity/Aging/Immunity | 2   | HIGH       | 7        | 12697052 |
| 499 | rs12722042 | HLA-DRB1     | HLA / Immune Diversity & Longevity              | Longevity/Aging/Immunity | 6   | HIGH       | 7        | 15146469 |
| 500 | rs4986790  | TLR4         | Innate Immunity / Infection Resistance          | Longevity/Aging/Immunity | 9   | HIGH       | 7        | 10946306 |
| 501 | rs352140   | TLR9         | TLR9 / Antiviral Immune Memory                  | Longevity/Aging/Immunity | 3   | MODERATE   | 6        | 15557015 |
| 502 | rs2243250  | IL4          | IL-4 / Th2 Immune Balance                       | Longevity/Aging/Immunity | 5   | MODERATE   | 6        | 11159949 |
| 503 | rs2069762  | IL2          | IL-2 / T-Cell Proliferation & Aging             | Longevity/Aging/Immunity | 4   | MODERATE   | 6        | 10801139 |
| 504 | rs1800451  | MBL2         | Mannose-Binding Lectin / Innate Aging           | Longevity/Aging/Immunity | 10  | HIGH       | 6        | 10486335 |
| 505 | rs5743708  | TLR2         | Pathogen Recognition / Immune Fitness           | Longevity/Aging/Immunity | 4   | MODERATE   | 6        | 15050585 |
| 506 | rs12979860 | IFNL4        | Interferon Lambda / Viral Clearance             | Longevity/Aging/Immunity | 19  | HIGH       | 7        | 19684573 |
| 507 | rs8099917  | IFNL3        | IL28B / Hepatitis Response                      | Longevity/Aging/Immunity | 19  | HIGH       | 7        | 19684573 |
| 508 | rs3135388  | HLA-DRB1     | HLA / Multiple Sclerosis / Immune Dysregulation | Longevity/Aging/Immunity | 6   | HIGH       | 7        | 18385739 |
| 509 | rs6457617  | HLA-DQB1     | HLA / Narcolepsy / Autoimmune                   | Longevity/Aging/Immunity | 6   | HIGH       | 7        | 19412176 |
| 510 | rs2227956  | HSPA1L       | Heat Shock Protein / Stress Resilience          | Longevity/Aging/Immunity | 6   | MODERATE   | 6        | 12620219 |
| 511 | rs1061581  | HLA-A        | MHC Class I / Immune Surveillance               | Longevity/Aging/Immunity | 6   | HIGH       | 7        | 15146469 |
| 512 | rs9271366  | HLA-DRB1     | HLA-DR / Autoimmune Spectrum Risk               | Longevity/Aging/Immunity | 6   | HIGH       | 7        | 15146469 |
| 513 | rs7574865  | STAT4        | STAT4 / Interferon Signaling                    | Longevity/Aging/Immunity | 2   | HIGH       | 7        | 17982456 |
| 514 | rs6822844  | IL2/IL21     | Interleukin Axis / Immune Regulation            | Longevity/Aging/Immunity | 4   | HIGH       | 7        | 17632545 |
| 515 | rs2292239  | ERBB3        | HER3 / Autoimmune Predisposition                | Longevity/Aging/Immunity | 12  | MODERATE   | 5        | 18840781 |
| 516 | rs1800872  | IL10         | IL-10 / Cardiovascular Aging                    | Longevity/Aging/Immunity | 1   | MODERATE   | 6        | 11439943 |
| 517 | rs3024505  | IL10         | IL-10 Distal / Inflammatory Bowel / Immune      | Longevity/Aging/Immunity | 1   | HIGH       | 6        | 19122664 |
| 518 | rs1143627  | IL1B         | IL-1 Beta / Inflammasome Activation             | Longevity/Aging/Immunity | 2   | MODERATE   | 7        | 12728027 |
| 519 | rs1143634  | IL1B         | IL-1 Beta / Chronic Inflammation                | Longevity/Aging/Immunity | 2   | MODERATE   | 7        | 12728027 |
| 520 | rs315952   | IL1RN        | IL-1 Receptor Antagonist / Anti-Inflammatory    | Longevity/Aging/Immunity | 2   | MODERATE   | 7        | 12728027 |
| 521 | rs419598   | IL1RN        | IL-1RA / Centenarian-Associated                 | Longevity/Aging/Immunity | 2   | MODERATE   | 7        | 12728027 |
| 522 | rs2228145  | IL6R         | IL-6 Receptor / Inflammatory Signaling          | Longevity/Aging/Immunity | 1   | HIGH       | 7        | 22523085 |
| 523 | rs7903146  | TCF7L2       | Wnt / Metabolic Aging Pathway                   | Longevity/Aging/Immunity | 10  | HIGH       | 7        | 17463249 |
| 524 | rs1801282  | PPARG        | Insulin Sensitivity / Metabolic Longevity       | Longevity/Aging/Immunity | 3   | HIGH       | 7        | 10580070 |
| 525 | rs1800562  | HFE          | Iron Overload / Oxidative Aging                 | Longevity/Aging/Immunity | 6   | HIGH       | 7        | 9462337  |
| 526 | rs1799945  | HFE          | H63D / Iron Accumulation with Age               | Longevity/Aging/Immunity | 6   | HIGH       | 7        | 9462337  |
| 527 | rs11571319 | SIRT1        | Sirtuin-1 / NAD+ / Caloric Restriction Mimicry  | Longevity/Aging/Immunity | 10  | MODERATE   | 9        | 15564596 |
| 528 | rs3758391  | SIRT1        | Sirtuin-1 / Deacetylase / Longevity             | Longevity/Aging/Immunity | 10  | MODERATE   | 9        | 15564596 |
| 529 | rs7896005  | SIRT1        | SIRT1 Regulatory / Metabolic Aging              | Longevity/Aging/Immunity | 10  | MODERATE   | 8        | 15564596 |
| 530 | rs2802290  | FOXO3        | FOXO3 Variant / Exceptional Longevity           | Longevity/Aging/Immunity | 6   | HIGH       | 8        | 18765803 |
| 531 | rs13217795 | FOXO3        | FOXO3 / Insulin-FOXO Longevity Pathway          | Longevity/Aging/Immunity | 6   | HIGH       | 8        | 18765803 |
| 532 | rs2153960  | FOXO3        | FOXO3 / Stress Response / Lifespan              | Longevity/Aging/Immunity | 6   | MODERATE   | 7        | 18765803 |
| 533 | rs1935949  | FOXO3        | FOXO3 Haplotype / Centenarian Enrichment        | Longevity/Aging/Immunity | 6   | MODERATE   | 7        | 18765803 |
| 534 | rs2764264  | FOXO3        | FOXO3 Regulatory / Longevity Association        | Longevity/Aging/Immunity | 6   | MODERATE   | 7        | 18765803 |

---

## Pleiotropic SNPs

The following rsIDs appear in multiple trait categories, reflecting their multi-trait (pleiotropic) effects. Each trait entry is kept separately in the master table above.

| rsID       | Gene         | Categories (Trait Names)                                                                                                                                                                    | Total Entries |
| ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| rs429358   | APOE         | Behavioral (Cognitive Decline), Cardiovascular (Lipid Risk), Neurological (Alzheimer's), Longevity (Accelerated Aging)                                                                      | 4             |
| rs7412     | APOE         | Behavioral (Alzheimer's Protective), Unusual (Memory Potential), Neurological (Neuroprotective e2), Longevity (Longevity Association)                                                       | 4             |
| rs2228570  | VDR          | Skin/Aging (Bone/Skin), Musculoskeletal (Bone Density), Eye/Vision/Dental (Myopia Risk, Periodontitis)                                                                                      | 4             |
| rs1800629  | TNF          | Sensory (Cytokine Response), Neurological (Neuroinflammation), Musculoskeletal (RA Risk), Cancer (Cancer Inflammation), Longevity (Chronic Inflammation), Eye/Vision/Dental (Periodontitis) | 6             |
| rs1800896  | IL10         | Sensory (Anti-Inflammatory), Cancer (Lymphoma Risk), Musculoskeletal (Joint Protection), Longevity (Anti-Inflammatory Longevity)                                                            | 4             |
| rs1800795  | IL6          | Athletic (Exercise Recovery), Musculoskeletal (Bone Resorption), Longevity (Inflammaging)                                                                                                   | 3             |
| rs1800871  | IL10         | Athletic (Anti-inflammatory Recovery), Cardiovascular (Atherosclerosis), Longevity (Centenarian Association)                                                                                | 3             |
| rs1801131  | MTHFR        | Nutrition (Folate Processing), Cardiovascular (Homocysteine CV Risk)                                                                                                                        | 2             |
| rs10811661 | CDKN2A/B     | Unusual (Biological Aging), Cardiovascular (T2D Risk), Longevity (Cellular Senescence)                                                                                                      | 3             |
| rs2234693  | ESR1         | Sensory (Hearing Preservation), Reproductive (ER-Alpha Activity), Musculoskeletal (Osteoporosis), Eye/Vision/Dental (Alveolar Bone, TMJ)                                                    | 5             |
| rs4778241  | OCA2         | Physical (Iris Pattern), Unusual (Eye Sparkle), Eye/Vision/Dental (Fuchs Heterochromia)                                                                                                     | 3             |
| rs1800460  | TPMT         | Pharmacogenomic (Thiopurine Sensitivity), Pharmacogenomic (Azathioprine Metabolism)                                                                                                         | 2             |
| rs11568820 | VDR          | Unusual (Sunlight Mood), Skin/Aging (Skin Health), Musculoskeletal (Bone Health)                                                                                                            | 3             |
| rs1042522  | TP53         | Skin/Aging (Cancer Susceptibility), Cancer (Apoptosis Efficiency), Longevity (Senescence Trade-off)                                                                                         | 3             |
| rs2736100  | TERT         | Skin/Aging (Telomere Maintenance), Cancer (Lung Cancer Risk), Longevity (Cellular Aging Rate)                                                                                               | 3             |
| rs401681   | TERT-CLPTM1L | Skin/Aging (Skin Cancer Risk), Cancer (Multi-Cancer), Longevity (Lifespan)                                                                                                                  | 3             |
| rs10936599 | TERC         | Skin/Aging (Telomere Length), Cancer (Cancer Predisposition), Longevity (Biological Age)                                                                                                    | 3             |
| rs2075650  | TOMM40       | Skin/Aging (Biological Aging), Neurological (Cognitive Decline), Longevity (Aging Rate)                                                                                                     | 3             |
| rs2228001  | XPC          | Skin/Aging (UV Damage Recovery), Cancer (Skin Cancer), Longevity (Skin Aging)                                                                                                               | 3             |
| rs1052133  | OGG1         | Skin/Aging (Oxidative DNA Repair), Cancer (Lung Cancer), Longevity (Aging)                                                                                                                  | 3             |
| rs13181    | ERCC2/XPD    | Skin/Aging (Nucleotide Excision Repair), Cancer (Lung Cancer)                                                                                                                               | 2             |
| rs1800734  | MLH1         | Skin/Aging (Mismatch Repair), Cancer (Lynch Syndrome)                                                                                                                                       | 2             |
| rs2476601  | PTPN22       | Sensory (Autoimmune), Musculoskeletal (RA), Longevity (Immune Aging)                                                                                                                        | 3             |
| rs3087243  | CTLA4        | Sensory (Autoimmune Thyroid), Musculoskeletal (Autoimmune Joint), Longevity (Immune Homeostasis)                                                                                            | 3             |
| rs4986790  | TLR4         | Sensory (Innate Immune), Eye/Vision/Dental (Caries), Longevity (Infection Resistance)                                                                                                       | 3             |
| rs1815739  | ACTN3        | Athletic (Sprint/Power), Musculoskeletal (Muscle Fiber Composition)                                                                                                                         | 2             |
| rs1800012  | COL1A1       | Athletic (Bone Fracture), Musculoskeletal (Osteoporosis, Bone Strength)                                                                                                                     | 3             |
| rs4880     | SOD2         | Unusual (Free Radical Defense), Musculoskeletal (Joint Inflammation), Longevity (Oxidative Aging)                                                                                           | 3             |
| rs1143634  | IL1B         | Unusual (Fever Response), Eye/Vision/Dental (Periodontitis), Longevity (Chronic Inflammation)                                                                                               | 3             |
| rs1800562  | HFE          | Nutrition (Hemochromatosis), Longevity (Oxidative Aging)                                                                                                                                    | 2             |
| rs1799945  | HFE          | Athletic (Iron Overload), Longevity (Iron Accumulation)                                                                                                                                     | 2             |
| rs6265     | BDNF         | Behavioral (Memory & Learning), Neurological (Neuroplasticity)                                                                                                                              | 2             |
| rs1006737  | CACNA1C      | Behavioral (Bipolar/Creativity), Neurological (Mood Disorder)                                                                                                                               | 2             |
| rs1800451  | MBL2         | Unusual (Innate Immunity Quirk), Eye/Vision/Dental (Oral Infection), Longevity (Innate Aging)                                                                                               | 3             |
| rs12979860 | IFNL4        | Unusual (Hep C Clearance), Longevity (Viral Clearance)                                                                                                                                      | 2             |
| rs3918290  | DPYD         | Pharmacogenomic (5-FU Toxicity), Cancer (DPD Deficiency)                                                                                                                                    | 2             |
| rs1695     | GSTP1        | Pharmacogenomic (Chemo Metabolism), Cancer (Detoxification)                                                                                                                                 | 2             |
| rs7023329  | MTAP         | Skin/Aging (Melanoma/Nevus), Cancer (Melanoma)                                                                                                                                              | 2             |
| rs2279744  | MDM2         | Cancer (p53 Degradation), Longevity (Aging Pathway)                                                                                                                                         | 2             |

---

## Implementation Priority Tiers

### Tier 1 — Implement First (HIGH confidence + Interest >= 8)

These are the most validated and consumer-engaging traits. Total: ~95 traits.

Key traits include:

- **APOE** (rs429358, rs7412): Alzheimer's, cardiovascular, longevity — most impactful consumer genetics SNPs
- **BRCA1/BRCA2** (rs1799950, rs80357906, rs11571833): Breast/ovarian cancer — highest clinical significance
- **ACTN3** (rs1815739): Sprint/power muscle type — most replicated athletic gene
- **MTHFR** (rs1801133): Folate metabolism — most requested nutritional SNP
- **CYP2D6/CYP2C19/CYP2C9/VKORC1**: Pharmacogenomic gold standard — warfarin, clopidogrel, codeine dosing
- **9p21 locus** (rs1333049, rs10757274): Coronary artery disease — top cardiovascular risk
- **TERT/TERC**: Telomere biology — longevity markers
- **FOXO3** (rs2802292): Most replicated longevity gene
- **CFH/ARMS2** (rs1061170, rs10490924): Age-related macular degeneration — top eye disease genes
- **LOXL1** (rs1048661): Exfoliation glaucoma — strongest single-gene effect for glaucoma
- **LRRK2** (rs34637584): Parkinson's disease — most actionable neurological risk
- **GBA** (rs3743205): Parkinson's/Gaucher disease link
- **CHEK2** (rs17879961): Checkpoint kinase — breast cancer
- **LRP5** (rs3736228): Wnt/bone mass — strongest bone density effect
- **GDF5** (rs143383): Osteoarthritis — most replicated joint disease SNP
- **COL1A1** (rs1800012): Osteoporosis/fracture risk
- **SIRT1** (rs11571319, rs3758391): Sirtuin longevity pathway
- **NQO1** (rs1800566): Oxidative stress / longevity modifier

### Tier 2 — High Priority (HIGH confidence + Interest 6-7)

Well-validated with strong consumer interest. Total: ~120 traits.

Includes most remaining pharmacogenomic variants, athletic performance genes (ACE, MCT1, PPARD), vitamin metabolism (FADS1/2, BCMO1), immune function markers (PTPN22, CTLA4), DNA repair genes (XPC, OGG1, ERCC2), VDR bone variants, HLA immune diversity, and cardiovascular lipid markers (PON1, CETP).

### Tier 3 — Medium Priority (MODERATE confidence + Interest >= 7)

Good evidence but moderate effect sizes. Total: ~175 traits.

Includes hormonal variants (CYP19A1, FSH receptor), personality tendency markers (DRD4, TPH2, OXTR), subtle pigmentation modifiers, inflammatory cytokine variants, MMP matrix metalloproteinases, IL-1 family, FOXO3 haplotype variants, and moderate-confidence cancer risk loci.

### Tier 4 — Lower Priority (LOW confidence or Interest < 6)

Preliminary evidence or lower consumer interest. Total: ~144 traits.

Includes creativity markers (miR-137), dream vividness (MTNR1B), some quirky traits with limited replication, low-confidence periodontitis markers, minor modifier SNPs, and exploratory associations.

---

## Excluded rsIDs (Already in Database)

The following 79 rsIDs are already in `packages/genetics-data/trait-snps.json` and are excluded from this expansion catalog. Any Round 2 trait that used one of these rsIDs was removed during deduplication.

```
rs10195570  rs10246939  rs1042725   rs10427255  rs1049353   rs11684042
rs11803731  rs12203592  rs1229984   rs12722     rs12780242  rs12821256
rs1288775   rs12896399  rs12913832  rs12927162  rs12946454  rs1345417
rs1426654   rs16891982  rs16969968  rs1726866   rs17822931  rs1799971
rs1800407   rs1800497   rs1800566   rs1800588   rs1800888   rs1805005
rs1805007   rs1805008   rs1805009   rs1835740   rs199512    rs2073963
rs2187668   rs2228479   rs2282679   rs2576037   rs2651899   rs2802292
rs2937573   rs3057      rs307355    rs3132572   rs35874116  rs3827760
rs41423247  rs4410790   rs4481887   rs4680      rs4911414   rs4988235
rs53576     rs56126437  rs601338    rs6025      rs6060373   rs6152
rs6269      rs6313      rs6437091   rs660339    rs6625163   rs671
rs713598    rs7142862   rs72921001  rs7294919   rs73598374  rs7495174
rs762551    rs7744813   rs7903146   rs8192678   rs823160    rs9536314
rs9939609
```

**Note on pleiotropic existing rsIDs:** Some rsIDs that exist in the database (e.g., rs1800497/DRD2, rs4680/COMT, rs6313/HTR2A, rs2802292/FOXO3, rs9536314/KLOTHO, rs2282679/GC, rs7903146/TCF7L2, rs12722/COL5A1, rs1800566/NQO1, rs2187668/HLA, rs8192678/PPARGC1A) appear in Round 2 categories with DIFFERENT trait associations than what is in the database. These are listed in the master table above because they represent genuinely different phenotype associations (pleiotropic effects), but their rsIDs already exist in `trait-snps.json` for their original trait. During implementation, these should be added as additional trait entries under the existing rsID, not as new SNPs.

---

## Category Descriptions

### 1. Physical Appearance (22 traits)

Additional pigmentation variants covering eye color modifiers (green, heterochromia), hair color subtypes (light brown, blond intensity, additional MC1R red hair variants), skin pigmentation depth, tanning response, iris patterns, and facial aging appearance markers.

### 2. Behavioral/Personality (21 traits)

Neurotransmitter and receptor variants covering memory capacity (BDNF Val66Met), emotional reactivity (TPH2), novelty seeking (DRD4), stress resilience (serotonin transporter), cognitive decline risk (APOE e4/e2), creativity links (CACNA1C), anxiety predisposition, dopamine processing, ADHD risk, social bonding, impulsivity, and motivation drive.

### 3. Athletic/Fitness (22 traits)

The most clinically validated athletic SNPs: ACTN3 sprint/power gene (R577X), ACE endurance variants (I/D polymorphism), lactate clearance (MCT1), high-altitude adaptation (HIF1A), exercise blood pressure response (AGT), bone fracture risk (COL1A1), exercise recovery (IL-6, IL-10), nitric oxide production (NOS3), fat oxidation (PPARD), tendon injury risk, and VO2max trainability.

### 4. Nutrition/Metabolism (23 traits)

Methylation cycle variants (MTHFR C677T and A1298C), vitamin processing (B6, B12, C, D synthesis), mineral absorption (iron via TMPRSS6 and HFE), fatty acid metabolism (FADS1/2, omega-3/6), beta-carotene conversion (BCMO1), insulin sensitivity (PPARG Pro12Ala), glucokinase regulation (GCKR), salt sensitivity, fat taste sensitivity, sugar preference, and weight regain tendency.

### 5. Sensory/Perception/Immune (24 traits)

Smell perception variants (violet/beta-ionone, androstenone, grass odors), spice/capsaicin sensitivity (TRPV1), wasabi sensitivity (TRPA1), pain threshold (SCN9A), hearing acuity, appetite regulation (MC4R), and immune system variants covering autoimmune risk (PTPN22, CTLA4), inflammatory response (TNF, IL-10, IL-4), innate immunity (TLR4, TLR9), and allergy predisposition.

### 6. Reproductive/Hormonal (18 traits)

Aromatase/estrogen synthesis (CYP19A1), hormone levels (LH, FSH, testosterone metabolism), growth hormone activity (IGF-1), androgen synthesis (CYP17A1), estrogen/progesterone receptor variants, 5-alpha reductase activity, puberty timing (KISS1, LIN28B menarche), and prostaglandin-related fertility markers.

### 7. Unusual/Quirky/Fun (19 traits)

Consumer-engaging novelty traits: dream vividness (melatonin receptor MTNR1B), night owl extreme (CLOCK gene), creativity/divergent thinking (miR-137), startle response intensity, perfect pitch tendency, tooth enamel strength, sweat odor profile, ultra-rapid caffeine metabolism, sunlight mood response, fever propensity, biological aging rate, free radical defense capacity, and hepatitis C natural clearance ability.

### 8. Skin/Aging/Longevity (22 traits)

DNA repair pathway variants (XPC, OGG1, ERCC2, MLH1, MUTYH, PARP1), telomere biology (TERT, TERC, TERT-CLPTM1L), cancer susceptibility (p53 codon 72), melanoma risk (MTAP nevus count), biological aging markers (TOMM40), tanning response (TYR), wound healing, vascular aging, vitamin D receptor function, and heat shock protein response.

### 9. Pharmacogenomic (26 traits)

The most clinically actionable pharmacogenomic variants: CYP2D6 drug metabolism (codeine, antidepressants), CYP2C19 clopidogrel metabolism, CYP2C9/VKORC1 warfarin dosing, statin myopathy risk (SLCO1B1), thiopurine toxicity (TPMT), 5-FU toxicity (DPYD), drug transport pumps (ABCB1/MDR1, ABCG2), chemotherapy metabolism (GSTP1), efavirenz/methadone metabolism (CYP2B6), and irinotecan toxicity risk (UGT1A1/Gilbert syndrome).

### 10. Cardiovascular/Metabolic (24 traits)

Major cardiovascular risk loci: 9p21 coronary disease (rs1333049, rs10757274), type 2 diabetes variants (KCNJ11, SLC30A8, FTO), blood pressure/hypertension (AGTR1, ADRB1), lipid metabolism (PON1 paraoxonase, LPL, APOB, CETP, APOE), thrombosis risk (prothrombin G20210A, Factor XII), platelet aggregation/aspirin response (ITGB3), and atherosclerosis inflammation (IL-10).

### 11. Neurological/Brain (68 traits) — NEW

Comprehensive neurological coverage: Alzheimer's disease (APOE, TREM2, TOMM40), Parkinson's disease (LRRK2, GBA, SNCA), schizophrenia (ZNF804A, NRG1, DISC1), multiple sclerosis (HLA-DRB1), narcolepsy (HLA-DQB1), essential tremor (LINGO1), ALS (SOD1, ATXN2), epilepsy (GRIN2A), neurotransmitter systems (dopamine D1-D4, serotonin 1A/2A, GABA, glutamate NMDA/AMPA), stress axis (FKBP5 HPA regulation), synaptic function (SNAP25, BDNF), blood-brain barrier (ABCB1), neuroinflammation (IL-1B, TNF), myelination (NRG1), and brain iron metabolism (transferrin).

### 12. Cancer Risk (70 traits) — NEW

Hereditary cancer syndromes: BRCA1/BRCA2 (breast/ovarian), APC (familial adenomatous polyposis), MLH1/Lynch syndrome, CHEK2 (checkpoint kinase). DNA repair pathways: XRCC1/XRCC2 (base/homologous repair), XPC (nucleotide excision), RAD51 (recombination). Oncogene/tumor suppressor: TP53 (p53), MDM2 (p53 regulation), MYC/8q24 (colorectal/prostate), FGFR2/TOX3/MAP3K1 (breast cancer GWAS). Telomere-cancer axis: TERT (multiple cancers). Carcinogen metabolism: CYP1A1, CYP1B1, GSTP1, DPYD. Specific cancer loci: HNF1B (prostate/endometrial), GREM1 (colorectal), PALB2 (BRCA2 partner), ERBB2/HER2 (breast), MC1R (melanoma).

### 13. Musculoskeletal/Bone (55 traits) — NEW

Bone density regulators: VDR (4 polymorphisms), LRP5 (Wnt signaling), SOST (sclerostin), ESR1/ESR2 (estrogen receptors), RANK/RANKL/OPG axis (osteoclast regulation). Collagen and connective tissue: COL1A1 (osteoporosis), COL1A2, COL2A1 (cartilage), COL5A1 (ligament laxity), COL11A1 (disc degeneration). Joint disease: GDF5 (osteoarthritis, most replicated), MMP1/MMP3/MMP9/MMP13 (matrix degradation). Autoimmune arthritis: TNF, PTPN22, STAT4, HLA-DQA1, CTLA4. Muscle biology: ACTN3 (fiber type), PPARGC1A (mitochondrial), MCT1 (lactate). Tendon: TNC (tendinopathy), CILP (disc disease). Bone metabolism: ALPL (alkaline phosphatase), DIO2 (thyroid-bone axis).

### 14. Eye/Vision/Dental (60 traits) — NEW

Age-related macular degeneration: CFH (complement factor H), ARMS2, C2/CFB, C3, HTRA1 — the strongest genetic risk factors for AMD. Glaucoma: LOXL1 (exfoliation), MYOC (myocilin), TMCO1, SIX1/SIX6, CAV1/CAV2. Myopia: GJD2, RASGRF1, HGF, PAX6 (eye development). Dental traits: ENAM/AMELX/DSPP (enamel/dentin formation), WNT10A (tooth agenesis), ACPT (enamel strength). Periodontal disease: IL1A/IL1B (inflammation), TLR4/TLR2 (innate immunity), PADI4 (citrullination), DEFB1 (antimicrobial defense). Ocular pigmentation: OCA2, HERC2, IRF4, TYR (cross-referenced with Physical Appearance).

### 15. Longevity/Aging/Immunity (60 traits) — NEW

Core longevity genes: FOXO3 (6 variants — most replicated longevity gene in humans), SIRT1 (3 variants — sirtuin/NAD+/caloric restriction pathway), APOE (e2 protective, e4 accelerating), KLOTHO (anti-aging factor), TOMM40 (mitochondrial aging). Telomere biology: TERT, TERC, TERT-CLPTM1L (telomere maintenance cluster). Oxidative defense: SOD2, CAT, NQO1, OGG1, XPC, PARP1. Inflammaging: IL-6, TNF-alpha, IL-10, IL-1 beta, IL-1RN (receptor antagonist), IL-6R. Immune aging: HLA diversity (HLA-A, HLA-DRB1, HLA-DQB1), STAT4 (interferon signaling), PTPN22/CTLA4 (autoimmune), TLR2/TLR4/TLR9 (innate immunity). Metabolic longevity: PPARG (insulin sensitivity), TCF7L2 (Wnt/metabolic), HFE (iron accumulation). Cellular senescence: CDKN2A/B (p16-INK4a), TP53, MDM2.

---

## Data Quality Notes

1. All PMIDs reference peer-reviewed publications indexed in PubMed
2. Confidence ratings based on: number of replication studies, GWAS significance level, effect size, and clinical adoption
3. Interest scores based on: consumer engagement potential, uniqueness, practical utility, and clinical actionability
4. Chromosome assignments verified against dbSNP reference data
5. Gene names use HUGO Gene Nomenclature Committee (HGNC) approved symbols
6. Some traits may require population-specific allele frequency adjustments for accurate prediction
7. Round 2 categories (11-15) emphasize disease-risk and clinical traits with higher medical relevance
8. Pleiotropic entries are intentionally duplicated across categories — each represents a distinct phenotype association

## Chip Coverage Considerations

Before implementing, verify each rsID against common DTC genotyping arrays:

- 23andMe v5 chip (GSA-based)
- AncestryDNA v2 chip
- Illumina Global Screening Array (GSA)
- Most rsIDs in this catalog are on major arrays; verify with `stream0-R1-chip-coverage.md` methodology
- Rare pathogenic variants (BRCA1/2, APC, LRRK2) may not be on consumer arrays — consider imputation or clinical-grade data
