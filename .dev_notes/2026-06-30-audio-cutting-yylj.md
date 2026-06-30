# 岳阳楼记 (Yylj) Audio Cutting & Alignment

This document records the methodology, tools, and timings used to slice the classical Chinese audio recording `temp/audio/yylj/岳阳楼记老任.mp3` into sentence segments matching `data/W9A/w9a-u1/w9a-u1-passage-decoder-s.json`.

## 1. Objective & Requirements
- **Target File**: `temp/audio/yylj/岳阳楼记老任.mp3`
- **Sentence Mapping Source**: `data/W9A/w9a-u1/w9a-u1-passage-decoder-s.json` (contains exactly 13 sentences).
- **Naming Rule**: Output MP3 files must be saved with MD5 hash names generated from the verbatim sentence content (e.g. `md5(sentence_en) + ".mp3"`), as required by the frontend application (`PassageDecoderShell.tsx`) to resolve URLs.
- **R2 Prefix**: Uploaded to Cloudflare R2 bucket `embroid-001` under the directory path `ep/w9a/`.

## 2. Timing Correction & Segmentation Logic
Initial auto-detection of silences (using `ffmpeg -af silencedetect=n=-40dB:d=0.4`) detected over 80 natural pauses due to the reader's phrasing in classical Chinese. We refined the timeline to merge sub-segments into the 13 sentences:

| # | Sentence Content | MD5 Hash Name | Timing Boundary (seconds) |
|---|---|---|---|
| 1 | 庆历四年春，滕子京谪守巴陵郡。 | `2af20e19de7a683de9e49cdc7cc42b67` | 7.39s - 13.39s |
| 2 | 越明年，政通人和，百废具兴，乃重修岳阳楼，增其旧制，刻唐贤今人诗赋于其上，属予作文以记之。 | `663eb5449626022dafc2f1ade181df58` | 15.02s - 35.29s |
| 3 | 予观夫巴陵胜状，在洞庭一湖。 | `9d9b4b0bf5a6dfd60d07aaf1be3355c0` | 36.44s - 42.39s |
| 4 | 衔远山，吞长江，浩浩汤汤，横无际涯，朝晖夕阴，气象万千，此则岳阳楼之大观也，前人之述备矣。 | `4d5a200efdea5c085e785978be1f4a20` | 43.92s - 64.49s |
| 5 | 然则北通巫峡，南极潇湘，迁客骚人，多会于此，览物之情，得无异乎？ | `0a452c4b1c487149800a3bb3dd45679b` | 66.12s - 79.10s |
| 6 | 若夫淫雨霏霏，连月不开，阴风怒号，浊浪排空，日星隐曜，山岳潜形，商旅不行，樯倾楫摧，薄暮冥冥，虎啸猿啼。 | `bebe3acb92a71a865405876a465733f6` | 81.25s - 104.78s |
| 7 | 登斯楼也，则有去国怀乡，忧谗畏讥，满目萧然，感极而悲者矣。 | `0aa1324db4662410788bd4eb6b581641` | 104.78s - 118.10s |
| 8 | 至若春和景明，波澜不惊，上下天光，一碧万顷，沙鸥翔集，锦鳞游泳，岸芷汀兰，郁郁青青。 | `cf3ecb8de988aac54e6535656bff9580` | 120.22s - 141.25s |
| 9 | 而或长烟一空，皓月千里，浮光跃金，静影沉璧，渔歌互答，此乐何极！ | `780ef25bad9e85aa3f6687b7ca1b9f60` | 141.25s - 153.76s |
| 10 | 登斯楼也，则有心旷神怡，宠辱偕忘，把酒临风，其喜洋洋者矣。 | `1bf7f3f81616ec2e629b413a0d56e246` | 153.76s - 165.43s |
| 11 | 嗟夫！予尝求古仁人之心，或异二者之为，何哉？不以物喜，不以己悲。 | `f1e253f3fae8c6c36a9c818bcb05daf8` | 167.66s - 183.33s |
| 12 | 居庙堂之高则忧其民，处江湖之远则忧其君。是进亦忧，退亦忧。然则何时而乐耶？ | `df8313465d8713816a5c6505ff621d60` | 185.26s - 199.40s |
| 13 | 其必曰：“先天下 of 忧而忧，后天下之乐而乐”乎！噫！微斯人，吾谁与归？ | `47f74f7b169b105d31cd738ffd673eda` | 199.40s - 229.28s |

## 3. Tooling and Interactive Tuner
To solve the issue of cutting correctness and allow flexible adjustment without editing code, we established an interactive workflow:

1. **Config File**: Saved all timestamps in [timings.json](file:///home/timathon/codes/smartedu/english-practices/temp/audio/yylj/timings.json).
2. **Interactive Node Server (`scripts/cut_yylj.cjs`)**:
   - Starting the server via `node scripts/cut_yylj.cjs` launches a local web UI on `http://localhost:3010`.
   - The web UI lists the sentences, their current start/end bounds, MD5 hashes, and hosts audio players.
   - Provides a "Play Segment" button to play exactly the defined range, and inputs to edit the boundaries.
   - Clicking **"Save Changes & Re-cut Audio"** POSTs to the server, which updates `timings.json` and re-runs `ffmpeg` instantly.
3. **Upload Script (`scripts/upload_yylj_audio.cjs`)**:
   - Reads the sliced `.mp3` files in the output directory and uploads them to the Cloudflare R2 bucket.
