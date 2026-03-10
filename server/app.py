import json
import hashlib
import time
import random
from pathlib import Path
from typing import Optional, Literal

from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from transcribe import transcribe_video, TranscribeResult, _translate_batch, _translate_keywords, _extract_keywords, KeywordInfo
from youtube import get_video_info, download_subtitles, parse_vtt, download_video, extract_video_id
from segmenter import segment_for_learning
from expressions import process_sentence_expressions, extract_discourse_markers, generate_pm_pack, score_transferability
from speech_assess import assess_speech, assess_recap

app = FastAPI(title="精听学习平台 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent
CACHE_DIR = BASE_DIR / "cache"
CACHE_DIR.mkdir(exist_ok=True)
VIDEO_DIR = BASE_DIR / "videos"
VIDEO_DIR.mkdir(exist_ok=True)
SUBS_DIR = BASE_DIR / "subs"
SUBS_DIR.mkdir(exist_ok=True)
EPISODES_FILE = BASE_DIR / "episodes.json"
PM_SENTENCES_FILE = BASE_DIR / "pm_sentences.json"
DAILY_RECORDS_FILE = BASE_DIR / "daily10_records.json"


def _load_episodes() -> list[dict]:
    if EPISODES_FILE.exists():
        return json.loads(EPISODES_FILE.read_text(encoding="utf-8"))
    return []


def _save_episodes(episodes: list[dict]):
    EPISODES_FILE.write_text(json.dumps(episodes, ensure_ascii=False, indent=2), encoding="utf-8")


def _load_pm_sentences() -> list[dict]:
    if PM_SENTENCES_FILE.exists():
        return json.loads(PM_SENTENCES_FILE.read_text(encoding="utf-8"))
    return []


def _append_daily_record(record: dict) -> None:
    records: list[dict] = []
    if DAILY_RECORDS_FILE.exists():
        try:
            records = json.loads(DAILY_RECORDS_FILE.read_text(encoding="utf-8"))
        except Exception:
            records = []
    records.append(record)
    DAILY_RECORDS_FILE.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")


CACHE_VERSION = "v3_pm_cn"

def _cache_key(prefix: str, *parts: str) -> str:
    raw = f"{prefix}:{CACHE_VERSION}:" + ":".join(parts)
    return hashlib.md5(raw.encode()).hexdigest()


def _get_cached(cache_key: str) -> Optional[dict]:
    path = CACHE_DIR / f"{cache_key}.json"
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
        if data and "sentences" in data:
            first = data["sentences"][0] if data["sentences"] else {}
            if "pm_meeting" not in first:
                return None
        return data
    return None


def _save_cache(cache_key: str, data: dict):
    path = CACHE_DIR / f"{cache_key}.json"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# --- Models ---

class TranscribeRequest(BaseModel):
    video_url: str
    model_size: str = "base"


class YouTubeInfoRequest(BaseModel):
    url: str


class YouTubeImportRequest(BaseModel):
    url: str
    generate_translation: bool = True
    generate_expressions: bool = True
    model_size: str = "base"


class PMSentenceModel(BaseModel):
    id: int
    english: str
    chinese: str
    category: str
    variation: str
    audio_url: str
    difficulty: Literal["easy", "medium", "hard"]


class DailySentenceRecordModel(BaseModel):
    user_id: str
    sentence_id: int
    date: str
    shadowing_score: float
    completed: bool


def _migrate_episodes_pm():
    """Backfill PM fields for episodes imported before PM upgrade."""
    episodes = _load_episodes()
    changed = False
    for ep in episodes:
        sents = ep.get("sentences", [])
        if not sents:
            continue

        first = sents[0]
        needs_pm_fields = "pm_meeting" not in first
        pack = ep.get("pm_pack")
        needs_pack_refresh = (
            not pack
            or (pack.get("meeting_phrases") and "chinese" not in pack["meeting_phrases"][0])
        )

        if needs_pm_fields:
            print(f"[Migrate] Backfilling PM fields for: {ep.get('title', ep.get('episode_id'))}")
            changed = True
            for s in sents:
                expr = process_sentence_expressions(s.get("english", ""))
                s["pm_meeting"] = expr["pm_meeting"]
                s["pm_slack"] = expr["pm_slack"]
                s["pm_doc"] = expr["pm_doc"]
                s["intent_tag"] = expr["intent_tag"]
                s["scenario_tags"] = expr["scenario_tags"]
                s["transferability"] = expr["transferability"]
                s.pop("rewrite_casual", None)
                s.pop("rewrite_formal", None)
                s.pop("rewrite_short", None)
            needs_pack_refresh = True

        if needs_pack_refresh:
            print(f"[Migrate] Regenerating PM pack for: {ep.get('title', ep.get('episode_id'))}")
            changed = True
            ep["pm_pack"] = generate_pm_pack(sents)
            ep["pm_phrase_count"] = ep["pm_pack"]["total_transferable"]

    if changed:
        _save_episodes(episodes)
        print("[Migrate] Episode PM migration complete.")


@app.on_event("startup")
def startup():
    _migrate_episodes_pm()


# --- Endpoints ---

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/episodes")
def list_episodes():
    """List all imported episodes."""
    return _load_episodes()


@app.get("/api/daily10")
def get_daily10():
    """
    返回 Daily 10：每日 10 句 PM 工作英语。

    - 从 pm_sentences.json 中随机抽取
    - 尽量混合不同 difficulty
    - 避免重复
    """
    all_sents = [_ for _ in _load_pm_sentences()]
    if not all_sents:
        raise HTTPException(status_code=500, detail="PM 句子库为空，请先配置 pm_sentences.json")

    # 按难度分桶
    buckets: dict[str, list[dict]] = {"easy": [], "medium": [], "hard": []}
    for s in all_sents:
        diff = s.get("difficulty", "medium")
        if diff not in buckets:
            diff = "medium"
        buckets[diff].append(s)

    target_total = 10
    target_easy = 4
    target_medium = 4
    target_hard = 2

    selected: list[dict] = []

    def pick_from_bucket(bucket: list[dict], n: int):
        nonlocal selected
        if not bucket or n <= 0:
            return
        if len(bucket) <= n:
            pool = [s for s in bucket if s not in selected]
            selected.extend(pool)
        else:
            pool = [s for s in bucket if s not in selected]
            random.shuffle(pool)
            selected.extend(pool[:n])

    pick_from_bucket(buckets["easy"], target_easy)
    pick_from_bucket(buckets["medium"], target_medium)
    pick_from_bucket(buckets["hard"], target_hard)

    if len(selected) < target_total:
        remaining = [s for s in all_sents if s not in selected]
        random.shuffle(remaining)
        selected.extend(remaining[: target_total - len(selected)])

    random.shuffle(selected)
    selected = selected[:target_total]

    return {"sentences": selected}


@app.post("/api/transcribe")
def transcribe(req: TranscribeRequest):
    """Transcribe a video URL (non-YouTube) via Whisper."""
    ck = _cache_key("transcribe", req.video_url, req.model_size)
    cached = _get_cached(ck)
    if cached:
        return cached

    try:
        from app import VIDEO_DIR as vd
        url_hash = hashlib.md5(req.video_url.encode()).hexdigest()[:12]
        out_path = vd / f"{url_hash}.mp4"
        if not out_path.exists():
            import subprocess
            subprocess.run(["curl", "-L", "-o", str(out_path), req.video_url],
                           check=True, capture_output=True, timeout=120)
        result = transcribe_video(str(out_path), model_size=req.model_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    data = result.to_dict()
    _save_cache(ck, data)
    return data


@app.post("/api/youtube/info")
def youtube_info(req: YouTubeInfoRequest):
    """Step 1: Fetch YouTube video metadata and subtitle availability."""
    try:
        info = get_video_info(req.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取视频信息失败: {e}")

    subtitle_hint = "none"
    if info.has_official_subs:
        subtitle_hint = "official"
    elif info.has_auto_subs:
        subtitle_hint = "auto"

    return {
        "video_id": info.video_id,
        "title": info.title,
        "channel": info.channel,
        "duration": info.duration,
        "thumbnail": info.thumbnail,
        "subtitle_hint": subtitle_hint,
    }


@app.post("/api/youtube/import")
def youtube_import(req: YouTubeImportRequest):
    """
    Full YouTube import pipeline:
    1. Fetch video info
    2. Download subtitles (or fall back to ASR)
    3. Segment into learning sentences
    4. Translate (optional)
    5. Generate oral expressions (optional)
    6. Save episode
    """
    ck = _cache_key("yt_import", req.url, str(req.generate_translation), str(req.generate_expressions))
    cached = _get_cached(ck)
    if cached:
        return cached

    # Step 1: Video info
    try:
        info = get_video_info(req.url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"视频信息获取失败: {e}")

    # Step 2: Download subtitles
    sub_file, sub_source = download_subtitles(req.url, SUBS_DIR)
    transcript_source = sub_source or "asr"

    sentences_data: list[dict] = []

    if sub_file:
        # Parse and segment subtitle file
        print(f"[YouTube] Using {sub_source} subtitles from {sub_file}")
        cues = parse_vtt(sub_file)
        segments = segment_for_learning(cues)

        for i, seg in enumerate(segments, 1):
            keywords = _extract_keywords(seg.text)
            sentences_data.append({
                "sentence_id": i,
                "start_time": seg.start,
                "end_time": seg.end,
                "english": seg.text,
                "chinese": "",
                "keywords": [{"word": w, "pos": "", "meaning": "", "phonetic": ""} for w in keywords],
                "pm_meeting": "",
                "pm_slack": "",
                "pm_doc": "",
                "intent_tag": "",
                "discourse_markers": [],
                "scenario_tags": [],
                "transferability": 0.0,
            })
    else:
        # Fall back to Whisper ASR
        print(f"[YouTube] No subtitles found, falling back to ASR")
        try:
            video_path = download_video(req.url, VIDEO_DIR)
            result = transcribe_video(str(video_path), model_size=req.model_size)
            for s in result.sentences:
                d = s.to_dict()
                d.update({
                    "pm_meeting": "",
                    "pm_slack": "",
                    "pm_doc": "",
                    "intent_tag": "",
                    "discourse_markers": [],
                    "scenario_tags": [],
                    "transferability": 0.0,
                })
                sentences_data.append(d)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"语音识别失败: {e}")

    if not sentences_data:
        raise HTTPException(status_code=422, detail="未能提取到任何字幕内容")

    # Step 3: Translation
    if req.generate_translation:
        print(f"[YouTube] Translating {len(sentences_data)} sentences...")
        en_texts = [s["english"] for s in sentences_data]
        zh_texts = _translate_batch(en_texts)
        for s, zh in zip(sentences_data, zh_texts):
            s["chinese"] = zh

    # Step 3b: Translate keywords
    all_kw_words = set()
    for s in sentences_data:
        for kw in s["keywords"]:
            all_kw_words.add(kw["word"])
    if all_kw_words and req.generate_translation:
        print(f"[YouTube] Translating {len(all_kw_words)} keywords...")
        kw_trans = _translate_keywords(list(all_kw_words))
        for s in sentences_data:
            for kw in s["keywords"]:
                kw["meaning"] = kw_trans.get(kw["word"], kw["word"])

    # Step 4: Generate PM expressions
    if req.generate_expressions:
        print(f"[YouTube] Generating PM expressions...")
        for s in sentences_data:
            expr = process_sentence_expressions(s["english"])
            s["pm_meeting"] = expr["pm_meeting"]
            s["pm_slack"] = expr["pm_slack"]
            s["pm_doc"] = expr["pm_doc"]
            s["intent_tag"] = expr["intent_tag"]
            s["discourse_markers"] = expr["discourse_markers"]
            s["scenario_tags"] = expr["scenario_tags"]
            s["transferability"] = expr["transferability"]

    # Step 4b: Generate PM Expression Pack
    pm_pack = generate_pm_pack(sentences_data) if req.generate_expressions else None
    pm_phrase_count = pm_pack["total_transferable"] if pm_pack else 0

    # Step 5: Build episode
    video_id = info.video_id
    total_words = sum(len(s["english"].split()) for s in sentences_data)

    # Download video for local playback
    try:
        video_path = download_video(req.url, VIDEO_DIR)
        local_video_url = f"/api/videos/{video_path.name}"
    except Exception:
        local_video_url = ""

    episode = {
        "episode_id": abs(hash(video_id)) % 100000,
        "source_type": "youtube",
        "source_url": req.url,
        "video_id": video_id,
        "title": info.title,
        "title_en": info.title,
        "channel": info.channel,
        "duration": info.duration,
        "thumbnail": info.thumbnail,
        "cover_url": info.thumbnail,
        "video_url": local_video_url,
        "accent": "American",
        "gender": "male",
        "difficulty": 3,
        "word_count": total_words,
        "sentence_count": len(sentences_data),
        "pm_phrase_count": pm_phrase_count,
        "tags": [],
        "category": "YouTube",
        "publish_date": time.strftime("%Y-%m-%d"),
        "transcript_source": transcript_source,
        "sentences": sentences_data,
        "pm_pack": pm_pack,
    }

    # Save to episodes list
    episodes = _load_episodes()
    episodes = [ep for ep in episodes if ep.get("episode_id") != episode["episode_id"]]
    episodes.insert(0, episode)
    _save_episodes(episodes)

    _save_cache(ck, episode)

    print(f"[YouTube] Import complete: {len(sentences_data)} sentences, {total_words} words")
    return episode


@app.get("/api/videos/{filename}")
def serve_video(filename: str):
    path = VIDEO_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(path, media_type="video/mp4")


@app.post("/api/speech/assess")
async def speech_assess(
    audio: UploadFile = File(...),
    original_sentence: str = Form(...),
    model_size: str = Form("base"),
):
    """Assess user's shadowing pronunciation against the original sentence."""
    audio_data = await audio.read()
    if len(audio_data) < 100:
        raise HTTPException(status_code=400, detail="Audio file is too small or empty")

    ext = "webm"
    if audio.content_type:
        if "wav" in audio.content_type:
            ext = "wav"
        elif "mp4" in audio.content_type or "m4a" in audio.content_type:
            ext = "m4a"
        elif "ogg" in audio.content_type:
            ext = "ogg"

    try:
        result = assess_speech(audio_data, original_sentence, model_size=model_size, audio_format=ext)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech assessment failed: {e}")

    return result.to_dict()


@app.post("/api/speech/recap")
async def speech_recap(
    audio: UploadFile = File(...),
    reference_text: str = Form(...),
    model_size: str = Form("base"),
):
    """Assess user's recap recording against reference text (free-form)."""
    audio_data = await audio.read()
    if len(audio_data) < 100:
        raise HTTPException(status_code=400, detail="Audio file is too small or empty")

    ext = "webm"
    if audio.content_type:
        if "wav" in audio.content_type:
            ext = "wav"
        elif "mp4" in audio.content_type or "m4a" in audio.content_type:
            ext = "m4a"

    try:
        result = assess_recap(audio_data, reference_text, model_size=model_size, audio_format=ext)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recap assessment failed: {e}")

    return result


@app.post("/api/daily10/record")
def save_daily10_record(record: DailySentenceRecordModel):
    """
    记录 Daily 10 跟读结果，简单持久化到 JSON 文件。
    """
    _append_daily_record(record.dict())
    return {"status": "ok"}
