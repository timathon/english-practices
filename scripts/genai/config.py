#!/usr/bin/env python3
"""
config.py — Configuration constants and helper functions for genai scripts.
"""

import os
import sys

api_key_high = "GOOGLE_API_KEY"
api_key_low = "GOOGLE_API_KEY_FREE"
model_high = "gemini-3.6-flash"
model_low = "gemini-3.5-flash-lite"

# UPPERCASE aliases for standard Python constant naming conventions
API_KEY_HIGH = api_key_high
API_KEY_LOW = api_key_low
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


def get_genai_config(use_high: bool = False):
    """
    Returns (api_key, model_name) tuple based on use_high flag.
    Defaults to low mode (GOOGLE_API_KEY_FREE and gemini-3.5-flash-lite).
    If use_high is True, uses GOOGLE_API_KEY and gemini-3.6-flash.
    """
    env_var_name = api_key_high if use_high else api_key_low
    api_key = os.environ.get(env_var_name)
    if not api_key:
        print(f"Error: {env_var_name} environment variable not set.", file=sys.stderr)
        sys.exit(1)
    model_name = model_high if use_high else model_low
    return api_key, model_name
