// ========================================
//  СУНДУКИ И РУЛЕТКА
// ========================================

import { currentUserData } from './state.js';
import { RARITIES, ITEMS_POOL, RARITY_GLOW, CHEST_EMOJI_MAP, ROULETTE_SECTORS } from './config.js';
import { saveUserData } from './supabase.js';
import { updateUI, renderInventory, renderAchievements, renderRouletteResult } from './ui.js';
import { toast } from './utils.js';

// ---- Сундуки ----

export function getRandomItem() {
    const rand = Math.random() * 100;
    let cumulative = 0;
    let selectedRarity = 'common';
    for (const [rarity, config] of Object.entries(RARITIES)) {
        cumulative += config.weight;
        if (rand <= cumulative) {
            selectedRarity = rarity;
            break;
        }
    }
    const pool = ITEMS_POOL.filter(item => item.rarity === selectedRarity);
    if (pool.length === 0) {
        return ITEMS_POOL[Math.floor(Math.random() * ITEMS_POOL.length)];
    }
    return JSON.parse(JSON.stringify(pool[Math.floor(Math.random() * pool.length)]));
}

export function spawnParticles(color) {
    const container = document.getElementById('chest-particles');
    container.innerHTML = '';
    const count = 28;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'chest-particle';
        const angle = (i / count) * 360;
        const dist  = 80 + Math.random() * 100;
        const rad   = angle * Math.PI / 180;
        const tx    = Math.cos(rad) * dist + 'px';
        const ty    = Math.sin(rad) * dist + 'px';
        const size  = 4 + Math.random() * 7;
        const delay = Math.random() * 0.15;
        const dur   = 0.5 + Math.random() * 0.4;
        p.style.cssText = `
            background: ${color};
            width: ${size}px; height: ${size}px;
            --tx: ${tx}; --ty: ${ty};
            box-shadow: 0 0 6px ${color};
            animation: particle-fly ${dur}s ease-out ${delay}s forwards;
        `;
        container.appendChild(p);
    }
}

export function flashRing(color) {
    const ring = document.getElementById('chest-ring');
    ring.style.border = `3px solid ${color}`;
    ring.style.boxShadow = `0 0 30px ${color}, inset 0 0 20px ${color}`;
    ring.classList.remove('pop');
    void ring.offsetWidth;
    ring.classList.add('pop');
}

export function showChestModal(tier, item) {
    const modal     = document.getElementById('chest-modal');
    const emojiEl   = document.getElementById('chest-emoji');
    const labelEl   = document.getElementById('chest-label');
    const revealEl  = document.getElementById('chest-item-reveal');
    const iconEl    = document.getElementById('chest-item-icon');
    const nameEl    = document.getElementById('chest-item-name');
    const rarityEl  = document.getElementById('chest-item-rarity');
    const bonusEl   = document.getElementById('chest-item-bonus');
    const closeBtn  = document.getElementById('chest-close-btn');

    const rarityConfig = RARITIES[item.rarity] || RARITIES.common;
    const glowColor    = RARITY_GLOW[item.rarity] || '#aaaacc';
    const chestEmoji   = CHEST_EMOJI_MAP[tier] || '📦';

    emojiEl.className   = 'chest-emoji idle';
    emojiEl.textContent = chestEmoji;
    emojiEl.style.setProperty('--burst-color', glowColor);
    labelEl.textContent   = 'Нажмите, чтобы открыть';
    revealEl.classList.remove('visible');
    closeBtn.classList.remove('visible');
    iconEl.textContent    = item.icon || '🎁';
    nameEl.textContent    = item.name;
    rarityEl.textContent  = rarityConfig.label || item.rarity;
    rarityEl.style.background = glowColor;
    rarityEl.style.color      = '#000';
    bonusEl.textContent = `+${item.bonus} к ${STAT_LABELS[item.stat] || 'характеристике'}`;
    iconEl.style.filter = `drop-shadow(0 0 16px ${glowColor})`;

    modal.classList.add('active');

    let opened = false;
    function doOpen() {
        if (opened) return;
        opened = true;
        emojiEl.removeEventListener('click', doOpen);
        labelEl.textContent = '...';

        emojiEl.className = 'chest-emoji shaking';

        setTimeout(() => {
            emojiEl.className = 'chest-emoji burst';
            emojiEl.textContent = tier === 'epic' ? '🎁' : '📬';
            spawnParticles(glowColor);
            flashRing(glowColor);
            labelEl.textContent = 'Вы получили...';
        }, 600);

        setTimeout(() => {
            revealEl.classList.add('visible');
        }, 1100);

        setTimeout(() => {
            closeBtn.classList.add('visible');
        }, 1600);
    }

    emojiEl.style.cursor = 'pointer';
    emojiEl.addEventListener('click', doOpen);

    setTimeout(() => doOpen(), 2000);
}

