/**
 * 每日一句模块
 * 负责获取、缓存和展示每日一句内容
 */

const QuoteFetcher = {
    // 系统提示词
    SYSTEM_PROMPT: `你的名字是"Word'n'Friends"，请你模仿英语学习网站的风格，返回一句英文"每日一句"。文风有诗意，友好而具有启发性。内容来源可以是原创，也可以是英文名著、经典台词、经典诗句。返回内容包括，英文每日一句，中文翻译，作者名。如果是原创，则作者名写"Word'n'Friends"。返回格式是json格式，示例如下：
{"english":"Here is one day one sentence.","chinese":"这里是每日一句。","source":"-- Author Name"}`,
    
    // 默认每日一句
    DEFAULT_QUOTE: {
        english: "Something worth having is worth waiting for.",
        chinese: "值得拥有的东西，值得等待。",
        source: "—— Word'n'Friends"
    },
    
    // 获取并显示每日一句
    async showDaily() {
        const contentDiv = document.querySelector('.result-content');
        
        // 检查是否已经缓存了每日一句在当前会话中
        const cachedQuote = sessionStorage.getItem('daily_quote');
        let quoteData = null;
        
        try {
            if (cachedQuote) {
                quoteData = JSON.parse(cachedQuote);
            }
            
            // 如果没有会话缓存，则从大模型获取新数据
            if (!quoteData) {
                // 创建或更新加载提示
                let loadingDiv = contentDiv.querySelector('.loader');
                if (!loadingDiv) {
                    loadingDiv = document.createElement('div');
                    loadingDiv.className = 'loader';
                    contentDiv.appendChild(loadingDiv);
                }
                
                // 获取当前使用的模型配置
                const config = ConfigManager.getCurrentConfig();
                
                console.log('获取新的每日一句...');
                // 从大模型获取每日一句（包含错误处理）
                quoteData = await this.fetchQuoteFromModel(config);
                
                // 只缓存到会话存储，而不是本地存储
                sessionStorage.setItem('daily_quote', JSON.stringify(quoteData));
                
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
    
    // 从AI模型获取每日一句
    async fetchQuoteFromModel(config) {
        return new Promise((resolve, reject) => {
            AIModelService.callModel(
                config,
                this.SYSTEM_PROMPT,
                "请给我今天的每日一句",
                0.8, // 温度参数，控制创造性
                (content, reasoning, done) => {
                    if (done) {
                        try {
                            // 提取JSON内容
                            const jsonMatch = content.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                const jsonStr = jsonMatch[0];
                                const quoteData = JSON.parse(jsonStr);
                                
                                // 格式化返回数据，确保所有字段都有值
                                const formattedData = {
                                    english: quoteData.english || this.DEFAULT_QUOTE.english,
                                    chinese: quoteData.chinese || this.DEFAULT_QUOTE.chinese,
                                    source: quoteData.source || this.DEFAULT_QUOTE.source
                                };
                                
                                resolve(formattedData);
                            } else {
                                console.warn('无法从模型响应中提取JSON格式的每日一句，使用默认值');
                                resolve(this.DEFAULT_QUOTE);
                            }
                        } catch (error) {
                            console.error('解析每日一句时出错，使用默认值:', error);
                            resolve(this.DEFAULT_QUOTE);
                        }
                    }
                },
                (error) => {
                    console.error('获取每日一句失败，使用默认值:', error);
                    resolve(this.DEFAULT_QUOTE);
                }
            ).catch(error => {
                console.error('调用模型时发生错误，使用默认值:', error);
                resolve(this.DEFAULT_QUOTE);
            });
        });
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
        sessionStorage.removeItem('daily_quote');
    }
};
