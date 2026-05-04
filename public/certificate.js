// ============================================================
// AI Challenge — Certificate generator
// Renders a 1200×800 PNG certificate on a canvas. No deps.
// Exposed as window.AIC_Certificate.{ render, download, qualifies }
// ============================================================
(function () {
  'use strict';

  function qualifies({ correctCount = 0, total = 10, isPractice = false } = {}) {
    if (isPractice) return false;
    const accuracy = total > 0 ? (correctCount / total) * 100 : 0;
    return accuracy >= 90;
  }

  // Wrap text to fit a max width, returning array of lines.
  function _wrap(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function render(opts) {
    const {
      playerName = 'AI Challenger',
      level      = 'AI Foundations',
      difficulty = 'Beginner',
      score      = 0,
      correctCount = 0,
      total      = 10,
      date       = new Date()
    } = opts || {};

    const W = 1200, H = 800;
    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#07060c');
    bg.addColorStop(1, '#1a0833');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Soft purple glow top-left
    const glow = ctx.createRadialGradient(W * 0.18, H * 0.22, 20, W * 0.18, H * 0.22, 520);
    glow.addColorStop(0, 'rgba(139, 92, 246, 0.35)');
    glow.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Inner border
    ctx.strokeStyle = 'rgba(196, 153, 252, 0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, W - 80, H - 80);
    ctx.strokeStyle = 'rgba(196, 153, 252, 0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(56, 56, W - 112, H - 112);

    // Top label
    ctx.fillStyle = 'rgba(196, 153, 252, 0.9)';
    ctx.font = '600 22px "Geist", "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡  AI  CHALLENGE', W / 2, 130);

    // Decorative line
    ctx.beginPath();
    ctx.moveTo(W / 2 - 80, 156);
    ctx.lineTo(W / 2 + 80, 156);
    ctx.strokeStyle = 'rgba(196, 153, 252, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 700 64px "Fraunces", "Georgia", serif';
    ctx.fillText('Certificate of Completion', W / 2, 240);

    // "This certifies that"
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '400 22px "Geist", "Segoe UI", system-ui, sans-serif';
    ctx.fillText('This certifies that', W / 2, 300);

    // Player name (large)
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 56px "Fraunces", "Georgia", serif';
    const nameLines = _wrap(ctx, playerName, W - 240);
    nameLines.forEach((line, i) => ctx.fillText(line, W / 2, 380 + i * 72));

    // "has successfully completed"
    const afterNameY = 400 + (nameLines.length - 1) * 72;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '400 22px "Geist", "Segoe UI", system-ui, sans-serif';
    ctx.fillText('has successfully completed a round on', W / 2, afterNameY + 32);

    // Level + difficulty
    ctx.fillStyle = '#c499fc';
    ctx.font = '700 38px "Fraunces", "Georgia", serif';
    ctx.fillText(`${level} — ${difficulty}`, W / 2, afterNameY + 90);

    // Stats row
    const statsY = afterNameY + 150;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '600 24px "JetBrains Mono", "Consolas", monospace';
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const stats = `${correctCount}/${total} correct  ·  ${accuracy}% accuracy  ·  ${score.toLocaleString()} pts`;
    ctx.fillText(stats, W / 2, statsY);

    // Trophy
    ctx.font = '120px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.fillText('🏆', W / 2, statsY + 130);

    // Footer: date + URL
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '400 18px "Geist", "Segoe UI", system-ui, sans-serif';
    const dStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    ctx.textAlign = 'left';
    ctx.fillText(`Issued: ${dStr}`, 90, H - 90);
    ctx.textAlign = 'right';
    ctx.fillText('ai-app-builder-challenge.vercel.app', W - 90, H - 90);

    return canvas;
  }

  function download(canvas, filename) {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'ai-challenge-certificate.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function shareCanvas(canvas, fallbackText) {
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) { resolve(false); return; }
        const file = new File([blob], 'ai-challenge-certificate.png', { type: 'image/png' });
        try {
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'My AI Challenge Certificate',
              text: fallbackText || 'I just earned an AI Challenge certificate!'
            });
            resolve(true);
            return;
          }
        } catch (_) { /* fall through to download */ }
        download(canvas);
        resolve(false);
      }, 'image/png');
    });
  }

  window.AIC_Certificate = { qualifies, render, download, shareCanvas };
})();
