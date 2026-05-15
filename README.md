# Definable.ai Campaign Dashboard

Live analytics dashboard connecting **Google Analytics 4** + **Google Search Console** into a single campaign view. Deployed on Netlify with serverless API functions.

## What it shows

| Section | Data Source | Update Frequency |
|---|---|---|
| Funnel milestones (5 cards) | GA4 Data API | Every 5 min |
| Traffic by source | GA4 Data API | Every 5 min |
| Search Console overview | GSC API | Every 5 min |
| Top pages by views | GA4 Data API | Every 5 min |
| Top search queries | GSC API | Every 5 min |
| Paid UTM breakdown (IG/LI) | GA4 Data API | Every 5 min |

## Funnel events tracked

```
utm_captured        → User arrived from an ad (already firing 915x/month) ✅
signup_click        → User clicked a signup CTA on the marketing site ✅ (just added)
signup_complete     → User completed registration on app.definable.ai ⚠️ add in app
first_chat_sent     → User sent first chat message ⚠️ add in app
subscription_started → User started a paid plan ⚠️ add in app
```

See `src/scripts/CAMPAIGN_INTEGRATION.md` in `definableai/new-marketing-website` for full implementation guide.

## Setup

### 1. Connect to Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
2. Select `definableai/campaign-dashboard`
3. Build settings are auto-detected from `netlify.toml`
4. Click **Deploy site**

### 2. Add environment variables in Netlify

Go to **Site settings** → **Environment variables** → Add:

| Variable | Value |
|---|---|
| `GA4_PROPERTY_ID` | `properties/500643354` |
| `GSC_SITE_URL` | `sc-domain:definable.ai` |
| `GOOGLE_SA_JSON` | Your service account key JSON (entire JSON string) |

### 3. Create a Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or use existing
3. Enable **Google Analytics Data API** and **Google Search Console API**
4. Create a **Service Account** → Download JSON key
5. In **GA4 Admin** → Property → Access Management → Add the service account email as Viewer
6. In **Search Console** → Settings → Users and permissions → Add service account email as Restricted user
7. Paste the entire downloaded JSON as the `GOOGLE_SA_JSON` env var value

### 4. Trigger a redeploy

Netlify will auto-deploy on every push to `main`. Alternatively, click **Trigger deploy** in the Netlify dashboard.

## Local development

```bash
npm install
npm run dev   # starts netlify dev server at localhost:8888
```

Create a `.env` file for local development:
```
GA4_PROPERTY_ID=properties/500643354
GSC_SITE_URL=sc-domain:definable.ai
GOOGLE_SA_JSON={...paste your service account JSON here...}
```

## Fallback

When env vars are not set (or API fails), the dashboard shows realistic demo data based on your actual GA4 numbers from the audit. A yellow banner indicates demo mode.

## Tech stack

- **Frontend**: Vanilla JS, no framework, no build step
- **Backend**: Node 18 Netlify Functions
- **APIs**: `@google-analytics/data` v4, `googleapis` v144
- **Deploy**: Netlify (auto-deploy from GitHub)
