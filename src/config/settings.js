/**
 * 用户设置管理模块
 * 负责管理用户偏好设置（音标类型、输出格式等）
 */

// 难度级别映射
export const difficultyMap = {
    "B": "初中到高中级，涵盖基础日常生活和简单学习场景，示例单词:apple, book, run, happy, school.",
    "A": "高考英语级，日常生活和基础学术词汇，示例单词:analyze, debate, environment, manage, strategy.",
    "S": "大学四级到六级，涉及广泛的日常生活和基础学术话题。示例单词:philosophy, economy, innovate, perspective, diverse.",
    "SS": "大学六级到雅思6.5分级，包含更多学术和专业词汇，能够阅读新闻、文学作品和中级学术材料，示例单词:metaphor, hypothesis, bureaucracy, paradox, renaissance.",
    "SSS": "雅思7分级，涵盖学术和复杂资料词汇，能够阅读科学文献，示例单词: paradigm, synthesis, epistemology, ontology, heuristic."
};

// 用户设置
export let userSettings = {
    phoneticType: 'us',     // 'uk'为英式音标，'us'为美式音标
    formatType: 'sentence',    // 'sentence'为例句模式，'table'为表格模式
    friendNumber: 5,        // 联想词数量
    difficulty: 'A'         // 默认难度级别
};

/**
 * 保存用户设置到本地存储
 */
export function saveUserSettings() {
    localStorage.setItem('wordnfriends_settings', JSON.stringify(userSettings));
}

/**
 * 初始化控制面板
 */
export function initControlPanel() {
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
    if (!userSettings.difficulty || !difficultyMap[userSettings.difficulty]) {
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