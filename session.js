// ========================================
//  СЕССИЯ (localStorage)
// ========================================

import { SESSION_KEY } from './config.js';

export function saveSession(username) {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ username: username, loginTime: new Date().toISOString() }));
    } catch (e) { console.error('Error saving session:', e); }
}

export function getSession() {
    try {
        const data = localStorage.getItem(SESSION_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
}

export function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { console.error('Error clearing session:', e); }
}