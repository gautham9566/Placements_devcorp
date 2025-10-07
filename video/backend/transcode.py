import os
import subprocess
import json
import time
from typing import Dict, Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

# This module requires ffmpeg to be installed on the server and available on PATH.

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
    },
}

RESOLUTIONS = {
    label: (cfg["width"], cfg["height"]) for label, cfg in QUALITY_PRESETS.items()
}


def _to_kbps(value: int) -> str:
    return f"{max(1, int(value) // 1000)}k"


def _cleanup_quality_dir(path: str):
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


def _write_master_playlist(upload_id: str, status_snapshot: Dict) -> str:
    base_folder = f"videos/{upload_id}"
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


def _build_scale_filter(width: int, height: int) -> str:
    # Ensure both dimensions are divisible by 2 after scaling
    # Use -2 which means "keep aspect ratio and make divisible by 2"
    return f"scale='min({width},iw)':'min({height},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2"


def _ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def _status_path(upload_id: str) -> str:
    return f"videos/{upload_id}/.transcode_status.json"


def _write_status(upload_id: str, data: Dict):
    path = _status_path(upload_id)
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f)
    except Exception:
        pass


def _read_status(upload_id: str) -> Dict:
    path = _status_path(upload_id)
    if not os.path.exists(path):
        return {}
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


_STATUS_LOCKS: Dict[str, Lock] = {}
_STATUS_LOCKS_LOCK = Lock()


def _get_status_lock(upload_id: str) -> Lock:
    with _STATUS_LOCKS_LOCK:
        lock = _STATUS_LOCKS.get(upload_id)
        if lock is None:
            lock = Lock()
            _STATUS_LOCKS[upload_id] = lock
        return lock


def _update_status(upload_id: str, mutator: Callable[[Dict], Dict]) -> Dict:
    lock = _get_status_lock(upload_id)
    with lock:
        current = _read_status(upload_id)
        updated = mutator(current or {}) if mutator else (current or {})
        if updated is None:
            updated = current or {}
        _write_status(upload_id, updated)
        return updated


def _merge_quality_status(upload_id: str, label: str, updates: Dict) -> Dict:
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

    return _update_status(upload_id, mutate)


def get_status_snapshot(upload_id: str) -> Dict:
    lock = _get_status_lock(upload_id)
    with lock:
        return _read_status(upload_id)


def _run_ffmpeg(source_path: str, out_path: str, width: int, height: int):
    # Simple blocking ffmpeg run (kept for fallback)
    scale_filter = _build_scale_filter(width, height)
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        source_path,
        "-vf",
        scale_filter,
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        out_path,
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return proc.returncode, proc.stderr.decode('utf-8', errors='ignore')


def _get_duration_seconds(path: str) -> float:
    try:
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            path,
        ]
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode('utf-8').strip()
        return float(out) if out else 0.0
    except Exception:
        return 0.0


def _probe_video_resolution(path: str):
    """Return (width, height) of the first video stream or (0,0) on failure."""
    try:
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height',
            '-of', 'csv=p=0:s=x',
            path,
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


