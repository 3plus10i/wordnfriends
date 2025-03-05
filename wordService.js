/**
 * 单词查询和扩展服务模块
 * 负责处理单词查询、API请求和流式响应处理
 */

const WordService = {
    // 全局状态
    responseTemperature: 0.8,  // 响应温度
    
    // 难度级别映射
    difficultyMap: {
        "B": "初中到高中级，涵盖基础日常生活和简单学习场景，示例单词:apple, book, run, happy, school.",
        "A": "高考英语级，日常生活和基础学术词汇，示例单词:analyze, debate, environment, manage, strategy.",
        "S": "大学四级到六级，涉及广泛的日常生活和基础学术话题。示例单词:philosophy, economy, innovate, perspective, diverse.",
        "SS": "大学六级到雅思6.5分级，包含更多学术和专业词汇，能够阅读新闻、文学作品和中级学术材料，示例单词:metaphor, hypothesis, bureaucracy, paradox, renaissance.",
        "SSS": "雅思7分级，涵盖学术和复杂资料词汇，能够阅读科学文献，示例单词: paradigm, synthesis, epistemology, ontology, heuristic."
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
    
    // 根据输入是否为空和格式类型，决定使用哪个系统提示文件
    getSystemPromptType(isEmpty = false) {
        if (isEmpty) {
            return 'empty';  // 空输入情况
        } else if (userSettings.formatType === 'sentence') {
            return 'sentence';  // 长格式（含例句）
        } else {
            return 'table';  // 短格式（表格）
        }
    },
    
    // 获取系统提示词
    async getSystemPrompt(isEmpty = false) {
        try {
            // 获取适合的提示文件名
            const promptFile = './system_' + this.getSystemPromptType(isEmpty) + '.md';
            
            const response = await fetch(promptFile);
            let systemPrompt = await response.text();
            
            // 只有在非空输入情况下才替换参数
            if (!isEmpty) {
                // 替换参数
                systemPrompt = systemPrompt.replace('{{phonetic_type}}', userSettings.phoneticType);
                systemPrompt = systemPrompt.replace('{{friend_number}}', userSettings.friendNumber);
                systemPrompt = systemPrompt.replace('{{difficulty_range}}', this.difficultyMap[userSettings.difficulty] || this.difficultyMap['A']);
            }
            
            return systemPrompt;
        } catch (error) {
            console.error('加载系统提示失败:', error);
            return isEmpty 
                ? "你是一名热心的英语助手，请输出一句英文名言和翻译，并友好地与用户打招呼。"
                : "输出用户给你的单词的翻译（英汉互译）。任何情况下输出长度不允许超过30个字符。并且在回复的开头加上“服务异常\n”";
        }
    },
    
    // 处理AI模型返回的内容
    handleModelResponse(content, reasoning, done, resultDiv) {
        const contentDiv = resultDiv.querySelector('.result-content');
        let wordResult = contentDiv.querySelector('.word-result');
        
        // 如果没有结果容器，创建一个
        if (!wordResult) {
            wordResult = document.createElement('div');
            wordResult.className = 'word-result';
            contentDiv.appendChild(wordResult);
        }
        
        // 完成时处理
        if (done) {
            const controls = resultDiv.querySelector('.result-controls');
            const stopButton = controls.querySelector('.stop-button');
            const resetButton = controls.querySelector('.reset-button');
            
            stopButton.style.display = 'none';
            resetButton.style.display = 'inline-block';
            
            // 如果没有内容，显示友好消息
            if (!content.trim()) {
                wordResult.innerHTML = '<div class="info-message">模型没有返回内容，请重试</div>';
            }
            
            // 通知发音助手流式输出已完成
            if (typeof PronunciationHelper !== 'undefined' && PronunciationHelper._initialized) {
                PronunciationHelper.handleStreamComplete();
            }
            
            return;
        }
        
        // 使用marked渲染markdown内容
        if (typeof marked !== 'undefined' && content) {
            wordResult.innerHTML = marked.parse(content);
        } else if (content) {
            wordResult.textContent = content;
        } else if (!wordResult.innerHTML) {
            // 如果没有内容，显示加载状态
            wordResult.innerHTML = '<div class="loader"></div>';
        }
    },
    
    // 处理API错误
    handleModelError(error, resultDiv) {
        console.error('AI模型请求失败:', error);
        
        const contentDiv = resultDiv.querySelector('.result-content');
        let wordResult = contentDiv.querySelector('.word-result');
        
        if (!wordResult) {
            wordResult = document.createElement('div');
            wordResult.className = 'word-result';
            contentDiv.appendChild(wordResult);
        }
        
        wordResult.innerHTML = `<div class="error-message">请求失败（${error.message || '未知错误'}）</div>`;
        
        // 更新控制按钮
        const controls = resultDiv.querySelector('.result-controls');
        const stopButton = controls.querySelector('.stop-button');
        const resetButton = controls.querySelector('.reset-button');
        
        stopButton.style.display = 'none';
        resetButton.style.display = 'inline-block';
    },
    
    // 主查询函数
    async queryWord() {
        if (AIModelService.isProcessing()) {
            showToast('已有请求在处理中', 'error');
            return;
        }

        const lastRequest = localStorage.getItem('lastRequest') || 0;
        if (Date.now() - lastRequest < 3000) {
            showToast('操作过于频繁，请稍后再试', 'error');
            return;
        }

        // 获取并清理用户输入
        let word = this.sanitizeInput(document.getElementById('wordInput').value);
        const isEmptyInput = !document.getElementById('wordInput').value.trim();
        document.getElementById('wordInput').value = word;

        const resultDiv = document.getElementById('result');
        const contentDiv = resultDiv.querySelector('.result-content');
        
        // 重置控制按钮状态
        const controls = resultDiv.querySelector('.result-controls');
        const stopButton = controls.querySelector('.stop-button');
        const resetButton = controls.querySelector('.reset-button');
        controls.style.display = 'block';
        stopButton.style.display = 'inline-block';
        resetButton.style.display = 'none';
        
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
        
        // 重置发音助手的处理状态
        if (typeof PronunciationHelper !== 'undefined') {
            PronunciationHelper.resetProcessingState();
        }

        try {
            // 获取系统提示，根据输入是否为空决定使用哪个提示
            const systemPrompt = await this.getSystemPrompt(isEmptyInput);
            const config = ConfigManager.getCurrentConfig();
            
            // 计算使用的温度
            const temperature = this.responseTemperature + (isEmptyInput ? 0.2 : 0);
            
            // 记录最后请求时间
            localStorage.setItem('lastRequest', Date.now());
            
            // 调用AI模型服务
            await AIModelService.callModel(
                config,
                systemPrompt,
                isEmptyInput ? "空输入" : word,
                temperature,
                (content, reasoning, done) => this.handleModelResponse(content, reasoning, done, resultDiv),
                (error) => this.handleModelError(error, resultDiv)
            );

        } catch (error) {
            // 错误处理已在handleModelError中完成
            console.error('查询过程中发生错误:', error);
        }
    },
    
    // 取消当前查询
    async cancelQuery() {
        try {
            await AIModelService.cancelRequest();
            
            const resultDiv = document.getElementById('result');
            const controls = resultDiv.querySelector('.result-controls');
            const stopButton = controls.querySelector('.stop-button');
            const resetButton = controls.querySelector('.reset-button');
            
            stopButton.style.display = 'none';
            resetButton.style.display = 'inline-block';
            
        } catch (error) {
            console.error('取消查询失败:', error);
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
        
        // 重置发音助手的处理状态
        if (typeof PronunciationHelper !== 'undefined') {
            PronunciationHelper.resetProcessingState();
        }
    }
};

// 全局函数别名，方便从HTML直接调用
function getWordFriends() {
    WordService.queryWord();
}
