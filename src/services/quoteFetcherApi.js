/**
 * 每日一句模块
 * 负责获取、缓存和展示每日一句内容
 */

// 警告！金山API没有CROS，本方案必须通过后端转发才可行，目前处于废弃阶段。


export const QuoteFetcherApi = {
    // 默认每日一句
    DEFAULT_QUOTE: {
        english: "Something worth having is worth waiting for.",
        chinese: "值得拥有的东西，值得等待。",
        source: "—— Word'n'Friends"
    },
    
    // 获取并显示每日一句
    async showDaily() {
        const contentDiv = document.querySelector('.result-content');
        
        // 尝试从localStorage加载缓存的每日一句
        const cachedQuote = localStorage.getItem('wordnfriends_daily_quote');
        let quoteData = null;
        let needRefresh = true;
        
        if (cachedQuote) {
            try {
                const parsed = JSON.parse(cachedQuote);
                // 检查缓存日期是否是今天（使用本地日期）
                const today = new Date();
                const todayStr = today.getFullYear() + '-' + 
                               String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(today.getDate()).padStart(2, '0'); // yyyy-MM-dd
                if (parsed.date && parsed.date === todayStr) {
                    quoteData = parsed;
                    needRefresh = false;
                } else {
                    console.log('缓存的每日一句日期已过期，重新获取');
                }
            } catch (error) {
                console.error('解析缓存的每日一句失败:', error);
            }
        }
        
        try {
            if (needRefresh) {
                // 创建或更新加载提示
                let loadingDiv = contentDiv.querySelector('.loader');
                if (!loadingDiv) {
                    loadingDiv = document.createElement('div');
                    loadingDiv.className = 'loader';
                    contentDiv.appendChild(loadingDiv);
                }
                
                console.log('从金山词霸API获取每日一句...');
                quoteData = await this.fetchQuoteFromAPI();
                
                // 缓存到localStorage
                localStorage.setItem('wordnfriends_daily_quote', JSON.stringify(quoteData));
                
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
                <div class="quote-english">${quoteData.english}</div>
                <div class="quote-chinese">${quoteData.chinese}</div>
                <div class="quote-source">${quoteData.source}</div>
            `;
            
        } catch (error) {
            console.error('加载每日一句失败:', error);
            
            // 移除加载提示
            const loadingDiv = contentDiv.querySelector('.loader');
            if (loadingDiv) {
                loadingDiv.remove();
            }
            
            // 使用默认每日一句
            const quoteDiv = document.createElement('div');
            quoteDiv.className = 'daily-quote';
            quoteDiv.innerHTML = `
                <div class="quote-english">${this.DEFAULT_QUOTE.english}</div>
                <div class="quote-chinese">${this.DEFAULT_QUOTE.chinese}</div>
                <div class="quote-source">${this.DEFAULT_QUOTE.source}</div>
            `;
            contentDiv.appendChild(quoteDiv);
        }
    },
    
    // 从金山词霸API获取每日一句
    async fetchQuoteFromAPI() {
        try {
            const response = await fetch('https://open.iciba.com/dsapi/', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            // 金山词霸API返回text/html内容，但实际上是JSON
            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                console.error('解析API响应JSON失败:', parseError);
                throw new Error('API返回的数据格式无效');
            }
            
            // 提取所需字段
            const english = data.content || '';
            const chinese = data.note || '';
            const date = data.dateline || new Date().toISOString().split('T')[0];
            
            if (!english || !chinese) {
                console.warn('API返回的content或note为空，使用默认值');
                return {
                    english: this.DEFAULT_QUOTE.english,
                    chinese: this.DEFAULT_QUOTE.chinese,
                    source: this.DEFAULT_QUOTE.source,
                    date: date
                };
            }
            
            return {
                english: english,
                chinese: chinese,
                source: "—— Word'n'Friends",
                date: date
            };
            
        } catch (error) {
            console.error('从金山词霸API获取每日一句失败:', error);
            // 返回默认值
            const today = new Date();
            const todayStr = today.getFullYear() + '-' + 
                           String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(today.getDate()).padStart(2, '0');
            return {
                english: this.DEFAULT_QUOTE.english,
                chinese: this.DEFAULT_QUOTE.chinese,
                source: this.DEFAULT_QUOTE.source,
                date: todayStr
            };
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
        localStorage.removeItem('wordnfriends_daily_quote');
        // 为了兼容性，也清除旧的sessionStorage
        sessionStorage.removeItem('daily_quote');
    }
};

export default QuoteFetcherApi;
