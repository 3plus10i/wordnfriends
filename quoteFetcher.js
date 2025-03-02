/**
 * 每日一句模块
 * 负责获取、缓存和展示每日一句内容
 */

const QuoteFetcher = {
    // 获取并显示每日一句
    async showDaily() {
        const contentDiv = document.querySelector('.result-content');
        
        // 检查是否已经缓存了今天的每日一句
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const cachedQuote = localStorage.getItem('daily_quote');
        let quoteData = null;
        
        try {
            if (cachedQuote) {
                const parsed = JSON.parse(cachedQuote);
                // 检查缓存是否为今天的
                if (parsed.date === today) {
                    quoteData = parsed.data;
                }
            }
            
            // 如果没有缓存或缓存过期，则获取新数据
            if (!quoteData) {
                // 创建或更新加载提示
                let loadingDiv = contentDiv.querySelector('.daily-quote-loading');
                if (!loadingDiv) {
                    loadingDiv = document.createElement('div');
                    loadingDiv.className = 'daily-quote-loading';
                    loadingDiv.textContent = '少女祈祷中...';
                    contentDiv.appendChild(loadingDiv);
                }
                
                const response = await fetch('https://apiv3.shanbay.com/weapps/dailyquote/quote/');
                
                if (!response.ok) {
                    throw new Error('获取每日一句失败');
                }
                
                quoteData = await response.json();
                
                // 缓存数据
                localStorage.setItem('daily_quote', JSON.stringify({
                    date: today,
                    data: quoteData
                }));
                
                // 移除加载提示
                if (loadingDiv) {
                    loadingDiv.remove();
                }
            }
            
            // 创建每日一句元素
            let quoteDiv = contentDiv.querySelector('.daily-quote');
            if (!quoteDiv) {
                quoteDiv = document.createElement('div');
                quoteDiv.className = 'daily-quote';
                contentDiv.appendChild(quoteDiv);
            } else {
                quoteDiv.style.display = 'block';
            }
            
            // 设置每日一句内容
            quoteDiv.innerHTML = `
                <div class="quote-english">${quoteData.content}</div>
                <div class="quote-chinese">${quoteData.translation}</div>
                <div class="quote-source">—— ${quoteData.author}</div>
            `;
            
        } catch (error) {
            console.error('加载每日一句失败:', error);
            // 移除加载提示
            const loadingDiv = contentDiv.querySelector('.daily-quote-loading');
            if (loadingDiv) {
                loadingDiv.remove();
            }
            
            // 创建备用每日一句
            const quoteDiv = document.createElement('div');
            quoteDiv.className = 'daily-quote';
            quoteDiv.innerHTML = `
                <div class="quote-english">Something worth having is worth waiting for.</div>
                <div class="quote-chinese">值得拥有的东西，值得等待。</div>
                <div class="quote-source">—— Word'n'Friends</div>
            `;
            contentDiv.appendChild(quoteDiv);
        }
    },
    
    // 隐藏每日一句
    hideQuote() {
        const dailyQuote = document.querySelector('.daily-quote');
        if (dailyQuote) {
            dailyQuote.style.display = 'none';
        }
    },
    
    // 显示每日一句
    showQuote() {
        const dailyQuote = document.querySelector('.daily-quote');
        if (dailyQuote) {
            dailyQuote.style.display = 'block';
        } else {
            this.showDaily();
        }
    },
    
    // 清除缓存（用于手动刷新每日一句）
    clearCache() {
        localStorage.removeItem('daily_quote');
    }
};
