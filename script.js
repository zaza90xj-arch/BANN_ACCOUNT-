// ═══════════════════════════════════════════════════════════════
//  AGS COMMUNITY — Hacker Scripts
// ═══════════════════════════════════════════════════════════════

// ═══ MATRIX RAIN ═══
const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const matrixChars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#@%&*';
const fontSize = 14;
let columns = Math.floor(canvas.width / fontSize);
let drops = Array(columns).fill(1);

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.floor(canvas.width / fontSize);
    drops = Array(columns).fill(1);
});

function drawMatrix() {
    ctx.fillStyle = 'rgba(0, 10, 5, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fontSize}px monospace`;
    for (let i = 0; i < drops.length; i++) {
        const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
        ctx.fillStyle = Math.random() > 0.97 ? '#ffffff' : '#00ff88';
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
    }
}
setInterval(drawMatrix, 50);

// ═══ CLOCK ═══
function updateClock() {
    const now = new Date();
    document.getElementById('live-clock').textContent = now.toTimeString().split(' ')[0];
    document.getElementById('server-time').textContent =
        now.getHours().toString().padStart(2, '0') + ':' +
        now.getMinutes().toString().padStart(2, '0');
}
updateClock();
setInterval(updateClock, 1000);

// ═══ UPTIME ═══
const startTime = Date.now();
function updateUptime() {
    const d = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(d / 3600).toString().padStart(2, '0');
    const m = Math.floor((d % 3600) / 60).toString().padStart(2, '0');
    const s = (d % 60).toString().padStart(2, '0');
    document.getElementById('uptime').textContent = `${h}:${m}:${s}`;
}
setInterval(updateUptime, 1000);

// ═══ PARTICLES ═══
function createParticle() {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (3 + Math.random() * 5) + 's';
    p.style.opacity = Math.random() * 0.6 + 0.2;
    document.querySelector('.particles').appendChild(p);
    setTimeout(() => p.remove(), 8000);
}
setInterval(createParticle, 300);

// ═══ COUNTER ═══
let totalChecks = parseInt(localStorage.getItem('ags_total_checks') || '0');
document.getElementById('total-checks').textContent = totalChecks;

// ═══ PASTE BUTTON ═══
document.getElementById('paste-btn').addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('token-input').value = text;
    } catch (e) {
        alert('Clipboard access denied. Paste manually (Ctrl+V).');
    }
});

// ═══ CHECK BOT — uses /api/check exactly like bot.py uses getMe ═══
const checkBtn = document.getElementById('check-btn');
const tokenInput = document.getElementById('token-input');
const resultDiv = document.getElementById('result');

checkBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();

    if (!token) {
        showResult('warn', '⚠️ NO TOKEN', 'Please paste a bot token first.');
        return;
    }

    if (!/^\d{8,12}:[A-Za-z0-9_-]{30,}$/.test(token)) {
        showResult('warn', '⚠️ INVALID FORMAT',
            'Token should look like: <b>1234567890:AAH...</b>');
        return;
    }

    checkBtn.disabled = true;
    checkBtn.classList.add('loading');
    checkBtn.querySelector('.btn-text').textContent = 'CHECKING...';
    resultDiv.classList.remove('show');

    try {
        const res = await fetch('/api/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });

        const data = await res.json();
        displayResult(data);

        totalChecks++;
        localStorage.setItem('ags_total_checks', totalChecks);
        document.getElementById('total-checks').textContent = totalChecks;

    } catch (err) {
        showResult('danger', '❌ NETWORK ERROR', err.message);
    } finally {
        checkBtn.disabled = false;
        checkBtn.classList.remove('loading');
        checkBtn.querySelector('.btn-text').textContent = 'CHECK BOT STATUS';
    }
});

function displayResult(data) {
    if (data.status === 'working') {
        showResult('success', '✅ BOT IS WORKING — NOT BANNED',
            `<div class="result-detail">
                <span class="k">Bot ID:</span> <b>${data.bot_id || 'N/A'}</b><br>
                <span class="k">Bot Name:</span> <b>${escapeHtml(data.bot_name || 'N/A')}</b><br>
                <span class="k">Username:</span> <b>@${escapeHtml(data.username || 'N/A')}</b><br>
                <span class="k">Status:</span> <b style="color:#00ff88">ACTIVE / NOT BANNED</b><br>
                <span class="k">Can Join Groups:</span> <b>${data.can_join_groups ? 'YES' : 'NO'}</b><br>
                <span class="k">Supports Inline:</span> <b>${data.supports_inline ? 'YES' : 'NO'}</b>
            </div>`);
    } else if (data.status === 'banned') {
        showResult('danger', '🚫 BOT IS BANNED / DELETED',
            `<div class="result-detail">
                <span class="k">Error:</span> <b>${escapeHtml(data.error || 'Unauthorized')}</b><br>
                <span class="k">Reason:</span> <b>Token is invalid, revoked, or bot banned.</b><br>
                <span class="k">Action:</span> <b>Create a new bot from @BotFather</b>
            </div>`);
    } else if (data.status === 'unknown') {
        showResult('warn', '⚠️ UNKNOWN STATUS', escapeHtml(data.error || 'Could not verify.'));
    } else {
        showResult('danger', '❌ ERROR', escapeHtml(data.error || 'Unknown error'));
    }
}

function showResult(type, title, detail) {
    resultDiv.className = 'result show ' + type;
    resultDiv.innerHTML = `<div class="result-title">${title}</div>${detail}`;
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

tokenInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkBtn.click();
});

const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get('token');
if (urlToken) tokenInput.value = urlToken;

console.log('%c🔥 AGS COMMUNITY 🔥', 'color:#00ff88;font-size:20px;font-weight:bold;');
console.log('%cBot Token Checker — Hacker Edition', 'color:#00ffe1;font-size:12px;');