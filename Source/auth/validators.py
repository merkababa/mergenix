"""
Validation functions for user authentication inputs.
"""

from typing import Tuple, Dict


def validate_email(email: str) -> Tuple[bool, str]:
    """
    Validate email format.

    Args:
        email: Email address to validate

    Returns:
        Tuple of (is_valid: bool, error_message: str)
    """
    if not email or '@' not in email:
        return False, "Invalid email format"

    parts = email.split('@')
    if len(parts) != 2:
        return False, "Invalid email format"

    if '.' not in parts[1]:
        return False, "Invalid email format"

    return True, ""


def validate_password(password: str) -> Tuple[bool, str]:
    """
    Validate password strength.

    Args:
        password: Password to validate

    Returns:
        Tuple of (is_valid: bool, error_message: str)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"
    return True, ""


def validate_name(name: str) -> Tuple[bool, str]:
    """
    Validate user name.

    Args:
        name: Name to validate

    Returns:
        Tuple of (is_valid: bool, error_message: str)
    """
    if not name or len(name.strip()) < 2:
        return False, "Name must be at least 2 characters long"
    return True, ""


def get_password_strength(password: str) -> Dict:
    """
    Analyze password strength and provide feedback.

    Args:
        password: Password to analyze

    Returns:
        Dict with keys: score (0-4), label (str), suggestions (list)
    """
    score = 0
    suggestions = []

    # Length check
    if len(password) >= 8:
        score += 1
    else:
        suggestions.append("Use at least 8 characters")

    if len(password) >= 12:
        score += 1
    else:
        suggestions.append("Consider using 12+ characters for better security")

    # Character variety checks
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(not c.isalnum() for c in password)

    if has_upper:
        score += 1
    else:
        suggestions.append("Add uppercase letters")

    if has_lower:
        score += 1
    else:
        suggestions.append("Add lowercase letters")

    if has_digit:
        score += 1
    else:
        suggestions.append("Add numbers")

    if has_special:
        score += 1
        suggestions.append("Great! Contains special characters")
    else:
        suggestions.append("Add special characters (!@#$%^&*)")

    # Normalize score to 0-4
    score = min(score, 4)

    # Label based on score
    labels = {
        0: "Very Weak",
        1: "Weak",
        2: "Fair",
        3: "Good",
        4: "Strong"
    }

    return {
        "score": score,
        "label": labels[score],
        "suggestions": suggestions
    }
