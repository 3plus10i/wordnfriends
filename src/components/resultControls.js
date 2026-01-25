/**
 * 结果区域控件管理模块
 * 负责处理查询结果的控制按钮逻辑
 */

import WordService from '../services/wordService.js';
import QuoteFetcher from '../services/quoteFetcher.js';

/**
 * 初始化结果区域控件
 */
export function initResultControls() {
    const resultDiv = document.getElementById('result');
    const controls = resultDiv.querySelector('.result-controls');
    const stopButton = controls.querySelector('.stop-button');
    const resetButton = controls.querySelector('.reset-button');

    // 终止按钮点击事件
    stopButton.addEventListener('click', async () => {
        // 先取消查询
        await WordService.cancelQuery();
        
        // 立即清除"加载中"状态
        const contentDiv = resultDiv.querySelector('.result-content');
        const wordResult = contentDiv.querySelector('.word-result');
        if (wordResult && wordResult.querySelector('.loader')) {
            // 如果仍在加载状态，直接重置到每日一句
            WordService.resetResult();
        } else {
            // 如果已经有内容，显示重置按钮
            stopButton.style.display = 'none';
            resetButton.style.display = 'inline-block';
        }
        
        // 确保状态被重置
        WordService.isStreaming = false;
    });

    // 重置按钮点击事件
    resetButton.addEventListener('click', () => {
        WordService.resetResult();
    });

    // 加载每日一句
    QuoteFetcher.showDaily();
}