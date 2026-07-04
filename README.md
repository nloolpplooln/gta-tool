# VaultGTA

GTA Online 载具收藏管理工具，收录 **858+ 款载具** 的完整数据，支持收藏管理、车库组织、改装记录、载具对比、DLC 时间线、AI 扫描识别。

## 功能

- **载具百科** — 按品牌、类型筛选全部载具，查看性能数据、详细规格、爆炸抗性、改装选项、涂装
- **收藏管理** — 标记已拥有车辆，仪表盘统计总资产
- **车库组织** — 创建多个车库，拖拽分配车辆，实时显示总价值
- **改装记录** — 勾选实际改装件，自动计算改装花费
- **载具对比** — 最多 4 辆车并排对比：价格、性能、装甲、特性
- **DLC 时间线** — 树杈型展示 47 个 DLC 及每个版本推出的车辆
- **AI 扫描识别** — 游戏中框选载具名称 → OCR 自动识别 → 匹配入库
- **分享卡片** — 生成车辆信息卡片，支持保存图片
- **数据备份** — JSON/CSV 导出导入，云端同步（需登录）

## 技术栈

| 层 | 技术 |
|---|------|
| 桌面框架 | Electron 42 |
| 前端 | Vanilla JS + CSS（无框架） |
| 本地数据库 | Dexie.js（IndexedDB） |
| 云端 | Supabase（认证 + 数据同步） |
| OCR | Tesseract.js |
| 构建 | electron-builder（NSIS + Portable） |
| 自动更新 | electron-updater |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（仅 Web 端）
npm run dev

# 启动 Electron 桌面应用
npm run electron

# 构建 Windows 安装包
npm run build:win
```

## 下载

前往 [Releases](https://github.com/nloolpplooln/gta-tool/releases) 下载最新安装包。

- **VaultGTA-Setup-x.x.x.exe** — NSIS 安装版（支持自动更新）
- **VaultGTA-x.x.x.exe** — 便携版

## 数据来源

- [antwen.cn](https://antwen.cn) — GTA 中文数据库
- [小黑盒](https://www.xiaoheihe.cn) — GTA5 百科

## 免责声明

- 本软件为免费工具，仅供个人学习与游戏辅助用途，不得用于商业目的
- 车辆数据来源于公开页面，版权归原作者及平台所有
- 软件不包含任何游戏内修改、外挂或作弊功能
- GTA、Grand Theft Auto 及相关商标为 Rockstar Games 所有

## License

MIT
