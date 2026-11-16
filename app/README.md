# Sabarimala booking console

1. `npm install`
2. `npx playwright install chromium`   (one time; this is the hidden/headless browser)
3. `npm start`  ->  open http://localhost:3000
4. Fill the form, press **Start automation**. Watch the log. **Stop** closes the hidden browser.

`e2e/bot.js` is your `test.js` made config-driven. Your old scripts are untouched.
Credentials are typed in the UI; they are not stored in any file.

## Docker

The `Dockerfile` uses the Playwright 1.56.1 Jammy image. Before exposing this
container on a public host, configure the server to listen on `0.0.0.0` and add
authentication: the current server listens only on `127.0.0.1`, and its control
API has no access control.