export function closeChestModal() {
    document.getElementById('chest-modal').classList.remove('active');
    document.getElementById('chest-particles').innerHTML = '';
}

export async function openChest(tier, price) {
    if (!currentUserData) return;
    if ((currentUserData.stats.gold || 0) < price) {
        toast('❌ Недостаточно монет!', 'error');
        return;
    }
    currentUserData.stats.gold -= price;
    const item = getRandomItem();
    if (!Array.isArray(currentUserData.inventory)) {
        currentUserData.inventory = [];
    }
    currentUserData.inventory.push(item);
    if (item.stat && item.bonus) {
        currentUserData.stats[item.stat] = (currentUserData.stats[item.stat] || 0) + item.bonus;
    }
    currentUserData.total_chests_opened = (currentUserData.total_chests_opened || 0) + 1;
    await saveUserData();
    updateUI();
    renderInventory();
    renderAchievements();
    showChestModal(tier, item);
}

// ---- Рулетка ----

let rouletteCanvas = null;
let ctx = null;
let isSpinning = false;
let currentAngle = 0;

export function initRoulette() {
    const canvas = document.getElementById('roulette-canvas');
    if (!canvas) return;
    const size = Math.min(canvas.parentElement?.offsetWidth || 320, 320);
    canvas.width  = size;
    canvas.height = size;
    rouletteCanvas = canvas;
    ctx = canvas.getContext('2d');
    drawWheel(currentAngle);
}

