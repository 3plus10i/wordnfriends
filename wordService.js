/**
 * 单词查询和扩展服务模块
 * 负责处理单词查询、API请求和流式响应处理
 */

const WordService = {
    // 全局状态
    isStreaming: false,
    currentReader: null,
    decoder: new TextDecoder(),
    
    // 难度级别映射
    difficultyMap: {
        "B": "初中到高中级，涵盖基础日常生活和简单学习场景，示例单词:apple, book, run, happy, school.",
        "A": "高考英语级，日常生活和基础学术词汇，示例单词:analyze, debate, environment, manage, strategy.",
        "S": "高考到大学四级，涉及更广泛的日常和基础学术话题。示例单词:philosophy, economy, innovate, perspective, diverse.",
        "SS": "高考到大学六级，包含更多学术和专业词汇，最高能够阅读新闻、文学作品和中级学术材料，示例单词:metaphor, hypothesis, bureaucracy, paradox, renaissance.",
        "SSS": "高考到托福6.5分级，涵盖常用学术和书面词汇，能够初步阅读科学文献，示例单词: paradigm, synthesis, epistemology, ontology, heuristic."
    },
    
    // 清理输入以防止注入
    sanitizeInput(input) {
        let ret = input.trim()
            .substring(0, 26)
            .replace(/[^a-zA-Z\u4e00-\u9fa5\-]/g, '');
        // 如果不同，向控制台打印
        if (ret !== input && input.trim()) {
            console.log('输入包含非法字符，已过滤:', input, '->', ret);
        }
        return ret;
    },
    
    // 获取系统提示词
    async getSystemPrompt() {
        try {
            const response = await fetch('./system');
            let systemPrompt = await response.text();
            
            // 替换参数
            systemPrompt = systemPrompt.replace('{{phonetic_type}}', userSettings.phoneticType);
            systemPrompt = systemPrompt.replace('{{friend_number}}', userSettings.friendNumber);
            systemPrompt = systemPrompt.replace('{{difficulty_range}}', this.difficultyMap[userSettings.difficulty] || this.difficultyMap['A']);
            
            return systemPrompt;
        } catch (error) {
            console.error(error);
            return "输出用户给你的单词的翻译（英汉互译）。任何情况下输出长度不允许超过30个字符。并且在回复的开头加上“服务异常\n”";
        }
    },
    
    // 处理流式数据
    async handleStream(reader, resultDiv) {
        const controls = resultDiv.querySelector('.result-controls');
        const stopButton = controls.querySelector('.stop-button');
        const resetButton = controls.querySelector('.reset-button');
        const contentDiv = resultDiv.querySelector('.result-content');
        
        // 隐藏每日一句
        QuoteFetcher.hideQuote();
        
        // 创建单词结果容器
        let wordResult = contentDiv.querySelector('.word-result');
        if (!wordResult) {
            wordResult = document.createElement('div');
            wordResult.className = 'word-result';
            contentDiv.appendChild(wordResult);
        } else {
            wordResult.innerHTML = '';
            wordResult.style.display = 'block';
        }
        
        this.currentReader = reader;
        controls.style.display = 'block';
        stopButton.style.display = 'inline-block';
        resetButton.style.display = 'none';
        
        let mdContent = '';
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    this.isStreaming = false;
                    stopButton.style.display = 'none';
                    resetButton.style.display = 'inline-block';
                    this.currentReader = null;
                    return;
                }

                const chunk = this.decoder.decode(value);
                const lines = chunk.split('\n').filter(line => {
                    return line.startsWith('data: ') && !line.includes('[DONE]');
                });
                
                lines.forEach(line => {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.choices[0].delta.content) {
                            mdContent += data.choices[0].delta.content;
                            if (typeof marked !== 'undefined') {
                                wordResult.innerHTML = marked.parse(mdContent);
                            } else {
                                wordResult.textContent = mdContent;
                            }
                        }
                    } catch (e) {
                        console.warn('解析流数据失败:', e);
                    }
                });
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Stream was canceled');
            } else {
                throw err;
            }
        }
    },
    
    // 主查询函数
    async queryWord() {
        if (this.isStreaming) {
            showToast('已有请求在处理中', 'error');
            return;
        }

        const lastRequest = localStorage.getItem('lastRequest') || 0;
        if (Date.now() - lastRequest < 3000) {
            showToast('操作过于频繁，请稍后再试', 'error');
            return;
        }
        localStorage.setItem('lastRequest', Date.now());

        let word = this.sanitizeInput(document.getElementById('wordInput').value);
        if (!word) {
            showToast('请输入单词', 'error');
            return;
        }
        
        document.getElementById('wordInput').value = word;
        
        // 在请求前打印关键数据
        const config = ConfigManager.getCurrentConfig();
        console.log('请求数据:', {
            provider: config.name,
            baseUrl: config.baseUrl,
            model: config.model,
            apiKey: config.apiKey ? '已配置' : '未配置',
            word: word,
            friendNumber: userSettings.friendNumber,
            phoneticType: userSettings.phoneticType,
            difficulty: userSettings.difficulty + ' (' + this.difficultyMap[userSettings.difficulty] + ')'
        });

        const resultDiv = document.getElementById('result');
        const contentDiv = resultDiv.querySelector('.result-content');
        
        // 隐藏每日一句并准备显示查询结果
        QuoteFetcher.hideQuote();
        
        // 准备显示加载状态
        let wordResult = contentDiv.querySelector('.word-result');
        if (!wordResult) {
            wordResult = document.createElement('div');
            wordResult.className = 'word-result';
            contentDiv.appendChild(wordResult);
        }
        wordResult.innerHTML = '<div class="loader"></div>';
        wordResult.style.display = 'block';
        
        this.isStreaming = true;

        try {
            const systemPrompt = await this.getSystemPrompt();
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            };

            const response = await fetch(config.baseUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: config.model,
                    stream: true,
                    max_tokens: 200 + userSettings.friendNumber * 100, // 限制token数
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: word }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                // 直接打印错误信息
                console.error('API请求失败:', errorData);
                throw new Error(errorData.error?.message || 'API请求失败');
            }

            this.isStreaming = true;
            await this.handleStream(response.body.getReader(), resultDiv);

        } catch (error) {
            console.error('请求失败:', error);
            const wordResult = contentDiv.querySelector('.word-result');
            if (wordResult) {
                wordResult.innerHTML = `<div class="error-message">请求失败（${error.message}）</div>`;
            }
            this.isStreaming = false;
        }
    },
    
    // 取消当前查询
    async cancelQuery() {
        if (this.currentReader) {
            await this.currentReader.cancel();
            this.currentReader = null;
            this.isStreaming = false;
        }
    },
    
    // 重置查询结果，显示每日一句
    resetResult() {
        const resultDiv = document.getElementById('result');
        const controls = resultDiv.querySelector('.result-controls');
        const resetButton = controls.querySelector('.reset-button');
        const contentDiv = resultDiv.querySelector('.result-content');
        
        // 隐藏控制按钮
        controls.style.display = 'none';
        resetButton.style.display = 'none';
        
        // 清除单词查询结果
        const wordResult = contentDiv.querySelector('.word-result');
        if (wordResult) {
            wordResult.remove();
        }
        
        // 显示每日一句
        QuoteFetcher.showQuote();
    }
};

// 全局函数别名，方便从HTML直接调用
function getWordFriends() {
    WordService.queryWord();
}
