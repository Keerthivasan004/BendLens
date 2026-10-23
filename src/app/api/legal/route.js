import { NextResponse } from 'next/server';
import UniversalApiCrawler from '@/lib/universalApiCrawler';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Universal Legal & Compliance Endpoint
 * Discovers and extracts authentic Privacy Policy and Terms of Service contents for any target URL.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json({ success: false, error: 'URL parameter is required' }, { status: 400 });
    }

    const legalDocuments = await UniversalApiCrawler.fetchLegalDocuments(targetUrl);

    return NextResponse.json({
      success: true,
      targetUrl,
      legalDocuments
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to extract legal documents'
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetUrl = body.url || body.targetUrl;

    if (!targetUrl) {
      return NextResponse.json({ success: false, error: 'URL is required in request body' }, { status: 400 });
    }

    const customHeaders = body.headers || body.customHeaders || {};
    const legalDocuments = await UniversalApiCrawler.fetchLegalDocuments(targetUrl, { customHeaders });

    return NextResponse.json({
      success: true,
      targetUrl,
      legalDocuments
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to extract legal documents'
    }, { status: 500 });
  }
}
