const NEWS_API_KEY = '28cb8c3a6b25c19a248f23ee6e2ee642';
const NEWS_ENDPOINT = 'https://gnews.io/api/v4/search';

// Core keywords for health alerts
const HEALTH_KEYWORDS = [
    'outbreak',
    'epidemic',
    'health warning',
    'disease'
];

// Basic exclusion keywords
const EXCLUDE_KEYWORDS = [
    'cancer',
    'clinical',
    'fundraiser'
];

async function updateNewsPanel(countryName) {
    if (!countryName || countryName === 'Select area') return;
    
    // Only proceed if bottom UI is already expanded
    if (!window.state.isBottomUIExpanded) return;
    
    const newsContainer = document.querySelector('.news-container');
    if (!newsContainer) return;

    newsContainer.innerHTML = '<div class="loading">Loading health alerts...</div>';
    
    try {
        // Check if we've hit the rate limit recently
        const lastRateLimitHit = localStorage.getItem('newsApiRateLimit');
        if (lastRateLimitHit && (Date.now() - parseInt(lastRateLimitHit)) < 300000) { // 5 minutes
            throw new Error('RATE_LIMIT_WAITING');
        }

        // Simpler query construction
        const healthQuery = `${countryName} (health OR disease)`;
        
        const params = new URLSearchParams({
            q: healthQuery,
            lang: 'en',
            max: '10',
            sortby: 'publishedAt',
            apikey: NEWS_API_KEY
        });

        const url = `${NEWS_ENDPOINT}?${params.toString()}`;
        console.log('Fetching news with query:', healthQuery);

        const response = await fetch(url);
        if (response.status === 429) {
            localStorage.setItem('newsApiRateLimit', Date.now().toString());
            throw new Error('RATE_LIMIT');
        }

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        // Filter articles for relevance
        const relevantArticles = data.articles?.filter(article => {
            const text = `${article.title} ${article.description}`.toLowerCase();
            
            // Check if article contains any exclude keywords
            const hasExcludedTopic = EXCLUDE_KEYWORDS.some(keyword => 
                text.includes(keyword.toLowerCase())
            );
            
            // Check if article has relevant health keywords
            const hasHealthKeyword = HEALTH_KEYWORDS.some(keyword => 
                text.includes(keyword.toLowerCase())
            );
            
            return !hasExcludedTopic && hasHealthKeyword;
        }).slice(0, 5); // Take top 5 relevant articles

        if (!relevantArticles?.length) {
            newsContainer.innerHTML = `
                <div class="news-item">
                    <p>No current health alerts or travel advisories found for ${countryName}.</p>
                </div>`;
            return;
        }

        const newsHtml = relevantArticles
            .map(article => {
                const hasValidImage = article.image && 
                    typeof article.image === 'string' && 
                    article.image.startsWith('http');

                const date = new Date(article.publishedAt);
                const timeAgo = getTimeAgo(date);

                return `
                    <div class="news-item">
                        ${hasValidImage ? `
                            <div class="news-thumbnail">
                                <img src="${article.image}" 
                                     alt=""
                                     onerror="this.parentElement.remove()"
                                     loading="lazy">
                            </div>
                        ` : ''}
                        <div class="news-content">
                            <h4>${article.title}</h4>
                            <p>${article.description || 'No description available'}</p>
                            <div class="news-footer">
                                <span class="date">${timeAgo}</span>
                                <a href="${article.url}" target="_blank" rel="noopener noreferrer">Read more</a>
                            </div>
                        </div>
                    </div>
                `;
            })
            .join('');

        newsContainer.innerHTML = newsHtml;
        cacheNewsResults(countryName, newsHtml);

    } catch (error) {
        console.error('Error fetching news:', error);
        let errorMessage;
        
        switch(error.message) {
            case 'RATE_LIMIT':
                errorMessage = 'News API rate limit reached. Please try again in 5 minutes.';
                break;
            case 'RATE_LIMIT_WAITING':
                const timeLeft = Math.ceil((300000 - (Date.now() - parseInt(localStorage.getItem('newsApiRateLimit')))) / 60000);
                errorMessage = `Please wait approximately ${timeLeft} minutes before requesting more news.`;
                break;
            default:
                errorMessage = 'Unable to load health alerts. Using cached data if available.';
        }

        // Try to show cached news if available
        const cachedNews = localStorage.getItem(`news_${countryName}`);
        if (cachedNews) {
            const cache = JSON.parse(cachedNews);
            if (Date.now() - cache.timestamp < 3600000) { // 1 hour cache
                newsContainer.innerHTML = cache.html;
                return;
            }
        }
            
        newsContainer.innerHTML = `
            <div class="news-item">
                <p>${errorMessage}</p>
                <p>General health information for ${countryName} will be available soon.</p>
            </div>`;
    }
}

function cacheNewsResults(countryName, html) {
    try {
        localStorage.setItem(`news_${countryName}`, JSON.stringify({
            timestamp: Date.now(),
            html: html
        }));
        
        // Log cached countries
        const cachedCountries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('news_')) {
                const country = key.replace('news_', '');
                const data = JSON.parse(localStorage.getItem(key));
                const age = Math.round((Date.now() - data.timestamp) / 60000); // age in minutes
                cachedCountries.push(`${country} (${age}min old)`);
            }
        }
        console.log('Currently cached news for:', cachedCountries);
    } catch (e) {
        console.warn('Failed to cache news results:', e);
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
        }
    }
    return 'Just now';
}

