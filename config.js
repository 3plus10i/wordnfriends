/**
 * 配置管理工具
 * 负责处理API配置的加载、保存和管理
 */
const ConfigManager = {
    // 默认配置（作为备用）
    DEFAULT_FALLBACK_CONFIG: {
        id: "demo_config",
        name: "示例配置（需设置API Key）",
        baseUrl: "https://api.example.com/v1/chat/completions",
        model: "example-model",
        magic: "",
        isDefault: true
    },
    
    // 内存中的默认配置缓存
    _defaultConfigs: null,
    
    encodeMagic: function(text) {
        if (!text) return '';
        return btoa(text);
    },
    
    decodeMagic: function(encoded) {
        if (!encoded) return '';
        try {
            return atob(encoded);
        } catch (e) {
            console.error('Broken magic:', e);
            return encoded; // 如果失败返回原字符串
        }
    },
    
    // 初始化配置管理器
    init: async function() {
        try {
            // 每次启动都尝试从env文件获取默认配置
            await this.loadDefaultConfigsFromEnv();
            
            // 设置默认配置（如果尚未设置当前配置）
            if (!localStorage.getItem('wordnfriends_current_config_id')) {
                const allConfigs = this.getAllConfigs();
                const defaultConfig = allConfigs.find(c => c.isDefault) || allConfigs[0];
                if (defaultConfig) {
                    this.setCurrentConfig(defaultConfig.id);
                }
            }
            
            console.log('配置管理器初始化完成');
        } catch (error) {
            console.error('配置管理器初始化失败:', error);
            // 使用备用配置
            this._defaultConfigs = [this.DEFAULT_FALLBACK_CONFIG];
        }
    },
    
    // 从env文件加载默认配置
    loadDefaultConfigsFromEnv: async function() {
        try {
            const response = await fetch('./env');
            if (!response.ok) {
                throw new Error('无法加载environment');
            }
            
            const envText = await response.text();
            const configs = this.parseEnvToConfigs(envText);
            
            if (configs && configs.length > 0) {
                // 仅在内存中保存默认配置，不存储到localStorage
                this._defaultConfigs = configs;
                console.log('已加载默认配置:', configs.length);
                return true;
            } else {
                throw new Error('配置解析后为空');
            }
        } catch (error) {
            console.error('加载默认配置失败:', error);
            // 使用备用配置，但不存储到localStorage
            this._defaultConfigs = [this.DEFAULT_FALLBACK_CONFIG];
            return false;
        }
    },
    
    // 解析env文件内容到配置对象
    parseEnvToConfigs: function(envText) {
        const configs = [];
        let currentConfig = null;
        
        // 按行解析
        const lines = envText.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 跳过空行和注释
            if (!line || line.startsWith(';') || line.startsWith('#')) {
                continue;
            }
            
            // 新配置区块开始
            if (line.startsWith('[') && line.endsWith(']')) {
                if (currentConfig) {
                    configs.push(currentConfig);
                }
                
                const configId = line.substring(1, line.length - 1);
                currentConfig = {
                    id: configId,
                    name: configId, // 默认名称与ID相同
                    isDefault: false,
                    baseUrl: "",
                    model: "",
                    magic: ""
                };
                continue;
            }
            
            // 解析配置项
            if (currentConfig && line.includes('=')) {
                const parts = line.split('=');
                const key = parts[0].trim().toLowerCase();
                const value = parts.slice(1).join('=').trim();
                
                switch (key) {
                    case 'name':
                        currentConfig.name = value;
                        break;
                    case 'baseurl':
                        currentConfig.baseUrl = value;
                        break;
                    case 'model':
                    case 'modelname':
                        currentConfig.model = value;
                        break;
                    case 'magic':
                        currentConfig.magic = value;
                        break;
                    case 'isdefault':
                        currentConfig.isDefault = value.toLowerCase() === 'true' || value === '1';
                        break;
                }
            }
        }
        
        // 添加最后一个配置
        if (currentConfig) {
            configs.push(currentConfig);
        }
        
        return configs;
    },
    
    // 获取默认配置
    getDefaultConfigs: function() {
        // 如果内存中有配置，优先使用
        if (this._defaultConfigs && this._defaultConfigs.length > 0) {
            return this._defaultConfigs;
        }
        
        // 如果内存中没有，返回备用配置
        return [this.DEFAULT_FALLBACK_CONFIG];
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
    
    // 获取解码后的密钥
    getDecodedMagic: function(config) {
        if (!config || !config.magic) return '';
        return this.decodeMagic(config.magic);
    },
    
    // 保存用户自定义配置
    saveUserConfig: function(config) {
        // 如果提供了新的明文密钥，进行编码后再存储
        if (config.magicPlaintext) {
            config.magic = this.encodeMagic(config.magicPlaintext);
            delete config.magicPlaintext; // 删除明文密钥
        }
        
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
    createUserConfig: function(name, baseUrl, model, magicPlaintext) {
        const config = {
            id: this.generateConfigId(name),
            name: name,
            baseUrl: baseUrl,
            model: model,
            magic: this.encodeMagic(magicPlaintext), // 编码存储
            isDefault: false,
            isUserConfig: true
        };
        
        this.saveUserConfig(config);
        return config;
    },
    
    // 重置所有配置（谨慎使用）
    resetAllConfigs: function() {
        localStorage.removeItem('wordnfriends_user_configs');
        localStorage.removeItem('wordnfriends_current_config_id');
        this._defaultConfigs = null;
        return this.loadDefaultConfigsFromEnv();
    }
};
