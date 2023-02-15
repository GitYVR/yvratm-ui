# YVRATM UI

UI for on boarding people to Matic network via cash

```bash
yarn build
npm install -g serve
npm install -g pm2

# serve as single page application
pm2 serve .\build\ 3001 --name "yvratm-ui" --spa
```