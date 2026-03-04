"""
PM Work Language Expression Engine:
- 3 PM rewrites per sentence: Meeting / Slack / Doc
- Intent tag classification
- Discourse marker extraction
- High-transferability sentence scoring
- PM Expression Pack generation
"""

import re
from dataclasses import dataclass, field


# --- Discourse Markers ---

DISCOURSE_MARKERS = {
    "buffer": [
        "you know", "i mean", "like", "basically", "actually", "honestly",
        "well", "so", "right", "okay so", "let me think",
        "the thing is", "here's the thing",
    ],
    "transition": [
        "so", "and then", "but", "however", "on the other hand",
        "that said", "having said that", "at the same time",
        "first of all", "secondly", "finally", "in addition",
        "moreover", "furthermore", "besides",
    ],
    "emphasis": [
        "absolutely", "definitely", "literally", "seriously",
        "to be honest", "to be fair", "frankly", "obviously",
        "clearly", "essentially", "fundamentally",
    ],
    "agreement": [
        "exactly", "absolutely", "totally", "definitely",
        "i agree", "that's right", "for sure", "no doubt",
        "100 percent", "couldn't agree more",
    ],
    "hedging": [
        "i think", "i believe", "i guess", "i suppose",
        "it seems like", "kind of", "sort of", "maybe",
        "probably", "perhaps", "as far as i know",
        "from my perspective", "in my opinion",
    ],
}

# --- Intent Classification ---

INTENT_PATTERNS: dict[str, list[str]] = {
    "提出观点 opinion": [
        r"\bi (?:think|believe|feel|would say)\b",
        r"\bfrom my (?:perspective|point of view|experience)\b",
        r"\bin my (?:opinion|view)\b",
        r"\bthe way i see it\b",
        r"\bmy (?:take|thought|sense) is\b",
    ],
    "提出风险 risk": [
        r"\b(?:concern|risk|worry|issue|problem|challenge|blocker)\b",
        r"\bwhat if\b",
        r"\b(?:might|could|may) (?:not|fail|break|cause)\b",
        r"\btrade.?off\b",
        r"\bdownside\b",
        r"\bwe need to be (?:careful|aware)\b",
    ],
    "推进行动 action": [
        r"\b(?:next step|action item|follow up|takeaway)\b",
        r"\b(?:let's|shall we|can we) (?:move|proceed|go ahead|start|kick off)\b",
        r"\bwe (?:need|should|have) to\b",
        r"\b(?:deadline|timeline|eta|by (?:end of|friday|monday))\b",
        r"\bi'?ll (?:take|own|handle|follow up)\b",
    ],
    "对齐认知 alignment": [
        r"\b(?:just to|to) (?:clarify|confirm|make sure|be clear)\b",
        r"\b(?:are we|is everyone) (?:on the same page|aligned)\b",
        r"\bwhat i (?:mean|meant|understand|heard)\b",
        r"\bmy understanding is\b",
        r"\blet me (?:recap|summarize|rephrase)\b",
        r"\bso (?:basically|essentially|in other words)\b",
    ],
    "反对方案 pushback": [
        r"\bi'?m not (?:sure|convinced)\b",
        r"\bi (?:don't|do not) (?:think|agree|believe)\b",
        r"\b(?:that might not|that doesn't|that won't)\b",
        r"\bhave we considered\b",
        r"\bwhat about\b",
        r"\bthe (?:concern|issue|problem) (?:is|with)\b",
        r"\bi'?d (?:push back|disagree|challenge)\b",
    ],
    "补充信息 addition": [
        r"\b(?:also|another thing|one more thing|by the way|btw)\b",
        r"\b(?:on top of that|in addition|additionally|furthermore)\b",
        r"\b(?:not only|plus|and also)\b",
        r"\bi'?d (?:like to )?add\b",
    ],
    "确认共识 confirm": [
        r"\b(?:sounds good|sounds great|that works|perfect|agreed)\b",
        r"\b(?:got it|understood|makes sense|noted|exactly)\b",
        r"\bi'?ll (?:do that|take care of|handle|get on)\b",
        r"\b(?:we're aligned|we're good|all set)\b",
    ],
    "争取资源 negotiate": [
        r"\bwe (?:need|require|could use) (?:more|additional|extra)\b",
        r"\b(?:bandwidth|capacity|resource|headcount|budget)\b",
        r"\b(?:priority|prioritize|deprioritize|scope)\b",
        r"\b(?:can we|could we) (?:get|have|allocate)\b",
        r"\b(?:trade.?off|compromise|alternative)\b",
    ],
    "解释说明 explain": [
        r"\b(?:what i mean is|in other words|to put it simply)\b",
        r"\b(?:basically|essentially|the idea is)\b",
        r"\b(?:for example|for instance|such as)\b",
        r"\b(?:the reason|because|that's why|this is why)\b",
        r"\b(?:let me explain|let me walk you through)\b",
    ],
}

