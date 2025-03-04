/**
 * 模态弹窗管理器
 * 负责处理应用中的模态弹窗显示和交互
 */

const ModalManager = {
    modals: {},
    
    init: function() {
        this.initAppreciationModal();
    },
    
    // 初始化赞赏码弹窗
    initAppreciationModal: function() {
        const modal = document.getElementById('appreciationModal');
        const miniIcon = document.querySelector('.mini-icon');
        const closeButton = modal.querySelector('.close-button');
        
        // 存储到模态窗口集合
        this.modals.appreciation = modal;
        
        if (miniIcon && modal) {
            // 点击小图标显示模态窗口
            miniIcon.addEventListener('click', () => {
                this.showModal('appreciation');
            });
            
            // 点击关闭按钮隐藏模态窗口
            closeButton.addEventListener('click', () => {
                this.hideModal('appreciation');
            });
            
            // 点击模态窗口背景关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal('appreciation');
                }
            });
        }
    },
    
    // 显示指定的模态窗口
    showModal: function(modalName) {
        const modal = this.modals[modalName];
        if (!modal) return;
        
        modal.style.display = 'block';
        // 强制重绘以确保过渡动画生效
        modal.offsetHeight;
        modal.classList.add('show');
    },
    
    // 隐藏指定的模态窗口
    hideModal: function(modalName) {
        const modal = this.modals[modalName];
        if (!modal) return;
        
        modal.classList.remove('show');
        // 等待动画完成后隐藏
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // 与CSS transition时间相匹配
    }
};
