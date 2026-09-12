import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { loadFromDB, initPersistence } from './services/storage/persistence';

/**
 * 启动流程：
 * 1. 从 Dexie(IndexedDB) 载入已持久化的世界数据；
 * 2. 初始化 store -> DB 的自动订阅持久化；
 * 3. 挂载 React 应用。
 */
async function bootstrap(): Promise<void> {
  await loadFromDB();
  initPersistence();
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