def _run_hls_with_progress(source_path: str, out_dir: str, preset: Dict, upload_id: str, label: str):
    """Run ffmpeg to generate HLS output for a single quality while updating status."""
    width = int(preset.get("width"))
    height = int(preset.get("height"))
    duration = _get_duration_seconds(source_path)
    scale_filter = _build_scale_filter(width, height)
    playlist_path = os.path.join(out_dir, "playlist.m3u8")
    segment_pattern = os.path.join(out_dir, "segment_%03d.ts")
    segment_duration = int(preset.get("segment_duration", 6))

    cmd = [
        'ffmpeg',
        '-y',
        '-i', source_path,
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
        # Use unbuffered mode for real-time progress updates
        proc = subprocess.Popen(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            universal_newlines=True,  # Read as strings for easier line processing
            bufsize=1  # Line buffered
        )
    except Exception as e:
        return 1, str(e)

    current_progress = 0
    started_at = time.time()
    _merge_quality_status(
        upload_id,
        label,
        {
            'status': 'running',
            'progress': current_progress,
            'started_at': started_at,
            'updated_at': started_at,
            'target_resolution': f'{width}x{height}',
        },
    )
    
    # parse stderr lines for progress
    try:
        while True:
            line = proc.stderr.readline()
            if not line:
                break
            line = line.strip()
            if 'time=' in line:
                # parse time from line like "frame=   10 fps=0.0 q=0.0 size=     256kB time=00:00:00.40 bitrate=5232.0kbits/s speed=0.80x"
                try:
                    time_str = line.split('time=')[1].split()[0]  # 00:00:00.40
                    h, m, s = time_str.split(':')
                    out_s = int(h)*3600 + int(m)*60 + float(s)
                    if duration > 0:
                        percent = int(min(100, (out_s / duration) * 100))
                    else:
                        percent = 0
                    if percent != current_progress:
                        current_progress = percent
                        _merge_quality_status(
                            upload_id,
                            label,
                            {
                                'status': 'running',
                                'progress': percent,
                                'updated_at': time.time(),
                            },
                        )
                except Exception:
                    pass

        # wait for process to finish
        rc = proc.wait()
        if rc == 0:
            # finish at 100%
            finished_at = time.time()
            _merge_quality_status(
                upload_id,
                label,
                {
                    'status': 'ok',
                    'progress': 100,
                    'path': os.path.join(label, 'playlist.m3u8'),
                    'playlist': os.path.join(label, 'playlist.m3u8'),
                    'finished_at': finished_at,
                    'updated_at': finished_at,
                },
            )
            return 0, ''
        else:
            # read stderr
            err = ''
            try:
                stderr_bytes = proc.stderr.read() if proc.stderr else b''
                err = stderr_bytes.decode('utf-8', errors='ignore') if isinstance(stderr_bytes, bytes) else str(stderr_bytes)
            except Exception:
                err = 'Unknown error'
            finished_at = time.time()
            _merge_quality_status(
                upload_id,
                label,
                {
                    'status': 'error',
                    'progress': current_progress,
                    'message': err,
                    'finished_at': finished_at,
                    'updated_at': finished_at,
                },
            )
            return rc, err
    except Exception as e:
        try:
            proc.kill()
        except Exception:
            pass
        finished_at = time.time()
        _merge_quality_status(
            upload_id,
            label,
            {
                'status': 'error',
                'progress': current_progress,
                'message': str(e),
                'finished_at': finished_at,
                'updated_at': finished_at,
            },
        )
        return 1, str(e)


def _get_quality_label_from_resolution(width: int, height: int) -> str:
    """Map resolution to quality label like '1080p', '720p', etc."""
    if height <= 0:
        return "unknown"
    
    # Define common resolution heights to quality labels
    quality_map = {
        2160: "2160p",
        1440: "1440p",
        1080: "1080p",
        720: "720p",
        480: "480p",
        360: "360p",
        240: "240p"
    }
    
    # Find the closest match
    for h, label in quality_map.items():
        if height >= h:
            return label
    
    # If lower than 240p, return custom label
    return f"{height}p"


def transcode_video(upload_id: str, filename: str) -> Dict[str, Dict]:
    """Transcode the uploaded video into multiple quality folders in parallel and persist status.

    Status file path: videos/<upload_id>/.transcode_status.json
    """
    base_folder = f"videos/{upload_id}"
    source_path = os.path.join(base_folder, filename)
    if not os.path.exists(source_path):
        status = {"error": f"Source file not found: {source_path}"}
        _update_status(upload_id, lambda _: status)
        return status

    # probe original resolution and choose which presets to run
    orig_w, orig_h = _probe_video_resolution(source_path)
    # if probe fails, default to running all presets
    if orig_h <= 0:
        selected_presets = list(QUALITY_PRESETS.keys())
        original_quality_label = "unknown"
    else:
        # Select presets with height <= original (includes original quality + lower resolutions)
        selected_presets = [label for label, cfg in QUALITY_PRESETS.items() if int(cfg.get('height', 0)) <= orig_h]
        original_quality_label = _get_quality_label_from_resolution(orig_w, orig_h)

    # prepare original entry
    original_res = f"{orig_w}x{orig_h}" if orig_h > 0 and orig_w > 0 else ""

    # initialize status
    status = {
        "upload_id": upload_id,
        "filename": filename,
        "started_at": time.time(),
        "qualities": {},
        "overall": "running",
        "original_resolution": original_res,
        "original_quality_label": original_quality_label,
    }

    # include original as a quality entry so status shows the original file/resolution
    try:
        status['qualities']['original'] = {
            'status': 'ok',
            'progress': 100,
            'file': filename,
            'path': filename,
            'resolution': original_res,
            'quality_label': original_quality_label,
        }
    except Exception:
        pass
    # only set statuses for selected presets
    for label, cfg in QUALITY_PRESETS.items():
        if label not in selected_presets:
            # mark as skipped
            status['qualities'][label] = {
                "status": "skipped",
                "progress": 0,
                "target_resolution": f"{cfg['width']}x{cfg['height']}",
            }
            continue
        # otherwise queue for processing
        status['qualities'][label] = {
            "status": "queued",
            "progress": 0,
            "target_resolution": f"{cfg['width']}x{cfg['height']}",
        }

    _update_status(upload_id, lambda _: status)

    # remove any stale master playlist before processing
    master_path = os.path.join(base_folder, "master.m3u8")
    if os.path.exists(master_path):
        try:
            os.remove(master_path)
        except Exception:
            pass

    # Run per-quality jobs in parallel
    with ThreadPoolExecutor(max_workers=min(4, len(QUALITY_PRESETS))) as ex:
        futures = {}
        for label, cfg in QUALITY_PRESETS.items():
            if label not in selected_presets:
                # skip creating dirs/jobs for skipped presets
                continue
            out_dir = os.path.join(base_folder, label)
            _cleanup_quality_dir(out_dir)
            ready_at = time.time()
            playlist_rel = os.path.join(label, 'playlist.m3u8').replace('\\', '/')

            _merge_quality_status(
                upload_id,
                label,
                {
                    'status': 'starting',
                    'progress': 0,
                    'started_at': ready_at,
                    'updated_at': ready_at,
                    'target_resolution': f"{cfg['width']}x{cfg['height']}",
                    'path': playlist_rel,
                    'playlist': playlist_rel,
                },
            )

            def make_job(s=source_path, directory=out_dir, preset=dict(cfg), lbl=label):
                _merge_quality_status(
                    upload_id,
                    lbl,
                    {
                        'status': 'running',
                        'progress': 0,
                        'updated_at': time.time(),
                    },
                )
                rc, err = _run_hls_with_progress(s, directory, preset, upload_id, lbl)
                return lbl, rc, err

            futures[ex.submit(make_job)] = label

        # collect results as they finish
        for fut in as_completed(futures.keys()):
            lbl, rc, err = fut.result()
            if rc != 0:
                # ensure an error message is recorded even if ffmpeg failed very early
                snapshot = get_status_snapshot(upload_id)
                existing = (snapshot.get('qualities', {}) if snapshot else {}).get(lbl, {})
                updates = {
                    'status': 'error',
                    'updated_at': time.time(),
                }
                if err:
                    updates['message'] = err
                if 'progress' not in existing:
                    updates['progress'] = 0
                _merge_quality_status(upload_id, lbl, updates)

    # finalize overall status
    def finalize(status_snapshot: Dict) -> Dict:
        status_snapshot = status_snapshot or {}
        qualities = status_snapshot.get('qualities', {})
        any_error = any(q.get('status') == 'error' for q in qualities.values())
        status_snapshot['overall'] = 'error' if any_error else 'ok'
        status_snapshot['finished_at'] = time.time()
        status_snapshot.setdefault('upload_id', upload_id)
        status_snapshot.setdefault('filename', filename)
        master_written = _write_master_playlist(upload_id, status_snapshot)
        if master_written:
            status_snapshot['master_playlist'] = 'master.m3u8'
        return status_snapshot

    final_status = _update_status(upload_id, finalize)

    return final_status


def transcode_async(upload_id: str, filename: str):
    # kept for compatibility; caller can spawn a thread
    return transcode_video(upload_id, filename)
