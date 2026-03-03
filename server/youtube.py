"""
YouTube video info extraction and subtitle download.
Priority: official subs > auto-generated subs > ASR fallback
"""

import json
import subprocess
import re
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class SubtitleCue:
    start: float
    end: float
    text: str


@dataclass
class YouTubeInfo:
    video_id: str
    title: str
    channel: str
    duration: float
    thumbnail: str
    description: str = ""
    has_official_subs: bool = False
    has_auto_subs: bool = False
    subtitle_source: str = ""  # "official" / "auto" / "asr"


def extract_video_id(url: str) -> str:
    patterns = [
        r'(?:v=|/v/|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'(?:embed/)([a-zA-Z0-9_-]{11})',
        r'(?:shorts/)([a-zA-Z0-9_-]{11})',
    ]
    for pat in patterns:
        m = re.search(pat, url)
        if m:
            return m.group(1)
    raise ValueError(f"Cannot extract video ID from: {url}")


def get_video_info(url: str) -> YouTubeInfo:
    """Fetch video metadata using yt-dlp."""
    result = subprocess.run(
        ["yt-dlp", "--dump-json", "--no-download", url],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        err = result.stderr.strip()
        if "Private video" in err or "Sign in" in err:
            raise ValueError("视频不可访问（可能是私有视频或需要登录）")
        if "not available" in err or "blocked" in err:
            raise ValueError("视频不可访问（可能是地区限制）")
        raise ValueError(f"无法获取视频信息: {err[:200]}")

    data = json.loads(result.stdout)

    subtitles = data.get("subtitles", {})
    auto_captions = data.get("automatic_captions", {})

    has_official = any(
        lang.startswith("en") for lang in subtitles.keys()
    )
    has_auto = any(
        lang.startswith("en") for lang in auto_captions.keys()
    )

    return YouTubeInfo(
        video_id=data.get("id", ""),
        title=data.get("title", ""),
        channel=data.get("channel", data.get("uploader", "")),
        duration=float(data.get("duration", 0)),
        thumbnail=data.get("thumbnail", ""),
        description=data.get("description", "")[:500],
        has_official_subs=has_official,
        has_auto_subs=has_auto,
    )


def download_subtitles(url: str, work_dir: Path) -> tuple[Optional[Path], str]:
    """
    Download English subtitles. Returns (subtitle_file_path, source_type).
    source_type: "official" | "auto" | None
    """
    video_id = extract_video_id(url)
    sub_path_base = work_dir / video_id

    for sub_type, flag in [("official", "--write-sub"), ("auto", "--write-auto-sub")]:
        subprocess.run(
            [
                "yt-dlp",
                flag,
                "--sub-lang", "en",
                "--sub-format", "vtt",
                "--skip-download",
                "-o", str(sub_path_base),
                url,
            ],
            capture_output=True, text=True, timeout=60,
        )

        for suffix in [".en.vtt", ".en-orig.vtt"]:
            candidate = Path(str(sub_path_base) + suffix)
            if candidate.exists() and candidate.stat().st_size > 50:
                return candidate, sub_type

    return None, ""


def parse_vtt(filepath: Path) -> list[SubtitleCue]:
    """Parse a WebVTT file into cues, handling YouTube auto-caption format."""
    text = filepath.read_text(encoding="utf-8")
    cues: list[SubtitleCue] = []

    blocks = re.split(r'\n\n+', text)
    for block in blocks:
        lines = block.strip().split('\n')
        timestamp_line = None
        text_lines = []

        for line in lines:
            if '-->' in line:
                timestamp_line = line
            elif timestamp_line is not None:
                cleaned = re.sub(r'<[^>]+>', '', line).strip()
                if cleaned:
                    text_lines.append(cleaned)

        if not timestamp_line or not text_lines:
            continue

        match = re.match(
            r'(\d{1,2}:)?(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})\.(\d{3})',
            timestamp_line.strip()
        )
        if not match:
            continue

        g = match.groups()
        start = (int(g[0].rstrip(':')) * 3600 if g[0] else 0) + int(g[1]) * 60 + int(g[2]) + int(g[3]) / 1000
        end = (int(g[4].rstrip(':')) * 3600 if g[4] else 0) + int(g[5]) * 60 + int(g[6]) + int(g[7]) / 1000

        # YouTube auto-captions: 2 lines where line 1 = repeated previous, line 2 = new
        # Take only the last meaningful line as new content
        if len(text_lines) >= 2:
            new_text = text_lines[-1]
        else:
            new_text = text_lines[0]

        new_text = re.sub(r'\[.*?\]', '', new_text).strip()
        if not new_text:
            continue

        cues.append(SubtitleCue(start=start, end=end, text=new_text))

    return _deduplicate_cues(cues)


def _deduplicate_cues(cues: list[SubtitleCue]) -> list[SubtitleCue]:
    """YouTube auto-subs often repeat text across overlapping cues. Deduplicate."""
    if not cues:
        return cues

    cleaned = []
    prev_text = ""
    for cue in cues:
        text = cue.text.strip()
        if not text:
            continue
        if text == prev_text:
            if cleaned:
                cleaned[-1].end = max(cleaned[-1].end, cue.end)
            continue
        if prev_text and text.startswith(prev_text):
            new_part = text[len(prev_text):].strip()
            if new_part:
                text = new_part
        cleaned.append(SubtitleCue(start=cue.start, end=cue.end, text=text))
        prev_text = cue.text.strip()

    return cleaned


def download_video(url: str, out_dir: Path) -> Path:
    """Download video file for playback."""
    video_id = extract_video_id(url)
    out_path = out_dir / f"{video_id}.mp4"

    if out_path.exists():
        return out_path

    subprocess.run(
        [
            "yt-dlp",
            "-f", "bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best",
            "--merge-output-format", "mp4",
            "-o", str(out_path),
            url,
        ],
        check=True, capture_output=True, timeout=300,
    )

    return out_path
