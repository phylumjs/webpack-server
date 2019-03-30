
import { Task } from '@phylum/pipeline';
import { WebpackTask } from '@phylum/webpack';
import express = require('express');
import { ServeStaticOptions } from 'serve-static';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import webpack = require('webpack');

export class WebpackServerTask extends Task<WebpackServerInfo> {
	public constructor(public readonly webpackTask: WebpackTask, optionsTask?: Task<WebpackServerOptions>) {
		super(async t => {
			const compiler = await t.use(webpackTask.getCompiler);
			const options = optionsTask ? await t.use(optionsTask) : {};

			const publicPath = compiler.options.output.publicPath;
			const contentBase = compiler.options.output.path;

			const app = express();
			app.use(publicPath, express.static(contentBase, options.files || {}));
			const server = createServer(app);

			const env = { webpackTask, compiler, options, app, server };
			if (Array.isArray(options.setup)) {
				await Promise.all(options.setup.map(setup => setup(env)))
			} else if (options.setup) {
				await options.setup(env);
			}

			await new Promise((resolve, reject) => {
				server.on('listening', resolve);
				server.on('error', reject);
				server.listen('listen' in options ? options.listen : 8080);
			});
			const address = server.address();
			t.using(() => new Promise((resolve, reject) => {
				server.close(error => {
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				});
			}));
			return { address };
		});
	}
}

export interface WebpackServerSetup {
	readonly webpackTask: WebpackTask;
	readonly compiler: webpack.Compiler;
	readonly options: WebpackServerOptions;
	readonly app: express.Express;
	readonly server: Server;
}

export type WebpackServerSetupFn = (setup: WebpackServerSetup) => Promise<void> | void;

export interface WebpackServerOptions {
	readonly listen?: number | string | {port: number, host: string};
	readonly files?: ServeStaticOptions;
	readonly setup?: WebpackServerSetupFn | WebpackServerSetupFn[];
}

export interface WebpackServerInfo {
	readonly address: string | AddressInfo;
}
