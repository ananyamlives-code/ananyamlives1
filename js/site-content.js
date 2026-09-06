(function () {
    'use strict';

    const setText = (selector, value) => {
        const element = document.querySelector(selector);
        if (element && typeof value === 'string') element.textContent = value;
    };

    const setHrefText = (selector, value, prefix) => {
        const element = document.querySelector(selector);
        if (!element || typeof value !== 'string') return;
        element.textContent = value;
        if (prefix) element.href = `${prefix}${value.replace(/[^+\d]/g, '')}`;
    };

    const escapeHtml = value => String(value || '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

    function applyContent(content) {
        const palette = {
            '--primary': content.palettePrimary,
            '--secondary': content.paletteSecondary,
            '--terracotta': content.paletteTerracotta,
            '--accent': content.paletteAccent,
            '--background': content.paletteBackground,
            '--bg-light': content.paletteCard,
            '--text-dark': content.paletteText,
            '--natural-accent': content.paletteNatural
        };
        Object.entries(palette).forEach(([variable, value]) => {
            if (value) document.documentElement.style.setProperty(variable, value);
        });

        setText('.announcement-left span', content.announcementLeft);
        setText('.announcement-middle span', content.announcementMiddle);
        setText('.logo-sub', content.brandSubtitle);
        setHrefText('.header-phone-link', content.phone, 'tel:');

        setText('.hero-subtitle-tamil', content.heroTitle);
        setText('.hero-desc', content.heroDescription);
        setText('#heroCta span', content.heroCta);
        if (content.heroImage) {
            const hero = document.querySelector('.hero');
            if (hero) hero.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url("${content.heroImage}")`;
        }

        setText('#collection .section-title', content.collectionTitle);
        setText('#collection .section-subtitle', content.collectionSubtitle);
        setText('#story .info-section-kicker', content.storyKicker);
        setText('#storyTitle', content.storyTitle);
        setText('.story-intro', content.storyIntro);

        [1, 2, 3, 4].forEach((number, index) => {
            setText(`.story-card:nth-of-type(${index + 1}) h3`, content[`storyCard${number}Title`]);
            setText(`.story-card:nth-of-type(${index + 1}) p`, content[`storyCard${number}Body`]);
        });
        setText('.story-closing', content.storyClosing);
        setText('.story-closing-subtext', content.storyClosingSubtext);
        setText('#values .info-section-kicker', content.careKicker);
        setText('#careGuideTitle', content.careTitle);
        setText('#values .info-section-content > p:last-child', content.careBody);
        setText('.footer-about-text', content.footerAbout);
        setHrefText('.contact-info-item:nth-child(1) a', content.phone, 'tel:');
        setHrefText('.contact-info-item:nth-child(2) a', content.email, 'mailto:');
        setText('.contact-info-item:nth-child(3) span', content.address);

        setText('.blog-kicker', content.blogKicker);
        setText('.blog-hero h1', content.blogTitle);
        setText('.blog-hero p', content.blogIntro);
        const articleGrid = document.querySelector('.blog-grid');
        if (articleGrid && Array.isArray(content.blogArticles) && content.blogArticles.length) {
            articleGrid.innerHTML = content.blogArticles.map(article => `
                <article class="blog-card">
                    <img class="blog-card-image" src="${escapeHtml(article.image)}" alt="${escapeHtml(article.title)}">
                    <div class="blog-card-content">
                        <div class="blog-meta">${escapeHtml(article.category)}</div>
                        <h3>${escapeHtml(article.title)}</h3>
                        <p>${escapeHtml(article.body)}</p>
                        <a href="#" class="blog-card-link">Read article</a>
                    </div>
                </article>
            `).join('');
        }
        if (!Array.isArray(content.blogArticles)) [1, 2, 3].forEach(number => {
            const card = document.querySelector(`.blog-card:nth-child(${number})`);
            if (!card) return;
            setText(`.blog-card:nth-child(${number}) .blog-meta`, content[`blog${number}Category`]);
            setText(`.blog-card:nth-child(${number}) h3`, content[`blog${number}Title`]);
            setText(`.blog-card:nth-child(${number}) p`, content[`blog${number}Body`]);
            const image = card.querySelector('.blog-card-image');
            if (image && content[`blog${number}Image`]) image.src = content[`blog${number}Image`];
        });
    }

    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const baseUrl = window.API_BASE_URL || '';
            const response = await fetch(`${baseUrl}/api/site-content`);
            const data = await response.json();
            if (data.success) applyContent(data.content);
        } catch (error) {
            console.warn('Site content sync unavailable:', error.message);
        }
    });
})();
