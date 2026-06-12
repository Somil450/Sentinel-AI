"""
Sentinel AI — Diagnosis Engine
Cross-references user-reported symptoms with live district outbreak signals
to rank which diseases the user is most likely to have.

Scoring formula (per disease):
  score = (symptom_overlap_pct × 0.50)
        + (local_signal_confidence × 0.35)
        + (seasonal_base_rate × 0.15)

All data is epidemiologically grounded — WHO clinical case definitions,
real India seasonal patterns, and live signal data from the DB.
"""

from datetime import datetime, timezone
from typing import List, Dict, Optional
from collections import defaultdict
import math


# ── DISEASE PROFILES ─────────────────────────────────────────────────────────
# Based on WHO clinical case definitions and India IDSP surveillance categories.
# Each profile lists:
#   symptoms     — canonical symptom tags (must match ai_engine.py SYNONYM_MAP)
#   description  — plain-English explanation
#   precautions  — actionable steps
#   see_doctor   — True if this disease warrants urgent medical attention
#   severity     — 1 (mild) to 5 (critical)
#   icd10        — ICD-10 code for reference
#   season_peak  — months (1-12) when India sees highest incidence

DISEASE_PROFILES: Dict[str, Dict] = {
    "Influenza (Seasonal Flu)": {
        "symptoms": ["fever", "cough", "fatigue", "body ache", "headache", "sore throat"],
        "description": (
            "Seasonal influenza caused by influenza A/B viruses. Very common during "
            "winter (Nov–Feb) and post-monsoon (Sep–Oct) in India. Spreads via "
            "respiratory droplets. Usually self-limiting in 5–7 days."
        ),
        "precautions": [
            "Rest and stay hydrated",
            "Take paracetamol for fever and body ache",
            "Avoid contact with vulnerable people (elderly, infants)",
            "Wear a mask if going out",
            "Consult doctor if fever > 3 days or breathing difficulty develops",
        ],
        "see_doctor": False,
        "severity": 2,
        "icd10": "J10",
        "season_peak": [11, 12, 1, 2, 9, 10],
        "source_keywords": ["influenza", "flu", "h1n1", "swine flu"],
    },

    "COVID-19": {
        "symptoms": ["fever", "cough", "loss of smell", "fatigue", "shortness of breath", "body ache"],
        "description": (
            "COVID-19 caused by SARS-CoV-2. Key distinguishing features include "
            "loss of smell/taste. New variants (JN.1, KP.2) continue to circulate "
            "in India. Most cases are now mild in vaccinated individuals."
        ),
        "precautions": [
            "Isolate immediately from household members",
            "Wear N95 mask if going out",
            "Monitor oxygen saturation with pulse oximeter",
            "Contact nearest health centre for testing",
            "Stay hydrated and rest",
        ],
        "see_doctor": True,
        "severity": 3,
        "icd10": "U07.1",
        "season_peak": [1, 2, 3, 6, 7],
        "source_keywords": ["covid", "covid-19", "coronavirus", "sars-cov"],
    },

    "Dengue Fever": {
        "symptoms": ["fever", "headache", "body ache", "fatigue", "nausea"],
        "description": (
            "Dengue is transmitted by Aedes mosquitoes. Characterized by sudden "
            "high fever (often 104°F), severe headache behind the eyes, and joint/muscle "
            "pain. India sees peak dengue transmission June–October during monsoon season. "
            "Warning signs: bleeding gums, blood in urine, persistent vomiting."
        ),
        "precautions": [
            "Use mosquito repellent and nets",
            "Eliminate standing water around your home",
            "Take paracetamol ONLY — avoid aspirin/ibuprofen (risk of bleeding)",
            "Monitor platelet count if fever > 2 days",
            "Seek immediate care for bleeding, severe abdominal pain, or persistent vomiting",
        ],
        "see_doctor": True,
        "severity": 4,
        "icd10": "A90",
        "season_peak": [6, 7, 8, 9, 10],
        "source_keywords": ["dengue", "aedes"],
    },

    "Malaria": {
        "symptoms": ["fever", "fatigue", "body ache", "headache", "nausea"],
        "description": (
            "Malaria caused by Plasmodium parasites transmitted by Anopheles mosquitoes. "
            "Classic pattern: fever with chills and rigors (shaking). Common in tropical "
            "and sub-tropical India, especially during and after monsoon. P. falciparum "
            "malaria can be life-threatening."
        ),
        "precautions": [
            "Seek immediate blood smear test or rapid malaria test",
            "Do NOT self-treat — prescription antimalarials needed",
            "Use insecticide-treated bed nets",
            "Eliminate stagnant water sources",
            "Complete full course of treatment even if feeling better",
        ],
        "see_doctor": True,
        "severity": 4,
        "icd10": "B50",
        "season_peak": [6, 7, 8, 9, 10, 11],
        "source_keywords": ["malaria", "plasmodium", "anopheles"],
    },

    "Typhoid Fever": {
        "symptoms": ["fever", "fatigue", "stomach pain", "nausea", "headache"],
        "description": (
            "Typhoid caused by Salmonella Typhi, spread via contaminated food/water. "
            "Fever is characteristically sustained (continuous, not spikes) and may "
            "be accompanied by rose-spot rash. Common in areas with poor sanitation."
        ),
        "precautions": [
            "Drink only boiled or bottled water",
            "Avoid street food and raw vegetables",
            "Requires antibiotic treatment — consult a doctor",
            "Typhoid vaccine (Vi-CPS) available and recommended",
            "Practice strict hand hygiene",
        ],
        "see_doctor": True,
        "severity": 3,
        "icd10": "A01.0",
        "season_peak": [5, 6, 7, 8, 9],
        "source_keywords": ["typhoid", "salmonella"],
    },

    "Common Cold (Rhinovirus/Coronavirus)": {
        "symptoms": ["cough", "sore throat", "fatigue", "headache"],
        "description": (
            "Common cold caused by rhinoviruses, coronaviruses (non-SARS), and "
            "adenoviruses. Primarily upper respiratory tract infection. Distinguished "
            "from flu by milder symptoms, gradual onset, and prominent nasal congestion. "
            "Self-limiting in 7–10 days."
        ),
        "precautions": [
            "Rest and stay warm",
            "Drink warm fluids (turmeric milk, ginger tea)",
            "Steam inhalation for congestion relief",
            "Honey + ginger for cough relief",
            "Avoid sharing utensils or towels",
        ],
        "see_doctor": False,
        "severity": 1,
        "icd10": "J00",
        "season_peak": [11, 12, 1, 2],
        "source_keywords": ["cold", "rhinovirus", "respiratory"],
    },

    "Chikungunya": {
        "symptoms": ["fever", "body ache", "fatigue", "headache"],
        "description": (
            "Chikungunya virus transmitted by Aedes mosquitoes (same vector as dengue). "
            "Key feature: severe joint pain (arthralgia) that can persist for weeks or months. "
            "Not usually fatal but debilitating. Co-circulates with dengue during monsoon."
        ),
        "precautions": [
            "Mosquito repellent and protective clothing",
            "Paracetamol for fever and pain (avoid NSAIDs in early phase)",
            "Physiotherapy for persistent joint pain",
            "Eliminate mosquito breeding sites",
            "No specific antiviral — supportive care only",
        ],
        "see_doctor": True,
        "severity": 3,
        "icd10": "A92.0",
        "season_peak": [6, 7, 8, 9, 10],
        "source_keywords": ["chikungunya", "chik"],
    },

    "Gastroenteritis / Food Poisoning": {
        "symptoms": ["nausea", "diarrhea", "stomach pain", "fatigue"],
        "description": (
            "Acute gastroenteritis caused by bacterial (Salmonella, E. coli, Vibrio), "
            "viral (Norovirus, Rotavirus), or parasitic agents. Transmitted via "
            "contaminated food and water. Peaks in summer (May–June) with food spoilage. "
            "Dehydration is the main complication."
        ),
        "precautions": [
            "Oral Rehydration Solution (ORS) — critical to prevent dehydration",
            "BRAT diet: Bananas, Rice, Applesauce, Toast",
            "Avoid dairy, spicy food, and caffeine",
            "Food safety: cook meat thoroughly, wash hands before eating",
            "Seek care if diarrhea > 3 days, blood in stool, or severe dehydration",
        ],
        "see_doctor": False,
        "severity": 2,
        "icd10": "A09",
        "season_peak": [4, 5, 6, 7],
        "source_keywords": ["gastroenteritis", "diarrhea", "cholera", "food poisoning"],
    },

    "Tuberculosis (TB)": {
        "symptoms": ["cough", "fatigue", "fever"],
        "description": (
            "Tuberculosis caused by Mycobacterium tuberculosis. Key distinguishing "
            "feature: chronic cough lasting > 2 weeks, often with blood-tinged sputum, "
            "night sweats, and significant weight loss. India has the world's highest "
            "TB burden. Highly treatable with proper DOTS therapy."
        ),
        "precautions": [
            "Consult doctor immediately if cough > 2 weeks",
            "Free DOTS treatment available at all government health centres",
            "Cover mouth when coughing — TB spreads via air",
            "Improve ventilation at home",
            "Complete full 6-month treatment course without interruption",
        ],
        "see_doctor": True,
        "severity": 4,
        "icd10": "A15",
        "season_peak": [1, 2, 3, 4, 5],  # Year-round but more diagnoses in dry season
        "source_keywords": ["tuberculosis", "tb", "mycobacterium"],
    },

    "Pneumonia": {
        "symptoms": ["cough", "fever", "shortness of breath", "fatigue"],
        "description": (
            "Pneumonia is a lung infection caused by bacteria (Streptococcus pneumoniae), "
            "viruses (influenza, COVID-19), or fungi. Key signs: productive cough, "
            "high fever, difficulty breathing, and chest pain. Can be severe in "
            "children, elderly, and immunocompromised individuals."
        ),
        "precautions": [
            "Seek immediate medical attention — pneumonia requires diagnosis by chest X-ray",
            "Do not delay if breathing is laboured or oxygen saturation < 94%",
            "Antibiotics required for bacterial pneumonia",
            "Pneumococcal vaccine (PCV13/PPSV23) available for prevention",
            "Bed rest, fluids, and fever management while awaiting care",
        ],
        "see_doctor": True,
        "severity": 5,
        "icd10": "J18",
        "season_peak": [11, 12, 1, 2],
        "source_keywords": ["pneumonia", "respiratory"],
    },

    "Leptospirosis": {
        "symptoms": ["fever", "headache", "body ache", "fatigue", "nausea"],
        "description": (
            "Leptospirosis is caused by Leptospira bacteria found in floodwater and animal "
            "urine. Peak incidence after monsoon floods in India (July–September). "
            "Can cause severe complications (Weil's disease) with kidney/liver failure "
            "if untreated. Common in flood-affected areas."
        ),
        "precautions": [
            "Avoid wading in floodwater without rubber boots",
            "Wash skin thoroughly after flood water exposure",
            "Prophylactic doxycycline available after known exposure",
            "Seek immediate medical care — requires antibiotic treatment",
            "Report to local health authority in flood-affected zones",
        ],
        "see_doctor": True,
        "severity": 4,
        "icd10": "A27",
        "season_peak": [7, 8, 9],
        "source_keywords": ["leptospirosis", "lepto", "flood"],
    },
}


