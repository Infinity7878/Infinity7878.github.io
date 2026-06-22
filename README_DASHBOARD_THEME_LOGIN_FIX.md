# Store Bot Dashboard Theme + Login Diagnostics Fix

This patch replaces `dashboard.html` with a version that matches the main Store Bot website theme and improves login/API error visibility.

It does not change the dashboard API. If login still fails after installing this patch, test:

```bash
curl -i http://127.0.0.1:3080/health
curl -i https://api.storebot.pro/health
pm2 status
pm2 logs storebot-dashboard-api --lines 120
```

If local health works but public health fails, fix Nginx/Cloudflare DNS for `api.storebot.pro`.
