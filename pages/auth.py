"""
Mergenix — Authentication Page

23andMe-style centered sign-in/register with Google OAuth.
Migrated from pages/1_Login.py — CSS removed (injected globally).
"""

import streamlit as st
from Source.auth import AuthManager
from Source.auth.email import send_password_reset_email, send_verification_email
from Source.auth.oauth import GoogleOAuthHandler


@st.cache_resource
def get_auth_manager():
    return AuthManager()


@st.cache_resource
def get_oauth_handler():
    return GoogleOAuthHandler()


auth_manager = get_auth_manager()
oauth_handler = get_oauth_handler()

# ========== HANDLE OAUTH CALLBACK ==========
query_params = st.query_params
if "oauth_callback" in query_params and query_params["oauth_callback"] == "google":
    if "code" in query_params and "state" in query_params:
        received_code = query_params["code"]
        received_state = query_params["state"]
        expected_state = st.session_state.get("oauth_state")

        if not oauth_handler.validate_state_token(received_state, expected_state):
            st.error("Invalid OAuth state. Possible CSRF attack detected.")
            st.stop()

        try:
            with st.spinner("Authenticating with Google..."):
                tokens = oauth_handler.exchange_code_for_tokens(received_code)
                user_info = oauth_handler.get_user_info(tokens["access_token"])
                success, user_data, message = oauth_handler.authenticate_or_create_user(
                    user_info, auth_manager
                )

                if success:
                    st.session_state["authenticated"] = True
                    st.session_state["user"] = user_data
                    st.session_state["user_email"] = user_data["email"]
                    st.session_state["user_name"] = user_data["name"]
                    st.session_state["user_tier"] = user_data["tier"]
                    if "oauth_state" in st.session_state:
                        del st.session_state["oauth_state"]
                    st.query_params.clear()
                    st.success(f"Welcome! {message}")
                    st.balloons()
                    import time
                    time.sleep(1)
                    # Redirect to origin page or analysis
                    redirect = st.session_state.pop("auth_redirect", "pages/analysis.py")
                    st.switch_page(redirect)
                else:
                    st.error(message)
        except Exception as e:
            st.error(f"OAuth authentication failed: {e}")

    elif "error" in query_params:
        error = query_params.get("error", "unknown")
        st.error(f"OAuth authentication failed: {error}")

# ========== HANDLE EMAIL VERIFICATION & PASSWORD RESET ==========
_action = query_params.get("action")
_token = query_params.get("token")

if _action == "verify" and _token:
    _v_success, _v_msg = auth_manager.verify_email(_token)
    if _v_success:
        st.success(_v_msg)
    else:
        st.error(_v_msg)
        # Offer to resend
        _resend_email = st.text_input("Enter your email to resend verification", key="resend_verify_email")
        if st.button("Resend Verification Email", key="resend_verify_btn"):
            if _resend_email:
                _r_ok, _r_msg, _r_token = auth_manager.resend_verification(_resend_email)
                if _r_ok:
                    if _r_token:
                        send_verification_email(_resend_email, _r_token)
                    st.info(_r_msg)
                else:
                    st.error(_r_msg)
    st.stop()