export function drawWheel(angle) {
    if (!ctx || !rouletteCanvas) return;
    const canvas = rouletteCanvas;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R  = Math.min(W, H) * 0.46;

    ctx.clearRect(0, 0, W, H);

    const count = ROULETTE_SECTORS.length;
    const arc   = (2 * Math.PI) / count;

    const DARK_COLORS = [
        { bg: '#1a0a2e', neon: '#cc44ff' },
        { bg: '#0a1a2e', neon: '#00ccff' },
        { bg: '#1a1a0a', neon: '#ffcc00' },
        { bg: '#2e0a1a', neon: '#ff2277' },
        { bg: '#0a2e1a', neon: '#00ff88' },
        { bg: '#1a0e0a', neon: '#ff6633' },
        { bg: '#0e0a2e', neon: '#8866ff' },
        { bg: '#2e2a0a', neon: '#ffee44' },
    ];

    // ── 1. Outer decorative ring tick-marks ──────────
    const tickCount = count * 6;
    const tickInner = R + 4;
    const tickOuter = R + 14;
    for (let i = 0; i < tickCount; i++) {
        const a = (i / tickCount) * 2 * Math.PI + angle;
        const isMajor = i % 6 === 0;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * tickInner, cy + Math.sin(a) * tickInner);
        ctx.lineTo(cx + Math.cos(a) * (isMajor ? tickOuter : tickOuter - 4), cy + Math.sin(a) * (isMajor ? tickOuter : tickOuter - 4));
        ctx.strokeStyle = isMajor ? 'rgba(255,0,204,0.8)' : 'rgba(255,0,204,0.3)';
        ctx.lineWidth = isMajor ? 1.5 : 0.8;
        ctx.stroke();
    }

    ROULETTE_SECTORS.forEach((sector, i) => {
        const col = DARK_COLORS[i % DARK_COLORS.length];
        const startAngle = angle + i * arc;
        const endAngle   = startAngle + arc;

        const grad = ctx.createRadialGradient(cx, cy, R * 0.18, cx, cy, R);
        grad.addColorStop(0,   col.bg);
        grad.addColorStop(0.6, col.bg);
        grad.addColorStop(1,   col.neon + '33');
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, startAngle, endAngle);
        ctx.closePath();
        ctx.strokeStyle = col.neon + '55';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, R, startAngle + 0.04, endAngle - 0.04);
        ctx.strokeStyle = col.neon;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = col.neon;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(startAngle) * R * 0.2, cy + Math.sin(startAngle) * R * 0.2);
        ctx.lineTo(cx + Math.cos(startAngle) * R,       cy + Math.sin(startAngle) * R);
        ctx.strokeStyle = col.neon + '88';
        ctx.lineWidth = 1.2;
        ctx.shadowColor = col.neon;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        const midAngle  = startAngle + arc / 2;
        const textR     = R * 0.68;
        const x = cx + Math.cos(midAngle) * textR;
        const y = cy + Math.sin(midAngle) * textR;
        ctx.font = `${Math.round(R * 0.2)}px sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = '#fff';
        ctx.shadowColor  = col.neon;
        ctx.shadowBlur   = 12;
        ctx.fillText(sector.emoji, x, y);
        ctx.shadowBlur = 0;

        const labelR = R * 0.88;
        const lx = cx + Math.cos(midAngle) * labelR;
        const ly = cy + Math.sin(midAngle) * labelR;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(midAngle + Math.PI / 2);
        ctx.font = `bold ${Math.round(R * 0.07)}px 'Inter', monospace`;
        ctx.fillStyle = col.neon;
        ctx.shadowColor = col.neon;
        ctx.shadowBlur  = 6;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sector.label.toUpperCase(), 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
    });

    // ── 3. Outer ring border ─────────────────────────
    ctx.beginPath();
    ctx.arc(cx, cy, R + 2, 0, 2 * Math.PI);
    ctx.strokeStyle = '#0a0a18';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, R + 6, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ff00cc';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff00cc';
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(cx, cy, R + 12, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── 4. Inner hub ─────────────────────────────────
    const hubR = R * 0.16;

    const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubR);
    hubGrad.addColorStop(0,   '#3a1a4a');
    hubGrad.addColorStop(0.6, '#1a0a2e');
    hubGrad.addColorStop(1,   '#0d0018');
    ctx.beginPath();
    ctx.arc(cx, cy, hubR, 0, 2 * Math.PI);
    ctx.fillStyle = hubGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, hubR, 0, 2 * Math.PI);
    ctx.strokeStyle = '#bf5af2';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#bf5af2';
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (let s = 0; s < 4; s++) {
        const sa = (s / 4) * Math.PI * 2 + angle * 0.3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(sa) * hubR * 0.4, cy + Math.sin(sa) * hubR * 0.4);
        ctx.lineTo(cx + Math.cos(sa) * hubR * 0.9, cy + Math.sin(sa) * hubR * 0.9);
        ctx.strokeStyle = 'rgba(191,90,242,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, hubR * 0.28, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#bf5af2';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
}

export async function spinRoulette() {
    if (!currentUserData) {
        toast('❌ Сначала войдите в игру!', 'error');
        return;
    }
    if ((currentUserData.stats.gold || 0) < 50) {
        toast('❌ Недостаточно монет! Нужно 50 🪙', 'error');
        return;
    }
    if (isSpinning) return;
    isSpinning = true;
    document.getElementById('roulette-spin-btn').disabled = true;

    currentUserData.stats.gold -= 50;
    await saveUserData();

    const totalRotation = 4 * 2 * Math.PI + Math.random() * 2 * Math.PI;
    const startAngle = currentAngle;
    const targetAngle = startAngle + totalRotation;
    const duration = 4000;
    const startTime = performance.now();

    function animateSpin(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = startAngle + totalRotation * eased;
        drawWheel(current);
        if (progress < 1) {
            requestAnimationFrame(animateSpin);
        } else {
            currentAngle = targetAngle;
            drawWheel(currentAngle);
            isSpinning = false;
            document.getElementById('roulette-spin-btn').disabled = false;
            const normalized = ((targetAngle % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
            const sectorIndex = Math.floor(normalized / (2*Math.PI / ROULETTE_SECTORS.length)) % ROULETTE_SECTORS.length;
            const sector = ROULETTE_SECTORS[sectorIndex];
            const item = getRandomItem();
            if (!Array.isArray(currentUserData.inventory)) {
                currentUserData.inventory = [];
            }
            currentUserData.inventory.push(item);
            if (item.stat && item.bonus) {
                currentUserData.stats[item.stat] = (currentUserData.stats[item.stat] || 0) + item.bonus;
            }
            saveUserData().then(() => {
                const rarityConfig = RARITIES[item.rarity] || RARITIES.common;
                renderRouletteResult(`✦ ${rarityConfig.label}: ${item.name}  +${item.bonus} ${STAT_LABELS[item.stat] || 'все статы'}`);
                updateUI();
                renderInventory();
                renderAchievements();
                const flash = document.getElementById('roulette-flash');
                if (flash) { flash.classList.add('active'); setTimeout(() => flash.classList.remove('active'), 700); }
                const resultEl = document.getElementById('roulette-result');
                if (resultEl) { resultEl.style.color = rarityConfig.color || '#00ffff'; setTimeout(() => { resultEl.style.color = ''; }, 4000); }
                toast(`🎡 Вы выиграли: ${rarityConfig.label}\n${item.icon} ${item.name}\n+${item.bonus} ${STAT_LABELS[item.stat] || 'всем статам'}`, 'success');
            });
        }
    }
    requestAnimationFrame(animateSpin);
}