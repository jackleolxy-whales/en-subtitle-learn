"""
Sentence segmentation for learning-grade subtitles.
Target: 2-6 seconds per sentence, proper sentence boundaries.
"""

import re
from dataclasses import dataclass
from youtube import SubtitleCue

MIN_DURATION = 1.0
MAX_DURATION = 8.0
IDEAL_MAX_DURATION = 6.0
MERGE_GAP_THRESHOLD = 0.3


@dataclass
class LearningSegment:
    start: float
    end: float
    text: str


def segment_for_learning(cues: list[SubtitleCue]) -> list[LearningSegment]:
    """
    Convert raw subtitle cues into learning-grade segments.
    1. Merge tiny fragments into reasonable chunks
    2. Split overly long segments
    3. Ensure 2-6 second target duration
    """
    if not cues:
        return []

    merged = _merge_to_target(cues)
    split = _split_long_segments(merged)
    cleaned = _clean_segments(split)
    return cleaned


def _merge_to_target(cues: list[SubtitleCue]) -> list[LearningSegment]:
    """
    Merge cues into segments targeting IDEAL_MAX_DURATION.
    Respects sentence boundaries when present, but always enforces max duration.
    """
    segments: list[LearningSegment] = []

    buffer_start = 0.0
    buffer_end = 0.0
    buffer_text = ""

    for cue in cues:
        text = cue.text.strip()
        if not text:
            continue

        if not buffer_text:
            buffer_start = cue.start
            buffer_end = cue.end
            buffer_text = text
            continue

        combined_duration = cue.end - buffer_start
        gap = cue.start - buffer_end
        current_duration = buffer_end - buffer_start

        at_sentence_boundary = _ends_with_sentence_boundary(buffer_text)
        at_clause_boundary = _ends_with_clause_boundary(buffer_text)

        if at_sentence_boundary and current_duration >= MIN_DURATION:
            segments.append(LearningSegment(start=buffer_start, end=buffer_end, text=buffer_text))
            buffer_start = cue.start
            buffer_end = cue.end
            buffer_text = text
        elif combined_duration > IDEAL_MAX_DURATION and at_clause_boundary and current_duration >= 2.0:
            segments.append(LearningSegment(start=buffer_start, end=buffer_end, text=buffer_text))
            buffer_start = cue.start
            buffer_end = cue.end
            buffer_text = text
        elif combined_duration > IDEAL_MAX_DURATION and current_duration >= 3.0:
            segments.append(LearningSegment(start=buffer_start, end=buffer_end, text=buffer_text))
            buffer_start = cue.start
            buffer_end = cue.end
            buffer_text = text
        elif gap > 1.0 and current_duration >= MIN_DURATION:
            segments.append(LearningSegment(start=buffer_start, end=buffer_end, text=buffer_text))
            buffer_start = cue.start
            buffer_end = cue.end
            buffer_text = text
        else:
            buffer_end = cue.end
            buffer_text = buffer_text + " " + text

    if buffer_text:
        segments.append(LearningSegment(start=buffer_start, end=buffer_end, text=buffer_text))

    return segments


def _split_long_segments(segments: list[LearningSegment]) -> list[LearningSegment]:
    """Split any segment longer than MAX_DURATION."""
    result: list[LearningSegment] = []

    for seg in segments:
        duration = seg.end - seg.start
        if duration <= MAX_DURATION:
            result.append(seg)
            continue

        parts = _split_text_intelligently(seg.text, duration)
        if len(parts) <= 1:
            result.append(seg)
            continue

        time_per_char = duration / max(len(seg.text), 1)
        current_start = seg.start

        for i, part in enumerate(parts):
            part_duration = len(part) * time_per_char
            part_end = current_start + part_duration if i < len(parts) - 1 else seg.end
            part_end = min(part_end, seg.end)
            result.append(LearningSegment(
                start=round(current_start, 2),
                end=round(part_end, 2),
                text=part.strip(),
            ))
            current_start = part_end

    return result


def _split_text_intelligently(text: str, duration: float) -> list[str]:
    """Split text aiming for ~5 second chunks."""
    target_chunks = max(2, int(duration / 5.0))
    target_chunk_len = len(text) / target_chunks

    # Try splitting at sentence boundaries first
    sentence_parts = re.split(r'(?<=[.!?])\s+', text)
    if len(sentence_parts) >= target_chunks:
        return _balance_parts(sentence_parts, target_chunk_len)

    # Try splitting at clause boundaries (commas, semicolons, conjunctions)
    clause_parts = re.split(r'(?<=,)\s+|(?<=;)\s+|\s+(?=and\s)|\s+(?=but\s)|\s+(?=so\s)|\s+(?=because\s)|\s+(?=when\s)|\s+(?=that\s)|\s+(?=which\s)', text)
    if len(clause_parts) >= target_chunks:
        return _balance_parts(clause_parts, target_chunk_len)

    # Last resort: split by word count
    words = text.split()
    words_per_chunk = max(5, len(words) // target_chunks)
    parts = []
    for i in range(0, len(words), words_per_chunk):
        chunk = ' '.join(words[i:i + words_per_chunk])
        if chunk:
            parts.append(chunk)
    return parts


def _balance_parts(parts: list[str], target_len: float) -> list[str]:
    """Merge small parts together to approach target length."""
    if len(parts) <= 1:
        return parts

    balanced = []
    current = parts[0]

    for part in parts[1:]:
        if len(current) < target_len * 0.6:
            current = current + " " + part
        else:
            balanced.append(current)
            current = part

    if current:
        balanced.append(current)

    return balanced


def _ends_with_sentence_boundary(text: str) -> bool:
    return bool(re.search(r'[.!?][\s"\']*$', text.strip()))


def _ends_with_clause_boundary(text: str) -> bool:
    """Check if text ends at a natural clause boundary."""
    t = text.strip().lower()
    return bool(
        re.search(r'[,;:][\s"\']*$', t)
        or t.endswith((' and', ' but', ' so', ' or', ' yet', ' because', ' that', ' which', ' when', ' while', ' then'))
    )


def _clean_segments(segments: list[LearningSegment]) -> list[LearningSegment]:
    """Final cleanup: remove empty, fix overlaps, normalize text."""
    result = []
    for seg in segments:
        text = seg.text.strip()
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\[.*?\]', '', text).strip()
        if not text or len(text) < 2:
            continue
        result.append(LearningSegment(
            start=round(seg.start, 2),
            end=round(seg.end, 2),
            text=text,
        ))

    for i in range(1, len(result)):
        if result[i].start < result[i - 1].end:
            result[i].start = result[i - 1].end

    return result