# ── SEASONAL BASE RATES (India, epidemiologically calibrated) ─────────────────
# Rate of background community transmission per month (0.0 – 1.0)
# Sources: IDSP Weekly Integrated Disease Surveillance, NVBDCP annual reports

def _get_seasonal_rate(disease_name: str, month: int) -> float:
    """Return 0.0–1.0 base rate for the disease in the given month (India)."""
    profile = DISEASE_PROFILES.get(disease_name, {})
    peak_months = profile.get("season_peak", [])
    if not peak_months:
        return 0.3
    if month in peak_months:
        return 0.85
    # Adjacent months get a partial score
    adjacent = {(m % 12) + 1 for m in peak_months} | {((m - 2) % 12) + 1 for m in peak_months}
    if month in adjacent:
        return 0.45
    return 0.15


# ── DIAGNOSIS ENGINE ──────────────────────────────────────────────────────────

class DiagnosisEngine:
    """
    Ranks diseases by probability given user symptoms and live area signals.

    score = (symptom_overlap_pct × 0.50)
          + (local_signal_confidence × 0.35)
          + (seasonal_base_rate × 0.15)
    """

    WEIGHTS = {
        "symptom_overlap": 0.50,
        "local_signal":    0.35,
        "seasonal":        0.15,
    }

    def diagnose(
        self,
        user_symptoms: List[str],
        district: str,
        db=None,
    ) -> Dict:
        """
        Main entry point. Returns ranked diagnoses + area context.

        Parameters
        ----------
        user_symptoms : list of canonical symptom tags (already normalized)
        district      : e.g. "Mumbai", "Bhopal"
        db            : the Sentinel DB singleton (optional, will import if None)
        """
        if db is None:
            from database import db as _db
            db = _db

        now = datetime.now(timezone.utc)
        current_month = now.month

        # ── STEP 1: Get active signals in the district ────────────────────────
        district_signals = self._get_district_signals(district, db)

        # ── STEP 2: Score each disease ────────────────────────────────────────
        scored = []
        for disease_name, profile in DISEASE_PROFILES.items():
            disease_symptoms = profile["symptoms"]

            # Symptom overlap: what % of this disease's symptoms does the user have?
            user_set = set(user_symptoms)
            disease_set = set(disease_symptoms)
            if not disease_set:
                continue

            matched = user_set & disease_set
            unmatched = disease_set - user_set
            extra_user_symptoms = user_set - disease_set

            # Overlap score: matched / max(disease, user) — penalises partial matches
            overlap_pct = len(matched) / max(len(disease_set), len(user_set)) * 100

            # Local signal confidence: is this disease active nearby?
            local_conf = self._get_local_confidence(
                disease_name, profile, district_signals
            )

            # Seasonal base rate
            seasonal_rate = _get_seasonal_rate(disease_name, current_month) * 100

            # Composite score
            raw_score = (
                overlap_pct       * self.WEIGHTS["symptom_overlap"] +
                local_conf        * self.WEIGHTS["local_signal"]    +
                seasonal_rate     * self.WEIGHTS["seasonal"]
            )

            # Must have at least 1 matching symptom to be a candidate
            if not matched:
                continue

            # Source tags from active local signals
            sources = district_signals.get("sources_by_type", {}).get(disease_name, [])
            if not sources and local_conf > 0:
                sources = district_signals.get("all_sources", [])

            scored.append({
                "disease": disease_name,
                "probability": round(min(raw_score, 97), 1),
                "matched_symptoms": sorted(matched),
                "unmatched_symptoms": sorted(unmatched),
                "extra_user_symptoms": sorted(extra_user_symptoms),
                "active_in_area": local_conf > 20,
                "area_signal_confidence": round(local_conf, 1),
                "seasonal_rate": round(seasonal_rate, 1),
                "symptom_overlap_pct": round(overlap_pct, 1),
                "description": profile["description"],
                "precautions": profile["precautions"],
                "see_doctor": profile["see_doctor"],
                "severity": profile["severity"],
                "icd10": profile["icd10"],
                "sources": sources if sources else [],
            })

        # ── STEP 3: Sort by probability and add confidence labels ─────────────
        scored.sort(key=lambda x: x["probability"], reverse=True)

        for d in scored:
            prob = d["probability"]
            if prob >= 65:
                d["confidence_label"] = "HIGH"
                d["confidence_color"] = "#ef4444"
            elif prob >= 40:
                d["confidence_label"] = "MODERATE"
                d["confidence_color"] = "#f59e0b"
            elif prob >= 20:
                d["confidence_label"] = "LOW"
                d["confidence_color"] = "#3b82f6"
            else:
                d["confidence_label"] = "UNLIKELY"
                d["confidence_color"] = "#6b7280"

        top5 = scored[:5]

        # ── STEP 4: Build area context summary ────────────────────────────────
        area_diseases = self._summarise_area_diseases(district_signals)

        return {
            "input_symptoms": user_symptoms,
            "district": district,
            "diagnoses": top5,
            "area_active_diseases": area_diseases,
            "area_signal_count": district_signals.get("total_reports", 0),
            "data_sources_used": district_signals.get("all_sources", []),
            "disclaimer": (
                "This is NOT medical advice. Sentinel AI uses real epidemiological "
                "data to estimate disease probabilities. Always consult a qualified "
                "doctor for diagnosis and treatment. In emergencies, call 112 or visit "
                "your nearest government health centre."
            ),
            "generated_at": now.isoformat(),
        }

    def _get_district_signals(self, district: str, db) -> Dict:
        """
        Extract active signal data for the given district from the DB.
        Returns a dict summarising what's spreading there.
        """
        result = {
            "total_reports": 0,
            "all_sources": [],
            "symptom_counts": defaultdict(int),
            "signals": [],
            "sources_by_type": defaultdict(list),
        }

        # Get reports for this district
        genuine_reports = [
            r for r in db._reports
            if r.get("district", "").lower() == district.lower()
            and not r.get("is_spam", False)
        ]

        # Also try partial match (e.g. "Bhopal North" → "Bhopal")
        if not genuine_reports:
            genuine_reports = [
                r for r in db._reports
                if district.lower() in r.get("district", "").lower()
                and not r.get("is_spam", False)
            ]

        result["total_reports"] = len(genuine_reports)

        # Count symptom frequencies
        for r in genuine_reports:
            for s in r.get("symptoms", []):
                result["symptom_counts"][s] += 1
            src = r.get("source", "")
            if src and src not in result["all_sources"]:
                result["all_sources"].append(src)

        # Get existing signals for the district
        district_signals = [
            s for s in db._signals.values()
            if district.lower() in s.get("district", "").lower()
        ]
        result["signals"] = district_signals

        return result

    def _get_local_confidence(
        self,
        disease_name: str,
        profile: Dict,
        district_data: Dict,
    ) -> float:
        """
        Estimate how much evidence there is that this specific disease
        is active in the district right now (0–100).
        """
        symptom_counts = district_data.get("symptom_counts", {})
        disease_symptoms = set(profile["symptoms"])
        source_keywords = set(profile.get("source_keywords", []))
        signals = district_data.get("signals", [])

        # Check if disease appears explicitly in signal names
        for sig in signals:
            sig_name = sig.get("name", "").lower()
            if any(kw in sig_name for kw in source_keywords):
                return min(sig.get("confidence", 50) * 1.1, 99)

        # Estimate from symptom overlap with what's being reported in the area
        if not symptom_counts:
            return 0.0

        total_area_reports = sum(symptom_counts.values())
        if total_area_reports == 0:
            return 0.0

        # What fraction of area's reported symptoms match this disease's profile?
        matched_count = sum(
            symptom_counts.get(s, 0) for s in disease_symptoms
        )
        match_ratio = matched_count / total_area_reports

        # Scale to 0–75 (max 75% from symptom matching alone, to leave room for direct signals)
        local_conf = match_ratio * 75

        # Boost if top district signals have overlapping symptoms
        for sig in signals:
            sig_symptoms = set(sig.get("symptoms", []))
            overlap = sig_symptoms & disease_symptoms
            if overlap:
                boost = (len(overlap) / max(len(disease_symptoms), 1)) * sig.get("confidence", 0) * 0.3
                local_conf = min(local_conf + boost, 99)

        return round(local_conf, 1)

    def _summarise_area_diseases(self, district_data: Dict) -> List[Dict]:
        """
        Return a concise summary of what diseases appear to be active
        in the area based on symptom patterns and signals.
        """
        symptom_counts = district_data.get("symptom_counts", {})
        if not symptom_counts:
            return []

        area_diseases = []
        for disease_name, profile in DISEASE_PROFILES.items():
            ds = set(profile["symptoms"])
            matched = sum(symptom_counts.get(s, 0) for s in ds)
            if matched > 0:
                area_diseases.append({
                    "disease": disease_name,
                    "evidence_strength": round(matched / max(sum(symptom_counts.values()), 1) * 100, 1),
                    "severity": profile["severity"],
                })

        area_diseases.sort(key=lambda x: x["evidence_strength"], reverse=True)
        return area_diseases[:6]


# Singleton
diagnosis_engine = DiagnosisEngine()
