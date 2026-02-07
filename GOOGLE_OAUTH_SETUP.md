# Google OAuth Setup Guide for Mergenix

This guide walks you through setting up Google OAuth authentication for Mergenix.

## Prerequisites

- A Google account
- Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: "Mergenix Genetic Platform"
4. Click "Create"

## Step 2: Enable Google+ API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type
3. Click "Create"
4. Fill in required fields:
   - App name: `Mergenix Genetic Platform`
   - User support email: Your email
   - Developer contact: Your email
5. Click "Save and Continue"
6. Scopes: Click "Add or Remove Scopes"
   - Add: `openid`
   - Add: `.../auth/userinfo.email`
   - Add: `.../auth/userinfo.profile`
7. Click "Save and Continue"
8. Test users: Add your email for testing
9. Click "Save and Continue"

## Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "Mergenix Web Client"
5. Authorized redirect URIs:
   - Add: `http://localhost:8501/Login?oauth_callback=google`
   - For production, add: `https://yourdomain.com/Login?oauth_callback=google`
6. Click "Create"
7. Copy your **Client ID** and **Client Secret**

## Step 5: Configure Environment Variables

1. Create a `.env` file in your Mergenix project root (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```bash
   GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:8501/Login?oauth_callback=google
   ```

3. **IMPORTANT**: Add `.env` to your `.gitignore` to keep credentials secure:
   ```bash
   echo ".env" >> .gitignore
   ```

## Step 6: Test OAuth Flow

1. Start your Streamlit app:
   ```bash
   streamlit run app.py
   ```

2. Navigate to the Login page
3. Click "🔵 Google" button
4. You should be redirected to Google's login page
5. After login, you'll be redirected back to Mergenix
6. Your account will be created automatically

## Troubleshooting

### "OAuth not configured" message
- Check that your `.env` file exists and has the correct variable names
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Restart your Streamlit app after adding environment variables

### "Redirect URI mismatch" error
- Verify the redirect URI in Google Cloud Console matches exactly
- Check for trailing slashes or protocol differences (http vs https)
- Make sure you added the URI to "Authorized redirect URIs"

### "Invalid OAuth state" error
- This is a security feature to prevent CSRF attacks
- Try clearing your browser cookies and trying again
- If persistent, check that `secrets.compare_digest` is working properly

### Email not verified error
- Google requires email verification before OAuth
- Verify your email in your Google account settings

## Security Notes

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use HTTPS in production** - Required for secure OAuth
3. **Rotate secrets regularly** - Update credentials periodically
4. **Monitor OAuth usage** - Check Google Cloud Console for unusual activity
5. **State token validation** - Implemented to prevent CSRF attacks

## User Data Stored

When a user signs in with Google, Mergenix stores:
- Email address (verified by Google)
- Full name
- Profile picture URL
- Google user ID (for linking accounts)
- OAuth provider: "google"

No password is stored for OAuth users.

## Production Deployment

For production deployment:

1. Update redirect URI in Google Cloud Console:
   ```
   https://yourdomain.com/Login?oauth_callback=google
   ```

2. Update `.env` for production:
   ```bash
   GOOGLE_REDIRECT_URI=https://yourdomain.com/Login?oauth_callback=google
   ```

3. Consider moving to OAuth consent screen "Production" status:
   - Complete app verification if required
   - This removes the "unverified app" warning

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Streamlit Secrets Management](https://docs.streamlit.io/streamlit-community-cloud/get-started/deploy-an-app/connect-to-data-sources/secrets-management)
