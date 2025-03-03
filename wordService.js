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
        "SSS": "大学四级到托福7分级，涵盖常用学术和书面词汇，能够阅读科学文献，示例单词: paradigm, synthesis, epistemology, ontology, heuristic."
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
        
        // 确保显示加载状态
        wordResult.innerHTML = '<div class="loader"></div>';
        
        this.currentReader = reader;
        controls.style.display = 'block';
        stopButton.style.display = 'inline-block';
        resetButton.style.display = 'none';
        
        let mdContent = '';
        let hasReceivedContent = false;  // 跟踪是否收到过实际内容
        let reasoningContent = '';       // 存储推理内容
        let reasoningBuffer = '';        // 用于按句子缓冲推理内容
        let isShowingReasoning = false;  // 是否正在显示推理内容
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    this.isStreaming = false;
                    console.log('流式输出完成');
                    stopButton.style.display = 'none';
                    resetButton.style.display = 'inline-block';
                    this.currentReader = null;
                    
                    // 如果整个流程中没有收到内容，显示一个友好的消息
                    if (!hasReceivedContent) {
                        wordResult.innerHTML = '<div class="info-message">模型没有返回内容，请重试</div>';
                    }
                    
                    // 如果推理结束，输出剩余缓冲区中的内容
                    if (reasoningBuffer.trim()) {
                        console.log('%c推理内容: ', 'color: #9c27b0;', reasoningBuffer);
                    }
                    
                    // 通知发音助手流式输出已完成
                    if (typeof PronunciationHelper !== 'undefined' && PronunciationHelper._initialized) {
                        PronunciationHelper.handleStreamComplete();
                    }
                    
                    return;
                }

                const chunk = this.decoder.decode(value);
                const lines = chunk.split('\n').filter(line => {
                    return line.startsWith('data: ') && !line.includes('[DONE]');
                });
                
                // 处理每个数据行
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line.slice(6));
                         
                        // 检查是否有推理内容
                        if (data.choices[0].delta && data.choices[0].delta.reasoning_content) {
                            const reasoning = data.choices[0].delta.reasoning_content;
                            reasoningContent += reasoning;  // 累计所有推理内容
                            reasoningBuffer += reasoning;   // 缓冲当前句子
                            
                            // 检查是否有句号，如果有则输出累积的内容
                            if (reasoning.includes('。')) {
                                // 可能有多个句号，按句号分割并逐一输出
                                const sentences = reasoningBuffer.split('。');
                                for (let i = 0; i < sentences.length - 1; i++) {
                                    if (sentences[i].trim()) {
                                        // 去掉换行符
                                        sentences[i] = sentences[i].replace(/\n/g, ' ');
                                        console.log('%c推理内容: ', 'color: #9c27b0;', sentences[i] + '。');
                                    }
                                }
                                // 保留最后一段（没有句号的部分）
                                reasoningBuffer = sentences[sentences.length - 1];
                            }
                            
                            // 如果还没有实际内容，标记为正在推理
                            if (!hasReceivedContent) {
                                isShowingReasoning = true;
                            }
                        }
                        
                        // 检查是否有实际内容
                        if (data.choices[0].delta && data.choices[0].delta.content) {
                            mdContent += data.choices[0].delta.content;
                            
                            // 标记已收到内容
                            if (!hasReceivedContent) {
                                hasReceivedContent = true;
                                
                                // 如果有未输出的推理内容，现在输出
                                if (reasoningBuffer.trim()) {
                                    console.log('%c推理内容: ', 'color: #9c27b0;', reasoningBuffer);
                                    reasoningBuffer = '';
                                }
                                
                                // // 如果之前在推理状态，输出完整的推理内容
                                // if (isShowingReasoning && reasoningContent) {
                                //     console.log('%c完整推理过程: ', 'color: #9c27b0; font-weight: bold;', reasoningContent);
                                // }
                            }
                            
                            // 使用marked渲染markdown
                            if (typeof marked !== 'undefined') {
                                wordResult.innerHTML = marked.parse(mdContent);
                            } else {
                                wordResult.textContent = mdContent;
                            }
                        }
                        
                    } catch (e) {
                        console.warn('解析流数据失败:', e, line);
                    }
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Stream was canceled');
            } else {
                // 如果有未输出的推理内容，现在输出
                if (reasoningBuffer.trim()) {
                    console.log('%c推理内容(中断): ', 'color: #9c27b0;', reasoningBuffer);
                }
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

        // 获取并清理用户输入
        let word = this.sanitizeInput(document.getElementById('wordInput').value);
        const isEmptyInput = !document.getElementById('wordInput').value.trim();
        
        document.getElementById('wordInput').value = word;
        
        // 在请求前打印关键数据
        const config = ConfigManager.getCurrentConfig();
        console.log('请求数据:', {
            provider: config.name,
            baseUrl: config.baseUrl,
            model: config.model,
            key: config.magic ? '已配置' : '未配置',
            word: word,
            systemPromptType: this.getSystemPromptType(isEmptyInput),
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
        
        // 重置发音助手的处理状态
        if (typeof PronunciationHelper !== 'undefined') {
            PronunciationHelper.resetProcessingState();
        }

        this.isStreaming = true;
        localStorage.setItem('lastRequest', Date.now());

        try {
            // 获取系统提示，根据输入是否为空决定使用哪个提示
            const systemPrompt = await this.getSystemPrompt(isEmptyInput);
            
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ConfigManager.getDecodedMagic(config)}`
            };

            const response = await fetch(config.baseUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: config.model,
                    stream: true,
                    temperature: isEmptyInput ? 0.9 : 0.6, // 空输入时使用更高的创意度
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: isEmptyInput ? "空输入" : word }
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
