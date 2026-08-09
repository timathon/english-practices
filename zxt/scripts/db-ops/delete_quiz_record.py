#!/usr/bin/env python3
"""
ZXT Remote Database Operations: Interactive Quiz History Deletion Tool
Usage: python3 zxt/scripts/db-ops/delete_quiz_record.py
"""

import os
import sys
import glob
import json
import urllib.request
import urllib.parse
import sqlite3

API_BASE_URL = "https://zxtapi.vibequizzing.com"

STUDENT_ROSTER = [
    {"id": "usr_stu_001", "name": "亚明", "username": "yaming", "className": "三年级A班"},
    {"id": "usr_stu_002", "name": "小红", "username": "xiaohong", "className": "三年级A班"},
    {"id": "usr_stu_003", "name": "小明", "username": "xiaoming", "className": "三年级A班"},
    {"id": "usr_stu_004", "name": "刚子", "username": "gangzi", "className": "三年级B班"},
    {"id": "usr_stu_005", "name": "莉莉", "username": "lili", "className": "三年级B班"},
]

def fetch_remote_history(student_id):
    url = f"{API_BASE_URL}/api/student/history?studentId={urllib.parse.quote(student_id)}"
    try:
        token = f"zxt_jwt_{student_id}_1700000000000"
        headers = {
            "User-Agent": "ZXT-Ops-Script/1.0",
            "Authorization": f"Bearer {token}"
        }
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("history", [])
    except Exception as e:
        print(f"⚠️ Remote fetch failed: {e}")
    return []

def delete_remote_record(student_id, record_id):
    url = f"{API_BASE_URL}/api/student/history/{urllib.parse.quote(record_id)}?studentId={urllib.parse.quote(student_id)}"
    try:
        token = f"zxt_jwt_{student_id}_1700000000000"
        headers = {
            "User-Agent": "ZXT-Ops-Script/1.0",
            "Authorization": f"Bearer {token}"
        }
        req = urllib.request.Request(url, method="DELETE", headers=headers)
        with urllib.request.urlopen(req) as resp:
            if resp.status in (200, 204):
                return True
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("success", False)
    except Exception as e:
        print(f"❌ Remote delete error: {e}")
        return False

def find_d1_sqlite_files():
    search_patterns = [
        "zxt/api/.wrangler/state/v3/d1/**/*.sqlite",
        "v2-api/.wrangler/state/v3/d1/**/*.sqlite"
    ]
    files = []
    for pattern in search_patterns:
        files.extend(glob.glob(pattern, recursive=True))
    return [f for f in files if "metadata" not in os.path.basename(f)]

def get_local_sqlite_history(student_id):
    d1_dbs = find_d1_sqlite_files()
    local_records = []
    for db_path in d1_dbs:
        try:
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='quiz_history';")
            if not cur.fetchone():
                conn.close()
                continue
            cur.execute("""
                SELECT id, poem_title, score, accuracy, quiz_type, completed_at 
                FROM quiz_history 
                WHERE student_id = ? 
                ORDER BY completed_at DESC
            """, (student_id,))
            rows = cur.fetchall()
            conn.close()
            for r in rows:
                local_records.append(({
                    "id": r[0],
                    "poemTitle": r[1],
                    "score": r[2],
                    "accuracy": r[3],
                    "quizType": r[4],
                    "completedAt": r[5]
                }, db_path))
        except Exception:
            pass
    return local_records

def delete_local_sqlite_record(db_path, record_id):
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("DELETE FROM quiz_history WHERE id = ?", (record_id,))
        conn.commit()
        affected = cur.rowcount
        conn.close()
        return affected > 0
    except Exception:
        return False

def main():
    print("=" * 65)
    print(" 🛠️  ZXT (知新堂) Quiz History Operations - Remote & Local Remover")
    print("=" * 65)
    print("\nSelect a student:")
    
    for idx, student in enumerate(STUDENT_ROSTER, 1):
        print(f"  [{idx}] {student['name']} (@{student['username']}) - {student['className']} (ID: {student['id']})")
        
    print("  [0] Cancel & Exit")

    while True:
        try:
            choice = input("\nEnter student number [0-5]: ").strip()
            if choice == "0":
                print("Operation cancelled.")
                sys.exit(0)
            st_idx = int(choice) - 1
            if 0 <= st_idx < len(STUDENT_ROSTER):
                selected_student = STUDENT_ROSTER[st_idx]
                break
            else:
                print("Invalid option. Please try again.")
        except (ValueError, KeyboardInterrupt):
            print("\nOperation cancelled.")
            sys.exit(0)

    student_id = selected_student["id"]
    student_name = selected_student["name"]
    print(f"\n🔍 Fetching records for student: {student_name} ({student_id})...")

    # Fetch from Remote API
    remote_records = fetch_remote_history(student_id)
    # Fetch from Local SQLite
    local_records = get_local_sqlite_history(student_id)

    combined_list = []
    for r in remote_records:
        combined_list.append({"record": r, "type": "REMOTE_API", "target": None})
    for r, db in local_records:
        combined_list.append({"record": r, "type": "LOCAL_SQLITE", "target": db})

    if not combined_list:
        print(f"\n⚠️  No quiz history records found for {student_name}.")
        sys.exit(0)

    print(f"\nFound {len(combined_list)} record(s) for {student_name}:")
    for idx, item in enumerate(combined_list, 1):
        rec = item["record"]
        source = f"[{item['type']}]"
        details_cnt = len(rec.get("details", [])) if "details" in rec else "?"
        print(f"  [{idx}] {rec['poemTitle']} | Score: {rec.get('score', 100)} | Date: {rec.get('completedAt', 'Unknown')} | Details: {details_cnt} | {source} (ID: {rec['id']})")
    print("  [0] Cancel & Exit")

    while True:
        try:
            choice = input(f"\nEnter record number to DELETE [0-{len(combined_list)}]: ").strip()
            if choice == "0":
                print("Operation cancelled.")
                sys.exit(0)
            rec_idx = int(choice) - 1
            if 0 <= rec_idx < len(combined_list):
                selected_target = combined_list[rec_idx]
                break
            else:
                print("Invalid option. Please try again.")
        except (ValueError, KeyboardInterrupt):
            print("\nOperation cancelled.")
            sys.exit(0)

    target_rec = selected_target["record"]
    target_type = selected_target["type"]

    confirm = input(f"\n⚠️  Are you sure you want to delete record '{target_rec['poemTitle']}' ({target_rec['id']}) from {target_type}? [y/N]: ").strip().lower()
    if confirm not in ['y', 'yes']:
        print("Deletion cancelled.")
        sys.exit(0)

    if target_type == "REMOTE_API":
        success = delete_remote_record(student_id, target_rec["id"])
    else:
        success = delete_local_sqlite_record(selected_target["target"], target_rec["id"])

    if success:
        print(f"\n✅ Successfully deleted quiz record '{target_rec['poemTitle']}' ({target_rec['id']}) from {target_type}!")
    else:
        print(f"\n❌ Failed to delete record '{target_rec['id']}'.")

if __name__ == "__main__":
    main()
