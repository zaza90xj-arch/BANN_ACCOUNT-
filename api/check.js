// ═══════════════════════════════════════════════════════════════
//  AGS COMMUNITY — Bot Token Checker (Vercel Serverless Function)
//  Same logic as bot.py's getMe() call
// ═══════════════════════════════════════════════════════════════
// Simple in-memory rate limit (per IP, 20 req/min)
const rateMap = new Map();

function rateLimit(ip) {
    const now = Date.now();
    const record = rateMap.get(ip) || { count: 0, resetAt: now + 60000 };
    if (now > record.resetAt) { record.count = 0; record.resetAt = now + 60000; }
    record.count++;
    rateMap.set(ip, record);
    return record.count <= 20;
}
export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            status: 'error',
            error: 'Method not allowed. Use POST.'
        });
    }

    // Parse body
    let token = '';
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        token = (body?.token || '').trim();
    } catch (e) {
        return res.status(400).json({
            status: 'error',
            error: 'Invalid JSON body'
        });
    }

    // Validate format
    if (!token) {
        return res.status(400).json({
            status: 'error',
            error: 'No token provided'
        });
    }

    if (!/^\d{8,12}:[A-Za-z0-9_-]{30,}$/.test(token)) {
        return res.status(400).json({
            status: 'banned',
            error: 'INVALID TOKEN FORMAT — Check the token again'
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  CALL TELEGRAM API — EXACTLY like bot.py does
    // ═══════════════════════════════════════════════════════════
    const apiUrl = `https://api.telegram.org/bot${token}/getMe`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });

        clearTimeout(timeoutId);

        let data = null;
        try {
            data = await response.json();
        } catch (e) {
            return res.status(500).json({
                status: 'error',
                error: 'Invalid response from Telegram'
            });
        }

        // ── Status 401 → Unauthorized → TOKEN INVALID / BANNED ──
        if (response.status === 401) {
            return res.status(200).json({
                status: 'banned',
                error: 'Unauthorized — token is invalid, revoked, or the bot is banned/deleted'
            });
        }

        // ── HTTP OK but response.ok = false ──
        if (!data || data.ok !== true) {
            const description = data?.description || 'Token is invalid or bot banned';
            const errorCode = data?.error_code;

            // 401 → banned / deleted
            if (errorCode === 401) {
                return res.status(200).json({
                    status: 'banned',
                    error: description
                });
            }

            return res.status(200).json({
                status: 'banned',
                error: description
            });
        }

        // ── SUCCESS → BOT IS WORKING (NOT BANNED) ──
        const bot = data.result || {};

        return res.status(200).json({
            status: 'working',
            bot_id: bot.id,
            bot_name: bot.first_name,
            username: bot.username,
            can_join_groups: bot.can_join_groups,
            can_read_all_group_messages: bot.can_read_all_group_messages,
            supports_inline: bot.supports_inline_queries,
            is_bot: bot.is_bot,
            message: '✅ Bot is working — not banned'
        });

    } catch (err) {
        clearTimeout(timeoutId);

        if (err.name === 'AbortError') {
            return res.status(200).json({
                status: 'unknown',
                error: 'Request timeout — Telegram did not respond in 15s'
            });
        }

        return res.status(200).json({
            status: 'error',
            error: 'Network error: ' + (err.message || 'Could not reach Telegram')
        });
    }
}