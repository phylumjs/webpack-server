# Webpack Server Task

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
