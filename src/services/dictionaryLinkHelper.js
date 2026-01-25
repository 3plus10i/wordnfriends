/**
 * 字典链接助手模块
 * 负责识别结果中的单词并添加点击查词功能
 */

import { showToast } from '../utils/toast.js';

const DictionaryLinkHelper = {
    _initialized: false,
    
    // 初始化
    init: function() {
        if (this._initialized) return;
        
        this._initialized = true;
        console.log('字典链接助手初始化完成');
    },
    
    // 处理流式输出完成的信号
    handleStreamComplete: function() {
        console.log('流式输出完成，处理单词链接');
        // 延迟处理以确保DOM已完全渲染
        setTimeout(() => {
            this.processWordLinksInResult();
        }, 300);
    },
    
    // 处理结果中的单词链接
    processWordLinksInResult: function() {
        const wordResult = document.querySelector('.word-result');
        if (!wordResult) {
            console.log('未找到结果容器');
            return;
        }
        
        // 如果已经处理过，则跳过
        if (wordResult.dataset.dictLinksProcessed === 'true') {
            console.log('字典链接已处理过，跳过');
            return;
        }
        
        try {
            // 处理粗体单词（通常在标题中）
            this.processBoldWords(wordResult);
            
            // 处理表格中的单词
            this.processTableWords(wordResult);
            
            // 处理普通文本节点中的单词
            this.processTextNodeWords(wordResult);
            
            // 标记为已处理
            wordResult.dataset.dictLinksProcessed = 'true';
            
            console.log('单词链接处理完成');
        } catch (error) {
            console.error('处理单词链接时出错:', error);
        }
    },
    
    // 处理粗体单词（通常在标题中）
    processBoldWords: function(container) {
        const boldElements = container.querySelectorAll('strong');
        let count = 0;
        
        boldElements.forEach(bold => {
            const text = bold.textContent.trim();
            // 提取可能的单词：通常格式是 "单词: [音标]" 或 "单词 [音标]"
            // 我们只提取字母单词
            const wordMatch = text.match(/^([a-zA-Z]+)/);
            if (wordMatch) {
                const word = wordMatch[1];
                this.wrapWordInLink(bold, word);
                count++;
            }
        });
        
        if (count > 0) {
            console.log(`处理了${count}个粗体单词`);
        }
    },
    
    // 处理表格中的单词
    processTableWords: function(container) {
        // 查找表格中的所有单元格
        const tdElements = container.querySelectorAll('table td');
        let count = 0;
        
        tdElements.forEach(td => {
            // 查找包含单词的单元格（通常是第一个单元格）
            const text = td.textContent.trim();
            const wordMatch = text.match(/^([a-zA-Z]+)/);
            if (wordMatch) {
                const word = wordMatch[1];
                // 检查是否已经是链接
                if (!td.querySelector('a.dict-link')) {
                    this.wrapWordInLink(td, word);
                    count++;
                }
            }
        });
        
        if (count > 0) {
            console.log(`表格中处理了${count}个单词`);
        }
    },
    
    // 处理文本节点中的单词（匹配单词后跟音标的模式）
    processTextNodeWords: function(container) {
        // 创建树遍历器，只选择文本节点
        const walker = document.createTreeWalker(
            container, 
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // 只处理包含音标模式 [...] 的文本节点
                    if (/\[[^\]]+\]/.test(node.nodeValue)) {
                        // 跳过已经是链接内部的文本节点
                        const parent = node.parentElement;
                        if (parent && (parent.tagName === 'A' || parent.classList.contains('dict-link'))) {
                            return NodeFilter.FILTER_SKIP;
                        }
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
        
        let totalProcessed = 0;
        
        // 处理每个找到的节点
        nodesToProcess.forEach(textNode => {
            const parentElement = textNode.parentElement;
            const text = textNode.nodeValue;
            
            // 1. 处理格式: 单词 [发音] 或 单词: [发音]
            const phoneticRegex = /(\b[a-zA-Z]+\b)\s*:\s*\[([^\]]+)\]|(\b[a-zA-Z]+\b)\s+\[([^\]]+)\]/g;
            const matches = [...text.matchAll(phoneticRegex)];
            
            if (matches.length > 0) {
                // 创建替换片段
                let newHTML = text;
                for (let i = matches.length - 1; i >= 0; i--) {
                    const match = matches[i];
                    // 匹配两种模式：单词: [音标] 或 单词 [音标]
                    const word = match[1] || match[3];
                    const phonetic = match[2] || match[4];
                    
                    // 跳过太短的单词
                    if (word.length < 2) continue;
                    
                    // 替换单词部分为链接，保留音标部分不变
                    const wordPattern = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const wordRegex = new RegExp(`\\b(${wordPattern})\\b(?=\\s*:\\s*\\[${phonetic}\\]|\\s+\\[${phonetic}\\])`, 'g');
                    
                    const replacement = `<a href="https://www.iciba.com/word?w=${word}" target="_blank" class="dict-link" title="点击查词">${word}</a>`;
                    newHTML = newHTML.replace(wordRegex, replacement);
                    
                    totalProcessed++;
                }
                
                // 创建新的HTML片段
                const fragment = document.createRange().createContextualFragment(newHTML);
                
                // 替换原始节点
                parentElement.replaceChild(fragment, textNode);
            }
        });
        
        if (totalProcessed > 0) {
            console.log(`处理了${totalProcessed}个文本节点中的单词链接`);
        }
    },
    
    // 将单词包装在链接中
    wrapWordInLink: function(element, word) {
        // 如果元素已经是链接，则跳过
        if (element.tagName === 'A' || element.classList.contains('dict-link')) {
            return;
        }
        
        // 检查元素是否只包含这个单词
        const text = element.textContent.trim();
        if (text === word) {
            // 替换整个元素为链接
            const link = document.createElement('a');
            link.href = `https://www.iciba.com/word?w=${word}`;
            link.target = '_blank';
            link.className = 'dict-link';
            link.title = '点击查词';
            link.textContent = word;
            
            element.parentElement.replaceChild(link, element);
        } else {
            // 只替换单词部分
            const html = element.innerHTML;
            // 使用正则表达式替换单词，但避免替换已经是链接的部分
            const wordRegex = new RegExp(`\\b(${word})\\b(?![^<]*>|[^<>]*</a>)`, 'gi');
            element.innerHTML = html.replace(wordRegex, `<a href="https://www.iciba.com/word?w=$1" target="_blank" class="dict-link" title="点击查词">$1</a>`);
        }
    },
    
    // 重置处理状态，用于新的查询
    resetProcessingState: function() {
        const wordResult = document.querySelector('.word-result');
        if (wordResult) {
            delete wordResult.dataset.dictLinksProcessed;
        }
        console.log('已重置字典链接助手处理状态');
    }
};

export default DictionaryLinkHelper;