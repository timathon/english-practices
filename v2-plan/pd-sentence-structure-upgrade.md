# Passage Decoder Sentence Structure (Main Verb) Upgrade Plan

## Overview
Upgrade existing Passage Decoder JSONs to include sentence structure and main verb annotations for every sentence:
- `verb`: The main finite verb / predicate phrase of the main clause.
- `verb_range`: `[start, end]` character slice index in `en`.
- `pattern`: Core sentence structure (e.g. `SVO`, `SVC`, `SVOC`, `SVOO`, `SV`, `SV (被动)`, `SVC (表语从句)`, `SVO (宾语从句)`, `SVOA`, `SV (祈使句)`).

---

## Progress Tracker

### Batch 1: T8A (t8a-reading-yb-part-1)
- [x] `v2-data/T8A/t8a-reading-yb-part-1/t8a-reading-yb-part-1-passage-decoder-w-test-1.json` (75/75, 100%)
- [x] `v2-data/T8A/t8a-reading-yb-part-1/t8a-reading-yb-part-1-passage-decoder-w-test-2.json` (80/80, 100%)
- [x] `v2-data/T8A/t8a-reading-yb-part-1/t8a-reading-yb-part-1-passage-decoder-w-test-3.json` (74/74, 100%)
- [x] `v2-data/T8A/t8a-reading-yb-part-1/t8a-reading-yb-part-1-passage-decoder-w-test-4.json` (60/60, 100%)
- [x] `v2-data/T8A/t8a-reading-yb-part-1/t8a-reading-yb-part-1-passage-decoder-w-test-5.json` (78/78, 100%)

### Batch 2: A8A
- [x] `v2-data/A8A/a8a-u1/a8a-u1-passage-decoder-s.json` (66/66, 100%)
- [x] `v2-data/A8A/a8a-u2/a8a-u2-passage-decoder-s.json` (63/63, 100%)
- [x] `v2-data/A8A/a8a-u3/a8a-u3-passage-decoder-s.json` (96/96, 100%)
- [x] `v2-data/A8A/a8a-u4/a8a-u4-passage-decoder-s.json` (35/35, 100%)
- [x] `v2-data/A8A/a8a-u5/a8a-u5-passage-decoder-s.json` (62/62, 100%)
- [x] `v2-data/A8A/a8a-u6/a8a-u6-passage-decoder-s.json` (58/58, 100%)
- [x] `v2-data/A8A/a8a-u7/a8a-u7-passage-decoder-s.json` (43/43, 100%)
- [x] `v2-data/A8A/a8a-u8/a8a-u8-passage-decoder-s.json` (62/62, 100%)

### Batch 3: A7A & A7B
- [x] `v2-data/A7A/a7a-u1/a7a-u1-passage-decoder-s.json` (81/81, 100%)
- [x] `v2-data/A7A/a7a-u2/a7a-u2-passage-decoder-s.json` (48/48, 100%)
- [x] `v2-data/A7A/a7a-u3/a7a-u3-passage-decoder-s.json` (24/24, 100%)
- [x] `v2-data/A7A/a7a-u4/a7a-u4-passage-decoder-s.json` (24/24, 100%)
- [x] `v2-data/A7A/a7a-u5/a7a-u5-passage-decoder-s.json` (29/29, 100%)
- [x] `v2-data/A7A/a7a-u6/a7a-u6-passage-decoder-s.json` (36/36, 100%)
- [x] `v2-data/A7A/a7a-u7/a7a-u7-passage-decoder-s.json` (92/92, 100%)
- [x] `v2-data/A7A/a7a-uz/a7a-uz-passage-decoder-w-1.json` (156/156, 100%)
- [x] `v2-data/A7B/a7b-u1/a7b-u1-passage-decoder-s.json` (36/36, 100%)
- [x] `v2-data/A7B/a7b-u2/a7b-u2-passage-decoder-s.json` (45/45, 100%)
- [x] `v2-data/A7B/a7b-u3/a7b-u3-passage-decoder-s.json` (42/42, 100%)
- [x] `v2-data/A7B/a7b-u4/a7b-u4-passage-decoder-s.json` (61/61, 100%)
- [x] `v2-data/A7B/a7b-u5/a7b-u5-passage-decoder-s.json` (24/24, 100%)
- [x] `v2-data/A7B/a7b-u6/a7b-u6-passage-decoder-s.json` (35/35, 100%)
- [x] `v2-data/A7B/a7b-u7/a7b-u7-passage-decoder-s.json` (61/61, 100%)
- [x] `v2-data/A7B/a7b-u7/a7b-u7-passage-decoder-w.json` (201/201, 100%)
- [x] `v2-data/A7B/a7b-u8/a7b-u8-passage-decoder-s.json` (41/41, 100%)
- [x] `v2-data/A7B/a7b-u8/a7b-u8-passage-decoder-w.json` (181/181, 100%)
- [x] `v2-data/A7B/a7b-uz/a7b-uz-passage-decoder-w.json` (194/194, 100%)

### Batch 4: SA1 & T7A
- [x] `v2-data/SA1/sa1-u0/sa1-u0-passage-decoder-s.json` (10/10, 100%)
- [x] `v2-data/SA1/sa1-u1/sa1-u1-passage-decoder-s.json` (39/39, 100%)
- [x] `v2-data/SA1/sa1-u2/sa1-u2-passage-decoder-s.json` (46/46, 100%)
- [x] `v2-data/SA1/sa1-u3/sa1-u3-passage-decoder-s.json` (34/34, 100%)
- [x] `v2-data/SA1/sa1-u4/sa1-u4-passage-decoder-s.json` (66/66, 100%)
- [x] `v2-data/SA1/sa1-u5/sa1-u5-passage-decoder-s.json` (36/36, 100%)
- [x] `v2-data/T7A/t7a-reading-yb-part-1/t7a-reading-yb-part-1-passage-decoder-w-test-1.json` (78/78, 100%)
- [x] `v2-data/T7A/t7a-reading-yb-part-1/t7a-reading-yb-part-1-passage-decoder-w-test-2.json` (64/64, 100%)
- [x] `v2-data/T7A/t7a-reading-yb-part-1/t7a-reading-yb-part-1-passage-decoder-w-test-3.json` (63/63, 100%)

### Batch 5: Primary (A3A, A3B, A4A, A4B, A5A, A5B, A6A, A6B, A9)
- [ ] Primary grades (41 passage-decoder files)

### Batch 6: Special Series (B-NCE2, B-PU0, B-PU1, B-Think1, RAZ-B, W7A, W9A, E-LYRICS)
- [ ] Special series (51 passage-decoder files)


