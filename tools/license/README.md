# 离线授权码生成器

这个目录用于生成单机版授权码。它只依赖 Node.js 自带的 `crypto`，不需要联网，也不需要安装第三方依赖。

## 1. 生成密钥

```powershell
node tools/license/generate-keypair.js --out license-keys
```

会生成：

- `license-keys/private.pem`：私钥，只能放在你或销售人员电脑里，不能发给客户。
- `license-keys/public.pem`：公钥，后续可以内置到客户软件里用于校验授权码。

## 2. 生成授权码

```powershell
node tools/license/create-license.js `
  --private-key license-keys/private.pem `
  --machine MACHINE-8F3A-21CD-99K2 `
  --customer "张三房产" `
  --plan lifetime
```

一年授权示例：

```powershell
node tools/license/create-license.js `
  --private-key license-keys/private.pem `
  --machine MACHINE-8F3A-21CD-99K2 `
  --customer "张三房产" `
  --plan yearly `
  --expires 2027-05-22
```

限制试用额度示例：

```powershell
node tools/license/create-license.js `
  --private-key license-keys/private.pem `
  --machine MACHINE-8F3A-21CD-99K2 `
  --customer "张三房产" `
  --plan trial `
  --expires 2026-06-22 `
  --communities 2 `
  --properties 10 `
  --transactions 30
```

`0` 或不填写限制表示不限数量。

## 3. 校验授权码

```powershell
node tools/license/verify-license.js `
  --public-key license-keys/public.pem `
  --license "REL1.xxx.yyy" `
  --machine MACHINE-8F3A-21CD-99K2
```

## 授权逻辑

授权码内容包含：

- 产品标识
- 客户名称
- 机器码
- 授权类型
- 签发时间
- 到期时间
- 试用限制

生成器用私钥签名，客户端以后只内置公钥。安装包被复制到别的电脑时，因为机器码不同，授权码会校验失败。
