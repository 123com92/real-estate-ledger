# 房产中介经营记账本

这是一个面向小型房产中介经营场景的记账与房源管理工具。当前版本已经从纯本地 `localStorage` 升级为可部署到 Vercel 的轻量全栈应用：

- 前端：原生 HTML / CSS / JavaScript
- 后端：Vercel Serverless Functions
- 数据库：PostgreSQL
- 认证：邮箱密码登录，HttpOnly Cookie 会话

## v0.2.0 更新

- 新增登录页和注册流程。
- 新增用户表、密码哈希、登录态 Cookie。
- 新增管理员用户管理模块，可切换用户角色和启停账号。
- 新增 PostgreSQL 数据结构，账本数据按用户保存到 `ledger_snapshots`。
- 修复原项目中文乱码，更新界面文案。
- 保留小区、房源、流水、提醒、经营建议和每日简报功能。

## 数据库创建

推荐使用 Neon、Supabase、Railway 或云厂商 RDS 创建 PostgreSQL。创建好数据库后，执行：

```sql
\i db/schema.sql
```

如果平台没有 `psql` 控制台，可以把 `db/schema.sql` 的内容复制到 SQL Editor 执行。

需要配置的环境变量：

```text
DATABASE_URL=postgresql://user:password@host:5432/dbname
SESSION_SECRET=请换成一段足够长的随机字符串
POSTGRES_SSL=true
```

`POSTGRES_SSL` 默认按云数据库启用 SSL。如果你在本地 Docker PostgreSQL 测试，可以设置为 `false`。

## 本地开发

安装依赖：

```powershell
npm install
```

启动 Vercel 本地开发服务：

```powershell
npm run dev
```

然后访问：

```text
http://localhost:3000
```

## Vercel 部署

1. 在 Vercel 新建项目，导入 GitHub 仓库。
2. 在项目环境变量中加入 `DATABASE_URL`、`SESSION_SECRET` 和 `POSTGRES_SSL`。
3. 在 PostgreSQL 执行 `db/schema.sql`。
4. 部署完成后访问 Vercel 自动生成的 `.vercel.app` 地址。
5. 第一个注册账号会自动成为管理员，后续注册账号默认为成员。

## 当前功能

- 小区管理：新建小区，按小区筛选经营数据。
- 房源管理：记录出租状态、装修时间、家电、家具、租客和交租日期。
- 财务管理：记录收入和成本流水，自动统计收入、成本、净利润和利润率。
- 成本优化：根据空置、利润、最大成本项和租差生成经营建议。
- 到期提醒：自动列出 7 天内待交房租和已逾期房源。
- 每日简报：一键生成今日经营汇总和待交房租清单。
- 用户管理：管理员可查看用户、切换角色、启用或停用账号。

## 单机版授权工具

项目已预留离线授权码生成器，后续改造成单机安装包时可以用于“机器码 + 授权码”的买断授权模式。

当前前端已经支持单机模式预览：

```text
http://localhost:5177/?standalone=1
```

单机模式会跳过云端登录，数据先保存到本机浏览器存储，并显示“授权信息”入口。未授权时按试用版限制使用，输入有效授权码后解除限制。

工具位置：

```text
tools/license/
```

常用命令：

```powershell
npm run license:keygen -- --out license-keys
npm run license:create -- --private-key license-keys/private.pem --machine MACHINE-8F3A-21CD-99K2 --customer "张三房产"
npm run license:verify -- --public-key license-keys/public.pem --license "REL1.xxx.yyy" --machine MACHINE-8F3A-21CD-99K2
```

`license-keys/private.pem` 是授权私钥，只能由销售或管理员保管，不能放进客户安装包。客户软件后续只内置公钥用于校验授权码。

## 说明

当前账本数据以 JSON 快照方式存储，适合几千用户以内的早期版本，迭代速度快。后续如果需要更细的审计、多人协作或复杂报表，可以把小区、房源和流水拆成独立 PostgreSQL 表。
