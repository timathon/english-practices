#!/usr/bin/env python3
"""
config.py — Configuration constants and helper functions for genai scripts.
"""

import os
import sys

api_key = "GOOGLE_API_KEY"
api_key_free = "GOOGLE_API_KEY_FREE"
model_high = "gemini-3.7-flash"
model_low = "gemini-3.5-flash-lite"

# UPPERCASE aliases for standard Python constant naming conventions
API_KEY = api_key
API_KEY_FREE = api_key_free
MODEL_HIGH = model_high
MODEL_LOW = model_low


def parse_high_flag() -> bool:
    """
    Checks sys.argv for 'high' or '--high' flag.
    Removes the flag from sys.argv if present and returns True.
    Also strips obsolete 'model=3.5' or 'model=high' if present.
    """
    use_high = False
    for flag in ["high", "--high", "model=high", "model=3.5"]:
        if flag in sys.argv:
            if flag in ["high", "--high", "model=high"]:
                use_high = True
            sys.argv.remove(flag)
    return use_high


def parse_paid_flag() -> bool:
    """
    Checks sys.argv for '--paid' or 'paid' flag.
    Removes the flag from sys.argv if present and returns True.
    """
    use_paid = False
    for flag in ["paid", "--paid", "key=paid", "--api-key"]:
        if flag in sys.argv:
            use_paid = True
            sys.argv.remove(flag)
    return use_paid


def get_genai_config(use_high: bool = False, force_paid: bool = None):
    """
    Returns (key_val, model_name) tuple based on use_high flag and available API keys.
    Tries GOOGLE_API_KEY_FREE (api_key_free) first by default regardless of model_high / model_low.
    If GOOGLE_API_KEY_FREE is missing or if force_paid/--paid flag is specified,
    falls back to or uses GOOGLE_API_KEY (api_key).
    """
    if force_paid is None:
        force_paid = parse_paid_flag()

    free_key_val = os.environ.get(api_key_free)
    paid_key_val = os.environ.get(api_key)

    if force_paid:
        selected_key = paid_key_val or free_key_val
    else:
        selected_key = free_key_val or paid_key_val

    if not selected_key:
        print(
            f"Error: Neither {api_key_free} nor {api_key} environment variables are set.",
            file=sys.stderr,
        )
        sys.exit(1)

    model_name = model_high if use_high else model_low
    return selected_key, model_name


def get_fallback_api_key(current_key: str) -> str | None:
    """
    Returns an alternative API key if current_key is exhausted at runtime.
    """
    free_key_val = os.environ.get(api_key_free)
    paid_key_val = os.environ.get(api_key)

    if current_key == free_key_val and paid_key_val and paid_key_val != free_key_val:
        return paid_key_val
    elif current_key == paid_key_val and free_key_val and free_key_val != paid_key_val:
        return free_key_val
    return None
