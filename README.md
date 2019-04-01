# Webpack Server Task
[![Build Status](https://travis-ci.com/phylumjs/webpack-server.svg?branch=master)](https://travis-ci.com/phylumjs/webpack-server)
[![Coverage Status](https://coveralls.io/repos/github/phylumjs/webpack-server/badge.svg?branch=master)](https://coveralls.io/github/phylumjs/webpack-server?branch=master)
[![Latest](https://img.shields.io/npm/v/@phylum/webpack-server.svg?label=latest) ![License](https://img.shields.io/npm/l/@phylum/webpack-server.svg?label=license)](https://npmjs.org/package/@phylum/webpack-server)

## Installation
```bash
npm i webpack @phylum/webpack @phylum/webpack-server
```

## Usage
The webpack server task runs an [express](https://expressjs.com/) application that serves the webpack output directory.<br>
*Note, that the webpack task will not be started automatically by the webpack server task.*

```ts
import { Task } from '@phylum/pipeline';
import { WebpackTask } from '@phylum/webpack';
import { WebpackServerTask } from '@phylum/webpack-server';

const bundle = new WebpackTask(...);

const serveBundle = new WebpackServerTask(webpackTask);

new Task(async t => {
	// Run the webpack compiler:
	await t.use(bundle);
	// Serve bundled files:
	await t.use(serveBundle);
});
```

## Listening
By default, the server will listen on `localhost:8080`.
```ts
new WebpackServerTask(webpackTask, Task.value({
	listen: 8080
}));
```
You can specify any argument that can be passed to `net/server.listen(..)`

## History fallback
For single page applications, it is common to fallback to `/index.html` if a request path is not found:
```bash
npm i connect-history-api-fallback
```
```ts
import history = require('connect-history-api-fallback');

new WebpackServerTask(webpackTask, Task.value({
	setup({ app }) {
		app.use(history());
	}
}));
```

## Client Updates
When the webpack task completes, an update message is broadcasted to all connected clients via web socket:
```ts
{
	"name": "webpack-update",
	// In case of an error:
	"error": "<details>"
	// else:
	"stats": {
		"errors": [...],
		"warnings": [...]
	}
}
```

## Hot module replacement
The hot module replacement client that ships with this package connects to the included web socket server and applies updates or reloads the page if not possible.
```ts
// Import the hmr client somewhere in your code...
import '@phylum/webpack-server/dist/hmr';
```
```ts
// ...or add it to your entry point:
entry: ['@phylum/webpack-server/dist/hmr', './src/index.js'],

// Optional. If not included, the hmr client
// will fallback to just reloading the web page.
plugins: [
	new webpack.HotModuleReplacementPlugin()
]
```
