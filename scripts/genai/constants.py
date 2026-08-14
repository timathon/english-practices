#!/usr/bin/env python3
"""
constants.py — Re-export configuration constants from config.py.
"""

try:
    from config import (
        api_key,
        api_key_free,
        model_high,
        model_low,
        API_KEY,
        API_KEY_FREE,
        MODEL_HIGH,
        MODEL_LOW,
        parse_high_flag,
        parse_paid_flag,
        get_genai_config,
        get_fallback_api_key,
    )
except ImportError:
    from .config import (
        api_key,
        api_key_free,
        model_high,
        model_low,
        API_KEY,
        API_KEY_FREE,
        MODEL_HIGH,
        MODEL_LOW,
        parse_high_flag,
        parse_paid_flag,
        get_genai_config,
        get_fallback_api_key,
    )

__all__ = [
    "api_key",
    "api_key_free",
    "model_high",
    "model_low",
    "API_KEY",
    "API_KEY_FREE",
    "MODEL_HIGH",
    "MODEL_LOW",
    "parse_high_flag",
    "parse_paid_flag",
    "get_genai_config",
    "get_fallback_api_key",
]
