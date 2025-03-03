/**
 * 发音助手模块
 * 负责识别结果中的音标并添加点击发音功能
 */

const PronunciationHelper = {
    // 用于存储音频对象
    audioElement: null,
    _initialized: false,
    
    // 初始化
    init: function() {
        if (this._initialized) return;
        
        // 创建复用的音频元素
        this.audioElement = document.createElement('audio');
        this.audioElement.style.display = 'none';
        document.body.appendChild(this.audioElement);
        
        this._initialized = true;
        console.log('发音助手初始化完成');
    },
    
    // 处理流式输出完成的信号
    handleStreamComplete: function() {
        console.log('流式输出完成，处理音标');
        // 延迟处理以确保DOM已完全渲染
        setTimeout(() => {
            this.processPhoneticsInResult();
        }, 300);
    },
    
    // 使用DOM TreeWalker处理音标
    processPhoneticsInResult: function() {
        const wordResult = document.querySelector('.word-result');
        if (!wordResult) {
            console.log('未找到结果容器');
            return;
        }
        
        // 如果已经处理过，则跳过
        if (wordResult.dataset.processed === 'true') {
            console.log('内容已处理过，跳过');
            return;
        }
        
        try {
            // 处理文本节点中的音标
            this.processTextNodePhonetics(wordResult);
            
            // 特殊处理表格中的内容
            this.processTablePhonetics(wordResult);
            
            // 特殊处理粗体标题中的内容
            this.processHeaderPhonetics(wordResult);
            
            // 添加点击事件
            this.addPhoneticClickEvents(wordResult);
            
            // 标记为已处理
            wordResult.dataset.processed = 'true';
        } catch (error) {
            console.error('处理音标时出错:', error);
        }
    },
    
    // 处理文本节点中的音标
    processTextNodePhonetics: function(container) {
        // 创建树遍历器，只选择文本节点
        const walker = document.createTreeWalker(
            container, 
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // 只处理包含[...]格式的文本节点
                    if (/\[[^\]]+\]/.test(node.nodeValue)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );
        
        // 存储需要处理的节点，避免在遍历时修改DOM
        const nodesToProcess = [];
        let node;
        while (node = walker.nextNode()) {
            nodesToProcess.push(node);
        }
        
        // 计数器
        let totalProcessed = 0;
        
        // 处理每个找到的节点
        nodesToProcess.forEach(textNode => {
            // 获取父元素和完整文本
            const parentElement = textNode.parentElement;
            const text = textNode.nodeValue;
            
            // 跳过已处理的元素的子节点
            if (parentElement.classList.contains('phonetic') || 
                parentElement.closest('.phonetic')) {
                return;
            }
            
            // 1. 处理格式: 单词 [发音]
            const phoneticRegex = /(\b\w+\b)\s+\[([^\]]+)\]/g;
            const matches = [...text.matchAll(phoneticRegex)];
            
            if (matches.length > 0) {
                // 创建替换片段
                let newHTML = text;
                for (let i = matches.length - 1; i >= 0; i--) {
                    const match = matches[i];
                    const word = match[1];
                    const phonetic = match[2];
                    
                    const replacement = `${word} <span class="phonetic" data-word="${word}" data-phonetic="${phonetic}" title="点击播放发音">[${phonetic}]</span>`;
                    newHTML = newHTML.substring(0, match.index) + 
                              replacement + 
                              newHTML.substring(match.index + match[0].length);
                    
                    totalProcessed++;
                }
                
                // 创建新的HTML片段
                const fragment = document.createRange().createContextualFragment(newHTML);
                
                // 替换原始节点
                parentElement.replaceChild(fragment, textNode);
            }
        });
        
        if (totalProcessed > 0) {
            console.log(`处理了${totalProcessed}个文本节点中的音标`);
        }
    },
    
    // 处理表格中的音标
    processTablePhonetics: function(container) {
        // 查找表格中的所有单元格
        const tdElements = container.querySelectorAll('table td');
        let count = 0;
        
        tdElements.forEach(td => {
            // 查找包含音标的单元格 [音标]
            const phoneticMatch = td.textContent.match(/\[([^\]]+)\]/);
            if (phoneticMatch) {
                // 获取当前行中的前一个单元格（通常包含单词）
                const prevTd = td.previousElementSibling;
                const currentText = td.innerHTML;
                
                if (prevTd && /\b\w+\b/.test(prevTd.textContent)) {
                    // 获取单词
                    const word = prevTd.textContent.match(/\b\w+\b/)[0].trim();
                    const phonetic = phoneticMatch[1];
                    
                    // 修改当前单元格，将音标部分转换为可点击，而不是修改单词单元格
                    td.innerHTML = currentText.replace(
                        /\[([^\]]+)\]/, 
                        `<span class="phonetic" data-word="${word}" data-phonetic="${phonetic}" title="点击发音">[${phonetic}]</span>`
                    );
                    count++;
                } else {
                    // 如果找不到匹配的单词单元格，尝试从当前单元格内容提取单词
                    // 假设单词可能是音标之前的内容
                    const cellContent = td.textContent;
                    const wordMatch = cellContent.match(/(\b\w+\b)\s*\[[^\]]+\]/);
                    
                    if (wordMatch) {
                        const word = wordMatch[1];
                        const phonetic = phoneticMatch[1];
                        
                        td.innerHTML = currentText.replace(
                            /\[([^\]]+)\]/, 
                            `<span class="phonetic" data-word="${word}" data-phonetic="${phonetic}" title="点击发音">[${phonetic}]</span>`
                        );
                        count++;
                    }
                }
            }
        });
        
        if (count > 0) {
            console.log(`表格中处理了${count}个音标`);
        }
    },
    
    // 处理标题中的音标
    processHeaderPhonetics: function(container) {
        // 查找粗体文本后跟随音标的情况
        const boldElements = container.querySelectorAll('strong');
        let count = 0;
        
        boldElements.forEach(bold => {
            const nextSibling = bold.nextSibling;
            if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE) {
                const text = nextSibling.nodeValue;
                const phoneticMatch = text.match(/:\s*\[([^\]]+)\]/);
                
                if (phoneticMatch) {
                    const word = bold.textContent.trim();
                    const phonetic = phoneticMatch[1];
                    
                    // 创建替换内容
                    const replacement = text.replace(
                        /:\s*\[([^\]]+)\]/, 
                        `: <span class="phonetic" data-word="${word}" data-phonetic="${phonetic}" title="点击播放发音">[${phonetic}]</span>`
                    );
                    
                    // 创建新片段
                    const fragment = document.createRange().createContextualFragment(replacement);
                    
                    // 替换原始文本节点
                    bold.parentElement.replaceChild(fragment, nextSibling);
                    count++;
                }
            }
        });
        
        if (count > 0) {
            console.log(`标题中处理了${count}个音标`);
        }
    },
    
    // 为音标添加点击事件
    addPhoneticClickEvents: function(container) {
        // 选择所有没有处理过的音标元素
        const phoneticElements = container.querySelectorAll('.phonetic:not([data-event-added])');
        let count = 0;
        
        phoneticElements.forEach(element => {
            element.setAttribute('data-event-added', 'true');
            count++;
            
            element.addEventListener('click', () => {
                const word = element.getAttribute('data-word');
                if (word) {
                    this.playPronunciation(word);
                }
            });
        });
        
        if (count > 0) {
            console.log(`为${count}个音标元素添加了点击事件`);
        }
    },
    
    // 播放发音
    playPronunciation: function(word) {
        if (!word) return;
        
        const type = userSettings.phoneticType === 'uk' ? 1 : 0; // 0为美式发音，1为英式发音
        const audioUrl = `https://dict.youdao.com/dictvoice?type=${type}&audio=${encodeURIComponent(word)}`;
        
        console.log('播放发音:', word, '类型:', userSettings.phoneticType);
        
        // 设置音频源并播放
        this.audioElement.src = audioUrl;
        this.audioElement.play()
            .catch(error => {
                console.error('播放发音失败:', error);
                showToast('发音加载失败，请稍后重试', 'error');
            });
    },
    
    // 手动处理当前页面上的音标
    processCurrentPhonetics: function() {
        console.log('手动触发音标处理');
        this.processPhoneticsInResult();
    },
    
    // 重置处理状态，用于新的查询
    resetProcessingState: function() {
        // 重置已处理标记
        const wordResult = document.querySelector('.word-result');
        if (wordResult) {
            delete wordResult.dataset.processed;
        }
        console.log('已重置发音助手处理状态');
    }
};
