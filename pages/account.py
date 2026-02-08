"""
Mergenix — Account Page

Profile management, password change, connected accounts, plan info.
"""

import streamlit as st
from Source.auth import AuthManager, get_current_user, get_verified_tier, require_auth
from Source.tier_config import TierType, get_tier_config
from Source.ui.components import render_page_hero, render_section_header

# Auth guard
require_auth()

user = get_current_user()
if not user:
    st.stop()


@st.cache_resource
def get_auth_manager():
    return AuthManager()


auth_manager = get_auth_manager()

# Get verified tier from database (not stale session state)
verified_tier = get_verified_tier(user.get("email"))

render_page_hero(
    "Account Settings",
    "Manage your profile, security, and plan",
)

# ---------------------------------------------------------------------------
# Profile Information
# ---------------------------------------------------------------------------
render_section_header("\U0001f464 Profile Information")

col1, col2 = st.columns([2, 1])
with col1:
    st.markdown(
        f"""
        <div style="background:var(--card-bg);border:1px solid var(--card-border);
            border-radius:16px;padding:24px;">
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
                <div style="width:60px;height:60px;border-radius:50%;
                    background:linear-gradient(135deg,#06d6a0,#06b6d4);
                    display:flex;align-items:center;justify-content:center;
                    font-family:'Sora',sans-serif;font-weight:800;font-size:1.5rem;color:var(--bg-deep);">
                    {user.get('name', 'U')[0].upper()}</div>
                <div>
                    <h3 style="margin:0;font-family:'Sora',sans-serif;color:var(--text-primary);font-weight:700;">{user.get('name', 'User')}</h3>
                    <p style="margin:4px 0 0;font-family:'Lexend',sans-serif;color:var(--text-muted);font-size:0.9rem;">{user.get('email', '')}</p>
                </div>
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
                <span class="tier-badge {verified_tier}">{verified_tier.upper()} PLAN</span>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
with col2:
    tier_config = get_tier_config(TierType(verified_tier))
    st.markdown(
        f"""
        <div style="background:var(--card-bg);border:1px solid var(--card-border);
            border-radius:16px;padding:24px;text-align:center;">
            <div style="font-family:'Sora',sans-serif;font-weight:300;font-size:0.75rem;color:var(--text-dim);
                text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Current Plan</div>
            <div style="font-family:'Sora',sans-serif;font-weight:800;font-size:1.6rem;color:var(--accent-teal);">
                {tier_config.display_name}</div>
            <p style="font-family:'Lexend',sans-serif;color:var(--text-muted);font-size:0.82rem;margin:8px 0 0;">
                {tier_config.disease_limit} diseases &bull; {tier_config.trait_limit} traits</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

# ---------------------------------------------------------------------------
# Change Password
# ---------------------------------------------------------------------------
st.markdown("---")
render_section_header("\U0001f512 Change Password")

with st.form("change_password_form"):
    current_pw = st.text_input("Current Password", type="password", key="current_pw")
    new_pw = st.text_input("New Password", type="password", key="new_pw",
                           help="Min 8 characters, 1 uppercase, 1 lowercase, 1 digit")
    confirm_pw = st.text_input("Confirm New Password", type="password", key="confirm_pw")

    if st.form_submit_button("Update Password", type="primary", use_container_width=True):
        if not all([current_pw, new_pw, confirm_pw]):
            st.error("Please fill in all password fields.")
        elif new_pw != confirm_pw:
            st.error("New passwords do not match.")
        elif len(new_pw) < 8:
            st.error("Password must be at least 8 characters.")
        else:
            # Verify current password
            success, _, _status = auth_manager.authenticate(user["email"], current_pw)
            if not success and _status != "2fa_required":
                st.error("Current password is incorrect.")
            else:
                ok, msg = auth_manager.change_password(user["email"], current_pw, new_pw)
                if ok:
                    st.success(msg)
                else:
                    st.error(msg)

# ---------------------------------------------------------------------------
# Two-Factor Authentication
# ---------------------------------------------------------------------------
st.markdown("---")
render_section_header("Two-Factor Authentication")

if auth_manager.is_2fa_enabled(user["email"]):
    st.success("2FA is currently **enabled** on your account.")

    # Disable 2FA
    with st.expander("Disable 2FA"):
        disable_code = st.text_input(
            "Enter your authenticator code to disable 2FA",
            max_chars=6,
            key="disable_2fa_code",
        )
        if st.button("Disable 2FA", key="disable_2fa_btn"):
            if not disable_code:
                st.error("Please enter your authenticator code.")
            elif auth_manager.disable_2fa(user["email"], disable_code.strip()):
                st.success("2FA has been disabled.")
                st.rerun()
            else:
                st.error("Invalid code. Could not disable 2FA.")

    # Regenerate backup codes
    with st.expander("Regenerate Backup Codes"):
        regen_code = st.text_input(
            "Enter your authenticator code to regenerate backup codes",
            max_chars=6,
            key="regen_backup_code",
        )
        if st.button("Regenerate Backup Codes", key="regen_backup_btn"):
            if not regen_code:
                st.error("Please enter your authenticator code.")
            else:
                regen_ok, new_codes = auth_manager.regenerate_backup_codes(
                    user["email"], regen_code.strip()
                )
                if regen_ok and new_codes:
                    st.success("New backup codes generated. Save them securely!")
                    st.warning(
                        "These codes will only be shown once. "
                        "Store them in a safe place."
                    )
                    for bc in new_codes:
                        st.code(bc)
                else:
                    st.error("Invalid code. Could not regenerate backup codes.")
else:
    st.info("2FA adds an extra layer of security to your account.")

    # Step 1: Generate QR code
    if st.button("Enable 2FA", key="enable_2fa_btn"):
        setup_data = auth_manager.setup_2fa(user["email"])
        if setup_data:
            st.session_state["2fa_setup_secret"] = setup_data["secret"]
            st.session_state["2fa_setup_qr"] = setup_data["qr_code"]

    if st.session_state.get("2fa_setup_qr"):
        st.image(
            st.session_state["2fa_setup_qr"],
            caption="Scan this QR code with your authenticator app",
            width=250,
        )
        st.markdown("**Or enter this secret manually:**")
        st.code(st.session_state["2fa_setup_secret"])

        # Step 2: Verify code and enable
        verify_code = st.text_input(
            "Enter the 6-digit code from your authenticator app",
            max_chars=6,
            key="2fa_verify_code",
        )
        if st.button("Verify and Enable 2FA", key="2fa_verify_enable_btn"):
            if not verify_code:
                st.error("Please enter the 6-digit code.")
            else:
                enable_ok, backup_codes = auth_manager.verify_and_enable_2fa(
                    user["email"], verify_code.strip()
                )
                if enable_ok and backup_codes:
                    st.success("2FA is now enabled!")
                    st.warning(
                        "Save these backup codes securely. "
                        "They will only be shown once!"
                    )
                    for bc in backup_codes:
                        st.code(bc)
                    st.session_state.pop("2fa_setup_secret", None)
                    st.session_state.pop("2fa_setup_qr", None)
                else:
                    st.error("Invalid code. Please try again.")

# ---------------------------------------------------------------------------
# Plan Info
# ---------------------------------------------------------------------------
st.markdown("---")
render_section_header("\U0001f4b3 Your Plan")

if verified_tier == "free":
    st.info("You're on the Free plan. Upgrade to unlock more features!")
    if st.button("\U0001f680 Upgrade Your Plan", type="primary", use_container_width=True):
        st.switch_page("pages/subscription.py")
else:
    st.success(f"You're on the **{tier_config.display_name}** plan (lifetime access).")
    if st.button("View Plans", use_container_width=True):
        st.switch_page("pages/subscription.py")

# ---------------------------------------------------------------------------
# Logout / Danger Zone
# ---------------------------------------------------------------------------
st.markdown("---")
render_section_header("\u26a0\ufe0f Account Actions")

col_logout, col_delete = st.columns(2)
with col_logout:
    if st.button("Logout", use_container_width=True):
        auth_manager.logout()
        st.rerun()
with col_delete:
    st.markdown(
        """<div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);
            border-radius:12px;padding:16px;text-align:center;">
            <p style="font-family:'Lexend',sans-serif;color:var(--accent-rose);font-size:0.85rem;margin:0;">
                Account deletion is permanent and cannot be undone.<br>
                Contact support@mergenix.com to request account deletion.</p>
        </div>""",
        unsafe_allow_html=True,
    )
