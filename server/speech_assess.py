"""
AI Shadowing Coach — Speech Assessment Pipeline:
  1. Whisper STT (user recording → text)
  2. Word-level diff against original sentence
  3. Pronunciation / Fluency / Rhythm scoring
  4. Actionable feedback generation
"""

import re
import tempfile
import difflib
from dataclasses import dataclass, field
from pathlib import Path

from faster_whisper import WhisperModel

_model_cache: dict[str, WhisperModel] = {}


def _get_model(model_size: str = "base") -> WhisperModel:
    if model_size not in _model_cache:
        print(f"[SpeechAssess] Loading Whisper model '{model_size}' ...")
        _model_cache[model_size] = WhisperModel(
            model_size, device="cpu", compute_type="int8"
        )
        print(f"[SpeechAssess] Model '{model_size}' loaded.")
    return _model_cache[model_size]


def _normalize_text(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s']", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _tokenize(text: str) -> list[str]:
    return _normalize_text(text).split()


@dataclass
class WordError:
    """A single word-level error."""
    position: int
    original_word: str
    spoken_word: str
    error_type: str  # 'substitution' | 'deletion' | 'insertion'


@dataclass
class SpeechAssessment:
    recognized_text: str
    pronunciation_score: int
    fluency_score: int
    rhythm_score: int
    errors: list[WordError] = field(default_factory=list)
    feedback: list[str] = field(default_factory=list)
    word_count_original: int = 0
    word_count_spoken: int = 0
    speech_duration: float = 0.0

    def to_dict(self) -> dict:
        return {
            "recognized_text": self.recognized_text,
            "pronunciation_score": self.pronunciation_score,
            "fluency_score": self.fluency_score,
            "rhythm_score": self.rhythm_score,
            "errors": [
                {
                    "position": e.position,
                    "original_word": e.original_word,
                    "spoken_word": e.spoken_word,
                    "error_type": e.error_type,
                }
                for e in self.errors
            ],
            "feedback": self.feedback,
            "word_count_original": self.word_count_original,
            "word_count_spoken": self.word_count_spoken,
            "speech_duration": round(self.speech_duration, 2),
        }


def _diff_words(original: str, spoken: str) -> list[WordError]:
    """Compute word-level diff between original and spoken text."""
    orig_tokens = _tokenize(original)
    spk_tokens = _tokenize(spoken)

    matcher = difflib.SequenceMatcher(None, orig_tokens, spk_tokens)
    errors: list[WordError] = []

    for op, i1, i2, j1, j2 in matcher.get_opcodes():
        if op == "equal":
            continue
        elif op == "replace":
            for k in range(max(i2 - i1, j2 - j1)):
                orig_w = orig_tokens[i1 + k] if (i1 + k) < i2 else ""
                spk_w = spk_tokens[j1 + k] if (j1 + k) < j2 else ""
                errors.append(WordError(
                    position=i1 + k if (i1 + k) < i2 else i2 - 1,
                    original_word=orig_w,
                    spoken_word=spk_w,
                    error_type="substitution" if orig_w and spk_w else ("deletion" if orig_w else "insertion"),
                ))
        elif op == "delete":
            for k in range(i1, i2):
                errors.append(WordError(
                    position=k,
                    original_word=orig_tokens[k],
                    spoken_word="",
                    error_type="deletion",
                ))
        elif op == "insert":
            for k in range(j1, j2):
                errors.append(WordError(
                    position=i1,
                    original_word="",
                    spoken_word=spk_tokens[k],
                    error_type="insertion",
                ))

    return errors


def _score_pronunciation(orig_tokens: list[str], errors: list[WordError]) -> int:
    """Score based on word-level accuracy. 0–100."""
    if not orig_tokens:
        return 0
    substitutions = sum(1 for e in errors if e.error_type == "substitution")
    deletions = sum(1 for e in errors if e.error_type == "deletion")
    error_count = substitutions + deletions
    accuracy = max(0, (len(orig_tokens) - error_count)) / len(orig_tokens)
    return int(round(accuracy * 100))


def _score_fluency(
    spoken_tokens: list[str],
    speech_duration: float,
    orig_tokens: list[str],
) -> int:
    """Score based on speech rate relative to expected."""
    if speech_duration <= 0 or not orig_tokens:
        return 50

    spoken_wpm = (len(spoken_tokens) / speech_duration) * 60
    # Native conversational speech: ~130–160 wpm. Scale based on expected rate.
    expected_duration = len(orig_tokens) / 2.5  # ~150 wpm → 2.5 words/sec
    if expected_duration <= 0:
        return 50

    ratio = speech_duration / expected_duration
    # Ideal ratio is 1.0. Penalize for too slow or too fast.
    if 0.8 <= ratio <= 1.3:
        base = 90
    elif 0.6 <= ratio <= 1.6:
        base = 75
    elif 0.4 <= ratio <= 2.0:
        base = 60
    else:
        base = 45

    # Bonus for completeness
    completeness = min(len(spoken_tokens) / max(len(orig_tokens), 1), 1.0)
    score = int(base * completeness)
    return max(0, min(100, score))


def _score_rhythm(errors: list[WordError], orig_tokens: list[str], spoken_tokens: list[str]) -> int:
    """Heuristic rhythm score based on word order preservation and completeness."""
    if not orig_tokens:
        return 0

    insertions = sum(1 for e in errors if e.error_type == "insertion")
    total_errors = len(errors)

    order_score = max(0, (len(orig_tokens) - total_errors)) / len(orig_tokens)
    length_ratio = min(len(spoken_tokens), len(orig_tokens)) / max(len(orig_tokens), 1)

    score = int(round((order_score * 0.6 + length_ratio * 0.4) * 100))
    return max(0, min(100, score))


def _generate_feedback(
    original: str,
    errors: list[WordError],
    pronunciation_score: int,
    fluency_score: int,
    rhythm_score: int,
) -> list[str]:
    """Generate human-readable improvement advice."""
    feedback: list[str] = []

    substitutions = [e for e in errors if e.error_type == "substitution"]
    deletions = [e for e in errors if e.error_type == "deletion"]
    insertions = [e for e in errors if e.error_type == "insertion"]

    for err in substitutions[:3]:
        if err.original_word and err.spoken_word:
            feedback.append(
                f'You said "{err.spoken_word}" instead of "{err.original_word}". '
                f'Pay attention to the pronunciation difference.'
            )

    for err in deletions[:2]:
        feedback.append(f'You missed the word "{err.original_word}". Try including it next time.')

    if insertions:
        extra_words = ", ".join(f'"{e.spoken_word}"' for e in insertions[:2])
        feedback.append(f'You added extra words: {extra_words}. Try to match the original more closely.')

    if fluency_score < 70:
        feedback.append("Try to speak more smoothly without long pauses between words.")

    if rhythm_score < 70:
        feedback.append("Focus on matching the natural rhythm of the original sentence.")

    if pronunciation_score >= 90 and fluency_score >= 80:
        feedback.insert(0, "Great job! Your pronunciation is very accurate.")
    elif pronunciation_score >= 75:
        feedback.insert(0, "Good attempt! A few words need more practice.")

    if not feedback:
        feedback.append("Keep practicing! Try to match the original sentence as closely as possible.")

    return feedback


def recognize_speech(audio_path: str, model_size: str = "base") -> tuple[str, float]:
    """Run Whisper STT on an audio file. Returns (text, duration_seconds)."""
    model = _get_model(model_size)
    segments, info = model.transcribe(
        audio_path,
        language="en",
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=200),
    )
    text_parts = []
    last_end = 0.0
    for seg in segments:
        text_parts.append(seg.text.strip())
        last_end = max(last_end, seg.end)

    full_text = " ".join(text_parts)
    duration = last_end if last_end > 0 else info.duration
    return full_text, duration


