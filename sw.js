const CACHE_NAME = 'math-pwa-final';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './img/potencia_positiva.png',    
    './img/potencia_negativa.png',    
    './img/notacion_cientifica.png',  
    './img/raiz_cuadrada.png'        
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
    e.respondWith(caches.match(e.request).then((response) => response || fetch(e.request)));
});