if _action == "reset" and _token:
    st.markdown(
        """
        <div class="login-card">
            <h1 class="login-title">Reset Your Password</h1>
            <p class="login-subtitle">Enter your new password below</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    with st.form("reset_password_form", clear_on_submit=True):
        _new_pw = st.text_input("New Password", type="password", placeholder="Min 8 characters", key="reset_new_pw")
        _confirm_pw = st.text_input("Confirm New Password", type="password", placeholder="Confirm password", key="reset_confirm_pw")
        _reset_submit = st.form_submit_button("Reset Password", type="primary", use_container_width=True)

        if _reset_submit:
            if not _new_pw or not _confirm_pw:
                st.error("Please fill in both password fields.")
            elif _new_pw != _confirm_pw:
                st.error("Passwords do not match.")
            else:
                _rp_ok, _rp_msg = auth_manager.complete_password_reset(_token, _new_pw)
                if _rp_ok:
                    st.success(_rp_msg)
                    st.info("You can now sign in with your new password.")
                else:
                    st.error(_rp_msg)
    st.stop()

# ========== 2FA CHALLENGE ==========
if st.session_state.get("2fa_pending_email"):
    _2fa_email = st.session_state["2fa_pending_email"]

    st.markdown(
        """
        <div class="login-card">
            <div class="dna-logo">
                <span class="dna-dot"></span><span class="dna-dot"></span>
                <span class="dna-dot"></span><span class="dna-dot"></span>
                <span class="dna-dot"></span>
            </div>
            <h1 class="login-title">Two-Factor Authentication</h1>
            <p class="login-subtitle">Enter the code from your authenticator app</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if st.session_state.get("2fa_use_backup"):
        # Backup code entry
        st.markdown('<div class="login-card" style="animation-delay: 0.2s;">', unsafe_allow_html=True)
        with st.form("2fa_backup_form", clear_on_submit=True):
            backup_code = st.text_input(
                "Backup Code",
                placeholder="xxxx-xxxx",
                key="2fa_backup_code",
            )
            col_verify_b, col_back = st.columns(2)
            with col_verify_b:
                submit_backup = st.form_submit_button(
                    "Verify Backup Code", type="primary", use_container_width=True
                )
            with col_back:
                use_totp = st.form_submit_button(
                    "Use authenticator instead", use_container_width=True
                )

            if submit_backup:
                if not backup_code:
                    st.error("Please enter a backup code.")
                elif auth_manager.verify_2fa_backup_code(_2fa_email, backup_code.strip()):
                    user_data = auth_manager.get_user(_2fa_email)
                    st.session_state["authenticated"] = True
                    st.session_state["user"] = user_data
                    st.session_state["user_email"] = user_data["email"]
                    st.session_state["user_name"] = user_data["name"]
                    st.session_state["user_tier"] = user_data["tier"]
                    st.session_state.pop("2fa_pending_email", None)
                    st.session_state.pop("2fa_use_backup", None)
                    st.success("Login successful!")
                    import time
                    time.sleep(1)
                    redirect = st.session_state.pop("auth_redirect", "pages/analysis.py")
                    st.switch_page(redirect)
                else:
                    st.error("Invalid backup code. Please try again.")

            if use_totp:
                st.session_state.pop("2fa_use_backup", None)
                st.rerun()
        st.markdown('</div>', unsafe_allow_html=True)
    else:
        # TOTP code entry
        st.markdown('<div class="login-card" style="animation-delay: 0.2s;">', unsafe_allow_html=True)
        with st.form("2fa_totp_form", clear_on_submit=True):
            totp_code = st.text_input(
                "Authentication Code",
                max_chars=6,
                placeholder="000000",
                key="2fa_totp_code",
            )
            col_verify, col_backup = st.columns(2)
            with col_verify:
                submit_totp = st.form_submit_button(
                    "Verify", type="primary", use_container_width=True
                )
            with col_backup:
                use_backup = st.form_submit_button(
                    "Use backup code", use_container_width=True
                )

            if submit_totp:
                if not totp_code:
                    st.error("Please enter the 6-digit code.")
                elif auth_manager.verify_2fa(_2fa_email, totp_code.strip()):
                    user_data = auth_manager.get_user(_2fa_email)
                    st.session_state["authenticated"] = True
                    st.session_state["user"] = user_data
                    st.session_state["user_email"] = user_data["email"]
                    st.session_state["user_name"] = user_data["name"]
                    st.session_state["user_tier"] = user_data["tier"]
                    st.session_state.pop("2fa_pending_email", None)
                    st.session_state.pop("2fa_use_backup", None)
                    st.success("Login successful!")
                    import time
                    time.sleep(1)
                    redirect = st.session_state.pop("auth_redirect", "pages/analysis.py")
                    st.switch_page(redirect)
                else:
                    st.error("Invalid code. Please try again.")

            if use_backup:
                st.session_state["2fa_use_backup"] = True
                st.rerun()
        st.markdown('</div>', unsafe_allow_html=True)

    # Cancel 2FA — go back to login
    if st.button("Cancel and return to login", use_container_width=True):
        st.session_state.pop("2fa_pending_email", None)
        st.session_state.pop("2fa_use_backup", None)
        st.rerun()

    st.stop()

# ========== ALREADY LOGGED IN ==========
if st.session_state.get("authenticated", False):
    st.markdown(
        """
        <div class="login-card">
            <div class="dna-logo">
                <span class="dna-dot"></span><span class="dna-dot"></span>
                <span class="dna-dot"></span><span class="dna-dot"></span>
                <span class="dna-dot"></span>
            </div>
            <h1 class="login-title">You're Already Logged In!</h1>
            <p class="login-subtitle">Welcome back to Mergenix</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    user = st.session_state.get("user", {})
    st.success(f"Logged in as **{user.get('name', 'User')}** ({user.get('email', '')})")

    col1, col2 = st.columns(2)
    with col1:
        if st.button("\U0001f9ec Go to Analysis", type="primary", use_container_width=True):
            st.switch_page("pages/analysis.py")
    with col2:
        if st.button("Logout", type="secondary", use_container_width=True):
            auth_manager.logout()
            st.rerun()
    st.stop()

# ========== AUTH FORM ==========
# Logo and header
st.markdown(
    """
    <div class="login-card">
        <div class="dna-logo">
            <span class="dna-dot"></span><span class="dna-dot"></span>
            <span class="dna-dot"></span><span class="dna-dot"></span>
            <span class="dna-dot"></span>
        </div>
        <h1 class="login-title">Welcome to Mergenix</h1>
        <p class="login-subtitle">Genetic Offspring Analysis Platform</p>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown('<div class="login-card" style="animation-delay: 0.2s;">', unsafe_allow_html=True)

tab1, tab2 = st.tabs(["Sign In", "Create Account"])

# ========== LOGIN TAB ==========
with tab1:
    st.markdown('<div style="margin: 1.5rem 0;">', unsafe_allow_html=True)
    col_g, col_a = st.columns(2)
    with col_g:
        if st.button("Continue with Google", key="google_login", type="secondary", use_container_width=True):
            if not oauth_handler.is_configured():
                st.warning("OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")
            else:
                state_token = oauth_handler.generate_state_token()
                st.session_state["oauth_state"] = state_token
                auth_url = oauth_handler.get_authorization_url(state_token)
                st.markdown(f'<meta http-equiv="refresh" content="0; url={auth_url}">', unsafe_allow_html=True)
                st.info("Redirecting to Google...")
    with col_a:
        if st.button("Apple (Coming Soon)", key="apple_login", type="secondary", use_container_width=True):
            st.info("Apple Sign-In integration coming soon!")
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="login-divider"><span>or continue with email</span></div>', unsafe_allow_html=True)

    with st.form("login_form", clear_on_submit=False):
        email = st.text_input("Email Address", placeholder="you@example.com", key="login_email")
        password = st.text_input("Password", type="password", placeholder="Enter your password", key="login_password")

        st.checkbox("Remember me", key="remember")

        st.markdown("<br>", unsafe_allow_html=True)
        submit = st.form_submit_button("Sign In", type="primary", use_container_width=True)

        if submit:
            if not email or not password:
                st.error("Please enter both email and password")
            else:
                with st.spinner("Signing in..."):
                    success, user_data, status = auth_manager.authenticate(email, password)
                    if status == "2fa_required":
                        st.session_state["2fa_pending_email"] = user_data["email"]
                        st.rerun()
                    elif success:
                        st.session_state["authenticated"] = True
                        st.session_state["user"] = user_data
                        st.session_state["user_email"] = user_data["email"]
                        st.session_state["user_name"] = user_data["name"]
                        st.session_state["user_tier"] = user_data["tier"]
                        st.success(f"Welcome back, {user_data['name']}!")
                        st.balloons()
                        import time
                        time.sleep(1)
                        redirect = st.session_state.pop("auth_redirect", "pages/analysis.py")
                        st.switch_page(redirect)
                    else:
                        st.error("Invalid email or password. Please try again.")

    # Forgot password — outside the form so it can have its own interactive widgets
    with st.expander("Forgot password?"):
        reset_email = st.text_input("Enter your email address", key="reset_email")
        if st.button("Send Reset Link", key="send_reset"):
            if reset_email:
                _fp_ok, _fp_msg, _fp_token = auth_manager.request_password_reset(reset_email)
                # If user exists, send the actual email
                if _fp_token:
                    send_password_reset_email(reset_email, _fp_token)
                st.info(_fp_msg)
            else:
                st.warning("Please enter your email address.")

# ========== REGISTER TAB ==========
with tab2:
    st.markdown('<div style="margin: 1.5rem 0;">', unsafe_allow_html=True)
    col_g2, col_a2 = st.columns(2)
    with col_g2:
        if st.button("Continue with Google", key="google_register", type="secondary", use_container_width=True):
            if not oauth_handler.is_configured():
                st.warning("OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")
            else:
                state_token = oauth_handler.generate_state_token()
                st.session_state["oauth_state"] = state_token
                auth_url = oauth_handler.get_authorization_url(state_token)
                st.markdown(f'<meta http-equiv="refresh" content="0; url={auth_url}">', unsafe_allow_html=True)
                st.info("Redirecting to Google...")
    with col_a2:
        if st.button("Apple (Coming Soon)", key="apple_register", type="secondary", use_container_width=True):
            st.info("Apple Sign-In integration coming soon!")
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="login-divider"><span>or register with email</span></div>', unsafe_allow_html=True)

    with st.form("register_form", clear_on_submit=False):
        reg_name = st.text_input("Full Name", placeholder="John Doe", key="reg_name")
        reg_email = st.text_input("Email Address", placeholder="you@example.com", key="reg_email")
        reg_password = st.text_input(
            "Password", type="password", placeholder="Min 8 characters",
            key="reg_password", help="Min 8 characters, 1 uppercase, 1 lowercase, 1 digit",
        )
        reg_confirm = st.text_input("Confirm Password", type="password", placeholder="Confirm password", key="reg_confirm")

        if reg_password:
            strength = sum([
                len(reg_password) >= 8,
                any(c.isupper() for c in reg_password),
                any(c.islower() for c in reg_password),
                any(c.isdigit() for c in reg_password),
            ])
            if strength <= 2:
                st.markdown('<div class="password-strength strength-weak"></div>', unsafe_allow_html=True)
                st.caption("Weak password")
            elif strength == 3:
                st.markdown('<div class="password-strength strength-medium"></div>', unsafe_allow_html=True)
                st.caption("Medium password")
            else:
                st.markdown('<div class="password-strength strength-strong"></div>', unsafe_allow_html=True)
                st.caption("Strong password")

        agree_terms = st.checkbox("I agree to the Terms of Service and Privacy Policy", key="agree_terms")
        st.markdown("<br>", unsafe_allow_html=True)
        submit_register = st.form_submit_button("Create Account", type="primary", use_container_width=True)

        if submit_register:
            if not all([reg_name, reg_email, reg_password, reg_confirm]):
                st.error("Please fill in all fields")
            elif not agree_terms:
                st.error("You must agree to the Terms of Service and Privacy Policy")
            elif reg_password != reg_confirm:
                st.error("Passwords do not match")
            else:
                with st.spinner("Creating your account..."):
                    success, message = auth_manager.register_user(reg_email, reg_name, reg_password)
                    if success:
                        # Generate and send verification email
                        _reg_token = auth_manager.generate_verification_token(reg_email)
                        if _reg_token:
                            send_verification_email(reg_email, _reg_token)
                        st.success("Account created! Please check your email to verify your account.")
                        st.info(
                            "A verification link has been sent to your email address. "
                            "Please verify your email before logging in."
                        )
                        # NOTE: auto-login after registration is preserved for now.
                        # Newly-registered users never have 2FA enabled yet.
                        _, user_data, _reg_status = auth_manager.authenticate(reg_email, reg_password)
                        if user_data:
                            st.session_state["authenticated"] = True
                            st.session_state["user"] = user_data
                            st.session_state["user_email"] = user_data["email"]
                            st.session_state["user_name"] = user_data["name"]
                            st.session_state["user_tier"] = user_data["tier"]
                        st.balloons()
                        import time
                        time.sleep(2)
                        st.switch_page("pages/analysis.py")
                    else:
                        st.error(message)

st.markdown('</div>', unsafe_allow_html=True)

# Trust signals
st.markdown(
    """
    <div class="trust-footer">
        <p><span class="lock-icon">\U0001f512</span><strong>Your data is encrypted and never shared</strong></p>
        <p style="font-size: 0.8rem;">Data Privacy First &bull;
        <a href="#" onclick="return false;">Privacy Policy</a> &bull;
        <a href="#" onclick="return false;">Terms of Service</a></p>
    </div>
    """,
    unsafe_allow_html=True,
)
