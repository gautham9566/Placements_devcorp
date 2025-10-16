from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Optional, Callable, List
import os
import json
import subprocess
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
import requests

app = FastAPI(title="Transcoding Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SHARED_STORAGE = os.path.abspath("../shared_storage")
ORIGINALS_PATH = os.path.join(SHARED_STORAGE, "originals")
HLS_PATH = os.path.join(SHARED_STORAGE, "hls")

METADATA_SERVICE_URL = "http://127.0.0.1:8003"

os.makedirs(HLS_PATH, exist_ok=True)
os.makedirs(ORIGINALS_PATH, exist_ok=True)

def _resolve_source_path(upload_id: str, filename: str) -> tuple[Optional[str], Optional[str]]:
    """Resolve source file path, checking both course-specific and legacy locations.
    Returns (file_path, course_id) tuple."""
    # First try legacy path (direct under originals/)
    legacy_path = os.path.join(ORIGINALS_PATH, upload_id, filename)
    if os.path.exists(legacy_path):
        return legacy_path, None

    # Search in course-specific folders
    for item in os.listdir(ORIGINALS_PATH):
        item_path = os.path.join(ORIGINALS_PATH, item)
        if os.path.isdir(item_path):
            course_specific_path = os.path.join(item_path, upload_id, filename)
            if os.path.exists(course_specific_path):
                return course_specific_path, item  # item is the course_id folder name

    return None, None

# Quality presets
QUALITY_PRESETS = {
    "1080p": {
        "width": 1920,
        "height": 1080,
        "video_bitrate": 5_800_000,
        "maxrate": 6_400_000,
        "bufsize": 9_600_000,
        "audio_bitrate": 192_000,
        "frame_rate": 30,
        "segment_duration": 6,
        "profile": "main",
        "encoder_preset": "faster",
        "gop": 48,
    },
    "720p": {
        "width": 1280,
        "height": 720,
        "video_bitrate": 3_500_000,
        "maxrate": 3_900_000,
        "bufsize": 5_800_000,
        "audio_bitrate": 160_000,
        "frame_rate": 30,
        "segment_duration": 6,
        "profile": "main",
        "encoder_preset": "faster",
        "gop": 48,
    },
    "480p": {
        "width": 854,
        "height": 480,
        "video_bitrate": 1_600_000,
        "maxrate": 1_900_000,
        "bufsize": 3_000_000,
        "audio_bitrate": 128_000,
        "frame_rate": 30,
        "segment_duration": 6,
        "profile": "main",
        "encoder_preset": "faster",
        "gop": 48,
    },
    "360p": {
        "width": 640,
        "height": 360,
        "video_bitrate": 900_000,
        "maxrate": 1_100_000,
        "bufsize": 2_200_000,
        "audio_bitrate": 96_000,
        "frame_rate": 30,
        "segment_duration": 6,
        "profile": "main",
        "encoder_preset": "faster",
        "gop": 48,
    },
}

class TranscodeRequest(BaseModel):
    upload_id: str
    filename: str
    network_speed: float = 10.0
    qualities: Optional[List[str]] = None

# Status lock management
_STATUS_LOCKS: Dict[str, Lock] = {}
_STATUS_LOCKS_LOCK = Lock()

def _get_status_lock(upload_id: str) -> Lock:
    with _STATUS_LOCKS_LOCK:
        lock = _STATUS_LOCKS.get(upload_id)
        if lock is None:
            lock = Lock()
            _STATUS_LOCKS[upload_id] = lock
        return lock

def _status_path(upload_id: str, course_id: Optional[str] = None) -> str:
    """Get the path to the transcode status file.
    If course_id is provided, use course-based folder structure.
    Otherwise, try to read existing status to get course_id, or use flat structure."""
    if course_id:
        return os.path.join(HLS_PATH, str(course_id), upload_id, ".transcode_status.json")

    # Try to find existing status file in course folders
    if os.path.exists(ORIGINALS_PATH):
        for item in os.listdir(ORIGINALS_PATH):
            item_path = os.path.join(ORIGINALS_PATH, item)
            if os.path.isdir(item_path):
                # Check if upload_id exists in this course folder
                upload_path = os.path.join(item_path, upload_id)
                if os.path.exists(upload_path):
                    # Found the course folder, use it for status
                    return os.path.join(HLS_PATH, item, upload_id, ".transcode_status.json")

    # Fallback to flat structure for legacy uploads
    return os.path.join(HLS_PATH, upload_id, ".transcode_status.json")

def _read_status(upload_id: str, course_id: Optional[str] = None) -> Optional[Dict]:
    """Read transcode status from JSON file."""
    status_path = _status_path(upload_id, course_id)
    if not os.path.exists(status_path):
        return None
    try:
        with open(status_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None

def _write_status(upload_id: str, data: Dict, course_id: Optional[str] = None):
    """Write status to JSON file."""
    # If course_id is in the data, use it
    if not course_id and 'course_id' in data:
        course_id = data['course_id']

    path = _status_path(upload_id, course_id)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass

def _update_status(upload_id: str, mutator: Callable[[Dict], Dict], course_id: Optional[str] = None) -> Dict:
    """Thread-safe status update."""
    lock = _get_status_lock(upload_id)
    with lock:
        current = _read_status(upload_id, course_id) or {}
        # If course_id is provided but not in current status, add it
        if course_id and 'course_id' not in current:
            current['course_id'] = course_id
        updated = mutator(current) if mutator else current
        if updated is None:
            updated = current
        # Extract course_id from updated status if available
        status_course_id = updated.get('course_id') or course_id
        _write_status(upload_id, updated, status_course_id)
        return updated

def _merge_quality_status(upload_id: str, label: str, updates: Dict, course_id: Optional[str] = None) -> Dict:
    """Merge quality-specific status updates."""
    def mutate(status: Dict) -> Dict:
        status = status or {}
        status.setdefault('qualities', {})
        existing = dict(status['qualities'].get(label, {}))
        merged = existing.copy()
        for key, value in updates.items():
            if key == 'started_at' and existing.get('started_at') is not None:
                continue
            merged[key] = value
        status['qualities'][label] = merged
        return status

    return _update_status(upload_id, mutate, course_id)

def get_status_snapshot(upload_id: str) -> Dict:
    """Get current status snapshot."""
    lock = _get_status_lock(upload_id)
    with lock:
        return _read_status(upload_id) or {}

def _is_transcoding_stopped(upload_id: str) -> bool:
    """Check if transcoding is stopped via metadata service."""
    try:
        response = requests.get(f"{METADATA_SERVICE_URL}/videos/{upload_id}/stopped", timeout=5)
        if response.status_code == 200:
            return response.json().get("stopped", False)
    except requests.RequestException:
        pass
    return False

def _to_kbps(value: int) -> str:
    """Convert bitrate to kbps string."""
    return f"{max(1, int(value) // 1000)}k"

def _cleanup_quality_dir(path: str):
    """Clean up HLS segment files."""
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)
        return

    for name in os.listdir(path):
        if not name.lower().endswith((".ts", ".m3u8", ".mp4")):
            continue
        try:
            os.remove(os.path.join(path, name))
        except Exception:
            continue

def _probe_video_resolution(path: str):
    """Return (width, height) of the first video stream or (0,0) on failure."""
    try:
        cmd = [
            'ffprobe', '-v', 'error', '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x',
            path
        ]
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode('utf-8').strip()
        if not out:
            return 0, 0
        parts = out.split('x')
        if len(parts) >= 2:
            w = int(parts[0]) if parts[0].isdigit() else 0
            h = int(parts[1]) if parts[1].isdigit() else 0
            return w, h
        return 0, 0
    except Exception:
        return 0, 0

def _get_duration_seconds(path: str) -> float:
    """Get video duration in seconds using ffprobe."""
    try:
        cmd = [
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', path
        ]
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode('utf-8').strip()
        return float(out) if out else 0.0
    except Exception:
        return 0.0

def _get_quality_label_from_resolution(width: int, height: int) -> str:
    """Map resolution to quality label like '1080p', '720p', etc."""
    if height <= 0:
        return "unknown"
    
    quality_map = {
        2160: "2160p",
        1440: "1440p",
        1080: "1080p",
        720: "720p",
        480: "480p",
        360: "360p",
        240: "240p"
    }
    
    for h, label in quality_map.items():
        if height >= h:
            return label
    
    return f"{height}p"

def _build_scale_filter(width: int, height: int) -> str:
    """Build FFmpeg scale filter ensuring dimensions divisible by 2."""
    return f"scale='min({width},iw)':'min({height},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2"

def _run_hls_with_progress(source_path: str, out_dir: str, preset: Dict, upload_id: str, label: str, course_id: Optional[str] = None):
    """Run ffmpeg to generate HLS output for a single quality while updating status."""
    width = int(preset.get("width"))
    height = int(preset.get("height"))
    duration = _get_duration_seconds(source_path)
    scale_filter = _build_scale_filter(width, height)
    playlist_path = os.path.join(out_dir, "playlist.m3u8")
    segment_pattern = os.path.join(out_dir, "segment_%03d.ts")
    segment_duration = int(preset.get("segment_duration", 6))

    cmd = [
        'ffmpeg', '-y', '-i', source_path,
        '-vf', scale_filter,
        '-c:v', 'libx264',
        '-profile:v', preset.get('profile', 'main'),
        '-preset', preset.get('encoder_preset', 'faster'),
        '-b:v', _to_kbps(preset.get('video_bitrate', 3_000_000)),
        '-maxrate', _to_kbps(preset.get('maxrate', preset.get('video_bitrate', 3_000_000))),
        '-bufsize', _to_kbps(preset.get('bufsize', preset.get('video_bitrate', 3_000_000) * 2)),
        '-g', str(preset.get('gop', 48)),
        '-keyint_min', str(preset.get('gop', 48)),
        '-sc_threshold', '0',
        '-force_key_frames', f"expr:gte(t,n_forced*{segment_duration})",
        '-c:a', 'aac',
        '-b:a', _to_kbps(preset.get('audio_bitrate', 128_000)),
        '-ac', '2',
        '-f', 'hls',
        '-hls_time', str(segment_duration),
        '-hls_list_size', '0',
        '-hls_playlist_type', 'vod',
        '-hls_flags', 'independent_segments',
        '-hls_segment_filename', segment_pattern,
        playlist_path,
    ]

    try:
        proc = subprocess.Popen(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            universal_newlines=True,
            bufsize=1
        )
    except Exception as e:
        return 1, str(e)

    current_progress = 0
    started_at = time.time()
    _merge_quality_status(
        upload_id, label,
        {
            'status': 'running',
            'progress': current_progress,
            'started_at': started_at,
            'updated_at': started_at,
            'target_resolution': f'{width}x{height}',
        },
        course_id
    )

    try:
        while True:
            line = proc.stderr.readline()
            if not line:
                break
            line = line.strip()

            # Check if transcoding should be stopped on every iteration
            if _is_transcoding_stopped(upload_id):
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
                _merge_quality_status(
                    upload_id, label,
                    {
                        'status': 'stopped',
                        'progress': current_progress,
                        'updated_at': time.time(),
                    },
                    course_id
                )
                return 1, 'Transcoding stopped by user'

            if 'time=' in line:
                try:
                    time_str = line.split('time=')[1].split()[0]
                    h, m, s = time_str.split(':')
                    out_s = int(h)*3600 + int(m)*60 + float(s)
                    if duration > 0:
                        percent = int(min(100, (out_s / duration) * 100))
                    else:
                        percent = 0
                    if percent != current_progress:
                        current_progress = percent
                        _merge_quality_status(
                            upload_id, label,
                            {
                                'status': 'running',
                                'progress': percent,
                                'updated_at': time.time(),
                            },
                            course_id
                        )
                except Exception:
                    pass

        rc = proc.wait()
        if rc == 0:
            finished_at = time.time()
            _merge_quality_status(
                upload_id, label,
                {
                    'status': 'ok',
                    'progress': 100,
                    'path': os.path.join(label, 'playlist.m3u8').replace('\\', '/'),
                    'playlist': os.path.join(label, 'playlist.m3u8').replace('\\', '/'),
                    'finished_at': finished_at,
                    'updated_at': finished_at,
                },
                course_id
            )
            return 0, ''
        else:
            err = ''
            try:
                stderr_bytes = proc.stderr.read() if proc.stderr else b''
                err = stderr_bytes.decode('utf-8', errors='ignore') if isinstance(stderr_bytes, bytes) else str(stderr_bytes)
            except Exception:
                err = 'Unknown error'
            finished_at = time.time()
            _merge_quality_status(
                upload_id, label,
                {
                    'status': 'error',
                    'progress': current_progress,
                    'message': err,
                    'finished_at': finished_at,
                    'updated_at': finished_at,
                },
                course_id
            )
            return rc, err
    except Exception as e:
        try:
            proc.kill()
        except Exception:
            pass
        finished_at = time.time()
        _merge_quality_status(
            upload_id, label,
            {
                'status': 'error',
                'progress': current_progress,
                'message': str(e),
                'finished_at': finished_at,
                'updated_at': finished_at,
            },
            course_id
        )
        return 1, str(e)

def _write_master_playlist(upload_id: str, status_snapshot: Dict, course_id: Optional[str] = None) -> str:
    """Write master HLS playlist."""
    if course_id:
        base_folder = os.path.join(HLS_PATH, str(course_id), upload_id)
    else:
        base_folder = os.path.join(HLS_PATH, upload_id)
    lines = [
        "#EXTM3U",
        "#EXT-X-VERSION:3",
        "#EXT-X-INDEPENDENT-SEGMENTS",
    ]

    qualities = (status_snapshot or {}).get("qualities", {}) if status_snapshot else {}
    wrote_any = False

    for label, cfg in QUALITY_PRESETS.items():
        playlist_rel = f"{label}/playlist.m3u8"
        playlist_abs = os.path.join(base_folder, playlist_rel)
        qstatus = qualities.get(label, {})
        if not os.path.exists(playlist_abs):
            continue
        if qstatus.get("status") != "ok":
            continue

        audio_bitrate = int(cfg.get("audio_bitrate", 128_000))
        video_avg = int(cfg.get("video_bitrate", cfg.get("maxrate", 1)))
        video_peak = int(cfg.get("maxrate", video_avg))
        bandwidth = max(1, video_peak + audio_bitrate)
        average_bandwidth = max(1, video_avg + audio_bitrate)
        frame_rate = int(cfg.get("frame_rate", 30))
        width = int(cfg.get("width"))
        height = int(cfg.get("height"))
        codecs = cfg.get("codecs", "avc1.640028,mp4a.40.2")
        name_attr = cfg.get("name", label)

        lines.append(
            f'#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},AVERAGE-BANDWIDTH={average_bandwidth},RESOLUTION={width}x{height},FRAME-RATE={frame_rate},CODECS="{codecs}",NAME="{name_attr}"'
        )
        lines.append(playlist_rel.replace("\\", "/"))
        wrote_any = True

    if not wrote_any:
        return ""

    master_path = os.path.join(base_folder, "master.m3u8")
    try:
        with open(master_path, "w", encoding="utf-8") as fp:
            fp.write("\n".join(lines) + "\n")
    except Exception:
        return ""

    return master_path

def transcode_video_task(upload_id: str, filename: str, network_speed: float = 10.0, qualities: Optional[List[str]] = None) -> Dict:
    """Main transcoding function that runs in background."""
    print(f"Starting transcoding for {upload_id}: {filename}")

    # Notify metadata service that transcoding is starting
    try:
        requests.post(
            f"{METADATA_SERVICE_URL}/videos/{upload_id}/transcoding-status",
            params={"status": "transcoding"},
            timeout=5
        )
    except Exception as e:
        print(f"Failed to update transcoding status to 'transcoding' for {upload_id}: {e}")

    # Resolve source path and course_id first
    source_path, course_id = _resolve_source_path(upload_id, filename)

    if _is_transcoding_stopped(upload_id):
        print(f"Transcoding stopped for {upload_id}")
        status = _read_status(upload_id, course_id) or {}
        status['overall'] = 'stopped'
        if course_id:
            status['course_id'] = course_id
        _update_status(upload_id, lambda _: status, course_id)
        return status

    if not source_path:
        status = {"error": f"Source file not found for upload_id: {upload_id}"}
        if course_id:
            status['course_id'] = course_id
        _update_status(upload_id, lambda _: status, course_id)
        print(f"Transcoding failed for {upload_id}: source file not found")

        # Notify metadata service of failure
        try:
            requests.post(
                f"{METADATA_SERVICE_URL}/videos/{upload_id}/transcoding-status",
                params={"status": "failed"},
                timeout=5
            )
        except Exception as e:
            print(f"Failed to update transcoding status to 'failed' for {upload_id}: {e}")

        return status

    existing_status = _read_status(upload_id, course_id)
    if existing_status and existing_status.get('overall') == 'ok':
        print(f"Transcoding already complete for {upload_id}")
        return existing_status

    orig_w, orig_h = _probe_video_resolution(source_path)
    if orig_h <= 0:
        selected_presets = list(QUALITY_PRESETS.keys())
        original_quality_label = "unknown"
    else:
        selected_presets = [label for label, cfg in QUALITY_PRESETS.items() if int(cfg.get('height', 0)) <= orig_h]
        original_quality_label = _get_quality_label_from_resolution(orig_w, orig_h)

    # If qualities specified, use them instead
    if qualities:
        selected_presets = [p for p in qualities if p in QUALITY_PRESETS]

    # Filter by network speed
    if network_speed < 1:
        selected_presets = [p for p in selected_presets if p in ['360p', '240p']]
    elif network_speed < 5:
        selected_presets = [p for p in selected_presets if p in ['480p', '360p', '240p']]
    elif network_speed < 10:
        selected_presets = [p for p in selected_presets if p not in ['2160p', '1440p']]

    print(f"Selected presets for {upload_id} (network {network_speed} Mbps): {selected_presets}")

    original_res = f"{orig_w}x{orig_h}" if orig_h > 0 and orig_w > 0 else ""

    status = existing_status or {
        "upload_id": upload_id,
        "filename": filename,
        "started_at": time.time(),
        "qualities": {},
        "overall": "running",
        "original_resolution": original_res,
        "original_quality_label": original_quality_label,
    }

    # Add course_id to status if available
    if course_id:
        status['course_id'] = course_id

    if 'original' not in status.get('qualities', {}):
        status.setdefault('qualities', {})
        status['qualities']['original'] = {
            'status': 'ok',
            'progress': 100,
            'file': filename,
            'path': filename,
            'resolution': original_res,
            'quality_label': original_quality_label,
        }

    status.update({
        "original_resolution": original_res,
        "original_quality_label": original_quality_label,
    })

    for label, cfg in QUALITY_PRESETS.items():
        if label not in status.get('qualities', {}):
            if label not in selected_presets:
                status.setdefault('qualities', {})
                status['qualities'][label] = {
                    "status": "skipped",
                    "progress": 0,
                    "target_resolution": f"{cfg['width']}x{cfg['height']}",
                }
            else:
                status.setdefault('qualities', {})
                status['qualities'][label] = {
                    "status": "queued",
                    "progress": 0,
                    "target_resolution": f"{cfg['width']}x{cfg['height']}",
                }

    _update_status(upload_id, lambda _: status, course_id)

    # Determine HLS output path based on course_id
    if course_id:
        hls_base_path = os.path.join(HLS_PATH, str(course_id), upload_id)
    else:
        hls_base_path = os.path.join(HLS_PATH, upload_id)

    master_path = os.path.join(hls_base_path, "master.m3u8")
    if os.path.exists(master_path):
        try:
            os.remove(master_path)
        except Exception:
            pass

    try:
        if _is_transcoding_stopped(upload_id):
            status['overall'] = 'stopped'
            _update_status(upload_id, lambda _: status, course_id)
            print(f"Transcoding stopped for {upload_id} before jobs")
            return status

        with ThreadPoolExecutor(max_workers=min(4, len(QUALITY_PRESETS))) as ex:
            futures = {}
            for label, cfg in QUALITY_PRESETS.items():
                if label not in selected_presets:
                    continue
                out_dir = os.path.join(hls_base_path, label)
                _cleanup_quality_dir(out_dir)
                ready_at = time.time()
                playlist_rel = os.path.join(label, 'playlist.m3u8').replace('\\', '/')

                _merge_quality_status(
                    upload_id, label,
                    {
                        'status': 'starting',
                        'progress': 0,
                        'started_at': ready_at,
                        'updated_at': ready_at,
                        'target_resolution': f"{cfg['width']}x{cfg['height']}",
                        'path': playlist_rel,
                        'playlist': playlist_rel,
                    },
                    course_id
                )

                def make_job(s=source_path, directory=out_dir, preset=dict(cfg), lbl=label, cid=course_id):
                    try:
                        _merge_quality_status(upload_id, lbl, {'status': 'running', 'progress': 0, 'updated_at': time.time()}, cid)
                        rc, err = _run_hls_with_progress(s, directory, preset, upload_id, lbl, cid)
                        return lbl, rc, err
                    except Exception as e:
                        print(f"Error in transcoding job for {upload_id}/{lbl}: {e}")
                        return lbl, 1, str(e)

                futures[ex.submit(make_job)] = label

            for fut in as_completed(futures.keys()):
                try:
                    lbl, rc, err = fut.result()
                    if rc != 0:
                        snapshot = get_status_snapshot(upload_id)
                        existing = (snapshot.get('qualities', {}) if snapshot else {}).get(lbl, {})
                        updates = {'status': 'error', 'updated_at': time.time()}
                        if err:
                            updates['message'] = err
                        if 'progress' not in existing:
                            updates['progress'] = 0
                        _merge_quality_status(upload_id, lbl, updates, course_id)
                except Exception as e:
                    print(f"Error processing transcoding result for {upload_id}: {e}")
                    continue
    except Exception as e:
        print(f"Error during parallel transcoding for {upload_id}: {e}")
        _update_status(upload_id, lambda s: {**s, 'overall': 'error', 'error': str(e), 'finished_at': time.time()}, course_id)

    try:
        def finalize(status_snapshot: Dict) -> Dict:
            status_snapshot = status_snapshot or {}
            qualities = status_snapshot.get('qualities', {})
            any_error = any(q.get('status') == 'error' for q in qualities.values())
            any_stopped = any(q.get('status') == 'stopped' for q in qualities.values())
            if any_stopped:
                status_snapshot['overall'] = 'stopped'
            elif any_error:
                status_snapshot['overall'] = 'error'
            else:
                status_snapshot['overall'] = 'ok'
            status_snapshot['finished_at'] = time.time()
            status_snapshot.setdefault('upload_id', upload_id)
            status_snapshot.setdefault('filename', filename)
            master_written = _write_master_playlist(upload_id, status_snapshot, course_id)
            if master_written:
                status_snapshot['master_playlist'] = 'master.m3u8'
            return status_snapshot

        final_status = _update_status(upload_id, finalize, course_id)

        # Update metadata service with original resolution and transcoding status
        try:
            transcoding_status = 'completed' if final_status.get('overall') == 'ok' else 'failed'
            requests.put(
                f"{METADATA_SERVICE_URL}/videos/{upload_id}",
                json={
                    "original_resolution": final_status.get("original_resolution"),
                    "original_quality_label": final_status.get("original_quality_label"),
                    "transcoding_status": transcoding_status
                },
                timeout=5
            )
            print(f"Updated metadata service: transcoding_status={transcoding_status} for {upload_id}")
        except Exception as e:
            print(f"Failed to update metadata service for {upload_id}: {e}")

        print(f"Transcoding completed for {upload_id}: {final_status.get('overall', 'unknown')}")
        return final_status
    except Exception as e:
        print(f"Error finalizing transcoding for {upload_id}: {e}")
        error_status = {
            "overall": "error",
            "error": f"Finalization failed: {str(e)}",
            "finished_at": time.time()
        }
        if course_id:
            error_status['course_id'] = course_id
        _update_status(upload_id, lambda _: error_status, course_id)

        # Notify metadata service of failure
        try:
            requests.post(
                f"{METADATA_SERVICE_URL}/videos/{upload_id}/transcoding-status",
                params={"status": "failed"},
                timeout=5
            )
        except Exception as notify_error:
            print(f"Failed to update transcoding status to 'failed' for {upload_id}: {notify_error}")

        return error_status

# API Endpoints

@app.post("/transcode/start")
async def transcode_start(request: TranscodeRequest):
    """Start transcoding for a video."""
    upload_id = request.upload_id
    filename = request.filename
    network_speed = request.network_speed
    qualities = request.qualities

    source_path, course_id = _resolve_source_path(upload_id, filename)
    if not source_path:
        raise HTTPException(status_code=404, detail="Source file not found")

    # Start transcoding in background thread
    thread = threading.Thread(
        target=transcode_video_task,
        args=(upload_id, filename, network_speed, qualities),
        daemon=True
    )
    thread.start()

    return {"status": "started", "upload_id": upload_id}


# Compatibility endpoints used by frontend proxy (path-style: /transcode/{upload_id})
@app.post("/transcode/{upload_id}")
async def transcode_trigger(upload_id: str, request: Request):
    """Trigger a transcode for an upload_id. Accepts optional JSON body { networkSpeed }.
    This mirrors the frontend expectation of POST /transcode/{hash}.
    """
    body = {}
    try:
        body = await request.json()
    except Exception:
        body = {}

    network_speed = float(body.get('networkSpeed') or body.get('network_speed') or 10.0)

    # Determine filename: prefer existing status filename, otherwise inspect originals folder
    status = _read_status(upload_id)
    filename = None
    if status and status.get('filename'):
        filename = status.get('filename')
    else:
        # Try legacy path first
        folder = os.path.join(ORIGINALS_PATH, upload_id)
        if os.path.exists(folder) and os.path.isdir(folder):
            # pick the first regular file
            for name in os.listdir(folder):
                if name.startswith('.'):
                    continue
                file_path = os.path.join(folder, name)
                if os.path.isfile(file_path):
                    filename = name
                    break

        # If not found, search in course-specific folders
        if not filename:
            for item in os.listdir(ORIGINALS_PATH):
                item_path = os.path.join(ORIGINALS_PATH, item)
                if os.path.isdir(item_path):
                    course_folder = os.path.join(item_path, upload_id)
                    if os.path.exists(course_folder) and os.path.isdir(course_folder):
                        for name in os.listdir(course_folder):
                            if name.startswith('.'):
                                continue
                            file_path = os.path.join(course_folder, name)
                            if os.path.isfile(file_path):
                                filename = name
                                break
                    if filename:
                        break

    if not filename:
        raise HTTPException(status_code=404, detail="Source file not found")

    # Start background transcode using existing task
    thread = threading.Thread(target=transcode_video_task, args=(upload_id, filename, network_speed), daemon=True)
    thread.start()
    return {"status": "started", "upload_id": upload_id}


@app.get("/transcode/{upload_id}/status")
async def transcode_status_compat(upload_id: str):
    """Return current transcode status for upload_id (compat path)."""
    status = get_status_snapshot(upload_id)
    if status and status != {}:
        return status
    
    # If status file doesn't exist, check metadata service for transcoding status
    try:
        response = requests.get(f"{METADATA_SERVICE_URL}/videos/{upload_id}", timeout=5)
        if response.status_code == 200:
            video_data = response.json()
            transcoding_status = video_data.get('transcoding_status', 'pending')
            if transcoding_status == 'transcoding':
                return {
                    "upload_id": upload_id,
                    "filename": video_data.get('filename', ''),
                    "overall": "running",
                    "qualities": {},
                    "started_at": time.time(),
                    "original_resolution": video_data.get('original_resolution', ''),
                    "original_quality_label": video_data.get('original_quality_label', '')
                }
            elif transcoding_status == 'completed':
                return {
                    "upload_id": upload_id,
                    "filename": video_data.get('filename', ''),
                    "overall": "ok",
                    "qualities": {},
                    "started_at": time.time(),
                    "original_resolution": video_data.get('original_resolution', ''),
                    "original_quality_label": video_data.get('original_quality_label', '')
                }
            elif transcoding_status == 'failed':
                return {
                    "upload_id": upload_id,
                    "filename": video_data.get('filename', ''),
                    "overall": "error",
                    "qualities": {},
                    "started_at": time.time(),
                    "original_resolution": video_data.get('original_resolution', ''),
                    "original_quality_label": video_data.get('original_quality_label', '')
                }
    except Exception as e:
        print(f"Failed to get status from metadata service: {e}")
    
    raise HTTPException(status_code=404, detail="Status not found")


@app.get("/transcode/{upload_id}/qualities")
async def transcode_qualities(upload_id: str):
    """Return qualities and master playlist info for an upload_id."""
    status = get_status_snapshot(upload_id) or {}
    qualities = status.get('qualities', {})

    # Try legacy path first
    master_path = os.path.join(HLS_PATH, upload_id, 'master.m3u8')
    master = None
    if os.path.exists(master_path):
        master = 'master.m3u8'
    else:
        # Search in course-specific folders
        for item in os.listdir(HLS_PATH):
            item_path = os.path.join(HLS_PATH, item)
            if os.path.isdir(item_path):
                course_master_path = os.path.join(item_path, upload_id, 'master.m3u8')
                if os.path.exists(course_master_path):
                    master = 'master.m3u8'
                    break

    return { 'master': master, 'qualities': qualities }

@app.get("/transcode/status/{upload_id}")
async def transcode_status(upload_id: str):
    """Get transcoding status for a video."""
    status = get_status_snapshot(upload_id)
    if status:
        return status
    
    # If status file doesn't exist, check metadata service for transcoding status
    try:
        response = requests.get(f"{METADATA_SERVICE_URL}/videos/{upload_id}", timeout=5)
        if response.status_code == 200:
            video_data = response.json()
            transcoding_status = video_data.get('transcoding_status', 'pending')
            if transcoding_status == 'transcoding':
                return {
                    "upload_id": upload_id,
                    "filename": video_data.get('filename', ''),
                    "overall": "running",
                    "qualities": {},
                    "started_at": time.time(),
                    "original_resolution": video_data.get('original_resolution', ''),
                    "original_quality_label": video_data.get('original_quality_label', '')
                }
            elif transcoding_status == 'completed':
                return {
                    "upload_id": upload_id,
                    "filename": video_data.get('filename', ''),
                    "overall": "ok",
                    "qualities": {},
                    "started_at": time.time(),
                    "original_resolution": video_data.get('original_resolution', ''),
                    "original_quality_label": video_data.get('original_quality_label', '')
                }
            elif transcoding_status == 'failed':
                return {
                    "upload_id": upload_id,
                    "filename": video_data.get('filename', ''),
                    "overall": "error",
                    "qualities": {},
                    "started_at": time.time(),
                    "original_resolution": video_data.get('original_resolution', ''),
                    "original_quality_label": video_data.get('original_quality_label', '')
                }
    except Exception as e:
        print(f"Failed to get status from metadata service: {e}")
    
    raise HTTPException(status_code=404, detail="Status not found")

@app.post("/transcode/resume")
async def transcode_resume():
    """Resume all incomplete transcoding jobs."""
    print("Checking for incomplete transcoding jobs...")
    
    if not os.path.exists(ORIGINALS_PATH):
        return {"status": "no_videos_folder"}
    
    resumed_count = 0
    for item in os.listdir(ORIGINALS_PATH):
        folder_path = os.path.join(ORIGINALS_PATH, item)
        if not os.path.isdir(folder_path):
            continue
        
        status_path = _status_path(item)
        if not os.path.exists(status_path):
            continue
        
        try:
            status = _read_status(item)
            if not status:
                continue
            
            overall_status = status.get('overall', 'unknown')
            filename = status.get('filename', '')
            
            if overall_status in ['running', 'error', 'unknown'] or overall_status != 'ok':
                if not filename:
                    continue
                
                source_path = os.path.join(folder_path, filename)
                if not os.path.exists(source_path):
                    continue
                
                print(f"Resuming incomplete transcoding for {item}: {filename}")
                thread = threading.Thread(
                    target=transcode_video_task,
                    args=(item, filename),
                    daemon=True
                )
                thread.start()
                resumed_count += 1
        except Exception as e:
            print(f"Error checking transcoding status for {item}: {e}")
            continue
    
    return {"status": "completed", "resumed_count": resumed_count}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "transcoding_service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
