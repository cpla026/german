# Deutschheft · 我的德语练习本

给自己用的小型德语学习页：能切换 A1 / A2 / B1，有今日单词、闪卡、小测验、句子和一段小对话。进度存在浏览器本地，没有账号。

## 本地打开

在本目录执行其一即可：

```bash
# Python
python -m http.server 4173
```

```bash
# Node
npx --yes serve -l 4173
```

浏览器打开 <http://localhost:4173>。

直接双击 `index.html` 大多也能用；若发音或字体异常，改用上面的本地服务。

## 免费远程访问

这是纯静态站点，下面几种都免费，适合自己用。

### 1. Cloudflare Pages（推荐）

1. 把本文件夹放进一个 GitHub 仓库并推送
2. 打开 [Cloudflare Pages](https://pages.cloudflare.com/)，用 GitHub 登录
3. 选中仓库，构建设置留空（无需 Build command，输出目录填 `/`）
4. 部署完成后会得到 `*.pages.dev` 地址，手机也能打开

### 2. Netlify Drop

打开 [app.netlify.com/drop](https://app.netlify.com/drop)，把整个文件夹拖进去。几十秒后得到一个公开链接。

### 3. GitHub Pages

仓库 Settings → Pages → Deploy from a branch，选 `main` / 根目录。地址类似 `https://你的用户名.github.io/仓库名/`。

远程访问后，进度仍存在**你正在用的那台设备的浏览器**里。换设备不会自动同步。

## 自己加内容

打开 `js/data.js`，按现有格式往对应等级追加单词、句子或测验即可。这是私人本子，不必一次写很多。

## 发音

点「读给我听」会调用系统的德语语音（Web Speech API）。Windows 可在「设置 → 时间和语言 → 语音」里添加德语语音，听感会好很多。
