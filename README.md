# VaultGTA

GTA Online 载具收藏管理工具，收录 **848 款载具** 的完整数据，支持收藏管理、车库组织、改装记录、载具对比、颜色浏览、3D 车牌定制。

## 功能

- **载具百科** — 按品牌、类型筛选全部载具，查看性能数据、详细规格、爆炸抗性、改装选项、涂装
- **默认颜色** — 从 GTA V 游戏文件提取 846 辆车的原始配色方案（5,019 组），点击跳转颜色卡片
- **稀有颜色标注** — 57 种稀有颜色在颜色卡片和车辆详情页高亮标记
- **颜色浏览器** — 160+ 种颜色卡片，含中英文名、色值、价格、适用部位、上车效果图
- **3D 车牌定制** — Three.js 实时渲染，自由旋转缩放，支持多种背景样式
- **收藏管理** — 标记已拥有车辆，仪表盘统计总资产
- **车库组织** — 创建多个车库，拖拽分配车辆，含位置/楼层信息
- **改装记录** — 标签页式改装选项（13 类），勾选改装件自动计算花费
- **载具对比** — 最多 4 辆车并排对比：价格、性能、装甲、特性
- **DLC 时间线** — 树杈型展示 DLC 及每个版本推出的车辆
- **分享卡片** — 生成车辆信息卡片，支持保存图片
- **数据备份** — JSON/CSV 导出导入，云端同步（需登录）

## 技术栈

| 层 | 技术 |
|---|------|
| 桌面框架 | Electron 42 |
| 前端 | Vanilla JS + CSS（无框架） |
| 本地数据库 | Dexie.js（IndexedDB） |
| 云端 | Supabase（认证 + 数据同步） |
| 3D 渲染 | Three.js |
| 构建 | electron-builder（NSIS + Portable） |
| 自动更新 | electron-updater + 腾讯云 COS CDN |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（仅 Web 端）
npm run dev

# 启动 Electron 桌面应用
npm run electron

# 构建 Windows 安装包
npm run build
```

## 下载

前往 [Releases](https://github.com/nloolpplooln/gta-tool/releases) 下载最新安装包。

- **VaultGTA-Setup-x.x.x.exe** — NSIS 安装版（支持自动更新）
- **VaultGTA-x.x.x.exe** — 便携版

## 数据来源

- GTA V 游戏文件（carvariations.ymt — 车辆默认颜色）
- GTA Wiki (gta.wiki — 交通默认色)
- antwen.cn（中文 GTA 数据库）
- 小黑盒 GTA5 百科 (xiaoheihe.cn)

## 免责声明

- 本软件为免费工具，仅供个人学习与游戏辅助用途，不得用于商业目的
- 车辆数据来源于公开页面和游戏文件，版权归原作者及平台所有
- 软件不包含任何游戏内修改、外挂或作弊功能
- GTA、Grand Theft Auto 及相关商标为 Rockstar Games 所有

## License

MIT
