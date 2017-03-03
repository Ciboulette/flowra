# Flowra

⛔️  This project is currently in development and not working for public ⛔️  

If you're interested please contact me : [here](mailto:louis@thefamily.co?Subject=Project%20Flowra%20Questions)

Build workflow have never been such easy. Just define your worker functions and call it when you need with this library in your current project.

## Installation

```bash
npm install flowra --save
```
## Worker

### Configuration

After installing, you need to setup your worker with the information you can get on [simpleFlow](http://simpleflow.io)
```js
const Flowra = require('flowra').config({
  app_env: 'dev || prod',
  app_id: 'YOUR_APP_ID',
  user_token: 'YOUR_USER_TOKEN',

});

```

## Workflow
