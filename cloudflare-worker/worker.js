/**
 * Cloudflare Worker - CORS Proxy with Turkish Encoding Support & Mackolik Webview Support
 */

export default {
    async fetch(request) {
        // CORS headers - Allow iframe embedding and cross-origin fetch
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        };

        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Get the URL to proxy from query parameter
        const url = new URL(request.url);
        let targetUrl = url.searchParams.get('url');

        // Fallback: If no explicit ?url= parameter, route relative requests to Mackolik
        if (!targetUrl) {
            if (url.pathname === '/' || url.pathname === '') {
                targetUrl = 'https://arsiv.mackolik.com/Canli-Sonuclar';
            } else {
                targetUrl = 'https://arsiv.mackolik.com' + url.pathname + url.search;
            }
        }

        try {
            // Fetch the target URL with custom headers
            const reqHeaders = new Headers({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': 'https://arsiv.mackolik.com/Canli-Sonuclar',
                'X-Requested-With': 'XMLHttpRequest'
            });

            const response = await fetch(targetUrl, { headers: reqHeaders });

            // Get response as ArrayBuffer to preserve encoding
            const buffer = await response.arrayBuffer();

            // Detect charset from Content-Type header
            const contentType = response.headers.get('Content-Type') || 'text/html';
            let charset = 'utf-8';

            const charsetMatch = contentType.match(/charset=([^;\s]+)/i);
            if (charsetMatch) {
                charset = charsetMatch[1];
            } else if (targetUrl.includes('tff.org')) {
                charset = 'windows-1254';
            }

            // Decode with detected charset
            const decoder = new TextDecoder(charset);
            let text = decoder.decode(buffer);

            // If HTML content from Mackolik Canli-Sonuclar, inject match link click interceptor script
            if (contentType.includes('text/html') && targetUrl.includes('Canli-Sonuclar')) {
                const injectionScript = `
                <script>
                (function() {
                    // Intercept clicks on any match link (e.g. <a href="//arsiv.mackolik.com/Mac/4479885/Tobol-FK-Panevezys" class="td_score">1 - 1</a>)
                    document.addEventListener('click', function(e) {
                        var target = e.target;
                        var link = target.closest ? target.closest('a[href*="/Mac/"]') : null;

                        if (!link) {
                            var curr = target;
                            while (curr && curr !== document.body) {
                                var href = curr.getAttribute ? curr.getAttribute('href') : '';
                                if (href && href.indexOf('/Mac/') !== -1) {
                                    link = curr;
                                    break;
                                }
                                curr = curr.parentElement;
                            }
                        }

                        if (link) {
                            var href = link.getAttribute('href') || link.href || '';
                            var match = href.match(/\\/Mac\\/(\\d+)/);
                            if (match && match[1]) {
                                var matchId = match[1];
                                e.preventDefault();
                                e.stopPropagation();

                                // Flash clicked score/link green
                                var origBg = link.style.backgroundColor;
                                link.style.transition = 'all 0.2s ease';
                                link.style.backgroundColor = '#10b981';
                                link.style.color = '#ffffff';
                                link.style.borderRadius = '4px';
                                link.style.padding = '2px 6px';

                                setTimeout(function() {
                                    link.style.backgroundColor = origBg;
                                    link.style.color = '';
                                }, 1200);

                                window.parent.postMessage({ type: 'SCRAPE_MACKOLIK_MATCH', matchId: matchId }, '*');
                                return false;
                            }
                        }
                    }, true);

                    // Inject 🚀 Scrape badges into table rows
                    function injectBadges() {
                        var rows = document.querySelectorAll('tr[id^="row_"]');
                        rows.forEach(function(row) {
                            var matchId = row.id.replace('row_', '').trim();
                            if (matchId && !isNaN(matchId) && !row.querySelector('.btn-scrape-injected')) {
                                var targetCell = row.cells[row.cells.length - 1] || row;
                                var btn = document.createElement('button');
                                btn.className = 'btn-scrape-injected';
                                btn.innerHTML = '🚀 Scrape';
                                btn.type = 'button';
                                btn.title = 'Maç ID: ' + matchId;
                                btn.style.cssText = 'background: #10b981; color: #ffffff; border: none; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; margin-left: 6px; z-index: 9999; font-family: sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.3); display: inline-block;';
                                btn.onclick = function(e) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    window.parent.postMessage({ type: 'SCRAPE_MACKOLIK_MATCH', matchId: matchId }, '*');
                                };
                                targetCell.appendChild(btn);
                            }
                        });
                    }

                    setInterval(injectBadges, 1000);
                    setTimeout(injectBadges, 500);
                    setTimeout(injectBadges, 2000);
                })();
                </script>
                `;
                text = text.replace(/<\/body>/i, injectionScript + '</body>');
            }

            // Re-encode as UTF-8
            const encoder = new TextEncoder();
            const utf8Buffer = encoder.encode(text);

            const resHeaders = new Headers(corsHeaders);
            resHeaders.set('Content-Type', contentType.includes('text/html') ? 'text/html; charset=utf-8' : contentType);

            return new Response(utf8Buffer, {
                status: response.status,
                headers: resHeaders
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
};
