/**
 * Toast通知工具
 * 提供自动消失的提示消息功能
 */

/**
 * 显示Toast通知
 * @param {string} message - 要显示的消息
 * @param {string} type - 消息类型: 'info', 'success', 'error', 'warning'
 * @param {number} duration - 显示时长（毫秒），默认3000
 */
export function showToast(message, type = 'info', duration = 3000) {
    // 确保有容器
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // 创建Toast元素
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // 添加到容器
    container.appendChild(toast);
    
    // 显示Toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // 设置自动消失
    setTimeout(() => {
        toast.classList.remove('show');
        // 动画结束后移除元素
        setTimeout(() => {
            container.removeChild(toast);
            // 如果没有更多toast，移除容器
            if (container.children.length === 0) {
                document.body.removeChild(container);
            }
        }, 300);
    }, duration);
}