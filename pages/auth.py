"""
Mergenix — Authentication Page

23andMe-style centered sign-in/register with Google OAuth.
Migrated from pages/1_Login.py — CSS removed (injected globally).
"""

import streamlit as st
from Source.auth import AuthManager
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

        col_rem, col_forgot = st.columns([1, 1])
        with col_rem:
            st.checkbox("Remember me", key="remember")
        with col_forgot:
            st.markdown(
                '<div style="text-align:right;padding-top:0.3rem;">'
                '<a href="#" style="font-size:0.9rem;">Forgot password?</a></div>',
                unsafe_allow_html=True,
            )

        st.markdown("<br>", unsafe_allow_html=True)
        submit = st.form_submit_button("Sign In", type="primary", use_container_width=True)

        if submit:
            if not email or not password:
                st.error("Please enter both email and password")
            else:
                with st.spinner("Signing in..."):
                    success, user_data = auth_manager.authenticate(email, password)
                    if success:
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
                        st.success(message)
                        _, user_data = auth_manager.authenticate(reg_email, reg_password)
                        st.session_state["authenticated"] = True
                        st.session_state["user"] = user_data
                        st.session_state["user_email"] = user_data["email"]
                        st.session_state["user_name"] = user_data["name"]
                        st.session_state["user_tier"] = user_data["tier"]
                        st.balloons()
                        st.info("Welcome to Mergenix! Redirecting to your dashboard...")
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
        <p style="font-size: 0.8rem;">HIPAA Compliant &bull;
        <a href="#" onclick="return false;">Privacy Policy</a> &bull;
        <a href="#" onclick="return false;">Terms of Service</a></p>
    </div>
    """,
    unsafe_allow_html=True,
)
