/**
 * Netlify Function: /api/gsc
 * Proxies Google Search Console API for the campaign dashboard.
 *
 * Required Netlify env vars:
 *   GSC_SITE_URL    = sc-domain:definable.ai
 *   GOOGLE_SA_JSON  = <service account key JSON string>
 *
 * Endpoints (via ?report= query param):
 *   overview  — total clicks, impressions, CTR, avg position (last 28 days)
 *   pages     — top 10 pages by clicks (last 28 days)
 *   queries   — top 20 queries by clicks (last 28 days)
 *   trend     — daily clicks + impressions (last 28 days)
 */

const { google } = require('googleapis');

const SITE_URL = process.env.GSC_SITE_URL;
const SA_JSON = process.env.GOOGLE_SA_JSON;

function getClient() {
  if (!SA_JSON) throw new Error('GOOGLE_SA_JSON env var not set');
  const credentials = JSON.parse(SA_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  return google.searchconsole({ version: 'v1', auth });
}

async function overviewReport(sc) {
  const res = await sc.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate: new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      dimensions: [],
    },
  });
  return res.data;
}

async function pagesReport(sc) {
  const res = await sc.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate: new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      dimensions: ['page'],
      rowLimit: 10,
    },
  });
  return res.data;
}

async function queriesReport(sc) {
  const res = await sc.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate: new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      dimensions: ['query'],
      rowLimit: 20,
    },
  });
  return res.data;
}

async function trendReport(sc) {
  const res = await sc.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate: new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      dimensions: ['date'],
    },
  });
  return res.data;
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (!SITE_URL) throw new Error('GSC_SITE_URL env var not set');
    const sc = getClient();
    const report = event.queryStringParameters?.report ?? 'overview';

    let data;
    switch (report) {
      case 'overview': data = await overviewReport(sc); break;
      case 'pages':    data = await pagesReport(sc); break;
      case 'queries':  data = await queriesReport(sc); break;
      case 'trend':    data = await trendReport(sc); break;
      default:         data = await overviewReport(sc);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, report, data }),
    };
  } catch (err) {
    console.error('[gsc function error]', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
