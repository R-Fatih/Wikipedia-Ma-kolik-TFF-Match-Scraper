/**
 * Cloudflare Worker - CORS Proxy with Turkish Encoding Support
 * 
 * Bu worker TFF.org için CORS proxy görevi görür ve Türkçe karakterleri
 * doğru şekilde korur.
 * 
 * Kurulum:
 * 1. https://workers.cloudflare.com adresine gidin
 * 2. Ücretsiz hesap oluşturun
 * 3. "Create a Worker" butonuna tıklayın
 * 4. Bu kodu yapıştırın
 * 5. "Save and Deploy" butonuna tıklayın
 * 6. Worker URL'nizi alın (örn: https://tff-proxy.your-name.workers.dev)
 */

export default {
    async fetch(request) {
        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Get the URL to proxy from query parameter
        const url = new URL(request.url);
        const targetUrl = url.searchParams.get('url');

        if (!targetUrl) {
            return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        try {
            // Fetch the target URL
            const response = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                }
            });

            // Get response as ArrayBuffer to preserve encoding
            const buffer = await response.arrayBuffer();

            // Detect charset from Content-Type header
            const contentType = response.headers.get('Content-Type') || 'text/html';
            let charset = 'utf-8';

            const charsetMatch = contentType.match(/charset=([^;\s]+)/i);
            if (charsetMatch) {
                charset = charsetMatch[1];
            } else if (targetUrl.includes('tff.org')) {
                // TFF.org uses Windows-1254 (Turkish)
                charset = 'windows-1254';
            }

            // Decode with detected charset
            const decoder = new TextDecoder(charset);
            let text = decoder.decode(buffer);

            // Re-encode as UTF-8
            const encoder = new TextEncoder();
            const utf8Buffer = encoder.encode(text);

            // Return response with UTF-8 encoding
            return new Response(utf8Buffer, {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'text/html; charset=utf-8',
                    'X-Original-Charset': charset,
                }
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
};
