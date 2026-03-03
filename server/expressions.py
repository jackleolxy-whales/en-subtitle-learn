"""
Oral expression generation:
- 3 rewrites per sentence (casual / formal / short)
- Discourse marker extraction
- Expression card tagging
"""

import re
from dataclasses import dataclass, field


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

SCENARIO_PATTERNS = {
    "对齐 alignment": [
        r"(?:let me|let's|can we)\s+(?:make sure|clarify|confirm|align)",
        r"(?:are we|is everyone)\s+(?:on the same page|aligned)",
        r"(?:just to|to)\s+(?:clarify|confirm|be clear)",
        r"what i (?:mean|meant|understand|heard)",
    ],
    "推进 progress": [
        r"(?:let's|shall we|can we)\s+(?:move on|move forward|proceed|continue|get started)",
        r"next (?:step|steps|thing)",
        r"(?:action item|follow up|takeaway)",
        r"(?:we need to|we should|let's)\s+(?:prioritize|focus on)",
    ],
    "解释 explain": [
        r"(?:what i mean is|in other words|to put it simply)",
        r"(?:basically|essentially|the idea is)",
        r"(?:for example|for instance|such as|like)",
        r"(?:the reason|because|that's why|this is why)",
    ],
    "补充 addition": [
        r"(?:also|another thing|one more thing|by the way)",
        r"(?:on top of that|in addition|additionally)",
        r"(?:not only|plus|and also)",
    ],
    "拒绝 pushback": [
        r"(?:i'm not sure|i don't think|i disagree)",
        r"(?:that might not|that doesn't|that won't)",
        r"(?:the concern is|my worry is|the risk is)",
        r"(?:have we considered|what about|but what if)",
    ],
    "确认 confirm": [
        r"(?:sounds good|sounds great|that works|perfect)",
        r"(?:got it|understood|makes sense|noted)",
        r"(?:i'll|we'll)\s+(?:do that|take care of|handle)",
    ],
}


@dataclass
class ExpressionCard:
    original: str
    casual: str
    formal: str
    short: str
    discourse_markers: list[str] = field(default_factory=list)
    scenario_tags: list[str] = field(default_factory=list)


def extract_discourse_markers(text: str) -> list[dict]:
    """Find discourse markers/connectors in text."""
    text_lower = text.lower()
    found = []
    for category, markers in DISCOURSE_MARKERS.items():
        for marker in markers:
            if marker in text_lower:
                idx = text_lower.index(marker)
                if idx == 0 or not text_lower[idx - 1].isalpha():
                    end_idx = idx + len(marker)
                    if end_idx >= len(text_lower) or not text_lower[end_idx].isalpha():
                        found.append({
                            "marker": marker,
                            "category": category,
                        })
    return found


def detect_scenarios(text: str) -> list[str]:
    """Detect which work scenario patterns match this sentence."""
    text_lower = text.lower()
    tags = []
    for tag, patterns in SCENARIO_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, text_lower):
                tags.append(tag)
                break
    return tags


def generate_rewrites_rule_based(text: str) -> dict:
    """
    Rule-based rewrite generation (no LLM required).
    Provides reasonable casual/formal/short alternatives.
    """
    text = text.strip()
    if not text:
        return {"casual": "", "formal": "", "short": ""}

    casual = text
    formal = text
    short = text

    formal_replacements = [
        (r"\bwanna\b", "want to"),
        (r"\bgonna\b", "going to"),
        (r"\bgotta\b", "have to"),
        (r"\bkinda\b", "kind of"),
        (r"\bsorta\b", "sort of"),
        (r"\bdunno\b", "don't know"),
        (r"\blemme\b", "let me"),
        (r"\bcuz\b", "because"),
        (r"\btho\b", "though"),
        (r"\byeah\b", "yes"),
        (r"\bnope\b", "no"),
        (r"\byep\b", "yes"),
        (r"\bcool\b", "acceptable"),
        (r"\bguys\b", "everyone"),
        (r"\bstuff\b", "matters"),
        (r"\bthing\b", "matter"),
    ]
    for pat, rep in formal_replacements:
        formal = re.sub(pat, rep, formal, flags=re.IGNORECASE)

    casual_replacements = [
        (r"\bwant to\b", "wanna"),
        (r"\bgoing to\b", "gonna"),
        (r"\bhave to\b", "gotta"),
        (r"\bkind of\b", "kinda"),
        (r"\blet me\b", "lemme"),
    ]
    for pat, rep in casual_replacements:
        casual = re.sub(pat, rep, casual, flags=re.IGNORECASE)

    fillers_to_remove = [
        r"\b(?:you know|i mean|like|basically|actually|honestly|well|right)\b,?\s*",
    ]
    for pat in fillers_to_remove:
        short = re.sub(pat, "", short, flags=re.IGNORECASE)
    short = re.sub(r'\s+', ' ', short).strip()
    if short and short[0].islower():
        short = short[0].upper() + short[1:]

    words = short.split()
    if len(words) > 12:
        boundary = len(words) // 2
        for i in range(boundary, len(words)):
            if words[i].endswith((',', '.', '!', '?', ';')):
                short = ' '.join(words[:i + 1])
                if not short.endswith('.'):
                    short = short.rstrip(',;') + '.'
                break

    return {
        "casual": casual if casual != text else "",
        "formal": formal if formal != text else "",
        "short": short if short != text else "",
    }


def process_sentence_expressions(text: str) -> dict:
    """Full expression processing for a single sentence."""
    markers = extract_discourse_markers(text)
    scenarios = detect_scenarios(text)
    rewrites = generate_rewrites_rule_based(text)

    return {
        "rewrite_casual": rewrites["casual"],
        "rewrite_formal": rewrites["formal"],
        "rewrite_short": rewrites["short"],
        "discourse_markers": markers,
        "scenario_tags": scenarios,
    }
