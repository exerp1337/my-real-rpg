<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>Реал Лайф РПГ v10.0</title>
    <style>
        /* ═══════════════════════════════════════════════
           iOS 26 · ULTRA · Light / Dark
           ═══════════════════════════════════════════════ */

        /* ── ШРИФТЫ ──────────────────────────────────── */
        @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800;14..32,900&display=swap');

        /* ── ПЕРЕМЕННЫЕ ──────────────────────────────── */
        :root {
            /* Цветовая палитра — светлая */
            --bg-primary: #f5f5f7;
            --bg-secondary: #ffffff;
            --bg-card: rgba(255, 255, 255, 0.7);
            --bg-input: rgba(255, 255, 255, 0.5);
            --bg-tab: rgba(255, 255, 255, 0.5);
            --bg-tab-active: #ffffff;

            --text-primary: #1c1c1e;
            --text-secondary: #3a3a3c;
            --text-tertiary: #8e8e93;
            --text-inverse: #ffffff;

            --accent: #007aff;
            --accent-green: #34c759;
            --accent-red: #ff3b30;
            --accent-yellow: #ff9500;
            --accent-purple: #af52de;

            --border: rgba(60, 60, 67, 0.12);
            --border-heavy: rgba(60, 60, 67, 0.25);
            --shadow-sm: 0 2px 8px rgba(0,0,0,0.04);
            --shadow-md: 0 8px 24px rgba(0,0,0,0.06);
            --shadow-lg: 0 16px 48px rgba(0,0,0,0.1);

            --radius-sm: 10px;
            --radius-md: 16px;
            --radius-lg: 24px;
            --radius-xl: 32px;

            --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            --font-mono: 'Inter', monospace;

            --transition: 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        /* ── ТЁМНАЯ ТЕМА ─────────────────────────────── */
        body.dark {
            --bg-primary: #0a0a0c;
            --bg-secondary: #1c1c1e;
            --bg-card: rgba(28, 28, 30, 0.85);
            --bg-input: rgba(44, 44, 46, 0.6);
            --bg-tab: rgba(44, 44, 46, 0.6);
            --bg-tab-active: #3a3a3c;

            --text-primary: #f5f5f7;
            --text-secondary: #e5e5ea;
            --text-tertiary: #8e8e93;

            --accent: #0a84ff;
            --accent-green: #30d158;
            --accent-red: #ff453a;
            --accent-yellow: #ff9f0a;
            --accent-purple: #bf5af2;

            --border: rgba(255, 255, 255, 0.1);
            --border-heavy: rgba(255, 255, 255, 0.2);
            --shadow-sm: 0 2px 8px rgba(0,0,0,0.3);
            --shadow-md: 0 8px 24px rgba(0,0,0,0.4);
            --shadow-lg: 0 16px 48px rgba(0,0,0,0.6);
        }

        /* ── ОБЩИЙ СБРОС ────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 0; }
        * { scrollbar-width: none; }

        html, body {
            height: 100%;
            overflow: hidden;
            font-family: var(--font);
            background: var(--bg-primary);
            color: var(--text-primary);
            transition: background var(--transition), color var(--transition);
            -webkit-font-smoothing: antialiased;
        }

        #app-background { display: none; }

        /* ══════════════════════════════════════════════
           TOAST
        ══════════════════════════════════════════════ */
        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-width: 320px;
            pointer-events: none;
        }
        .toast {
            background: var(--bg-card);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: 14px 18px;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-primary);
            box-shadow: var(--shadow-lg);
            pointer-events: auto;
            border-left: 4px solid var(--accent);
            animation: toastIn 0.4s ease, toastOut 0.4s ease 2.6s forwards;
        }
        .toast.success { border-left-color: var(--accent-green); }
        .toast.error   { border-left-color: var(--accent-red); }
        .toast.warning { border-left-color: var(--accent-yellow); }
        @keyframes toastIn {
            from { opacity: 0; transform: translateX(24px) scale(0.95); }
            to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastOut {
            from { opacity: 1; transform: translateX(0) scale(1); }
            to   { opacity: 0; transform: translateX(24px) scale(0.95); }
        }

        /* ══════════════════════════════════════════════
           AUTH SCREEN
        ══════════════════════════════════════════════ */
        #auth-screen {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 24px;
            background: var(--bg-primary);
        }
        .auth-inner {
            width: 100%;
            max-width: 380px;
        }
        .auth-logo {
            text-align: center;
            margin-bottom: 32px;
        }
        .logo-icon {
            font-size: 56px;
            display: block;
            margin-bottom: 12px;
            filter: drop-shadow(0 4px 12px rgba(0,0,0,0.1));
        }
        .auth-logo h1 {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.5px;
            color: var(--text-primary);
        }
        .auth-logo .subtitle {
            font-size: 14px;
            color: var(--text-tertiary);
            font-weight: 400;
        }
        .auth-panel {
            background: var(--bg-card);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: var(--radius-xl);
            padding: 24px;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-lg);
        }
        .auth-tabs {
            display: flex;
            gap: 4px;
            background: var(--bg-tab);
            border-radius: var(--radius-md);
            padding: 4px;
            margin-bottom: 20px;
        }
        .auth-tab {
            flex: 1;
            text-align: center;
            padding: 10px;
            border-radius: var(--radius-sm);
            font-size: 15px;
            font-weight: 500;
            color: var(--text-tertiary);
            cursor: pointer;
            transition: all var(--transition);
        }
        .auth-tab.active {
            background: var(--bg-tab-active);
            color: var(--text-primary);
            box-shadow: var(--shadow-sm);
        }
        .auth-form {
            display: none;
            flex-direction: column;
            gap: 16px;
        }
        .auth-form.active { display: flex; }

        .auth-form input {
            background: var(--bg-input);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: 14px 16px;
            font-size: 16px;
            color: var(--text-primary);
            transition: border-color var(--transition), box-shadow var(--transition);
            outline: none;
        }
        .auth-form input:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.12);
        }
        .auth-form input::placeholder { color: var(--text-tertiary); }

        .auth-btn {
            background: var(--accent);
            color: #fff;
            border: none;
            border-radius: var(--radius-md);
            padding: 14px;
            font-size: 17px;
            font-weight: 600;
            cursor: pointer;
            transition: background var(--transition), transform 0.1s;
            width: 100%;
        }
        .auth-btn:active { transform: scale(0.98); }
        .auth-btn:hover { opacity: 0.9; }

        .auth-error, .auth-success {
            font-size: 14px;
            min-height: 20px;
            text-align: center;
        }
        .auth-error { color: var(--accent-red); }
        .auth-success { color: var(--accent-green); }
        .auth-hint {
            font-size: 14px;
            color: var(--text-tertiary);
            text-align: center;
        }
        .auth-hint span {
            color: var(--accent);
            cursor: pointer;
            font-weight: 500;
        }

        /* ══════════════════════════════════════════════
           GAME CONTAINER
        ══════════════════════════════════════════════ */
        .game-container {
            display: none;
            flex-direction: column;
            height: 100vh;
            max-width: 480px;
            margin: 0 auto;
            background: var(--bg-primary);
            position: relative;
        }
        .game-container.active { display: flex; }

        /* ── HEADER ──────────────────────────────────── */
        .header-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: var(--bg-card);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border);
            flex-shrink: 0;
        }
        .header-title {
            font-size: 17px;
            font-weight: 700;
            letter-spacing: -0.3px;
            color: var(--text-primary);
        }
        .header-right {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .user-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            color: var(--text-primary);
            background: var(--bg-input);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            padding: 4px 10px 4px 6px;
            border-radius: 20px;
        }
        #header-avatar { font-size: 20px; }
        #user-nick { font-weight: 600; }
        #user-level-badge {
            font-size: 12px;
            color: var(--accent);
            font-weight: 600;
        }
        #social-level-badge {
            font-size: 12px;
            color: var(--accent-purple);
            font-weight: 600;
        }

        .gold-badge {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 15px;
            font-weight: 600;
            color: var(--accent-yellow);
            background: var(--bg-input);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            padding: 4px 12px;
            border-radius: 20px;
        }

        .logout-btn {
            background: none;
            border: none;
            color: var(--accent-red);
            font-size: 18px;
            cursor: pointer;
            padding: 0 4px;
            opacity: 0.6;
            transition: opacity var(--transition);
        }
        .logout-btn:hover { opacity: 1; }

        .theme-toggle {
            background: var(--bg-input);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid var(--border);
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            cursor: pointer;
            transition: background var(--transition), transform 0.2s;
            color: var(--text-primary);
        }
        .theme-toggle:active { transform: scale(0.9); }
        .theme-toggle:hover { background: var(--border); }

        /* ── TABS (bottom nav) ───────────────────────── */
        .tabs {
            display: flex;
            background: var(--bg-card);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-top: 1px solid var(--border);
            flex-shrink: 0;
            padding: 4px 8px 8px;
            gap: 4px;
        }
        .tab-btn {
            flex: 1;
            background: none;
            border: none;
            border-radius: var(--radius-md);
            padding: 8px 4px 6px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            transition: all var(--transition);
            color: var(--text-tertiary);
            font-size: 10px;
            font-weight: 500;
        }
        .tab-btn .tab-icon { font-size: 22px; }
        .tab-btn.active {
            background: var(--bg-tab-active);
            color: var(--accent);
        }
        .tab-btn:active { transform: scale(0.95); }

        /* ── SCREENS WRAPPER ─────────────────────────── */
        .screens-wrapper {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            -webkit-overflow-scrolling: touch;
        }
        .screen {
            display: none;
            flex-direction: column;
            gap: 16px;
        }
        .screen.active { display: flex; }

        /* ══════════════════════════════════════════════
           CARDS — Glassmorphism
        ══════════════════════════════════════════════ */
        .card,
        .profile-card,
        .quest-card,
        .social-card,
        .sleep-card,
        .shop-card,
        .achieve-card,
        .social-quest-card,
        .weekly-challenge-card,
        .goal-card,
        .random-quest-card,
        .inventory-box {
            background: var(--bg-card);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: 16px;
            box-shadow: var(--shadow-sm);
            transition: background var(--transition), border-color var(--transition), box-shadow var(--transition);
        }

        .card-label {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-tertiary);
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .card-label::after {
            content: '';
            flex: 1;
            height: 1px;
            background: var(--border);
        }

        /* ══════════════════════════════════════════════
           PROFILE
        ══════════════════════════════════════════════ */
        .profile-card {
            text-align: center;
            background: var(--bg-card);
        }
        #profile-avatar {
            font-size: 72px;
            display: block;
            margin-bottom: 4px;
            filter: drop-shadow(0 4px 12px rgba(0,0,0,0.1));
        }
        .profile-level-label {
            font-size: 12px;
            color: var(--text-tertiary);
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        #level-display {
            font-size: 56px;
            font-weight: 800;
            color: var(--text-primary);
            line-height: 1.1;
        }
        .title-display {
            font-size: 15px;
            font-weight: 600;
            color: var(--accent);
            margin: 6px 0 12px;
        }
        .progress-container {
            background: var(--bg-input);
            border-radius: 20px;
            height: 8px;
            overflow: hidden;
            margin: 8px 0 4px;
        }
        .progress-bar {
            height: 100%;
            background: var(--accent);
            border-radius: 20px;
            transition: width 0.6s ease;
        }
        #exp-display {
            font-size: 13px;
            color: var(--text-tertiary);
            font-weight: 500;
        }

        /* ══════════════════════════════════════════════
           SOCIAL CARD
        ══════════════════════════════════════════════ */
        .social-card .social-title {
            font-weight: 600;
            color: var(--text-primary);
        }
        .social-level {
            font-size: 28px;
            font-weight: 700;
            color: var(--accent-purple);
        }
        #social-bar { background: var(--accent-purple); }

        /* ══════════════════════════════════════════════
           SLEEP
        ══════════════════════════════════════════════ */
        .sleep-title {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 8px;
        }
        .sleep-desc {
            font-size: 14px;
            color: var(--text-secondary);
            line-height: 1.5;
            margin-bottom: 12px;
        }
        .sleep-btn {
            background: var(--accent);
            color: #fff;
            border: none;
            border-radius: var(--radius-md);
            padding: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: all var(--transition);
        }
        .sleep-btn:active { transform: scale(0.98); }
        .sleep-btn:hover { opacity: 0.9; }

        /* ══════════════════════════════════════════════
           STATS
        ══════════════════════════════════════════════ */
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        .stat-item {
            background: var(--bg-input);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border-radius: var(--radius-md);
            padding: 12px 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background var(--transition);
        }
        .stat-item span:first-child { color: var(--text-secondary); font-weight: 500; }
        .stat-item span:last-child {
            font-weight: 600;
            font-size: 16px;
            font-family: var(--font-mono);
        }
        .luck-stat { grid-column: span 2; }

        /* ══════════════════════════════════════════════
           HOTBAR
        ══════════════════════════════════════════════ */
        .hotbar-title {
            display: flex;
            justify-content: space-between;
            font-weight: 600;
            color: var(--text-secondary);
            font-size: 14px;
            margin-bottom: 10px;
        }
        .hotbar-goals {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .hotbar-goal {
            background: var(--bg-input);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border-radius: var(--radius-md);
            padding: 8px 12px;
            flex: 1 1 calc(50% - 8px);
            min-width: 100px;
            border-left: 3px solid var(--accent);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .hotbar-goal .title { font-weight: 500; font-size: 14px; }
        .hotbar-goal .progress { font-size: 12px; color: var(--text-tertiary); }
        .hotbar-empty { color: var(--text-tertiary); font-size: 14px; padding: 8px 0; }

        /* ══════════════════════════════════════════════
           RANDOM QUEST
        ══════════════════════════════════════════════ */
        .random-quest-btn {
            background: var(--accent);
            color: #fff;
            border: none;
            border-radius: var(--radius-md);
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition);
        }
        .random-quest-btn:active { transform: scale(0.96); }

        /* ══════════════════════════════════════════════
           QUESTS
        ══════════════════════════════════════════════ */
        .quest-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
        }
        .quest-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.4; }
        .quest-reward { font-size: 13px; font-weight: 500; color: var(--accent-green); }

        .action-btn {
            background: var(--accent);
            color: #fff;
            border: none;
            border-radius: var(--radius-md);
            padding: 10px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: all var(--transition);
        }
        .action-btn:active { transform: scale(0.97); }
        .action-btn:disabled { opacity: 0.4; pointer-events: none; }
        .action-btn.blue { background: var(--accent); }
        .action-btn.purple { background: var(--accent-purple); }

        .weekly-challenge-card { border-left: 4px solid var(--accent-yellow); }
        .weekly-header { font-size: 16px; font-weight: 700; color: var(--text-primary); }
        .weekly-desc { font-size: 14px; color: var(--text-secondary); margin: 6px 0 10px; }
        .weekly-reward-text { font-size: 13px; color: var(--accent-yellow); font-weight: 500; margin-bottom: 12px; }
        .weekly-btn {
            background: var(--accent-yellow);
            color: #fff;
            border: none;
            border-radius: var(--radius-md);
            padding: 10px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: all var(--transition);
        }
        .weekly-btn:active { transform: scale(0.97); }

        .social-quest-card { border-left: 4px solid var(--accent-purple); }
        .social-quest-rank {
            font-size: 12px;
            font-weight: 600;
            color: var(--accent-purple);
            text-transform: uppercase;
        }
        .social-quest-card .title { font-size: 16px; font-weight: 600; }
        .social-quest-card .desc { font-size: 14px; color: var(--text-secondary); }
        .social-quest-card .reward { font-size: 13px; color: var(--accent-green); }
        .social-quest-card .actions button {
            background: var(--accent-green);
            color: #fff;
            border: none;
            border-radius: var(--radius-md);
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity var(--transition);
        }
        .social-quest-card .actions button.done { opacity: 0.4; pointer-events: none; }

        /* ══════════════════════════════════════════════
           GOALS
        ══════════════════════════════════════════════ */
        .goal-card {
            border-left: 4px solid var(--accent);
        }
        .goal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .goal-title { font-size: 16px; font-weight: 600; }
        .goal-desc { font-size: 14px; color: var(--text-secondary); }
        .goal-progress {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .goal-progress-bar {
            flex: 1;
            background: var(--bg-input);
            height: 6px;
            border-radius: 10px;
            overflow: hidden;
        }
        .goal-progress-bar .fill {
            height: 100%;
            border-radius: 10px;
            transition: width 0.4s;
            background: var(--accent);
        }
        .goal-reward { font-size: 13px; color: var(--text-tertiary); }
        .goal-reward span { color: var(--accent-yellow); font-weight: 500; }
        .goal-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            align-items: center;
        }
        .goal-actions button {
            background: var(--bg-input);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: none;
            border-radius: var(--radius-sm);
            padding: 6px 12px;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-primary);
            cursor: pointer;
            transition: background var(--transition);
        }
        .goal-actions button:hover { background: var(--border); }
        .goal-actions .done-btn { background: var(--accent-green); color: #fff; }
        .goal-actions .done-btn:hover { opacity: 0.8; }
        .goal-actions .delete-btn { background: var(--accent-red); color: #fff; }
        .goal-actions .delete-btn:hover { opacity: 0.8; }
        .goal-card.completed { opacity: 0.6; }

        .add-goal-btn {
            background: var(--accent);
            color: #fff;
            border: none;
            border-radius: var(--radius-md);
            padding: 10px 16px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition);
        }
        .add-goal-btn:active { transform: scale(0.96); }

        /* ══════════════════════════════════════════════
           SHOP
        ══════════════════════════════════════════════ */
        .shop-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        .shop-card {
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }
        .shop-card h3 { font-size: 16px; font-weight: 600; }
        .buy-btn {
            background: var(--accent);
            color: #fff;
            border: none;
            border-radius: var(--radius-md);
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition);
        }
        .buy-btn:active { transform: scale(0.96); }

        /* ══ ROULETTE — iOS 26 STYLE ═══════════════════ */
        .roulette-container {
            background: var(--bg-card);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-radius: var(--radius-lg);
            padding: 20px;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-sm);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
        }
        .roulette-hud-title {
            font-weight: 600;
            font-size: 16px;
            color: var(--text-primary);
        }
        .roulette-hud-cost {
            font-size: 14px;
            color: var(--text-tertiary);
        }
        .roulette-hud-cost span { color: var(--accent-yellow); font-weight: 600; }

        .roulette-stage {
            position: relative;
            width: 100%;
            max-width: 280px;
            aspect-ratio: 1/1;
            display: flex;
            justify-content: center;
        }
        .roulette-pointer {
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 24px;
            color: var(--text-primary);
            z-index: 5;
        }
        #roulette-canvas {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            box-shadow: var(--shadow-md);
        }
        .roulette-flash {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.1s;
        }
        .roulette-flash.active {
            opacity: 1;
            background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
            animation: flash-out 0.6s ease forwards;
        }
        @keyframes flash-out {
            0% { opacity: 1; }
            100% { opacity: 0; }
        }
        .roulette-spin-btn {
            background: var(--accent);
            color: #fff;
            border: none;
            border-radius: var(--radius-md);
            padding: 12px 40px;
            font-size: 17px;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition);
        }
        .roulette-spin-btn:active { transform: scale(0.96); }
        .roulette-spin-btn:disabled { opacity: 0.4; pointer-events: none; }
        .roulette-result-display {
            font-size: 14px;
            color: var(--text-primary);
            min-height: 24px;
            text-align: center;
        }

        /* ══════════════════════════════════════════════
           INVENTORY
        ══════════════════════════════════════════════ */
        .inventory-items {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .inv-item {
            background: var(--bg-input);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border-radius: var(--radius-sm);
            padding: 6px 12px;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            border: 1px solid var(--border);
            transition: background var(--transition), border-color var(--transition);
        }
        .inv-item:hover { border-color: var(--accent); }

        /* ══════════════════════════════════════════════
           ACHIEVEMENTS
        ══════════════════════════════════════════════ */
        .achieve-card {
            border-left: 4px solid var(--accent-yellow);
        }
        .achieve-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .achieve-title { font-weight: 600; font-size: 15px; }
        .achieve-badge {
            font-size: 12px;
            font-weight: 600;
            color: var(--text-tertiary);
            background: var(--bg-input);
            padding: 2px 10px;
            border-radius: 20px;
        }
        .achieve-card.locked { opacity: 0.5; }
        .achieve-card.locked .achieve-title { color: var(--text-tertiary); }
        .achieve-desc { font-size: 14px; color: var(--text-secondary); }
        .achieve-progress-bar {
            background: var(--bg-input);
            height: 4px;
            border-radius: 10px;
            overflow: hidden;
        }
        .achieve-progress-bar .fill {
            height: 100%;
            background: var(--accent-yellow);
            border-radius: 10px;
            transition: width 0.4s;
        }
        .achieve-reward { font-size: 13px; color: var(--accent-green); }

        /* ══════════════════════════════════════════════
           RESET BUTTON
        ══════════════════════════════════════════════ */
        .reset-btn {
            background: none;
            border: none;
            color: var(--accent-red);
            font-size: 14px;
            font-weight: 500;
            padding: 10px;
            cursor: pointer;
            width: 100%;
            opacity: 0.6;
            transition: opacity var(--transition);
        }
        .reset-btn:hover { opacity: 1; }

        /* ══════════════════════════════════════════════
           MODAL
        ══════════════════════════════════════════════ */
        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.3);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            padding: 20px;
        }
        .modal-overlay.active { display: flex; }

        .modal {
            background: var(--bg-card);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: var(--radius-xl);
            padding: 24px;
            width: 100%;
            max-width: 400px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--border);
        }
        .modal h2 {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 16px;
            color: var(--text-primary);
        }
        .modal input,
        .modal textarea,
        .modal select {
            width: 100%;
            background: var(--bg-input);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: 12px 14px;
            font-size: 15px;
            color: var(--text-primary);
            margin-bottom: 12px;
            transition: border-color var(--transition);
        }
        .modal input:focus,
        .modal textarea:focus,
        .modal select:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.12);
        }
        .modal select option { background: var(--bg-card); }
        .modal label {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-secondary);
            display: block;
            margin-bottom: 4px;
        }
        .modal-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 8px;
        }
        .modal-actions .cancel {
            background: var(--bg-input);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: none;
            border-radius: var(--radius-md);
            padding: 10px 20px;
            font-size: 15px;
            font-weight: 500;
            color: var(--text-primary);
            cursor: pointer;
        }
        .modal-actions .submit {
            background: var(--accent);
            border: none;
            border-radius: var(--radius-md);
            padding: 10px 20px;
            font-size: 15px;
            font-weight: 600;
            color: #fff;
            cursor: pointer;
        }
        #goal-reward-preview {
            background: var(--bg-input);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border-radius: var(--radius-md);
            padding: 10px;
            font-size: 14px;
            color: var(--text-primary);
            margin-bottom: 12px;
        }

        /* ── ROULETTE MODAL ───────────────────────────── */
        #roulette-spin-text { font-size: 60px; min-height: 80px; text-align: center; }
        #roulette-result-text { font-size: 16px; color: var(--text-secondary); min-height: 40px; text-align: center; }
        #roulette-actions { justify-content: center; }

        /* ══════════════════════════════════════════════
           CHEST MODAL (iOS 26)
        ══════════════════════════════════════════════ */
        #chest-modal {
            position: fixed;
            inset: 0;
            z-index: 2000;
            display: none;
            justify-content: center;
            align-items: center;
            background: rgba(0,0,0,0.35);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
        }
        #chest-modal.active { display: flex; }
        .chest-modal-inner {
            background: var(--bg-card);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border-radius: var(--radius-xl);
            padding: 32px 24px;
            max-width: 340px;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--border);
            position: relative;
        }
        .chest-particles {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: hidden;
        }
        .chest-particle {
            position: absolute;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            top: 50%;
            left: 50%;
            opacity: 0;
        }
        @keyframes particle-fly {
            0% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
            100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        .chest-emoji {
            font-size: 72px;
            line-height: 1;
            z-index: 2;
            user-select: none;
        }
        .chest-emoji.idle {
            animation: chest-idle 2s ease-in-out infinite;
        }
        @keyframes chest-idle {
            0%,100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-6px) rotate(-2deg); }
        }
        .chest-emoji.shaking {
            animation: chest-shake 0.08s ease-in-out infinite;
        }
        @keyframes chest-shake {
            0%,100% { transform: rotate(-4deg) scale(1.05); }
            50% { transform: rotate(4deg) scale(1.05); }
        }
        .chest-emoji.burst {
            animation: chest-burst 0.5s cubic-bezier(.2,1.6,.4,1) forwards;
        }
        @keyframes chest-burst {
            0% { transform: scale(1.05); filter: drop-shadow(0 0 0px transparent); }
            30% { transform: scale(1.35); filter: drop-shadow(0 0 40px var(--burst-color, #fff)); }
            60% { transform: scale(0.9); }
            100% { transform: scale(1); filter: drop-shadow(0 0 8px var(--burst-color, #fff)); }
        }
        .chest-ring {
            position: absolute;
            top: 50%; left: 50%;
            width: 120px; height: 120px;
            border-radius: 50%;
            transform: translate(-50%,-50%) scale(0);
            opacity: 0;
            pointer-events: none;
        }
        .chest-ring.pop {
            animation: ring-pop 0.6s ease-out forwards;
        }
        @keyframes ring-pop {
            0% { transform: translate(-50%,-50%) scale(0.3); opacity: 0.9; }
            100% { transform: translate(-50%,-50%) scale(3.5); opacity: 0; }
        }
        .chest-label {
            font-size: 14px;
            color: var(--text-tertiary);
            min-height: 20px;
        }
        .chest-item-reveal {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.5s ease, transform 0.5s ease;
            min-height: 80px;
        }
        .chest-item-reveal.visible {
            opacity: 1;
            transform: translateY(0);
        }
        .chest-item-icon { font-size: 48px; }
        .chest-item-name { font-size: 18px; font-weight: 700; }
        .chest-item-rarity {
            font-size: 12px;
            font-weight: 600;
            padding: 2px 12px;
            border-radius: 20px;
            background: var(--bg-input);
        }
        .chest-item-bonus { font-size: 14px; color: var(--text-tertiary); }
        .chest-close-btn {
            margin-top: 12px;
            background: var(--accent);
            color: #fff;
            border: none;
            border-radius: var(--radius-md);
            padding: 10px 24px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.3s;
        }
        .chest-close-btn.visible { opacity: 1; }

        /* ══════════════════════════════════════════════
           RARITY BADGE
        ══════════════════════════════════════════════ */
        .rarity-badge {
            font-size: 11px;
            font-weight: 600;
            padding: 2px 10px;
            border-radius: 20px;
            background: var(--accent);
            color: #fff;
            white-space: nowrap;
        }

        /* ══════════════════════════════════════════════
           RESPONSIVE
        ══════════════════════════════════════════════ */
        @media (max-width: 420px) {
            .header-title { font-size: 15px; }
            #level-display { font-size: 44px; }
            #profile-avatar { font-size: 52px; }
            .stats-grid { grid-template-columns: 1fr 1fr; }
            .shop-grid { grid-template-columns: 1fr; }
            .tab-btn .tab-icon { font-size: 20px; }
            .tab-btn { font-size: 9px; }
            .hotbar-goal { flex: 1 1 100%; }
        }

        /* ══════════════════════════════════════════════
           АНИМАЦИЯ ПОЯВЛЕНИЯ
        ══════════════════════════════════════════════ */
        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .auth-container { animation: fadeUp 0.5s ease forwards; }
        .game-container.active { animation: fadeUp 0.4s ease forwards; }
    </style>
</head>
<body>
    <div id="app-background"></div>
    <div class="toast-container" id="toast-container"></div>

    <!-- ══════════════════════════════════════════════
         АВТОРИЗАЦИЯ
    ══════════════════════════════════════════════ -->
    <div id="auth-screen" class="auth-container">
        <div class="auth-inner">
            <div class="auth-logo">
                <span class="logo-icon">⚔️</span>
                <h1>Реал Лайф РПГ</h1>
                <div class="subtitle">// система прокачки жизни v10.0</div>
            </div>

            <div class="auth-panel">
                <div class="auth-tabs">
                    <div class="auth-tab active" id="login-tab" onclick="switchAuthTab('login')">🔑 Вход</div>
                    <div class="auth-tab" id="register-tab" onclick="switchAuthTab('register')">📝 Регистрация</div>
                </div>

                <div class="auth-form active" id="login-form">
                    <input type="text" id="login-username" placeholder="Имя пользователя" autocomplete="username">
                    <input type="password" id="login-password" placeholder="Пароль" autocomplete="current-password">
                    <div class="auth-error" id="login-error"></div>
                    <button class="auth-btn" onclick="loginUser()">// ВОЙТИ В СИСТЕМУ</button>
                    <div class="auth-hint">Нет аккаунта? <span onclick="switchAuthTab('register')">Создать</span></div>
                </div>

                <div class="auth-form" id="register-form">
                    <input type="text" id="reg-username" placeholder="Имя пользователя" autocomplete="username">
                    <input type="email" id="reg-email" placeholder="Email (необязательно)" autocomplete="email">
                    <input type="password" id="reg-password" placeholder="Пароль (минимум 4 символа)" autocomplete="new-password">
                    <input type="password" id="reg-password2" placeholder="Повторите пароль" autocomplete="new-password">
                    <div class="auth-error" id="register-error"></div>
                    <div class="auth-success" id="register-success"></div>
                    <button class="auth-btn" onclick="registerUser()">// СОЗДАТЬ АККАУНТ</button>
                    <div class="auth-hint">Уже есть аккаунт? <span onclick="switchAuthTab('login')">Войти</span></div>
                </div>
            </div>
        </div>
    </div>

    <!-- ══════════════════════════════════════════════
         ИГРА
    ══════════════════════════════════════════════ -->
    <div id="game-container" class="game-container">

        <!-- HEADER -->
        <div class="header-bar">
            <div class="header-title">▸ РПГ РЕАЛ ЛАЙФ</div>
            <div class="header-right">
                <div class="user-badge">
                    <span id="header-avatar">🥚</span>
                    <span id="user-nick">Игрок</span>
                    <span id="user-level-badge">Lv.1</span>
                    <span id="social-level-badge">Соц.1</span>
                    <button class="logout-btn" onclick="logoutUser()" title="Выйти">✕</button>
                </div>
                <div class="gold-badge">🪙&thinsp;<span id="gold-val">0</span></div>
                <!-- Кнопка переключения темы -->
                <button class="theme-toggle" id="theme-toggle" onclick="toggleTheme()" title="Переключить тему">🌙</button>
            </div>
        </div>

        <!-- SCREENS -->
        <div class="screens-wrapper">

            <!-- ── Прокачка ── -->
            <div id="main-screen" class="screen active">

                <div class="card hotbar">
                    <div class="hotbar-title">
                        <span>🎯 Активные цели</span>
                        <span style="color:var(--accent);cursor:pointer;font-size:11px;" onclick="switchTab('goals-screen', document.querySelectorAll('.tab-btn')[2])">ВСЕ →</span>
                    </div>
                    <div class="hotbar-goals" id="hotbar-goals"></div>
                </div>

                <div class="card random-quest-card">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                        <div class="card-label" style="margin:0;">🎲 Рандомный квест</div>
                        <button id="random-quest-btn" class="random-quest-btn">// КРУТИТЬ</button>
                    </div>
                    <div id="random-quest-display" style="margin-top:12px;font-size:13px;color:var(--text-tertiary);font-family:var(--font-body);">
                        Нажмите «КРУТИТЬ», чтобы получить случайное задание.
                    </div>
                </div>

                <div class="profile-card">
                    <div id="profile-avatar">🥚</div>
                    <div class="profile-level-label">// УРОВЕНЬ ПЕРСОНАЖА</div>
                    <div id="level-display">1</div>
                    <div class="title-display" id="title-display">🥚 Обыватель</div>
                    <div class="progress-container"><div class="progress-bar" id="exp-bar"></div></div>
                    <div id="exp-display">0 / 250 XP</div>
                </div>

                <div class="social-card card">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <span class="social-title" style="color:var(--accent-purple)">🤝 Соц. Уровень</span>
                        <span class="social-level" id="social-level-display">1</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:11px;color:var(--text-tertiary);margin-bottom:6px;">
                        <span id="social-xp-display">0 / 100 XP</span>
                        <span id="social-percent-display">0%</span>
                    </div>
                    <div class="progress-container"><div id="social-bar" class="progress-bar"></div></div>
                    <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-tertiary);margin-top:8px;">⟳ ОБНОВЛЕНИЕ: <span id="social-timer">--:--:--</span></div>
                </div>

                <div class="sleep-card card">
                    <div class="sleep-title" style="color:var(--accent)">🌙 Режим сна</div>
                    <div class="sleep-desc">
                        До 00:00 → <b style="color:var(--accent-green)">+10 Дисциплина / +15 🪙</b><br>
                        После 00:00 → <b style="color:var(--accent-red)">-10 Дисциплина</b>
                    </div>
                    <button class="sleep-btn" id="sleep-action-btn" onclick="checkSleepTime()">🛌 ЛЕЧЬ СПАТЬ</button>
                </div>

                <div class="stats-grid">
                    <div class="stat-item"><span>💪 Сила</span><span id="str-val" style="color:var(--accent)">0</span></div>
                    <div class="stat-item"><span>🏃 Выносливость</span><span id="end-val" style="color:var(--accent-yellow)">0</span></div>
                    <div class="stat-item"><span>🎯 Ловкость</span><span id="agi-val" style="color:var(--accent-green)">0</span></div>
                    <div class="stat-item"><span>📚 Интеллект</span><span id="int-val" style="color:var(--accent)">0</span></div>
                    <div class="stat-item"><span>🗣 Харизма</span><span id="cha-val" style="color:var(--accent-purple)">0</span></div>
                    <div class="stat-item"><span>👁 Дисциплина</span><span id="per-val" style="color:var(--accent)">0</span></div>
                    <div class="stat-item luck-stat"><span>🍀 Удача</span><span id="luck-val" style="color:var(--accent-yellow)">0</span></div>
                </div>

                <div class="card">
                    <button class="action-btn" onclick="train('str')" style="border-color:var(--accent);color:var(--accent);">
                        <span>🏋️ Зал (База)</span><span class="btn-plus">+10 Сила</span>
                    </button>
                </div>

                <div class="inventory-box card">
                    <div class="card-label">🎒 Снаряжение &amp; Бонусы</div>
                    <div class="inventory-items" id="inventory-list">
                        <span style="color:var(--text-tertiary);font-style:italic;font-size:13px;">Нет снаряжения...</span>
                    </div>
                </div>

                <button class="reset-btn" onclick="resetProgress()">⚠ Начать жизнь с нуля</button>
            </div>

            <!-- ── Квесты ── -->
            <div id="quests-screen" class="screen">
                <div class="section-title">// КВЕСТЫ</div>

                <div class="weekly-challenge-card card">
                    <div class="weekly-header" style="color:var(--accent-yellow)">⭐ Прочитай книгу</div>
                    <div class="weekly-desc" style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
                        Прочитай книгу объёмом не менее 200 страниц.
                    </div>
                    <div class="weekly-reward-text" style="color:var(--accent-yellow);margin-bottom:12px;">
                        ➕ +8 ко всем характеристикам · +15 удачи · +100 монет
                    </div>
                    <button class="weekly-btn" id="w1" onclick="completeWeeklyChallenge(this)" style="border-color:var(--accent-yellow);color:var(--accent-yellow);">// ВЫПОЛНИТЬ</button>
                </div>

                <div class="quests-grid" id="quests-container"></div>
                <div class="social-quests-container" id="social-quests-container"></div>
            </div>

            <!-- ── Цели ── -->
            <div id="goals-screen" class="screen">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div class="section-title" style="border:none;padding:0;">// ЦЕЛИ</div>
                    <button class="add-goal-btn" onclick="showAddGoalModal()" style="border-color:var(--accent-yellow);color:var(--accent-yellow);padding:8px 14px;font-size:10px;">➕ ДОБАВИТЬ</button>
                </div>
                <div class="goals-container" id="goals-container"></div>
            </div>

            <!-- ── Магазин ── -->
            <div id="shop-screen" class="screen">
                <div class="section-title">// МАГАЗИН</div>

                <div class="shop-grid">
                    <div class="shop-card card">
                        <h3>📦 Обычный сундук</h3>
                        <button class="buy-btn" onclick="openChest('common',30)" style="border-color:var(--accent);color:var(--accent);">
                            За 30 🪙
                        </button>
                    </div>
                    <div class="shop-card card" style="border-color:rgba(255,0,204,0.3);">
                        <h3 style="color:var(--accent-purple);">👑 Эпический кейс</h3>
                        <button class="buy-btn" onclick="openChest('epic',100)" style="border-color:var(--accent-purple);color:var(--accent-purple);">
                            За 100 🪙
                        </button>
                    </div>
                </div>

                <div class="roulette-container">
                    <div class="roulette-hud-title">
                        <span class="roulette-hud-dot"></span>
                        РУЛЕТКА УДАЧИ
                        <span class="roulette-hud-dot"></span>
                    </div>
                    <div class="roulette-hud-cost">СТОИМОСТЬ: <span>50 🪙</span></div>

                    <div class="roulette-stage">
                        <div class="roulette-pointer">▼</div>
                        <canvas id="roulette-canvas" width="320" height="320"></canvas>
                        <div class="roulette-flash" id="roulette-flash"></div>
                    </div>

                    <button class="roulette-spin-btn" id="roulette-spin-btn" onclick="spinRoulette()">
                        <span class="spin-btn-inner">КРУТИТЬ</span>
                    </button>
                    <div id="roulette-result" class="roulette-result-display"></div>
                </div>
            </div>

            <!-- ── Ачивки ── -->
            <div id="achieve-screen" class="screen">
                <div class="section-title" style="color:var(--accent-yellow)">// ДОСТИЖЕНИЯ</div>
                <div id="achievements-container"></div>
            </div>

        </div><!-- /screens-wrapper -->

        <!-- BOTTOM NAV TABS -->
        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('main-screen', this)">
                <span class="tab-icon">⚔️</span>Прокачка
            </button>
            <button class="tab-btn" onclick="switchTab('quests-screen', this)">
                <span class="tab-icon">📜</span>Квесты
            </button>
            <button class="tab-btn" onclick="switchTab('goals-screen', this)">
                <span class="tab-icon">🎯</span>Цели
            </button>
            <button class="tab-btn" onclick="switchTab('shop-screen', this)">
                <span class="tab-icon">🏪</span>Магазин
            </button>
            <button class="tab-btn" onclick="switchTab('achieve-screen', this)">
                <span class="tab-icon">🏆</span>Ачивки
            </button>
        </div>
    </div>

    <!-- ═══ МОДАЛКА РУЛЕТКИ ═══ -->
    <div class="modal-overlay" id="roulette-modal">
        <div class="modal" style="text-align:center;">
            <h2>🎰 Рулетка заданий</h2>
            <div id="roulette-spin-text">🎰</div>
            <div id="roulette-result-text"></div>
            <div id="roulette-actions" class="modal-actions" style="display:none;">
                <button id="roulette-accept-btn" class="auth-btn" style="border-color:var(--accent-green);color:var(--accent-green);">✅ Принять</button>
                <button id="roulette-skip-btn" class="auth-btn" style="border-color:var(--accent-yellow);color:var(--accent-yellow);">🔄 Пропустить</button>
                <button id="roulette-close-btn" class="auth-btn" style="border-color:var(--text-tertiary);color:var(--text-tertiary);">✕ Закрыть</button>
            </div>
        </div>
    </div>

    <!-- ═══ МОДАЛКА ЦЕЛЕЙ ═══ -->
    <div class="modal-overlay" id="goal-modal">
        <div class="modal">
            <h2>🎯 Новая цель</h2>
            <input type="text" id="goal-title" placeholder="Название цели">
            <textarea id="goal-desc" placeholder="Описание" rows="2"></textarea>
            <input type="number" id="goal-target" placeholder="Целевое значение">
            <input type="text" id="goal-unit" placeholder="Единица измерения">
            <select id="goal-rarity">
                <option value="legendary">⭐ Легендарная</option>
                <option value="epic">🔮 Эпическая</option>
                <option value="common">📦 Обычная</option>
                <option value="easy">🌱 Легкая</option>
            </select>
            <select id="goal-stat">
                <option value="str">💪 Сила</option>
                <option value="end">🏃 Выносливость</option>
                <option value="agi">🎯 Ловкость</option>
                <option value="int">📚 Интеллект</option>
                <option value="cha">🗣 Харизма</option>
                <option value="per">👁 Дисциплина</option>
                <option value="luck">🍀 Удача</option>
            </select>
            <div id="goal-reward-preview"></div>
            <div class="modal-actions">
                <button class="cancel" onclick="closeGoalModal()">Отмена</button>
                <button class="submit" onclick="addGoal()">Добавить</button>
            </div>
        </div>
    </div>

    <!-- ═══ МОДАЛКА СУНДУКА ═══ -->
    <div id="chest-modal">
        <div class="chest-modal-inner">
            <div class="chest-particles" id="chest-particles"></div>
            <div class="chest-ring" id="chest-ring"></div>
            <div class="chest-emoji idle" id="chest-emoji">📦</div>
            <div class="chest-label" id="chest-label">Нажмите, чтобы открыть</div>
            <div class="chest-item-reveal" id="chest-item-reveal">
                <div class="chest-item-icon" id="chest-item-icon">🗡️</div>
                <div class="chest-item-name" id="chest-item-name">Меч теней</div>
                <div class="chest-item-rarity" id="chest-item-rarity">EPIC</div>
                <div class="chest-item-bonus" id="chest-item-bonus">+5 к Силе</div>
            </div>
            <button class="chest-close-btn" id="chest-close-btn" onclick="closeChestModal()">Забрать награду</button>
        </div>
    </div>

    <script src="script.js"></script>
    <script>
        // ========================================
        //  ТЕМА (iOS 26) — инициализация
        // ========================================

        const THEME_KEY = 'rpg_theme';

        function getPreferredTheme() {
            const saved = localStorage.getItem(THEME_KEY);
            if (saved === 'dark' || saved === 'light') return saved;
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        function applyTheme(theme) {
            if (theme === 'dark') {
                document.body.classList.add('dark');
                const btn = document.getElementById('theme-toggle');
                if (btn) btn.textContent = '☀️';
            } else {
                document.body.classList.remove('dark');
                const btn = document.getElementById('theme-toggle');
                if (btn) btn.textContent = '🌙';
            }
            localStorage.setItem(THEME_KEY, theme);
        }

        function toggleTheme() {
            const isDark = document.body.classList.contains('dark');
            applyTheme(isDark ? 'light' : 'dark');
        }

        // Применяем тему при загрузке
        const initialTheme = getPreferredTheme();
        applyTheme(initialTheme);
    </script>
</body>
</html>
