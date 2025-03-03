// script.js - 核心功能和初始化

// 用户设置
let userSettings = {
    phoneticType: 'us',     // 'uk'为英式音标，'us'为美式音标
    formatType: 'sentence',    // 'sentence'为例句模式，'table'为表格模式
    friendNumber: 5,        // 联想词数量
    difficulty: 'A'         // 默认难度级别
};

// 设置页脚文字
function setFooterText() {
    const config = ConfigManager.getCurrentConfig();
    const footerElement = document.querySelector('.footer div');
    if (footerElement) {
        footerElement.textContent = `由 ${config.model.split('/').pop()} 强力驱动`;
    }
}

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
        await WordService.cancelQuery();
        stopButton.style.display = 'none';
        const contentDiv = resultDiv.querySelector('.result-content');
        if (contentDiv.querySelector('.word-result')) {
            resetButton.style.display = 'inline-block';
        }
    });

    // 重置按钮点击事件
    resetButton.addEventListener('click', () => {
        WordService.resetResult();
    });

    // 加载每日一句
    QuoteFetcher.showDaily();
}

// 初始化配置面板
function initConfigPanel() {
    const configBtn = document.querySelector('.advanced-config-btn');
    const configPanel = document.querySelector('.config-panel');
    
    // 配置选择下拉菜单
    const configSelect = document.getElementById('configSelect');
    const apiKeyInput = document.getElementById('apiKey');
    const baseUrlInput = document.getElementById('baseUrl');
    const modelNameInput = document.getElementById('modelName');
    const configNameInput = document.getElementById('configName');
    
    const saveBtn = configPanel.querySelector('.save-config');
    const deleteBtn = configPanel.querySelector('.delete-config');
    const addNewBtn = configPanel.querySelector('.add-new-config');
    
    // 刷新配置列表
    // 此时应保证默认配置已首次加载
    function updateConfigList() {
        // 清空当前配置列表
        configSelect.innerHTML = '';
        
        // 获取所有配置
        const allConfigs = ConfigManager.getAllConfigs();
        const currentConfig = ConfigManager.getCurrentConfig();
        
        // 添加配置到下拉菜单
        allConfigs.forEach(config => {
            const option = document.createElement('option');
            option.value = config.id;
            option.textContent = `${config.name} (${config.model})`;
            if (config.isUserConfig) {
                option.textContent += ' 📝';  // 标记用户配置
            }
            if (config.id === currentConfig.id) {
                option.selected = true;
            }
            configSelect.appendChild(option);
        });
    }
    
    // 显示选定的配置详情
    function showConfigDetails(configId) {
        const config = ConfigManager.getAllConfigs().find(c => c.id === configId);
        if (!config) return;
        
        // 不显示解码后的密钥，保持编码状态
        apiKeyInput.value = '';
        apiKeyInput.placeholder = config.magic ? '密钥已加密存储' : '请输入密钥';
        
        baseUrlInput.value = config.baseUrl || '';
        modelNameInput.value = config.model || '';
        configNameInput.value = config.name || '';
        
        // 设置编辑状态和按钮可见性
        const isUserConfig = config.isUserConfig === true;
        configNameInput.disabled = !isUserConfig;
        deleteBtn.style.display = isUserConfig ? 'inline-block' : 'none';
    }
    
    // 加载初始配置
    updateConfigList();
    showConfigDetails(ConfigManager.getCurrentConfig().id);
    
    // 显示/隐藏配置面板
    configBtn.addEventListener('click', () => {
        configPanel.classList.toggle('show');
    });
    
    // 监听配置选择变化
    configSelect.addEventListener('change', () => {
        const selectedConfigId = configSelect.value;
        
        // 立即应用选择的配置
        ConfigManager.setCurrentConfig(selectedConfigId);
        setFooterText();
        showToast('已切换到配置：'+ConfigManager.getCurrentConfig().name, 'success');
        
        // 显示配置详情
        showConfigDetails(selectedConfigId);
    });
    
    // 保存配置
    saveBtn.addEventListener('click', () => {
        const selectedConfigId = configSelect.value;
        const selectedConfig = ConfigManager.getAllConfigs().find(c => c.id === selectedConfigId);
        
        if (selectedConfig) {
            // 更新现有配置
            if (selectedConfig.isUserConfig) {
                // 用户配置可完全修改
                const updatedConfig = {
                    ...selectedConfig,
                    name: configNameInput.value.trim(),
                    baseUrl: baseUrlInput.value.trim(),
                    model: modelNameInput.value.trim()
                };
                
                // 仅当输入了新密钥时才更新密钥
                const newKey = apiKeyInput.value.trim();
                if (newKey) {
                    updatedConfig.magicPlaintext = newKey;
                }
                
                ConfigManager.saveUserConfig(updatedConfig);
            } else {
                // 创建用户配置版本
                const newConfig = ConfigManager.createUserConfig(
                    `${configNameInput.value.trim()} (自定义)`,
                    baseUrlInput.value.trim(),
                    modelNameInput.value.trim(),
                    apiKeyInput.value.trim()
                );
                ConfigManager.setCurrentConfig(newConfig.id);
            }
            
            updateConfigList();
            setFooterText();
            showToast('配置已保存', 'success');
        }
    });
    
    // 添加新配置
    addNewBtn.addEventListener('click', () => {
        const newName = '新配置';
        const newConfig = ConfigManager.createUserConfig(
            newName,
            baseUrlInput.value.trim() || 'https://api.example.com/v1/chat/completions',
            modelNameInput.value.trim() || 'model/example',
            '' // 空字符串
        );
        
        ConfigManager.setCurrentConfig(newConfig.id);
        updateConfigList();
        showConfigDetails(newConfig.id);
    });
    
    // 删除配置
    deleteBtn.addEventListener('click', () => {
        const selectedConfigId = configSelect.value;
        const selectedConfig = ConfigManager.getAllConfigs().find(c => c.id === selectedConfigId);
        
        if (selectedConfig && selectedConfig.isUserConfig) {
            if (confirm(`确定要删除配置 "${selectedConfig.name}" 吗？`)) {
                ConfigManager.deleteUserConfig(selectedConfigId);
                
                // 重新选择默认配置
                const defaultConfig = ConfigManager.getAllConfigs().find(c => c.isDefault);
                ConfigManager.setCurrentConfig(defaultConfig.id);
                
                updateConfigList();
                showConfigDetails(defaultConfig.id);
                showToast('配置已删除', 'info');
            }
        }
    });
    
    // 隐藏不再需要的"使用此配置"按钮
    const setCurrentBtn = configPanel.querySelector('.set-current-config');
    if (setCurrentBtn) {
        setCurrentBtn.style.display = 'none';
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    await ConfigManager.init();
    initControlPanel();
    initResultControls();
    initConfigPanel();
    setFooterText();
    
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
    
    // 初始化赞赏码弹窗
    const miniIcon = document.querySelector('.mini-icon');
    const modal = document.getElementById('appreciationModal');
    const closeButton = document.querySelector('.close-button');
    
    if (miniIcon && modal) {
        miniIcon.addEventListener('click', function() {
            modal.classList.add('show');
        });
        
        closeButton.addEventListener('click', function() {
            closeModal();
        });
        
        // 点击弹窗外部关闭
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    // 设置Markdown渲染选项
    marked.setOptions({
        gfm: true,
        tables: true
    });
});

// 获取 modal 元素
const modal = document.getElementById('appreciationModal');
const closeButton = document.querySelector('.close-button');
const miniIcon = document.querySelector('.mini-icon');

// 点击小图标显示 modal
miniIcon.addEventListener('click', () => {
    modal.style.display = 'block';
    // 强制重绘
    modal.offsetHeight;
    modal.classList.add('show');
});

// 点击关闭按钮隐藏 modal
closeButton.addEventListener('click', closeModal);

// 点击 modal 背景关闭
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

function closeModal() {
    modal.classList.remove('show');
    // 等待动画完成后隐藏
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300); // 与 CSS transition 时间相匹配
}

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
