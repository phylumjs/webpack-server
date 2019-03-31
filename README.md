# Webpack Server Task
[![Build Status](https://travis-ci.com/phylumjs/webpack-server.svg?branch=master)](https://travis-ci.com/phylumjs/webpack-server)
[![Coverage Status](https://coveralls.io/repos/github/phylumjs/webpack-server/badge.svg?branch=master)](https://coveralls.io/github/phylumjs/webpack-server?branch=master)
[![Latest](https://img.shields.io/npm/v/@phylum/webpack-server.svg?label=latest) ![License](https://img.shields.io/npm/l/@phylum/webpack-server.svg?label=license)](https://npmjs.org/package/@phylum/webpack-server)

## Installation
```bash
npm i webpack @phylum/webpack @phylum/webpack-server
```

## Usage
The webpack server task runs an [express](https://expressjs.com/) application that serves the webpack output directory.

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