# --- PM Scenario Categories ---

PM_SCENARIOS = [
    "meeting", "slack", "document", "negotiation", "alignment", "pushback",
]


def extract_discourse_markers(text: str) -> list[dict]:
    text_lower = text.lower()
    found = []
    for category, markers in DISCOURSE_MARKERS.items():
        for marker in markers:
            if marker in text_lower:
                idx = text_lower.index(marker)
                if idx == 0 or not text_lower[idx - 1].isalpha():
                    end_idx = idx + len(marker)
                    if end_idx >= len(text_lower) or not text_lower[end_idx].isalpha():
                        found.append({"marker": marker, "category": category})
    return found


def detect_intent(text: str) -> str:
    """Classify the primary communicative intent of a sentence."""
    text_lower = text.lower()
    scores: dict[str, int] = {}
    for intent, patterns in INTENT_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, text_lower):
                scores[intent] = scores.get(intent, 0) + 1
    if not scores:
        return ""
    return max(scores, key=scores.get)


def detect_pm_scenarios(text: str) -> list[str]:
    """Map sentence to PM scenario categories."""
    text_lower = text.lower()
    tags = []
    for intent, patterns in INTENT_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, text_lower):
                tags.append(intent)
                break
    return tags


# --- PM Rewrite Engine ---

