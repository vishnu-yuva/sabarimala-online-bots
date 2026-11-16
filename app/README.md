# Sabarimala booking console

1. `npm install`
2. `npx playwright install chromium`   (one time; this is the hidden/headless browser)
3. `npm start`  ->  open http://localhost:3000
4. Fill the form, press **Start automation**. Watch the log. **Stop** closes the hidden browser.

`e2e/bot.js` is your `test.js` made config-driven. Your old scripts are untouched.
Credentials are typed in the UI; they are not stored in any file.

## Docker

The `Dockerfile` uses the Playwright 1.56.1 Jammy image and listens on
`0.0.0.0`. Set `APP_PASSWORD` to a secret of at least 16 characters when
running the container; the server will refuse to start on a network interface
without it. The optional `APP_USERNAME` defaults to `admin`. Basic
authentication protects the UI and all API endpoints.

On Railway, set the service's **Root Directory** to `app` and add
`APP_PASSWORD` (and optionally `APP_USERNAME`) under **Variables**. Railway
provides `PORT`; the Dockerfile's `3000` value is only a fallback. Keep
`APP_PASSWORD` out of the repository.

Local development defaults to `127.0.0.1` and does not require app
authentication. If you set `APP_PASSWORD` locally, open the page and enter
`admin` (or your configured `APP_USERNAME`) and that password in the browser's
authentication prompt.
