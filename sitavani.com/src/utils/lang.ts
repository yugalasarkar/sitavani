import { NewsCategory, DisplayLanguage } from '../types';

export const CATEGORY_LABELS: Record<NewsCategory, { en: string; hi: string }> = {
  HERITAGE: { en: 'Vedic & Heritage Renaissance', hi: 'वैदिक एवं सांस्कृतिक पुनर्जागरण' },
  MANDIR: { en: 'Mandir & Sacred Corridors', hi: 'मंदिर एवं पवित्र गलियारे' },
  DEFENSE: { en: 'Sovereign & Superpower Bharat', hi: 'समर्थ एवं संप्रभु भारत' },
  SCIENCE: { en: 'Space & High Tech (ISRO/UPI)', hi: 'अंतरिक्ष एवं उच्च तकनीक' },
  SANSKRIT: { en: 'Sanskrit & Knowledge Systems', hi: 'संस्कृत एवं ज्ञान परंपरा' },
  GOVERNANCE: { en: 'Sovereign Policy & Security', hi: 'संप्रभु नीति एवं सुरक्षा' },
  NARRATIVE_FACTS: { en: 'Fact vs Myth: Bharat Narrative', hi: 'सत्य तथ्य: भारत विमर्श' },
  GENERAL: { en: 'Civilisational Milestones', hi: 'सभ्यतागत उपलब्धियां' }
};

export const UI_STRINGS = {
  wire_title: {
    en: 'Sitavani Sovereign Wire',
    hi: 'सीतावाणी संप्रभु समाचार धारा'
  },
  wire_tagline: {
    en: 'Curated intelligence on heritage reclamation, mandir corridors, indigenous defense, and high-tech self-reliance.',
    hi: 'विरासत पुनर्प्राप्ति, मंदिर गलियारे, स्वदेशी रक्षा एवं उच्च तकनीक आत्मनिर्भरता पर प्रामाणिक रपट।'
  },
  filter_all: { en: 'All Dispatches', hi: 'समस्त समाचार' },
  lead_dispatch: { en: 'Lead Dispatch', hi: 'मुख्य समाचार' },
  spotlight_features: { en: 'Renaissance Spotlights', hi: 'प्रमुख उपलब्धियां' },
  latest_wire: { en: 'Chronological Wire', hi: 'ताज़ा समाचार धारा' },
  inspect_source: { en: 'Inspect Source', hi: 'मूल स्रोत' },
  read_dispatch: { en: 'Read Dispatch', hi: 'विस्तृत पढ़ें' },
  editorial_desk: { en: 'Editorial Desk', hi: 'संपादकीय कक्ष' },
  public_wire: { en: 'Public Wire', hi: 'सार्वजनिक पटल' },
  pending_queue: { en: 'Pending Review', hi: 'स्वीकृति हेतु प्रतीक्षारत' },
  publish_btn: { en: 'Publish to Wire', hi: 'प्रकाशित करें' },
  discard_btn: { en: 'Discard', hi: 'अस्वीकार करें' },
  edit_publish: { en: 'Edit & Publish', hi: 'संशोधन एवं प्रकाशन' },
  sha256_verified: { en: 'SHA-256 Verified Digest', hi: 'SHA-256 सत्यापित कूट' },
  curatorial_notes: { en: 'Curatorial Notes', hi: 'संपादकीय टिप्पणी' },
  sources_monitored: { en: 'Monitored Sources', hi: 'निरीक्षित स्रोत' },
  pipeline_daemon: { en: 'Ingestion Daemon', hi: 'डेटा अंतर्ग्रहण सेवा' },
  run_pipeline_now: { en: 'Run Crawl Cycle Now', hi: 'अभी क्रॉल चक्र चलाएं' },
  all_clear: { en: 'No pending articles awaiting review.', hi: 'कोई लंबित समाचार शेष नहीं है।' }
};
