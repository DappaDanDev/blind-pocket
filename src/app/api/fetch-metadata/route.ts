import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Validate URL format
    const validUrl = new URL(url);
    
    // Fetch the webpage
    const response = await fetch(validUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BlindPocket/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);

    // Extract Open Graph metadata
    const title = 
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      '';

    const description = 
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '';

    const image = 
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      '';

    // Return metadata
    return NextResponse.json({
      title: title.trim(),
      description: description.trim(),
      image: image.trim(),
    });

  } catch (error) {
    console.error('Error fetching metadata:', error);
    
    // Return empty metadata on error
    return NextResponse.json({
      title: '',
      description: '',
      image: '',
    });
  }
}