def assess_speech(
    audio_data: bytes,
    original_sentence: str,
    model_size: str = "base",
    audio_format: str = "webm",
) -> SpeechAssessment:
    """
    Full assessment pipeline:
      1. Save audio to temp file
      2. Whisper STT
      3. Word diff
      4. Score
      5. Feedback
    """
    suffix = f".{audio_format}" if audio_format else ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_data)
        tmp_path = tmp.name

    try:
        recognized_text, speech_duration = recognize_speech(tmp_path, model_size)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if not recognized_text.strip():
        return SpeechAssessment(
            recognized_text="",
            pronunciation_score=0,
            fluency_score=0,
            rhythm_score=0,
            errors=[],
            feedback=["No voice detected. Please try speaking louder and closer to the microphone."],
            word_count_original=len(_tokenize(original_sentence)),
            word_count_spoken=0,
            speech_duration=speech_duration,
        )

    orig_tokens = _tokenize(original_sentence)
    spk_tokens = _tokenize(recognized_text)

    min_expected = max(1, len(orig_tokens) // 3)
    if len(spk_tokens) < min_expected and len(orig_tokens) > 3:
        return SpeechAssessment(
            recognized_text=recognized_text,
            pronunciation_score=0,
            fluency_score=0,
            rhythm_score=0,
            errors=[],
            feedback=["Your speech was too short. Try speaking the full sentence."],
            word_count_original=len(orig_tokens),
            word_count_spoken=len(spk_tokens),
            speech_duration=speech_duration,
        )

    errors = _diff_words(original_sentence, recognized_text)

    pronunciation_score = _score_pronunciation(orig_tokens, errors)
    fluency_score = _score_fluency(spk_tokens, speech_duration, orig_tokens)
    rhythm_score = _score_rhythm(errors, orig_tokens, spk_tokens)

    feedback = _generate_feedback(
        original_sentence, errors,
        pronunciation_score, fluency_score, rhythm_score,
    )

    return SpeechAssessment(
        recognized_text=recognized_text,
        pronunciation_score=pronunciation_score,
        fluency_score=fluency_score,
        rhythm_score=rhythm_score,
        errors=errors,
        feedback=feedback,
        word_count_original=len(orig_tokens),
        word_count_spoken=len(spk_tokens),
        speech_duration=speech_duration,
    )


def assess_recap(
    audio_data: bytes,
    reference_text: str,
    model_size: str = "base",
    audio_format: str = "webm",
) -> dict:
    """
    Assess a free-form recap recording. Less strict than shadowing —
    focuses on content coverage and clarity rather than exact word match.
    """
    suffix = f".{audio_format}" if audio_format else ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_data)
        tmp_path = tmp.name

    try:
        recognized_text, speech_duration = recognize_speech(tmp_path, model_size)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if not recognized_text.strip():
        return {
            "recognized_text": "",
            "clarity_score": 0,
            "coverage_score": 0,
            "feedback": ["No voice detected. Please try speaking louder."],
            "speech_duration": round(speech_duration, 2),
        }

    ref_tokens = set(_tokenize(reference_text))
    spk_tokens = set(_tokenize(recognized_text))

    if not ref_tokens:
        coverage = 1.0
    else:
        overlap = ref_tokens & spk_tokens
        coverage = len(overlap) / len(ref_tokens)

    spk_words = _tokenize(recognized_text)
    wpm = (len(spk_words) / speech_duration * 60) if speech_duration > 0 else 0
    clarity = min(100, int(70 + (30 if 100 <= wpm <= 180 else 0)))

    coverage_score = int(round(coverage * 100))

    feedback: list[str] = []
    if coverage_score >= 80:
        feedback.append("Good summary! You covered most key points.")
    elif coverage_score >= 50:
        feedback.append("Decent attempt. Try to include more key details from the original.")
    else:
        feedback.append("Your summary missed many key points. Review the reference and try again.")

    missing_important = ref_tokens - spk_tokens
    content_words = {w for w in missing_important if len(w) > 4}
    if content_words:
        sample = list(content_words)[:5]
        feedback.append(f"Consider including: {', '.join(sample)}")

    if wpm < 80:
        feedback.append("Try to speak a bit faster for a more natural pace.")
    elif wpm > 200:
        feedback.append("Slow down slightly for better clarity.")

    return {
        "recognized_text": recognized_text,
        "clarity_score": clarity,
        "coverage_score": coverage_score,
        "feedback": feedback,
        "speech_duration": round(speech_duration, 2),
    }
