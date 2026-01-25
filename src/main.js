/**
 * 应用主入口文件
 */

// 导入第三方库
import { marked } from 'marked';

// 导入配置和工具模块
import ConfigManager from './config/config.js';
import { showToast } from './utils/toast.js';

// 导入服务模块
import AIModelService from './services/aiModelService.js';
import { QuoteFetcher } from './services/quoteFetcher.js';
import WordService, { getWordFriends } from './services/wordService.js';
import PronunciationHelper from './services/pronunciationHelper.js';
import DictionaryLinkHelper from './services/dictionaryLinkHelper.js';
import ModalManager from './managers/modalManager.js';
import ConfigPanelManager from './managers/configPanelManager.js';

// 导入设置管理模块
import { initControlPanel } from './config/settings.js';
import { initResultControls } from './components/resultControls.js';

/**
 * 设置Markdown渲染选项
 */
function setupMarked() {
    marked.setOptions({
        gfm: true,
        tables: true
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 初始化配置管理器
        await ConfigManager.init();
        
        // 初始化控制面板
        initControlPanel();
        
        // 初始化结果控件
        initResultControls();
        
        // 初始化配置面板管理器
        ConfigPanelManager.init();
        ConfigPanelManager.updateConfigList();
        ConfigPanelManager.updateFooterText();
        
        // 初始化模态弹窗管理器
        ModalManager.init();
        
        // 初始化发音助手 - 放在所有其他初始化之后
        PronunciationHelper.init();
        
        // 初始化字典链接助手
        DictionaryLinkHelper.init();
        
        // 设置Markdown渲染器
        setupMarked();
        
        console.log('Word\'n\'Friends 应用初始化完成');
        
    } catch (error) {
        console.error('应用初始化失败:', error);
        showToast('应用初始化失败，请刷新页面重试', 'error');
    }
});

// 全局函数别名，方便从HTML直接调用
window.getWordFriends = getWordFriends;

// // 暴露全局变量用于调试（可选）
// if (import.meta.env.DEV) {
//     window.WordService = WordService;
//     window.ConfigManager = ConfigManager;
//     window.AIModelService = AIModelService;
//     window.QuoteFetcher = QuoteFetcher;
//     window.PronunciationHelper = PronunciationHelper;
//     window.ModalManager = ModalManager;
//     window.ConfigPanelManager = ConfigPanelManager;
// }