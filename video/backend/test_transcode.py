#!/usr/bin/env python3

import os
import shutil
import unittest

from transcode import QUALITY_PRESETS, _write_master_playlist


class HlsPackagingTests(unittest.TestCase):
    def setUp(self):
        self.upload_id = "unit_test_hls"
        self.base_path = os.path.join("videos", self.upload_id)
        os.makedirs(self.base_path, exist_ok=True)

    def tearDown(self):
        shutil.rmtree(self.base_path, ignore_errors=True)

    def _create_variant_playlist(self, quality: str):
        variant_dir = os.path.join(self.base_path, quality)
        os.makedirs(variant_dir, exist_ok=True)
        playlist_path = os.path.join(variant_dir, "playlist.m3u8")
        with open(playlist_path, "w", encoding="utf-8") as fp:
            fp.write("#EXTM3U\n")
            fp.write("#EXT-X-VERSION:3\n")
            fp.write("#EXTINF:6.0,\n")
            fp.write("segment_000.ts\n")
        return playlist_path

    def test_master_playlist_written_when_variants_exist(self):
        # Create a couple of variant playlists
        created_qualities = list(QUALITY_PRESETS.keys())[:2]
        for quality in created_qualities:
            self._create_variant_playlist(quality)

        status_snapshot = {
            "qualities": {quality: {"status": "ok"} for quality in created_qualities}
        }

        master_path = _write_master_playlist(self.upload_id, status_snapshot)

        self.assertTrue(master_path.endswith("master.m3u8"))
        self.assertTrue(os.path.exists(master_path))

        with open(master_path, "r", encoding="utf-8") as fp:
            master_contents = fp.read()

        self.assertIn("#EXTM3U", master_contents)
        for quality in created_qualities:
            expected_line = f"{quality}/playlist.m3u8"
            self.assertIn(expected_line, master_contents)
            self.assertIn("BANDWIDTH=", master_contents)

    def test_master_playlist_not_written_when_no_successful_variants(self):
        status_snapshot = {
            "qualities": {label: {"status": "error"} for label in QUALITY_PRESETS.keys()}
        }

        master_path = _write_master_playlist(self.upload_id, status_snapshot)

        self.assertEqual(master_path, "")
        self.assertFalse(os.path.exists(os.path.join(self.base_path, "master.m3u8")))


if __name__ == "__main__":  # pragma: no cover
    unittest.main()