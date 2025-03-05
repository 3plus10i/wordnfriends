/**
 * AI模型服务
 * 负责处理与AI大模型的API交互、流式输出和错误处理
 */

const AIModelService = {
    // 全局状态
    isStreaming: false,
    currentReader: null,
    abortController: null,
    decoder: new TextDecoder(),
    
    /**
     * 调用AI模型
     * @param {Object} config - API配置对象
     * @param {string} systemPrompt - 系统提示词
     * @param {string} userInput - 用户输入
     * @param {number} temperature - 温度参数(创造性)
     * @param {function} onStream - 流数据回调函数，参数: (content, reasoning, done)
     * @param {function} onError - 错误回调函数
     * @returns {Promise} - 完成后的Promise
     */
    async callModel(config, systemPrompt, userInput, temperature, onStream, onError) {
        // 如果已经有请求正在处理，拒绝新请求
        if (this.isStreaming) {
            console.warn('已有请求正在处理中');
            return Promise.reject(new Error('已有请求正在处理中'));
        }
        
        console.log('开始AI请求:', {
            provider: config.name,
            model: config.model,
            temperature: temperature
        });
        
        try {
            // 创建新的AbortController用于此次请求
            this.abortController = new AbortController();
            const signal = this.abortController.signal;
            
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ConfigManager.getDecodedMagic(config)}`
            };
            
            this.isStreaming = true;
            console.log('正在发送请求到:', config.baseUrl);
            
            const response = await fetch(config.baseUrl, {
                method: 'POST',
                headers,
                signal: signal,
                body: JSON.stringify({
                    model: config.model,
                    stream: true,
                    temperature: temperature,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userInput }
                    ]
                })
            });
            
            if (!response.ok) {
                console.error('API返回错误状态码:', response.status);
                const errorText = await response.text();
                let errorMessage;
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error?.message || `API错误(${response.status})`;
                } catch (e) {
                    errorMessage = `请求失败(${response.status}): ${errorText.substring(0, 100)}`;
                }
                
                throw new Error(errorMessage);
            }
            
            console.log('成功获取响应，开始流式处理');
            this.currentReader = response.body.getReader();
            
            return this.processStream(onStream, onError);
            
        } catch (error) {
            this.isStreaming = false;
            this.currentReader = null;
            this.abortController = null;
            
            // 如果是用户主动取消，不视为错误
            if (error.name === 'AbortError') {
                console.log('请求已被用户取消');
                return Promise.resolve({ canceled: true });
            }
            
            console.error('API调用失败:', error);
            if (onError) {
                onError(error);
            }
            
            return Promise.reject(error);
        }
    },
    
    /**
     * 处理流式数据
     * @param {function} onStream - 流数据回调
     * @param {function} onError - 错误回调
     * @returns {Promise}
     */
    async processStream(onStream, onError) {
        let mdContent = '';
        let reasoningContent = '';
        let reasoningBuffer = '';
        let hasReceivedContent = false;
        
        try {
            while (true) {
                const { done, value } = await this.currentReader.read();
                if (done) {
                    // 流读取完成
                    console.log('流式输出完成');
                    
                    // 输出剩余缓冲区中的推理内容
                    if (reasoningBuffer.trim()) {
                        console.log('%c推理内容: ', 'color: #9c27b0;', reasoningBuffer);
                    }
                    
                    // 调用回调通知完成
                    if (onStream) {
                        onStream(mdContent, reasoningContent, true);
                    }
                    
                    this.isStreaming = false;
                    this.currentReader = null;
                    this.abortController = null;
                    return { content: mdContent, reasoning: reasoningContent };
                }
                
                // 解码并处理块数据
                const chunk = this.decoder.decode(value);
                const lines = chunk.split('\n').filter(line => {
                    return line.startsWith('data: ') && !line.includes('[DONE]');
                });
                
                // 处理每个数据行
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        // 处理推理内容
                        if (data.choices[0].delta && data.choices[0].delta.reasoning_content) {
                            const reasoning = data.choices[0].delta.reasoning_content;
                            reasoningContent += reasoning;
                            reasoningBuffer += reasoning;
                            
                            // 检查是否有句号，按句号分割并输出
                            if (reasoning.includes('。')) {
                                const sentences = reasoningBuffer.split('。');
                                for (let i = 0; i < sentences.length - 1; i++) {
                                    if (sentences[i].trim()) {
                                        const cleanSentence = sentences[i].replace(/\n/g, ' ');
                                        console.log('%c推理内容: ', 'color: #9c27b0;', cleanSentence + '。');
                                    }
                                }
                                reasoningBuffer = sentences[sentences.length - 1];
                            }
                        }
                        
                        // 处理实际内容
                        if (data.choices[0].delta && data.choices[0].delta.content) {
                            const newContent = data.choices[0].delta.content;
                            mdContent += newContent;
                            hasReceivedContent = true;
                            
                            // 如果有未输出的推理内容，现在输出
                            if (!hasReceivedContent && reasoningBuffer.trim()) {
                                console.log('%c推理内容: ', 'color: #9c27b0;', reasoningBuffer);
                                reasoningBuffer = '';
                            }
                            
                            // 调用回调传递新内容
                            if (onStream) {
                                onStream(mdContent, reasoningContent, false);
                            }
                        }
                    } catch (e) {
                        console.warn('解析流数据失败:', e, line);
                    }
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('流式读取被取消');
                return { canceled: true, content: mdContent, reasoning: reasoningContent };
            } else {
                console.error('流式处理错误:', err);
                if (onError) {
                    onError(err);
                }
                throw err;
            }
        } finally {
            // 确保状态被重置
            this.isStreaming = false;
        }
    },
    
    /**
     * 取消当前请求
     * @returns {Promise} - 代表取消操作的Promise
     */
    async cancelRequest() {
        console.log('取消AI请求 - 当前状态:', this.isStreaming ? '正在流式输出' : '非流式状态');
        
        // 立即重置状态标志
        this.isStreaming = false;
        
        // 取消HTTP请求
        if (this.abortController) {
            try {
                console.log('执行请求取消');
                this.abortController.abort();
                this.abortController = null;
            } catch (error) {
                console.error('取消HTTP请求时出错:', error);
            }
        }
        
        // 取消reader流读取
        if (this.currentReader) {
            try {
                await this.currentReader.cancel();
                console.log('已取消流式读取');
            } catch (error) {
                console.error('取消流读取时出错:', error);
            } finally {
                this.currentReader = null;
            }
        }
        
        return Promise.resolve({ canceled: true });
    },
    
    /**
     * 检查是否正在处理请求
     * @returns {boolean} - 是否有请求正在处理
     */
    isProcessing() {
        return this.isStreaming;
    }
};
