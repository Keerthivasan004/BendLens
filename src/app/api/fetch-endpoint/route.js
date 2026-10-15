import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    let url = (body.url || '').trim();
    const method = (body.method || 'GET').toUpperCase();
    const customHeaders = body.headers || {};
    const payload = body.body;

    if (!url) {
      return NextResponse.json({ success: false, error: 'Endpoint URL is required' }, { status: 400 });
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 BendLens/1.0',
      'Accept': 'application/json, text/plain, text/html, */*',
      ...customHeaders
    };

    const fetchOptions = {
      method,
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    };

    if (payload && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (typeof payload === 'object') {
        fetchOptions.headers['Content-Type'] = fetchOptions.headers['Content-Type'] || 'application/json';
        fetchOptions.body = JSON.stringify(payload);
      } else {
        fetchOptions.body = String(payload);
      }
    }

    const res = await fetch(url, fetchOptions);
    const durationMs = Date.now() - startTime;
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    
    let responseData = null;
    let isJson = false;

    if (contentType.includes('application/json')) {
      try {
        responseData = await res.json();
        isJson = true;
      } catch {
        responseData = await res.text();
      }
    } else {
      responseData = await res.text();
    }

    const responseHeaders = {};
    res.headers.forEach((val, key) => {
      responseHeaders[key] = val;
    });

    return NextResponse.json({
      success: true,
      url,
      method,
      status: res.status,
      statusText: res.statusText,
      durationMs,
      contentType,
      isJson,
      headers: responseHeaders,
      data: responseData
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    return NextResponse.json({
      success: false,
      error: err.message || 'Fetch request failed',
      durationMs
    }, { status: 200 });
  }
}
