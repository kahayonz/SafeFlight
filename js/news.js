const NEWS_API_KEY = '28cb8c3a6b25c19a248f23ee6e2ee642';
const NEWS_ENDPOINT = 'https://gnews.io/api/v4/search';

async function updateNewsPanel(countryName) {
    const newsContainer = document.querySelector('.news-container');
    newsContainer.innerHTML = '<div class="loading">Loading news...</div>';
    
    try {
        const searchTerms = [
            'disease outbreak',
            'epidemic',
            'health emergency',
            'virus',
            'infectious disease',
            'public health'
        ];

        const response = await fetch(`${NEWS_ENDPOINT}?` + new URLSearchParams({
            token: NEWS_API_KEY,
            q: `(${searchTerms.join(' OR ')}) AND ${countryName}`,
            lang: 'en',
            max: 5,
            sortby: 'publishedAt'
        }));

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.articles || data.articles.length === 0) {
            newsContainer.innerHTML = '<div class="news-item"><p>No health news found for this region.</p></div>';
            return;
        }

        newsContainer.innerHTML = data.articles
            .map(article => `
                <div class="news-item">
                    ${article.image ? `
                        <div class="news-thumbnail">
                            <img src="${article.image}" alt="${article.title}" 
                                 onerror="this.src='https://via.placeholder.com/100x100?text=No+Image'">
                        </div>
                    ` : ''}
                    <div class="news-content">
                        <h4>${article.title}</h4>
                        <p>${article.description || ''}</p>
                        <div class="news-footer">
                            <span class="date">${new Date(article.publishedAt).toLocaleDateString()}</span>
                            <a href="${article.url}" target="_blank" rel="noopener noreferrer">Read more</a>
                        </div>
                    </div>
                </div>
            `)
            .join('');

    } catch (error) {
        console.error('Error fetching news:', error);
        newsContainer.innerHTML = '<div class="news-item"><p>Unable to load news at this time.</p></div>';
    }
}

