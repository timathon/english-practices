#!/usr/bin/env python3
"""
constants.py — Re-export configuration constants from config.py.
"""

try:
    from config import (
        api_key_high,
        api_key_low,
        model_high,
        model_low,
        API_KEY_HIGH,
        API_KEY_LOW,
        MODEL_HIGH,
        MODEL_LOW,
        parse_high_flag,
        get_genai_config,
    )
except ImportError:
    from .config import (
        api_key_high,
        api_key_low,
        model_high,
        model_low,
        API_KEY_HIGH,
        API_KEY_LOW,
        MODEL_HIGH,
        MODEL_LOW,
        parse_high_flag,
        get_genai_config,
    )

__all__ = [
    "api_key_high",
    "api_key_low",
    "model_high",
    "model_low",
    "API_KEY_HIGH",
    "API_KEY_LOW",
    "MODEL_HIGH",
    "MODEL_LOW",
    "parse_high_flag",
    "get_genai_config",
]
