
import { Task, dispose } from '@phylum/pipeline';
import { WebpackTask } from '@phylum/webpack';
import express = require('express');
import { ServeStaticOptions } from 'serve-static';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import webpack = require('webpack');
import { resolve } from 'path';
import WebSocket = require('ws');
import { inspect } from 'util';

export class WebpackServerTask extends Task<WebpackServerInfo> {
	public constructor(public readonly webpackTask: WebpackTask, optionsTask?: Task<WebpackServerOptions>) {
		super(async t => {
			const compiler = await t.use(webpackTask.getCompiler);
			const options = optionsTask ? await t.use(optionsTask) : {};

			const publicPath = compiler.options.output.publicPath;
			const contentBase = compiler.options.output.path || resolve('dist');

			const app = express();
			app.use(publicPath || '/', express.static(contentBase, options.files || {}));
			const server = createServer(app);
			const wss = new WebSocket.Server({ server, clientTracking: true });

			const updates = webpackTask.pipe(state => {
				state.then(stats => {
					const message = JSON.stringify({
						name: 'webpack-update',
						stats: stats.toJson({ all: false, warnings: true, errors: true })
					});
					for (const ws of wss.clients) {
						ws.send(message);
					}
				}).catch(error => {
					const message = JSON.stringify({
						name: 'webpack-update',
						error: error.stack || inspect(error)
					});
					for (const ws of wss.clients) {
						ws.send(message);
					}
				});
			});

			const env = { task: this, webpackTask, compiler, options, app, server, wss };
			if (options.setup) {
				await options.setup(env);
			}

			await new Promise((resolve, reject) => {
				server.on('listening', resolve);
				server.on('error', reject);
				server.listen('listen' in options ? options.listen : 8080);
			});
			const address = server.address();
			t.using(() => new Promise((resolve, reject) => {
				dispose(updates);
				server.close(error => {
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				});
				for (const ws of wss.clients) {
					if (ws.readyState < 1) {
						ws.terminate();
					}
				}
			}));
			return { address };
		});
	}
}

export interface WebpackServerSetup {
	readonly task: WebpackServerTask;
	readonly webpackTask: WebpackTask;
	readonly compiler: webpack.Compiler;
	readonly options: WebpackServerOptions;
	readonly app: express.Express;
	readonly server: Server;
	readonly wss: WebSocket.Server;
}

export interface WebpackServerOptions {
	readonly listen?: number | string | {port: number, host: string};
	readonly files?: ServeStaticOptions;
	readonly setup?: (setup: WebpackServerSetup) => Promise<void> | void;
}

export interface WebpackServerInfo {
	readonly address: string | AddressInfo;
}
