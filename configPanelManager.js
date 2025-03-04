/**
 * 配置面板管理器
 * 负责处理配置界面的显示、隐藏和交互功能
 */

const ConfigPanelManager = {
    init: function() {
        this.isCreatingNewConfig = false; // 添加新状态标记
        this.bindEvents();
        this.updateConfigList();
        this.showConfigDetails(document.getElementById('configSelect').value);
    },
    
    // 绑定所有配置面板相关事件
    bindEvents: function() {
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
        const cancelBtn = configPanel.querySelector('.cancel-config'); // 新增取消按钮引用
        
        // 显示/隐藏配置面板
        configBtn.addEventListener('click', () => {
            configPanel.classList.toggle('show');
        });
        
        // 监听配置选择变化
        configSelect.addEventListener('change', () => {
            const selectedConfigId = configSelect.value;
            
            // 立即应用选择的配置
            ConfigManager.setCurrentConfig(selectedConfigId);
            this.updateFooterText();
            showToast('已切换到配置：'+ConfigManager.getCurrentConfig().name, 'success');
            
            // 显示配置详情
            this.showConfigDetails(selectedConfigId);
        });
        
        // 保存配置
        saveBtn.addEventListener('click', () => {
            // 获取所有输入值
            const nameValue = configNameInput.value.trim();
            const keyValue = apiKeyInput.value.trim();
            const urlValue = baseUrlInput.value.trim();
            const modelValue = modelNameInput.value.trim();
            
            // 无论是新建还是修改，都必须填写全部字段
            if (!nameValue || !urlValue || !modelValue) {
                showToast('有字段为空，请检查补充', 'error');
                return;
            }
            
            // 检查密钥 - 如果是新建配置则必须填写密钥
            if (!keyValue && this.isCreatingNewConfig) {
                showToast('API密钥不能为空', 'error');
                return;
            }
            
            // 处理配置保存逻辑
            if (this.isCreatingNewConfig) {
                // 创建新配置
                const newConfig = ConfigManager.createUserConfig(
                    nameValue,
                    urlValue,
                    modelValue,
                    keyValue
                );
                
                // 立即应用
                ConfigManager.setCurrentConfig(newConfig.id);
                showToast('新配置已创建并应用', 'success');
                
                // 重置新建配置状态
                this.isCreatingNewConfig = false;
            } 
            else {
                const selectedConfigId = configSelect.value;
                const selectedConfig = ConfigManager.getAllConfigs().find(c => c.id === selectedConfigId);
                
                // 如果是默认配置，则不允许修改
                if (selectedConfig && !selectedConfig.isUserConfig) {
                    showToast('默认配置不可修改，请创建新配置', 'error');
                    return;
                }
                
                if (selectedConfig && selectedConfig.isUserConfig) {
                    // 修改现有用户配置
                    const updatedConfig = {
                        ...selectedConfig,
                        name: nameValue,
                        baseUrl: urlValue,
                        model: modelValue
                    };
                    
                    // 如果有输入密钥则更新
                    if (keyValue) {
                        updatedConfig.magicPlaintext = keyValue;
                    }
                    
                    // 保存并应用
                    ConfigManager.saveUserConfig(updatedConfig);
                    ConfigManager.setCurrentConfig(updatedConfig.id);
                    showToast('配置已更新并应用', 'success');
                }
            }
            
            // 重新显示"新增配置"按钮
            addNewBtn.style.display = 'inline-block';
            // 隐藏"取消"按钮
            cancelBtn.style.display = 'none';
            
            // 重新显示配置选择下拉菜单
            const configSelectItem = configSelect.closest('.config-item');
            configSelectItem.style.display = 'block';
            
            this.updateConfigList();
            this.updateFooterText();
        });
        
        // 添加新配置
        addNewBtn.addEventListener('click', () => {
            // 设置为新建配置模式，但不立即创建配置
            this.isCreatingNewConfig = true;
            
            // 清空并设置默认值
            configNameInput.value = '新配置';
            apiKeyInput.value = '';
            apiKeyInput.placeholder = '请输入API密钥';
            baseUrlInput.value = 'https://api.example.com/v1/chat/completions';
            modelNameInput.value = 'model/example';
            
            // 取消禁用编辑
            configNameInput.disabled = false;
            
            // 隐藏"新增配置"按钮
            addNewBtn.style.display = 'none';
            // 显示"取消"按钮
            cancelBtn.style.display = 'inline-block';
            
            // 隐藏配置选择下拉菜单及其所在的config-item
            const configSelectItem = configSelect.closest('.config-item');
            configSelectItem.style.display = 'none';
            
            // 隐藏删除按钮，因为还没有创建配置
            deleteBtn.style.display = 'none';
        });
        
        // 取消新建配置
        cancelBtn.addEventListener('click', () => {
            // 重置新建配置状态
            this.isCreatingNewConfig = false;
            
            // 重新显示"新增配置"按钮
            addNewBtn.style.display = 'inline-block';
            // 隐藏"取消"按钮
            cancelBtn.style.display = 'none';
            
            // 重新显示配置选择下拉菜单
            const configSelectItem = configSelect.closest('.config-item');
            configSelectItem.style.display = 'block';
            
            // 重新加载配置列表
            this.updateConfigList();
            // 显示当前选中的配置详情
            const selectedConfigId = configSelect.value;
            this.showConfigDetails(selectedConfigId);
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
                    
                    this.updateConfigList();
                    this.showConfigDetails(defaultConfig.id);
                    showToast('配置已删除', 'info');
                }
            }
        });
        
        // 隐藏不再需要的"使用此配置"按钮
        const setCurrentBtn = configPanel.querySelector('.set-current-config');
        if (setCurrentBtn) {
            setCurrentBtn.style.display = 'none';
        }
    },
    
    // 更新页脚文本
    updateFooterText: function() {
        const config = ConfigManager.getCurrentConfig();
        const footerElement = document.querySelector('.footer div');
        if (footerElement) {
            footerElement.textContent = `由 ${config.model.split('/').pop()} 强力驱动`;
        }
    },
    
    // 刷新配置列表
    updateConfigList: function() {
        const configSelect = document.getElementById('configSelect');
        
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
    },
    
    // 显示选定的配置详情
    showConfigDetails: function(configId) {
        const configNameInput = document.getElementById('configName');
        const apiKeyInput = document.getElementById('apiKey');
        const baseUrlInput = document.getElementById('baseUrl');
        const modelNameInput = document.getElementById('modelName');
        const deleteBtn = document.querySelector('.delete-config');
        
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
};
