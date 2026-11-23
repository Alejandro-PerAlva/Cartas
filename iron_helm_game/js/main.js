import { App } from './ui/app.js';

const boot = () => { window.ironHelm = new App(document.getElementById('app')); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