def _strip_fillers(text: str) -> str:
    cleaned = re.sub(
        r"\b(?:uh+|um+|er+|ah+|oh+|you know|i mean|like|basically|actually|honestly|well|right|so|okay)\b[,.]?\s*",
        "", text, flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if cleaned and cleaned[0].islower():
        cleaned = cleaned[0].upper() + cleaned[1:]
    return cleaned


def _formalize(text: str) -> str:
    replacements = [
        (r"\bwanna\b", "want to"), (r"\bgonna\b", "going to"),
        (r"\bgotta\b", "have to"), (r"\bkinda\b", "kind of"),
        (r"\bsorta\b", "sort of"), (r"\bdunno\b", "don't know"),
        (r"\blemme\b", "let me"), (r"\bcuz\b", "because"),
        (r"\btho\b", "though"), (r"\byeah\b", "yes"),
        (r"\bnope\b", "no"), (r"\byep\b", "yes"),
        (r"\bcool\b", "acceptable"), (r"\bguys\b", "everyone"),
        (r"\bstuff\b", "matters"), (r"\bthing\b", "point"),
        (r"\ba lot of\b", "significant"), (r"\bbig\b", "substantial"),
    ]
    result = text
    for pat, rep in replacements:
        result = re.sub(pat, rep, result, flags=re.IGNORECASE)
    return result


def _casualize(text: str) -> str:
    replacements = [
        (r"\bwant to\b", "wanna"), (r"\bgoing to\b", "gonna"),
        (r"\bhave to\b", "gotta"), (r"\bkind of\b", "kinda"),
        (r"\blet me\b", "lemme"), (r"\bI would\b", "I'd"),
        (r"\bdo not\b", "don't"), (r"\bcannot\b", "can't"),
        (r"\bwill not\b", "won't"),
    ]
    result = text
    for pat, rep in replacements:
        result = re.sub(pat, rep, result, flags=re.IGNORECASE)
    return result


def generate_pm_rewrites(text: str, intent: str) -> dict:
    """Generate Meeting / Slack / Doc versions of a sentence."""
    text = text.strip()
    if not text or len(text.split()) < 3:
        return {"meeting": "", "slack": "", "doc": ""}

    cleaned = _strip_fillers(text)
    if not cleaned:
        cleaned = text

    # --- Meeting: natural spoken with buffer phrases ---
    meeting_base = _casualize(cleaned)
    meeting = meeting_base
    intent_lower = intent.lower()

    # Always prepend a contextual buffer for Meeting version
    if "opinion" in intent_lower:
        if not re.match(r"(?i)^(i think|i believe|from my|in my)", meeting):
            meeting = "I think " + meeting[0].lower() + meeting[1:]
    elif "risk" in intent_lower:
        if not re.match(r"(?i)^(one concern|the risk|the concern|my worry)", meeting):
            meeting = "One concern here — " + meeting[0].lower() + meeting[1:]
    elif "action" in intent_lower:
        if not re.match(r"(?i)^(let'?s|next step|so the|i'?ll|sounds good)", meeting):
            meeting = "So the next step would be — " + meeting[0].lower() + meeting[1:]
    elif "alignment" in intent_lower:
        if not re.match(r"(?i)^(just to|to clarify|my understanding|let me|lemme)", meeting):
            meeting = "Just to make sure we're aligned — " + meeting[0].lower() + meeting[1:]
    elif "pushback" in intent_lower:
        if not re.match(r"(?i)^(i'?m not|i don'?t|i'?d push|have we)", meeting):
            meeting = "I'd push back a bit here — " + meeting[0].lower() + meeting[1:]
    elif "confirm" in intent_lower:
        if not re.match(r"(?i)^(sounds|got it|makes sense|agreed)", meeting):
            meeting = "Sounds good — " + meeting[0].lower() + meeting[1:]
    elif "negotiate" in intent_lower:
        if not re.match(r"(?i)^(what if|could we|can we)", meeting):
            meeting = "What if we " + meeting[0].lower() + meeting[1:]
    else:
        meeting = "Yeah so — " + meeting[0].lower() + meeting[1:]

    # --- Slack: short, action-oriented, no fluff ---
    slack = _strip_fillers(text)
    slack = _formalize(slack)
    words = slack.split()
    if len(words) > 15:
        for i in range(10, len(words)):
            w = words[i]
            if w.endswith(('.', '!', '?', ',', ';')) or w.lower() in ('and', 'but', 'so', 'because'):
                slack = ' '.join(words[:i + (1 if w.endswith(('.', '!', '?')) else 0)])
                if not slack.endswith(('.', '!', '?')):
                    slack = slack.rstrip('.,;') + '.'
                break
    if not slack.endswith(('.', '!', '?')):
        slack += '.'

    # --- Doc: formal, structured, complete ---
    doc = _formalize(cleaned)
    if not doc.endswith(('.', '!', '?')):
        doc += '.'
    doc = doc[0].upper() + doc[1:] if doc else doc

    return {
        "meeting": meeting,
        "slack": slack,
        "doc": doc,
    }


# --- Transferability Scoring ---

def score_transferability(text: str) -> float:
    """Score how useful a sentence is for PM work (0.0 - 1.0)."""
    text_lower = text.lower()
    score = 0.0

    words = text_lower.split()
    if len(words) < 4:
        return 0.0
    if len(words) > 6:
        score += 0.1

    for patterns in INTENT_PATTERNS.values():
        for pat in patterns:
            if re.search(pat, text_lower):
                score += 0.3
                break

    for markers in DISCOURSE_MARKERS.values():
        for marker in markers:
            if marker in text_lower:
                score += 0.1
                break

    noise_patterns = [
        r"^\[", r"\bmusic\b", r"\bapplause\b", r"\blaughter\b",
        r"^\w+$", r"^(?:yeah|yes|no|okay|oh|uh|um|right)$",
    ]
    for pat in noise_patterns:
        if re.search(pat, text_lower):
            score -= 0.5

    return max(0.0, min(1.0, score))


def generate_pm_pack(sentences: list[dict]) -> dict:
    """Generate a PM Expression Pack summary for an episode."""
    scored = []
    for s in sentences:
        sc = score_transferability(s.get("english", ""))
        if sc >= 0.2:
            scored.append((sc, s))

    scored.sort(key=lambda x: -x[0])
    top = scored[:25]

    meeting_phrases = []
    slack_phrases = []
    doc_phrases = []
    connectors = set()

    for _, s in top:
        m = s.get("pm_meeting", "")
        sl = s.get("pm_slack", "")
        d = s.get("pm_doc", "")
        chinese = s.get("chinese", "")
        base = {
            "original": s.get("english", ""),
            "chinese": chinese,
            "intent": s.get("intent_tag", ""),
            "sentence_id": s.get("sentence_id", 0),
        }
        if m and len(meeting_phrases) < 10:
            meeting_phrases.append({**base, "text": m})
        if sl and len(slack_phrases) < 10:
            slack_phrases.append({**base, "text": sl})
        if d and len(doc_phrases) < 5:
            doc_phrases.append({**base, "text": d})

        for dm in s.get("discourse_markers", []):
            connectors.add(dm.get("marker", "") if isinstance(dm, dict) else str(dm))

    return {
        "meeting_phrases": meeting_phrases,
        "slack_phrases": slack_phrases,
        "doc_phrases": doc_phrases,
        "connectors": sorted(connectors)[:15],
        "total_transferable": len(scored),
    }


def process_sentence_expressions(text: str) -> dict:
    """Full PM expression processing for a single sentence."""
    markers = extract_discourse_markers(text)
    intent = detect_intent(text)
    scenarios = detect_pm_scenarios(text)
    rewrites = generate_pm_rewrites(text, intent)
    transferability = score_transferability(text)

    return {
        "pm_meeting": rewrites["meeting"],
        "pm_slack": rewrites["slack"],
        "pm_doc": rewrites["doc"],
        "intent_tag": intent,
        "discourse_markers": markers,
        "scenario_tags": scenarios,
        "transferability": round(transferability, 2),
    }
