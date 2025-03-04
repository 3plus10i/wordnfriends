// script.js - 核心功能和初始化

// 用户设置
let userSettings = {
    phoneticType: 'us',     // 'uk'为英式音标，'us'为美式音标
    formatType: 'sentence',    // 'sentence'为例句模式，'table'为表格模式
    friendNumber: 5,        // 联想词数量
    difficulty: 'A'         // 默认难度级别
};

// 初始化控制面板
function initControlPanel() {
    // 初始化本地存储中的设置
    const savedSettings = localStorage.getItem('wordnfriends_settings');
    if (savedSettings) {
        try {
            const parsedSettings = JSON.parse(savedSettings);
            // 合并设置，确保有默认值
            userSettings = {
                ...userSettings,
                ...parsedSettings
            };
        } catch (e) {
            console.error('解析用户设置失败:', e);
            // 如果解析失败，使用默认设置
        }
    }

    // 音标模式切换开关
    const phoneticToggle = document.getElementById('phoneticToggle');
    const phoneticTypeText = document.getElementById('phoneticType');
    
    // 设置初始状态
    phoneticToggle.checked = userSettings.phoneticType === 'us';
    phoneticTypeText.textContent = phoneticToggle.checked ? '美' : '英';
    
    // 监听切换事件
    phoneticToggle.addEventListener('change', function() {
        userSettings.phoneticType = this.checked ? 'us' : 'uk';
        phoneticTypeText.textContent = this.checked ? '美' : '英';
        saveUserSettings();
    });
    
    // 输出格式切换开关
    const formatToggle = document.getElementById('formatToggle');
    const formatTypeText = document.getElementById('formatType');
    
    // 设置输出格式初始状态
    formatToggle.checked = userSettings.formatType === 'sentence';
    formatTypeText.textContent = formatToggle.checked ? '长' : '短';
    
    // 监听切换事件
    formatToggle.addEventListener('change', function() {
        userSettings.formatType = this.checked ? 'sentence' : 'table';
        formatTypeText.textContent = this.checked ? '长' : '短';
        saveUserSettings();
    });
    
    // 联想词数量滑动条
    const friendSlider = document.getElementById('friendSlider');
    const friendNumberText = document.getElementById('friendNumber');
    
    // 设置初始值
    friendSlider.value = userSettings.friendNumber;
    friendNumberText.textContent = userSettings.friendNumber;
    
    // 监听滑动事件
    friendSlider.addEventListener('input', function() {
        userSettings.friendNumber = this.value;
        friendNumberText.textContent = this.value;
        saveUserSettings();
    });
    
    // 难度级别下拉菜单
    const difficultySelect = document.getElementById('difficultyLevel');
    
    // 确保有默认难度值
    if (!userSettings.difficulty || !WordService.difficultyMap[userSettings.difficulty]) {
        userSettings.difficulty = 'A'; // 使用A级作为默认难度
        saveUserSettings(); // 保存设置
    }
    
    // 设置初始值
    difficultySelect.value = userSettings.difficulty;
    
    // 监听选择事件
    difficultySelect.addEventListener('change', function() {
        userSettings.difficulty = this.value;
        saveUserSettings();
    });
    
    console.log('已初始化设置:', userSettings); // 添加日志便于调试
}

// 保存用户设置到本地存储
function saveUserSettings() {
    localStorage.setItem('wordnfriends_settings', JSON.stringify(userSettings));
}

// 初始化结果区域控件
function initResultControls() {
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

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    await ConfigManager.init();
    initControlPanel();
    initResultControls();
    
    // 初始化配置面板管理器
    ConfigPanelManager.init();
    ConfigPanelManager.updateConfigList();
    ConfigPanelManager.updateFooterText();
    
    // 初始化模态弹窗管理器
    ModalManager.init();
    
    // 初始化发音助手 - 放在所有其他初始化之后
    PronunciationHelper.init();
    
    // 添加调试功能 - 为F2按键添加手动触发音标处理功能
    document.addEventListener('keydown', function(event) {
        if (event.key === 'F2') {
            console.log('F2键触发音标处理');
            PronunciationHelper.processCurrentPhonetics();
            event.preventDefault();
        }
    });

    // 设置Markdown渲染选项
    marked.setOptions({
        gfm: true,
        tables: true
    });
});

// 添加自动消失的提示功能
function showToast(message, type = 'info', duration = 3000) {
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
