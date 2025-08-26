import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Globe, 
  FileCode2, 
  Code2, 
  Sparkles,
  Zap,
  Palette,
  Smartphone,
  ShoppingCart,
  Briefcase,
  MessageCircle,
  Calendar,
  Users,
  BarChart
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  type: 'web-app' | 'component' | 'prototype';
  category: 'business' | 'creative' | 'utility' | 'ecommerce';
  html: string;
  css: string;
  javascript: string;
  preview: string;
  tags: string[];
}

interface TemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Template) => void;
}

const templates: Template[] = [
  {
    id: 'landing-page',
    name: 'Landing Page Moderne',
    description: 'Page d\'atterrissage responsive avec hero section et CTA',
    type: 'web-app',
    category: 'business',
    preview: '🚀',
    tags: ['responsive', 'hero', 'cta', 'moderne'],
    html: `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Landing Page Moderne</title>
</head>
<body>
    <nav class="navbar">
        <div class="nav-brand">MonApp</div>
        <div class="nav-links">
            <a href="#features">Fonctionnalités</a>
            <a href="#pricing">Tarifs</a>
            <button class="btn-primary">Commencer</button>
        </div>
    </nav>
    
    <main class="hero">
        <div class="hero-content">
            <h1>Révolutionnez votre workflow</h1>
            <p>L'outil qui va transformer votre façon de travailler</p>
            <button class="cta-button">Essayer gratuitement</button>
        </div>
    </main>
    
    <section id="features" class="features">
        <div class="feature-grid">
            <div class="feature-card">
                <h3>Rapide</h3>
                <p>Performance optimisée</p>
            </div>
            <div class="feature-card">
                <h3>Sécurisé</h3>
                <p>Données protégées</p>
            </div>
            <div class="feature-card">
                <h3>Facile</h3>
                <p>Interface intuitive</p>
            </div>
        </div>
    </section>
</body>
</html>`,
    css: `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Arial', sans-serif;
    line-height: 1.6;
    color: #333;
}

.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 5%;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    position: fixed;
    top: 0;
    width: 100%;
    z-index: 1000;
}

.nav-brand {
    font-size: 1.5rem;
    font-weight: bold;
    color: #6366f1;
}

.nav-links {
    display: flex;
    align-items: center;
    gap: 2rem;
}

.nav-links a {
    text-decoration: none;
    color: #333;
    transition: color 0.3s;
}

.nav-links a:hover {
    color: #6366f1;
}

.btn-primary {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
    padding: 0.5rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.3s;
}

.btn-primary:hover {
    transform: translateY(-2px);
}

.hero {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.hero-content h1 {
    font-size: 3.5rem;
    margin-bottom: 1rem;
    font-weight: 700;
}

.hero-content p {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    opacity: 0.9;
}

.cta-button {
    background: white;
    color: #6366f1;
    border: none;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s;
}

.cta-button:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.features {
    padding: 5rem 5%;
    background: #f8fafc;
}

.feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto;
}

.feature-card {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    text-align: center;
    transition: transform 0.3s;
}

.feature-card:hover {
    transform: translateY(-5px);
}

.feature-card h3 {
    color: #6366f1;
    margin-bottom: 1rem;
}

@media (max-width: 768px) {
    .hero-content h1 {
        font-size: 2.5rem;
    }
    
    .nav-links {
        gap: 1rem;
    }
}`,
    javascript: `// Animation au scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observer les cartes
document.querySelectorAll('.feature-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s, transform 0.6s';
    observer.observe(card);
});

// Smooth scroll pour la navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

console.log('Landing page initialisée!');`
  },
  {
    id: 'dashboard',
    name: 'Dashboard Analytics',
    description: 'Interface de tableau de bord avec graphiques et métriques',
    type: 'web-app',
    category: 'business',
    preview: '📊',
    tags: ['dashboard', 'analytics', 'charts', 'metrics'],
    html: `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Analytics</title>
</head>
<body>
    <div class="dashboard">
        <aside class="sidebar">
            <div class="logo">Analytics</div>
            <nav class="nav-menu">
                <a href="#" class="nav-item active">
                    <span class="icon">📊</span>
                    Vue d'ensemble
                </a>
                <a href="#" class="nav-item">
                    <span class="icon">👥</span>
                    Utilisateurs
                </a>
                <a href="#" class="nav-item">
                    <span class="icon">💰</span>
                    Revenus
                </a>
                <a href="#" class="nav-item">
                    <span class="icon">⚙️</span>
                    Paramètres
                </a>
            </nav>
        </aside>
        
        <main class="main-content">
            <header class="top-bar">
                <h1>Vue d'ensemble</h1>
                <div class="user-info">
                    <span>Bonjour, Admin</span>
                    <div class="avatar"></div>
                </div>
            </header>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">2,431</div>
                    <div class="metric-label">Utilisateurs</div>
                    <div class="metric-change positive">+12%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">€15,240</div>
                    <div class="metric-label">Revenus</div>
                    <div class="metric-change positive">+8%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">94.5%</div>
                    <div class="metric-label">Satisfaction</div>
                    <div class="metric-change positive">+2%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">1,287</div>
                    <div class="metric-label">Commandes</div>
                    <div class="metric-change negative">-3%</div>
                </div>
            </div>
            
            <div class="charts-section">
                <div class="chart-container">
                    <h3>Évolution des ventes</h3>
                    <div class="chart-placeholder">
                        <div class="chart-bars">
                            <div class="bar" style="height: 60%"></div>
                            <div class="bar" style="height: 80%"></div>
                            <div class="bar" style="height: 45%"></div>
                            <div class="bar" style="height: 90%"></div>
                            <div class="bar" style="height: 70%"></div>
                            <div class="bar" style="height: 85%"></div>
                            <div class="bar" style="height: 95%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="activity-feed">
                    <h3>Activité récente</h3>
                    <div class="activity-item">
                        <div class="activity-icon">👤</div>
                        <div class="activity-content">
                            <div class="activity-text">Nouveau utilisateur inscrit</div>
                            <div class="activity-time">Il y a 5 min</div>
                        </div>
                    </div>
                    <div class="activity-item">
                        <div class="activity-icon">💰</div>
                        <div class="activity-content">
                            <div class="activity-text">Commande de 250€ reçue</div>
                            <div class="activity-time">Il y a 12 min</div>
                        </div>
                    </div>
                    <div class="activity-item">
                        <div class="activity-icon">📧</div>
                        <div class="activity-content">
                            <div class="activity-text">Campagne email envoyée</div>
                            <div class="activity-time">Il y a 1h</div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</body>
</html>`,
    css: `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: #f1f5f9;
    color: #334155;
}

.dashboard {
    display: flex;
    height: 100vh;
}

.sidebar {
    width: 250px;
    background: white;
    border-right: 1px solid #e2e8f0;
    padding: 1.5rem 0;
}

.logo {
    font-size: 1.5rem;
    font-weight: bold;
    text-align: center;
    margin-bottom: 2rem;
    color: #6366f1;
}

.nav-menu {
    display: flex;
    flex-direction: column;
}

.nav-item {
    display: flex;
    align-items: center;
    padding: 0.75rem 1.5rem;
    text-decoration: none;
    color: #64748b;
    transition: all 0.2s;
}

.nav-item:hover,
.nav-item.active {
    background: #f1f5f9;
    color: #6366f1;
    border-right: 3px solid #6366f1;
}

.nav-item .icon {
    margin-right: 0.75rem;
    font-size: 1.1rem;
}

.main-content {
    flex: 1;
    overflow-y: auto;
}

.top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    background: white;
    border-bottom: 1px solid #e2e8f0;
}

.top-bar h1 {
    font-size: 1.75rem;
    font-weight: 600;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.avatar {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 50%;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    padding: 2rem;
}

.metric-card {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    transition: transform 0.2s;
}

.metric-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metric-value {
    font-size: 2rem;
    font-weight: bold;
    color: #1e293b;
    margin-bottom: 0.25rem;
}

.metric-label {
    color: #64748b;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
}

.metric-change {
    font-size: 0.875rem;
    font-weight: 500;
}

.metric-change.positive {
    color: #059669;
}

.metric-change.negative {
    color: #dc2626;
}

.charts-section {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
    padding: 0 2rem 2rem;
}

.chart-container,
.activity-feed {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
}

.chart-container h3,
.activity-feed h3 {
    margin-bottom: 1rem;
    color: #1e293b;
}

.chart-placeholder {
    height: 200px;
    display: flex;
    align-items: end;
    justify-content: center;
}

.chart-bars {
    display: flex;
    align-items: end;
    gap: 0.5rem;
    height: 100%;
}

.bar {
    width: 30px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 4px 4px 0 0;
    transition: all 0.3s;
}

.bar:hover {
    opacity: 0.8;
}

.activity-item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f1f5f9;
}

.activity-item:last-child {
    border-bottom: none;
}

.activity-icon {
    width: 32px;
    height: 32px;
    background: #f1f5f9;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
}

.activity-text {
    font-size: 0.875rem;
    color: #334155;
}

.activity-time {
    font-size: 0.75rem;
    color: #64748b;
    margin-top: 0.25rem;
}

@media (max-width: 768px) {
    .dashboard {
        flex-direction: column;
    }
    
    .sidebar {
        width: 100%;
        height: auto;
    }
    
    .metrics-grid {
        grid-template-columns: 1fr;
    }
    
    .charts-section {
        grid-template-columns: 1fr;
    }
}`,
    javascript: `// Animation des métriques au chargement
function animateMetrics() {
    const metrics = document.querySelectorAll('.metric-value');
    
    metrics.forEach((metric, index) => {
        const finalValue = metric.textContent;
        metric.textContent = '0';
        
        setTimeout(() => {
            animateValue(metric, 0, parseFloat(finalValue.replace(/[€,%]/g, '')), 1500, finalValue);
        }, index * 200);
    });
}

function animateValue(element, start, end, duration, originalText) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            current = end;
            clearInterval(timer);
            element.textContent = originalText;
        } else {
            const prefix = originalText.includes('€') ? '€' : '';
            const suffix = originalText.includes('%') ? '%' : '';
            element.textContent = prefix + Math.floor(current).toLocaleString() + suffix;
        }
    }, 16);
}

// Animation des barres du graphique
function animateChart() {
    const bars = document.querySelectorAll('.bar');
    
    bars.forEach((bar, index) => {
        const originalHeight = bar.style.height;
        bar.style.height = '0%';
        
        setTimeout(() => {
            bar.style.height = originalHeight;
        }, index * 100 + 500);
    });
}

// Navigation active
function handleNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Retirer la classe active de tous les items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Ajouter la classe active à l'item cliqué
            item.classList.add('active');
        });
    });
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    animateMetrics();
    animateChart();
    handleNavigation();
    
    console.log('Dashboard initialisé!');
});

// Simulation de nouvelles données
setInterval(() => {
    const activities = document.querySelector('.activity-feed');
    if (Math.random() > 0.8) { // 20% de chance
        const newActivity = document.createElement('div');
        newActivity.className = 'activity-item';
        newActivity.innerHTML = \`
            <div class="activity-icon">🔔</div>
            <div class="activity-content">
                <div class="activity-text">Nouvelle notification</div>
                <div class="activity-time">À l'instant</div>
            </div>
        \`;
        activities.insertBefore(newActivity, activities.children[1]);
        
        // Limiter à 5 activités
        if (activities.children.length > 6) {
            activities.removeChild(activities.lastElementChild);
        }
    }
}, 10000);`
  },
  {
    id: 'card-component',
    name: 'Carte Produit',
    description: 'Composant de carte produit avec animation hover',
    type: 'component',
    category: 'ecommerce',
    preview: '🛍️',
    tags: ['card', 'product', 'hover', 'animation'],
    html: `<div class="product-card">
    <div class="product-image">
        <img src="https://via.placeholder.com/300x200/6366f1/ffffff?text=Produit" alt="Produit">
        <div class="product-badge">Nouveau</div>
        <div class="product-actions">
            <button class="action-btn favorite">♡</button>
            <button class="action-btn share">📤</button>
        </div>
    </div>
    <div class="product-info">
        <div class="product-category">Technologie</div>
        <h3 class="product-title">Produit Innovant</h3>
        <p class="product-description">Une description courte et attractive du produit qui donne envie d'en savoir plus.</p>
        <div class="product-rating">
            <div class="stars">★★★★☆</div>
            <span class="rating-count">(127 avis)</span>
        </div>
        <div class="product-footer">
            <div class="product-price">
                <span class="current-price">99,99€</span>
                <span class="old-price">129,99€</span>
            </div>
            <button class="add-to-cart">Ajouter au panier</button>
        </div>
    </div>
</div>`,
    css: `.product-card {
    width: 320px;
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
}

.product-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.product-image {
    position: relative;
    overflow: hidden;
    aspect-ratio: 3/2;
}

.product-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
}

.product-card:hover .product-image img {
    transform: scale(1.05);
}

.product-badge {
    position: absolute;
    top: 12px;
    left: 12px;
    background: linear-gradient(135deg, #ff6b6b, #ee5a24);
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.product-actions {
    position: absolute;
    top: 12px;
    right: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    opacity: 0;
    transform: translateX(10px);
    transition: all 0.3s ease;
}

.product-card:hover .product-actions {
    opacity: 1;
    transform: translateX(0);
}

.action-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
}

.action-btn:hover {
    background: white;
    transform: scale(1.1);
}

.product-info {
    padding: 20px;
}

.product-category {
    color: #6366f1;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
}

.product-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 8px;
    line-height: 1.3;
}

.product-description {
    color: #6b7280;
    font-size: 0.875rem;
    line-height: 1.5;
    margin-bottom: 16px;
}

.product-rating {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
}

.stars {
    color: #fbbf24;
    font-size: 0.875rem;
}

.rating-count {
    color: #6b7280;
    font-size: 0.75rem;
}

.product-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.product-price {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.current-price {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1f2937;
}

.old-price {
    font-size: 0.875rem;
    color: #9ca3af;
    text-decoration: line-through;
}

.add-to-cart {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
}

.add-to-cart:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.add-to-cart:active {
    transform: translateY(0);
}

/* Animation au chargement */
.product-card {
    animation: fadeInUp 0.6s ease forwards;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Responsive */
@media (max-width: 480px) {
    .product-card {
        width: 100%;
        max-width: 300px;
    }
    
    .product-footer {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
    }
    
    .add-to-cart {
        width: 100%;
        justify-content: center;
    }
}`,
    javascript: `// Gestion des interactions de la carte produit
class ProductCard {
    constructor(element) {
        this.element = element;
        this.favoriteBtn = element.querySelector('.favorite');
        this.shareBtn = element.querySelector('.share');
        this.addToCartBtn = element.querySelector('.add-to-cart');
        this.isFavorite = false;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setupAnimations();
    }
    
    bindEvents() {
        // Gestion du favori
        this.favoriteBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleFavorite();
        });
        
        // Gestion du partage
        this.shareBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.shareProduct();
        });
        
        // Gestion de l'ajout au panier
        this.addToCartBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.addToCart();
        });
        
        // Effet parallax léger sur l'image
        this.element.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });
        
        this.element.addEventListener('mouseleave', () => {
            this.resetTransform();
        });
    }
    
    toggleFavorite() {
        this.isFavorite = !this.isFavorite;
        
        if (this.isFavorite) {
            this.favoriteBtn.textContent = '❤️';
            this.favoriteBtn.style.transform = 'scale(1.2)';
            
            // Animation de particules
            this.createHeartParticles();
        } else {
            this.favoriteBtn.textContent = '♡';
            this.favoriteBtn.style.transform = 'scale(1)';
        }
        
        // Retour à la taille normale
        setTimeout(() => {
            this.favoriteBtn.style.transform = 'scale(1)';
        }, 200);
        
        console.log(\`Produit \${this.isFavorite ? 'ajouté aux' : 'retiré des'} favoris\`);
    }
    
    shareProduct() {
        // Effet de partage
        this.shareBtn.style.transform = 'scale(1.2) rotate(15deg)';
        
        setTimeout(() => {
            this.shareBtn.style.transform = 'scale(1) rotate(0deg)';
        }, 200);
        
        // Simulation du partage
        if (navigator.share) {
            navigator.share({
                title: 'Produit Innovant',
                text: 'Découvrez ce produit incroyable!',
                url: window.location.href
            });
        } else {
            // Fallback: copier dans le presse-papiers
            navigator.clipboard.writeText(window.location.href);
            this.showToast('Lien copié dans le presse-papiers!');
        }
        
        console.log('Produit partagé');
    }
    
    addToCart() {
        // Animation du bouton
        const originalText = this.addToCartBtn.textContent;
        this.addToCartBtn.textContent = 'Ajouté!';
        this.addToCartBtn.style.background = 'linear-gradient(135deg, #059669, #10b981)';
        this.addToCartBtn.style.transform = 'scale(0.95)';
        
        // Effet de ripple
        this.createRippleEffect(this.addToCartBtn);
        
        // Retour à l'état normal
        setTimeout(() => {
            this.addToCartBtn.textContent = originalText;
            this.addToCartBtn.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
            this.addToCartBtn.style.transform = 'scale(1)';
        }, 1500);
        
        console.log('Produit ajouté au panier');
    }
    
    handleMouseMove(e) {
        const rect = this.element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;
        
        const image = this.element.querySelector('.product-image img');
        if (image) {
            image.style.transform = \`scale(1.05) perspective(1000px) rotateX(\${rotateX}deg) rotateY(\${rotateY}deg)\`;
        }
    }
    
    resetTransform() {
        const image = this.element.querySelector('.product-image img');
        if (image) {
            image.style.transform = 'scale(1) perspective(1000px) rotateX(0deg) rotateY(0deg)';
        }
    }
    
    createHeartParticles() {
        for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.textContent = '❤️';
            particle.style.position = 'absolute';
            particle.style.fontSize = '12px';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '1000';
            
            const rect = this.favoriteBtn.getBoundingClientRect();
            particle.style.left = rect.left + 'px';
            particle.style.top = rect.top + 'px';
            
            document.body.appendChild(particle);
            
            // Animation
            const angle = (i / 6) * Math.PI * 2;
            const distance = 50 + Math.random() * 20;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            
            particle.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: \`translate(\${x}px, \${y}px) scale(0)\`, opacity: 0 }
            ], {
                duration: 800,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }).onfinish = () => {
                particle.remove();
            };
        }
    }
    
    createRippleEffect(button) {
        const ripple = document.createElement('div');
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(255, 255, 255, 0.6)';
        ripple.style.transform = 'scale(0)';
        ripple.style.animation = 'ripple 0.6s linear';
        ripple.style.left = '50%';
        ripple.style.top = '50%';
        ripple.style.width = '20px';
        ripple.style.height = '20px';
        ripple.style.marginLeft = '-10px';
        ripple.style.marginTop = '-10px';
        
        button.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }
    
    showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.background = '#1f2937';
        toast.style.color = 'white';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '8px';
        toast.style.zIndex = '1000';
        toast.style.animation = 'slideInRight 0.3s ease';
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    setupAnimations() {
        // Observer pour l'animation d'entrée
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationDelay = '0s';
                    entry.target.classList.add('animate');
                }
            });
        });
        
        observer.observe(this.element);
    }
}

// Style pour les animations CSS
const style = document.createElement('style');
style.textContent = \`
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
\`;
document.head.appendChild(style);

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => new ProductCard(card));
    
    console.log('Cartes produit initialisées!');
});`
  }
];

