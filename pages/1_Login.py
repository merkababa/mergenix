"""
Tortit - Full-Page Login/Register
Beautiful authentication page with bioluminescent dark theme.
"""

import streamlit as st
import sys
import os

# Path setup
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, APP_DIR)

from Source.auth import AuthManager
from Source.auth.oauth import GoogleOAuthHandler

# Page config
st.set_page_config(
    page_title="Login - Tortit Genetic Platform",
    page_icon="🧬",
    layout="centered",
    initial_sidebar_state="collapsed",
)

# Initialize auth manager and OAuth handler
@st.cache_resource
def get_auth_manager():
    return AuthManager()

@st.cache_resource
def get_oauth_handler():
    return GoogleOAuthHandler()

auth_manager = get_auth_manager()
oauth_handler = get_oauth_handler()

# Custom CSS for full-page login
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap');

    /* Hide sidebar completely */
    [data-testid="stSidebar"] {
        display: none;
    }

    /* Full page background */
    .stApp {
        background: linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #1a1040 100%);
    }

    /* Hide default Streamlit elements */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}

    /* Center container */
    .block-container {
        padding-top: 3rem !important;
        padding-bottom: 3rem !important;
        max-width: 480px !important;
    }

    /* Animations */
    @keyframes helixFloat {
        0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
        50% { transform: translateY(-8px) rotate(180deg); opacity: 1; }
    }

    @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }

    @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 30px rgba(6, 214, 160, 0.15), 0 8px 40px rgba(0, 0, 0, 0.4); }
        50% { box-shadow: 0 0 50px rgba(6, 214, 160, 0.3), 0 8px 40px rgba(0, 0, 0, 0.4); }
    }

    @keyframes fadeSlideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }

    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }

    /* Main card */
    .login-card {
        background: linear-gradient(135deg, #111827 0%, #1a2236 100%);
        border: 1px solid rgba(148, 163, 184, 0.12);
        border-radius: 28px;
        padding: 3rem 2.5rem;
        animation: pulseGlow 4s ease-in-out infinite, fadeSlideUp 0.6s ease-out;
        margin-bottom: 2rem;
    }

    /* DNA Logo */
    .dna-logo {
        display: flex;
        justify-content: center;
        gap: 6px;
        margin-bottom: 1.5rem;
    }

    .dna-dot {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
    }

    .dna-dot:nth-child(1) {
        background: linear-gradient(135deg, #06d6a0, #22d3ee);
        animation: helixFloat 2s ease-in-out infinite;
    }

    .dna-dot:nth-child(2) {
        background: linear-gradient(135deg, #7c3aed, #a78bfa);
        animation: helixFloat 2s ease-in-out infinite 0.3s;
    }

    .dna-dot:nth-child(3) {
        background: linear-gradient(135deg, #06d6a0, #22d3ee);
        animation: helixFloat 2s ease-in-out infinite 0.6s;
    }

    .dna-dot:nth-child(4) {
        background: linear-gradient(135deg, #7c3aed, #a78bfa);
        animation: helixFloat 2s ease-in-out infinite 0.9s;
    }

    .dna-dot:nth-child(5) {
        background: linear-gradient(135deg, #06d6a0, #22d3ee);
        animation: helixFloat 2s ease-in-out infinite 1.2s;
    }

    /* Title */
    .login-title {
        margin: 0 0 0.5rem;
        font-size: 2.5rem;
        font-family: 'Outfit', sans-serif;
        font-weight: 800;
        background: linear-gradient(135deg, #06d6a0, #22d3ee, #7c3aed);
        background-size: 200% 200%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: gradientShift 6s ease infinite;
        text-align: center;
    }

    .login-subtitle {
        font-family: 'DM Sans', sans-serif;
        color: #94a3b8;
        font-size: 1rem;
        margin: 0 0 2rem;
        text-align: center;
    }

    /* Tab styling */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        background: rgba(17, 24, 39, 0.6);
        border-radius: 14px;
        padding: 6px;
        border: 1px solid rgba(148, 163, 184, 0.12);
        margin-bottom: 2rem;
    }

    .stTabs [data-baseweb="tab"] {
        border-radius: 10px;
        padding: 12px 24px;
        color: #94a3b8;
        font-weight: 600;
        font-family: 'Outfit', sans-serif;
        transition: all 0.2s ease;
        font-size: 1rem;
    }

    .stTabs [data-baseweb="tab"]:hover {
        color: #06d6a0;
        background: rgba(6, 214, 160, 0.05);
    }

    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #06d6a0, #059669) !important;
        color: #0a0e1a !important;
        font-weight: 700 !important;
    }

    /* Input fields */
    .stTextInput > div > div > input {
        background: rgba(17, 24, 39, 0.8) !important;
        border: 1px solid rgba(148, 163, 184, 0.15) !important;
        border-radius: 12px !important;
        padding: 14px 16px !important;
        font-size: 16px !important;
        font-family: 'DM Sans', sans-serif !important;
        color: #e2e8f0 !important;
        height: 52px !important;
        transition: all 0.2s ease;
    }

    .stTextInput > div > div > input:focus {
        border-color: #06d6a0 !important;
        box-shadow: 0 0 0 3px rgba(6, 214, 160, 0.1) !important;
    }

    .stTextInput > label {
        color: #cbd5e1 !important;
        font-family: 'DM Sans', sans-serif !important;
        font-weight: 500 !important;
        font-size: 0.9rem !important;
        margin-bottom: 8px !important;
    }

    /* Checkbox */
    .stCheckbox {
        color: #cbd5e1 !important;
        font-family: 'DM Sans', sans-serif !important;
        font-size: 0.9rem !important;
    }

    /* Primary button */
    .stButton > button[kind="primary"] {
        background: linear-gradient(135deg, #06d6a0 0%, #059669 50%, #047857 100%);
        border: none;
        border-radius: 14px;
        padding: 16px 28px;
        font-weight: 700;
        font-size: 1.1rem;
        font-family: 'Outfit', sans-serif;
        letter-spacing: 0.02em;
        color: #0a0e1a !important;
        box-shadow: 0 4px 20px rgba(6, 214, 160, 0.3);
        transition: all 0.3s ease;
        width: 100%;
        height: 56px;
    }

    .stButton > button[kind="primary"]:hover {
        box-shadow: 0 6px 30px rgba(6, 214, 160, 0.5);
        transform: translateY(-2px);
    }

    /* Secondary button (social login) */
    .stButton > button[kind="secondary"] {
        background: white;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 12px;
        padding: 14px 20px;
        font-weight: 600;
        font-size: 1rem;
        font-family: 'DM Sans', sans-serif;
        color: #1e293b !important;
        transition: all 0.2s ease;
        width: 100%;
        height: 52px;
        margin-bottom: 12px;
    }

    .stButton > button[kind="secondary"]:hover {
        background: #f8fafc;
        border-color: rgba(148, 163, 184, 0.3);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    /* Divider */
    .login-divider {
        display: flex;
        align-items: center;
        text-align: center;
        margin: 1.5rem 0;
        color: #64748b;
        font-family: 'DM Sans', sans-serif;
        font-size: 0.85rem;
    }

    .login-divider::before,
    .login-divider::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid rgba(148, 163, 184, 0.15);
    }

    .login-divider span {
        padding: 0 1rem;
    }

    /* Links */
    a {
        color: #06d6a0 !important;
        text-decoration: none !important;
        font-weight: 500;
        transition: color 0.2s ease;
    }

    a:hover {
        color: #22d3ee !important;
    }

    /* Trust signals footer */
    .trust-footer {
        text-align: center;
        padding: 1.5rem 2rem;
        background: rgba(17, 24, 39, 0.4);
        border: 1px solid rgba(148, 163, 184, 0.08);
        border-radius: 20px;
        animation: fadeSlideUp 0.6s ease-out 0.2s both;
    }

    .trust-footer p {
        color: #94a3b8;
        font-size: 0.85rem;
        margin: 0.5rem 0;
        font-family: 'DM Sans', sans-serif;
    }

    .trust-footer .lock-icon {
        color: #06d6a0;
        font-size: 1.2rem;
        margin-right: 0.5rem;
    }

    /* Alert boxes */
    .stAlert {
        border-radius: 12px;
        font-family: 'DM Sans', sans-serif;
    }

    /* Hide default padding */
    .element-container {
        margin-bottom: 0 !important;
    }

    /* Password strength indicator */
    .password-strength {
        height: 4px;
        border-radius: 2px;
        margin-top: 8px;
        transition: all 0.3s ease;
    }

    .strength-weak {
        background: #ef4444;
        width: 33%;
    }

    .strength-medium {
        background: #f59e0b;
        width: 66%;
    }

    .strength-strong {
        background: #06d6a0;
        width: 100%;
    }

    /* Remember me row */
    .remember-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 1rem 0 1.5rem;
        font-size: 0.9rem;
    }

    /* Center text */
    .center-text {
        text-align: center;
        margin-top: 1.5rem;
        color: #94a3b8;
        font-family: 'DM Sans', sans-serif;
        font-size: 0.9rem;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# ========== HANDLE OAUTH CALLBACK ==========
# Check for OAuth callback parameters in URL
query_params = st.query_params
if "oauth_callback" in query_params and query_params["oauth_callback"] == "google":
    # Handle Google OAuth callback
    if "code" in query_params and "state" in query_params:
        received_code = query_params["code"]
        received_state = query_params["state"]
        expected_state = st.session_state.get("oauth_state")

        # Validate state token (CSRF protection)
        if not oauth_handler.validate_state_token(received_state, expected_state):
            st.error("❌ Invalid OAuth state. Possible CSRF attack detected.")
            st.stop()

        # Exchange code for tokens
        try:
            with st.spinner("Authenticating with Google..."):
                # Exchange authorization code for tokens
                tokens = oauth_handler.exchange_code_for_tokens(received_code)

                # Get user info from Google
                user_info = oauth_handler.get_user_info(tokens["access_token"])

                # Create or link user account
                success, user_data, message = oauth_handler.authenticate_or_create_user(
                    user_info, auth_manager
                )

                if success:
                    # Log in user
                    st.session_state["authenticated"] = True
                    st.session_state["user"] = user_data
                    st.session_state["user_email"] = user_data["email"]
                    st.session_state["user_name"] = user_data["name"]
                    st.session_state["user_tier"] = user_data["tier"]

                    # Clear OAuth state
                    if "oauth_state" in st.session_state:
                        del st.session_state["oauth_state"]

                    # Clear query params
                    st.query_params.clear()

                    st.success(f"✅ {message}")
                    st.balloons()

                    # Redirect to main app
                    import time
                    time.sleep(1)
                    st.switch_page("app.py")
                else:
                    st.error(f"❌ {message}")

        except Exception as e:
            st.error(f"❌ OAuth authentication failed: {str(e)}")

    elif "error" in query_params:
        # User cancelled or error occurred
        error = query_params.get("error", "unknown")
        st.error(f"❌ OAuth authentication failed: {error}")

# Check if already logged in
if st.session_state.get("authenticated", False):
    st.markdown(
        """
        <div class="login-card">
            <div class="dna-logo">
                <span class="dna-dot"></span>
                <span class="dna-dot"></span>
                <span class="dna-dot"></span>
                <span class="dna-dot"></span>
                <span class="dna-dot"></span>
            </div>
            <h1 class="login-title">You're Already Logged In!</h1>
            <p class="login-subtitle">Welcome back to Tortit</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    user = st.session_state.get("user", {})
    st.success(f"✅ Logged in as **{user.get('name', 'User')}** ({user.get('email', '')})")

    col1, col2 = st.columns(2)

    with col1:
        if st.button("🏠 Go to Main App", type="primary", use_container_width=True):
            st.switch_page("app.py")

    with col2:
        if st.button("🚪 Logout", type="secondary", use_container_width=True):
            auth_manager.logout()
            st.rerun()

    st.stop()

# Initialize session state for mode
if "auth_mode" not in st.session_state:
    st.session_state["auth_mode"] = "login"

# Logo and header
st.markdown(
    """
    <div class="login-card">
        <div class="dna-logo">
            <span class="dna-dot"></span>
            <span class="dna-dot"></span>
            <span class="dna-dot"></span>
            <span class="dna-dot"></span>
            <span class="dna-dot"></span>
        </div>
        <h1 class="login-title">Welcome to Tortit</h1>
        <p class="login-subtitle">Genetic Offspring Analysis Platform</p>
    </div>
    """,
    unsafe_allow_html=True,
)

# Main card content
st.markdown('<div class="login-card" style="animation-delay: 0.2s;">', unsafe_allow_html=True)

# Login/Register tabs
tab1, tab2 = st.tabs(["Sign In", "Create Account"])

# ========== LOGIN TAB ==========
with tab1:
    # Social login buttons (coming soon)
    st.markdown('<div style="margin: 1.5rem 0;">', unsafe_allow_html=True)

    col_g, col_a = st.columns(2)
    with col_g:
        if st.button("🔵 Google", key="google_login", type="secondary"):
            if not oauth_handler.is_configured():
                st.warning("⚙️ OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.")
            else:
                # Generate and store state token
                state_token = oauth_handler.generate_state_token()
                st.session_state["oauth_state"] = state_token

                # Get authorization URL and redirect
                auth_url = oauth_handler.get_authorization_url(state_token)
                st.markdown(f'<meta http-equiv="refresh" content="0; url={auth_url}">', unsafe_allow_html=True)
                st.info("🔄 Redirecting to Google...")

    with col_a:
        if st.button("🍎 Apple", key="apple_login", type="secondary"):
            st.info("🚀 Apple Sign-In integration coming soon!")

    st.markdown('</div>', unsafe_allow_html=True)

    # Divider
    st.markdown(
        '<div class="login-divider"><span>or continue with email</span></div>',
        unsafe_allow_html=True,
    )

    # Login form
    with st.form("login_form", clear_on_submit=False):
        email = st.text_input("Email Address", placeholder="you@example.com", key="login_email")
        password = st.text_input("Password", type="password", placeholder="••••••••", key="login_password")

        # Remember me and forgot password
        col_rem, col_forgot = st.columns([1, 1])
        with col_rem:
            remember_me = st.checkbox("Remember me", key="remember")
        with col_forgot:
            st.markdown('<div style="text-align: right; padding-top: 0.3rem;"><a href="#" style="font-size: 0.9rem;">Forgot password?</a></div>', unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        submit = st.form_submit_button("Sign In", type="primary", use_container_width=True)

        if submit:
            if not email or not password:
                st.error("❌ Please enter both email and password")
            else:
                with st.spinner("Signing in..."):
                    success, user_data = auth_manager.authenticate(email, password)

                    if success:
                        st.session_state["authenticated"] = True
                        st.session_state["user"] = user_data
                        st.session_state["user_email"] = user_data["email"]
                        st.session_state["user_name"] = user_data["name"]
                        st.session_state["user_tier"] = user_data["tier"]
                        st.success(f"✅ Welcome back, {user_data['name']}!")
                        st.balloons()

                        # Redirect to main app
                        import time
                        time.sleep(1)
                        st.switch_page("app.py")
                    else:
                        st.error("❌ Invalid email or password. Please try again.")

    # Sign up link
    st.markdown(
        '<p class="center-text">Don\'t have an account? <a href="#" onclick="return false;">Sign up</a></p>',
        unsafe_allow_html=True,
    )

# ========== REGISTER TAB ==========
with tab2:
    # Social registration (coming soon)
    st.markdown('<div style="margin: 1.5rem 0;">', unsafe_allow_html=True)

    col_g2, col_a2 = st.columns(2)
    with col_g2:
        if st.button("🔵 Google", key="google_register", type="secondary"):
            if not oauth_handler.is_configured():
                st.warning("⚙️ OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.")
            else:
                # Generate and store state token
                state_token = oauth_handler.generate_state_token()
                st.session_state["oauth_state"] = state_token

                # Get authorization URL and redirect
                auth_url = oauth_handler.get_authorization_url(state_token)
                st.markdown(f'<meta http-equiv="refresh" content="0; url={auth_url}">', unsafe_allow_html=True)
                st.info("🔄 Redirecting to Google...")

    with col_a2:
        if st.button("🍎 Apple", key="apple_register", type="secondary"):
            st.info("🚀 Apple Sign-In integration coming soon!")

    st.markdown('</div>', unsafe_allow_html=True)

    # Divider
    st.markdown(
        '<div class="login-divider"><span>or register with email</span></div>',
        unsafe_allow_html=True,
    )

    # Registration form
    with st.form("register_form", clear_on_submit=False):
        reg_name = st.text_input("Full Name", placeholder="John Doe", key="reg_name")
        reg_email = st.text_input("Email Address", placeholder="you@example.com", key="reg_email")
        reg_password = st.text_input("Password", type="password", placeholder="••••••••", key="reg_password", help="Min 8 characters, 1 uppercase, 1 lowercase, 1 digit")
        reg_confirm = st.text_input("Confirm Password", type="password", placeholder="••••••••", key="reg_confirm")

        # Password strength indicator (visual feedback)
        if reg_password:
            strength = 0
            if len(reg_password) >= 8:
                strength += 1
            if any(c.isupper() for c in reg_password):
                strength += 1
            if any(c.islower() for c in reg_password):
                strength += 1
            if any(c.isdigit() for c in reg_password):
                strength += 1

            if strength <= 2:
                st.markdown('<div class="password-strength strength-weak"></div>', unsafe_allow_html=True)
                st.caption("🔴 Weak password")
            elif strength == 3:
                st.markdown('<div class="password-strength strength-medium"></div>', unsafe_allow_html=True)
                st.caption("🟡 Medium password")
            else:
                st.markdown('<div class="password-strength strength-strong"></div>', unsafe_allow_html=True)
                st.caption("🟢 Strong password")

        # Terms checkbox
        agree_terms = st.checkbox("I agree to the Terms of Service and Privacy Policy", key="agree_terms")

        st.markdown("<br>", unsafe_allow_html=True)

        submit_register = st.form_submit_button("Create Account", type="primary", use_container_width=True)

        if submit_register:
            if not all([reg_name, reg_email, reg_password, reg_confirm]):
                st.error("❌ Please fill in all fields")
            elif not agree_terms:
                st.error("❌ You must agree to the Terms of Service and Privacy Policy")
            elif reg_password != reg_confirm:
                st.error("❌ Passwords do not match")
            else:
                with st.spinner("Creating your account..."):
                    success, message = auth_manager.register_user(reg_email, reg_name, reg_password)

                    if success:
                        st.success(f"✅ {message}")

                        # Auto-login after registration
                        _, user_data = auth_manager.authenticate(reg_email, reg_password)
                        st.session_state["authenticated"] = True
                        st.session_state["user"] = user_data
                        st.session_state["user_email"] = user_data["email"]
                        st.session_state["user_name"] = user_data["name"]
                        st.session_state["user_tier"] = user_data["tier"]

                        st.balloons()
                        st.info("🎉 Welcome to Tortit! Redirecting to your dashboard...")

                        # Redirect to main app
                        import time
                        time.sleep(2)
                        st.switch_page("app.py")
                    else:
                        st.error(f"❌ {message}")

    # Sign in link
    st.markdown(
        '<p class="center-text">Already have an account? <a href="#" onclick="return false;">Sign in</a></p>',
        unsafe_allow_html=True,
    )

st.markdown('</div>', unsafe_allow_html=True)

# Trust signals footer
st.markdown(
    """
    <div class="trust-footer">
        <p><span class="lock-icon">🔒</span><strong>Your data is encrypted and never shared</strong></p>
        <p style="font-size: 0.8rem;">HIPAA Compliant • <a href="#">Privacy Policy</a> • <a href="#">Terms of Service</a></p>
    </div>
    """,
    unsafe_allow_html=True,
)
