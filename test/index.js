// @ts-check
'use strict';

import test from 'ava';
import { dir } from 'tmp';
import { remove } from 'fs-extra';
import http from 'http';
import { Task, dispose } from '@phylum/pipeline';
import { WebpackTask } from '@phylum/webpack';
import { WebpackServerTask } from '..';
import { writeFile } from 'fs-extra';
import WebSocket from 'ws';

test('simple usage', t => tmp(async dirname => {
	const bundle = new WebpackTask(Task.value({
		context: dirname,
		entry: `${dirname}/entry.js`,
		output: { path: `${dirname}/dist`, filename: 'index.js' }
	}));
	const serveBundle = new WebpackServerTask(bundle, Task.value({
		listen: { host: '127.0.0.1', port: 0 },
		setup: setup => {
			t.true(setup.webpackTask instanceof WebpackTask);
		}
	}));
	await writeFile(`${dirname}/entry.js`, 'console.log("foo");');
	const runBundle = bundle.start();
	const runServeBundle = serveBundle.start();
	try {
		const [info] = await Promise.all([nextOutput(serveBundle), nextOutput(bundle)]);
		await request(info.address, '/index.js');
		t.pass();
	} finally {
		dispose(runBundle);
		dispose(runServeBundle);
		await Promise.all([bundle.inactive(), serveBundle.inactive()]);
	}
}));

test('client updates', t => tmp(async dirname => {
	const bundle = new WebpackTask(Task.value({
		context: dirname,
		entry: `${dirname}/entry.js`,
		output: { path: `${dirname}/dist`, filename: 'index.js' }
	}));
	const serveBundle = new WebpackServerTask(bundle, Task.value({ listen: { host: '127.0.0.1', port: 0 } }));
	const runServeBundle = serveBundle.start();
	try {
		await writeFile(`${dirname}/entry.js`, 'console.log("foo");');
		const info = await nextOutput(serveBundle);
		const ws = await connect(info.address);
		const runBundle = bundle.start();
		try {
			const message = await nextMessage(ws, m => m.name === 'webpack-update');
			t.falsy(message.error);
			t.truthy(message.stats);
			t.truthy(message.stats.warnings);
			t.truthy(message.stats.errors);
		} finally {
			ws.close();
			dispose(runBundle);
			await bundle.inactive();
		}
	} finally {
		dispose(runServeBundle);
		await serveBundle.inactive();	
	}
}));

/**
 * @param {(dirname: string) => Promise<void>} callback
 * @returns {Promise<void>}
 */
async function tmp(callback) {
	const dirname = await new Promise((resolve, reject) => {
		dir((error, dirname) => {
			if (error) {
				reject(error);
			} else {
				resolve(dirname);
			}
		});
	});
	try {
		await callback(dirname);
	} finally {
		await remove(dirname);
	}
}

/**
 * @param {{ address: string; port: number; } | string} address
 * @param {string} path
 * @returns {Promise<string>}
 */
function request(address, path) {
	if (typeof address === 'string') {
		throw new TypeError('Unix domain socket path is not supported.');
	}
	return new Promise((resolve, reject) => {
		const req = http.request({ host: address.address, port: address.port, method: 'GET', path }, res => {
			let data = '';
			res.setEncoding('utf8');
			res.on('end', () => (res.statusCode === 200 ? resolve : reject)(data));
			res.on('data', chunk => {
				data += chunk;
			});
		});
		req.on('error', reject);
		req.end();
	});
}

/**
 * @param {{ address: string; port: number; } | string} address
 * @returns {Promise<WebSocket>}
 */
function connect(address) {
	if (typeof address === 'string') {
		throw new TypeError('Unix domain socket path is not supported.');
	}
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(`ws://${address.address}:${address.port}`);
		ws.on('error', reject);
		ws.on('open', () => resolve(ws));
	});
}

/**
 * @param {Task<T>} task
 * @returns {Promise<T>}
 * @template T
 */
function nextOutput(task) {
	return new Promise((resolve, reject) => {
		const r = task.pipe(s => s.then(resolve, reject).then(() => dispose(r)));
	});
}

/**
 * @param {WebSocket} ws
 * @param {(message: any) => boolean} filter
 * @returns {Promise<any>}
 */
function nextMessage(ws, filter) {
	return new Promise((resolve, reject) => {
		if (ws.readyState !== WebSocket.OPEN) {
			reject(new Error('WebSocket is not connected.'));
		}
		function onError(error) {
			cleanup();
			reject(error);
		}
		function onClose() {
			cleanup();
			reject(new Error('WebSocket was closed.'));
		}
		function onMessage(data) {
			try {
				const message = JSON.parse(data);
				if (filter(message)) {
					cleanup();
					resolve(message);
				}
			} catch (error) {
				onError(error);
			}
		}
		ws.on('error', onError).on('close', onClose).on('message', onMessage);
		function cleanup() {
			ws.off('error', onError).off('close', onClose).off('message', onMessage);
		}
	});
}