export const TemplateLibrary = ({ isOpen, onClose, onSelectTemplate }: TemplateLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'Tous', icon: Code2 },
    { id: 'business', name: 'Business', icon: Briefcase },
    { id: 'creative', name: 'Créatif', icon: Palette },
    { id: 'ecommerce', name: 'E-commerce', icon: ShoppingCart },
    { id: 'utility', name: 'Utilitaire', icon: Zap },
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'web-app': return <Globe className="w-4 h-4" />;
      case 'component': return <FileCode2 className="w-4 h-4" />;
      case 'prototype': return <Code2 className="w-4 h-4" />;
      default: return <FileCode2 className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'web-app': return 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-600';
      case 'component': return 'from-green-500/10 to-green-600/5 border-green-500/20 text-green-600';
      case 'prototype': return 'from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-600';
      default: return 'from-gray-500/10 to-gray-600/5 border-gray-500/20 text-gray-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            Bibliothèque de Templates
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {/* Search and Filters */}
          <div className="p-6 border-b border-border/60">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un template..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="grid w-full grid-cols-5">
                {categories.map((category) => (
                  <TabsTrigger 
                    key={category.id} 
                    value={category.id}
                    className="flex items-center gap-1 text-xs"
                  >
                    <category.icon className="w-3 h-3" />
                    {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Templates Grid */}
          <ScrollArea className="flex-1 p-6">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Code2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">Aucun template trouvé</p>
                <p className="text-sm">Essayez de modifier vos critères de recherche</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTemplates.map((template) => (
                  <Card 
                    key={template.id}
                    className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 overflow-hidden"
                    onClick={() => {
                      onSelectTemplate(template);
                      onClose();
                    }}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{template.preview}</div>
                          <div>
                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                              {template.name}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {template.description}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`flex items-center gap-1 bg-gradient-to-r ${getTypeColor(template.type)}`}
                        >
                          {getTypeIcon(template.type)}
                          {template.type}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {template.tags.slice(0, 4).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {template.tags.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.tags.length - 4}
                          </Badge>
                        )}
                      </div>

                      <Button 
                        className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTemplate(template);
                          onClose();
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Utiliser ce template
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};