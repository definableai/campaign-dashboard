/**
 * Netlify Function: /api/ga4
 * Proxies Google Analytics Data API v1 for the campaign dashboard.
 *
 * Required Netlify env vars:
 *   GA4_PROPERTY_ID  = properties/500643354
 *   GOOGLE_SA_JSON   = <service account key JSON string>
 *
 * Endpoints (via ?report= query param):
 *   funnel     — 4 milestone conversion events (last 30 days, daily)
 *   traffic    — sessions by channel/source (last 30 days)
 *   engagement — top pages by views + avg session duration (last 30 days)
 *   utm        — sessions broken down by utm_source + utm_campaign (last 30 days)
 */

const { BetaAnalyticsDataClient } = require('@google-analytics/data');

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const SA_JSON = process.env.GOOGLE_SA_JSON;

function getClient() {
  if (!SA_JSON) throw new Error('GOOGLE_SA_JSON env var not set');
  const credentials = JSON.parse(SA_JSON);
  return new BetaAnalyticsDataClient({ credentials });
}

async function funnelReport(client) {
  const [response] = await client.runReport({
    property: PROPERTY_ID,
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'date' }, { name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: {
          values: ['signup_click', 'signup_complete', 'first_chat_sent', 'subscription_started', 'utm_captured'],
        },
      },
    },
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });
  return response;
}

async function trafficReport(client) {
  const [response] = await client.runReport({
    property: PROPERTY_ID,
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
    metrics: [{ name: 'sessions' }, { name: 'newUsers' }, { name: 'bounceRate' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 20,
  });
  return response;
}

async function engagementReport(client) {
  const [response] = await client.runReport({
    property: PROPERTY_ID,
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
      { name: 'sessions' },
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 10,
  });
  return response;
}

async function utmReport(client) {
  const [response] = await client.runReport({
    property: PROPERTY_ID,
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensions: [
      { name: 'sessionSource' },
      { name: 'sessionCampaignName' },
      { name: 'date' },
    ],
    metrics: [{ name: 'sessions' }, { name: 'newUsers' }],
    dimensionFilter: {
      filter: {
        fieldName: 'sessionMedium',
        stringFilter: { value: 'paid_social', matchType: 'EXACT' },
      },
    },
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });
  return response;
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
    if (!PROPERTY_ID) throw new Error('GA4_PROPERTY_ID env var not set');
    const client = getClient();
    const report = event.queryStringParameters?.report ?? 'funnel';

    let data;
    switch (report) {
      case 'funnel':     data = await funnelReport(client); break;
      case 'traffic':    data = await trafficReport(client); break;
      case 'engagement': data = await engagementReport(client); break;
      case 'utm':        data = await utmReport(client); break;
      default:           data = await funnelReport(client);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, report, data }),
    };
  } catch (err) {
    console.error('[ga4 function error]', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
