/**
 * 配置管理工具
 */
const ConfigManager = {
    // 获取默认配置
    getDefaultConfigs: function() {
        // 尝试从全局变量获取默认配置（由defaultConfigs.js提供）
        if (typeof window !== 'undefined' && window.DEFAULT_API_CONFIGS) {
            return window.DEFAULT_API_CONFIGS;
        }
        
        // 如果找不到默认配置，返回空配置数组
        console.warn('未找到默认配置，请确保已正确加载 defaultConfigs.js 文件');
        return [
            {
                id: "demo_config",
                name: "示例配置（需设置API密钥）",
                baseUrl: "https://api.example.com/v1/chat/completions",
                model: "example-model",
                apiKey: "", // 空API密钥
                isDefault: true
            }
        ];
    },
    
    // 获取所有配置（默认+用户自定义）
    getAllConfigs: function() {
        const userConfigs = this.getUserConfigs();
        return [...this.getDefaultConfigs(), ...userConfigs];
    },
    
    // 获取用户自定义的配置
    getUserConfigs: function() {
        const savedUserConfigs = localStorage.getItem('wordnfriends_user_configs');
        if (savedUserConfigs) {
            try {
                return JSON.parse(savedUserConfigs);
            } catch (e) {
                console.error('解析用户配置失败:', e);
                return [];
            }
        }
        return [];
    },
    
    // 保存用户自定义配置
    saveUserConfig: function(config) {
        const userConfigs = this.getUserConfigs();
        
        // 检查是否已存在相同ID配置
        const existingIndex = userConfigs.findIndex(c => c.id === config.id);
        if (existingIndex >= 0) {
            // 更新现有配置
            userConfigs[existingIndex] = config;
        } else {
            // 添加新配置
            userConfigs.push(config);
        }
        
        localStorage.setItem('wordnfriends_user_configs', JSON.stringify(userConfigs));
        return true;
    },
    
    // 删除用户自定义配置
    deleteUserConfig: function(configId) {
        let userConfigs = this.getUserConfigs();
        userConfigs = userConfigs.filter(c => c.id !== configId);
        localStorage.setItem('wordnfriends_user_configs', JSON.stringify(userConfigs));
        return true;
    },
    
    // 获取当前选择的配置
    getCurrentConfig: function() {
        const currentConfigId = localStorage.getItem('wordnfriends_current_config_id');
        const allConfigs = this.getAllConfigs();
        
        // 如果有已选择的配置ID，返回对应配置
        if (currentConfigId) {
            const config = allConfigs.find(c => c.id === currentConfigId);
            if (config) return config;
        }
        
        // 否则返回默认配置
        const defaultConfig = allConfigs.find(c => c.isDefault) || allConfigs[0];
        return defaultConfig;
    },
    
    // 设置当前配置
    setCurrentConfig: function(configId) {
        localStorage.setItem('wordnfriends_current_config_id', configId);
    },
    
    // 生成唯一配置ID
    generateConfigId: function(name) {
        return 'user_' + name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString(36);
    },
    
    // 创建新的自定义配置
    createUserConfig: function(name, baseUrl, model, apiKey) {
        const config = {
            id: this.generateConfigId(name),
            name: name,
            baseUrl: baseUrl,
            model: model,
            apiKey: apiKey,
            isDefault: false,
            isUserConfig: true
        };
        
        this.saveUserConfig(config);
        return config;
    }
};
