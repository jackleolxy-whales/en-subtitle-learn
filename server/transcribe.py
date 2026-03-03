"""
Video transcription pipeline:
  1. Whisper speech recognition with word-level timestamps
  2. Sentence segmentation
  3. Chinese translation
  4. Keyword extraction
"""

import re
from dataclasses import dataclass, field
from typing import Optional

from faster_whisper import WhisperModel
from deep_translator import GoogleTranslator

_model_cache: dict[str, WhisperModel] = {}


def _get_model(model_size: str = "base") -> WhisperModel:
    if model_size not in _model_cache:
        print(f"[Whisper] Loading model '{model_size}' ...")
        _model_cache[model_size] = WhisperModel(
            model_size, device="cpu", compute_type="int8"
        )
        print(f"[Whisper] Model '{model_size}' loaded.")
    return _model_cache[model_size]


COMMON_WORDS = {
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
    "my", "your", "his", "its", "our", "their", "mine", "yours", "ours", "theirs",
    "a", "an", "the", "this", "that", "these", "those",
    "is", "am", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "shall", "should",
    "can", "could", "may", "might", "must",
    "and", "or", "but", "not", "no", "nor", "so", "yet", "for",
    "in", "on", "at", "to", "of", "with", "by", "from", "up", "about", "into",
    "through", "during", "before", "after", "above", "below", "between",
    "out", "off", "over", "under", "again", "further", "then", "once",
    "here", "there", "when", "where", "why", "how", "all", "each", "every",
    "both", "few", "more", "most", "other", "some", "such", "only", "own",
    "same", "than", "too", "very", "just", "because", "as", "if", "while",
    "what", "which", "who", "whom", "whose",
    "also", "back", "even", "still", "new", "now", "way", "many",
    "like", "long", "make", "thing", "see", "look", "come", "go", "get",
    "know", "think", "say", "said", "tell", "told", "take", "want", "give",
    "well", "also", "here", "right", "yeah", "okay", "oh", "um", "uh",
    "let", "put", "got", "much", "going", "don", "didn", "doesn", "won",
    "really", "ll", "ve", "re", "s", "t", "d", "m",
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "first", "last", "next", "year", "time", "day", "people", "world",
    "lot", "little", "bit", "big", "good", "bad", "great", "best", "old",
    "high", "low", "set", "place", "part", "point", "end", "run", "live",
    "any", "been", "down", "made", "after", "own", "work", "being",
    "sure", "yes", "no", "maybe", "already", "keep", "went", "came",
    "use", "used", "need", "try", "man", "men", "woman", "women",
    "find", "found", "help", "kind", "course", "fact", "why", "because",
    "com", "www", "http", "https",
    "we're", "we'll", "it's", "i'm", "don't", "didn't", "doesn't", "can't",
    "won't", "wouldn't", "shouldn't", "couldn't", "isn't", "aren't", "wasn't",
}


@dataclass
class KeywordInfo:
    word: str
    pos: str = ""
    meaning: str = ""
    phonetic: str = ""


@dataclass
class SentenceInfo:
    sentence_id: int
    start_time: float
    end_time: float
    english: str
    chinese: str = ""
    keywords: list[KeywordInfo] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "sentence_id": self.sentence_id,
            "start_time": round(self.start_time, 2),
            "end_time": round(self.end_time, 2),
            "english": self.english,
            "chinese": self.chinese,
            "keywords": [
                {"word": k.word, "pos": k.pos, "meaning": k.meaning, "phonetic": k.phonetic}
                for k in self.keywords
            ],
        }


@dataclass
class TranscribeResult:
    sentences: list[SentenceInfo]
    duration: float
    word_count: int
    language: str = "en"
    title_en: str = ""

    def to_dict(self) -> dict:
        return {
            "sentences": [s.to_dict() for s in self.sentences],
            "duration": round(self.duration, 1),
            "word_count": self.word_count,
            "language": self.language,
            "title_en": self.title_en,
        }


def _extract_keywords(text: str, top_n: int = 3) -> list[str]:
    """Extract uncommon words as keywords."""
    words = re.findall(r"[a-zA-Z']+", text.lower())
    seen = set()
    keywords = []
    for w in words:
        clean = w.strip("'")
        if clean and clean not in COMMON_WORDS and clean not in seen and len(clean) > 2:
            seen.add(clean)
            keywords.append(clean)
    return keywords[:top_n]


def _translate_batch(texts: list[str]) -> list[str]:
    """Translate English texts to Chinese."""
    if not texts:
        return []

    translator = GoogleTranslator(source="en", target="zh-CN")
    results = []
    for text in texts:
        try:
            translated = translator.translate(text)
            results.append(translated or "")
        except Exception:
            results.append("")
    return results


def _translate_keywords(words: list[str]) -> dict[str, str]:
    """Translate individual keywords."""
    if not words:
        return {}

    translator = GoogleTranslator(source="en", target="zh-CN")
    result = {}
    for word in words:
        try:
            translated = translator.translate(word)
            result[word] = translated or word
        except Exception:
            result[word] = word
    return result


def transcribe_video(
    video_path: str,
    model_size: str = "base",
    language: Optional[str] = "en",
) -> TranscribeResult:
    """Full pipeline: transcribe → segment → translate → extract keywords."""

    model = _get_model(model_size)

    print(f"[Transcribe] Processing: {video_path}")
    segments_gen, info = model.transcribe(
        video_path,
        language=language,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(
            min_silence_duration_ms=300,
        ),
    )

    raw_segments = list(segments_gen)
    print(f"[Transcribe] Got {len(raw_segments)} raw segments, duration={info.duration:.1f}s")

    sentences: list[SentenceInfo] = []
    sid = 1
    for seg in raw_segments:
        text = seg.text.strip()
        if not text:
            continue
        sentences.append(SentenceInfo(
            sentence_id=sid,
            start_time=seg.start,
            end_time=seg.end,
            english=text,
        ))
        sid += 1

    if not sentences:
        return TranscribeResult(
            sentences=[], duration=info.duration, word_count=0, language=language or "en"
        )

    print(f"[Translate] Translating {len(sentences)} sentences...")
    english_texts = [s.english for s in sentences]
    chinese_texts = _translate_batch(english_texts)
    for s, cn in zip(sentences, chinese_texts):
        s.chinese = cn

    all_keywords_set: set[str] = set()
    for s in sentences:
        kws = _extract_keywords(s.english)
        for kw in kws:
            all_keywords_set.add(kw)
        s.keywords = [KeywordInfo(word=w) for w in kws]

    if all_keywords_set:
        print(f"[Keywords] Translating {len(all_keywords_set)} unique keywords...")
        kw_translations = _translate_keywords(list(all_keywords_set))
        for s in sentences:
            for kw in s.keywords:
                kw.meaning = kw_translations.get(kw.word, kw.word)

    total_words = sum(len(re.findall(r"[a-zA-Z']+", s.english)) for s in sentences)

    print(f"[Done] {len(sentences)} sentences, {total_words} words")

    return TranscribeResult(
        sentences=sentences,
        duration=info.duration,
        word_count=total_words,
        language=info.language or "en",
    )
