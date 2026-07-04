# Scraper Scripts

独立的数据抓取脚本，不属于主应用。需要手动在项目根目录执行。

## antwen_scraper.js

从 **antwen.cn** 抓取 GTA Online 载具数据（894+ 辆）。

- 抓取列表页（56 页）获取所有载具链接
- 逐页抓取详情（性能数据、价格、涂装、改装件、装甲等）
- 输出：`antwen_vehicles.json`

```bash
node scraper/antwen_scraper.js
node scraper/antwen_scraper.js --resume      # 断点续传
node scraper/antwen_scraper.js --detail-only  # 仅重抓详情
```

## merge_antwen.js

将 `antwen_vehicles.json` 合并到主 `vehicles.json`。

- 按 `model_name`（不区分大小写）匹配已有载具
- 丰富字段：armor, tags, liveries, mods, ER 等级, 截图
- 添加全新的载具

```bash
node scraper/merge_antwen.js
```
