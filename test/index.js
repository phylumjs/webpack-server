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

test('simple usage', t => tmp(async dirname => {
	const bundle = new WebpackTask(Task.value({
		context: dirname,
		entry: `${dirname}/entry.js`,
		output: {
			path: `${dirname}/dist`,
			filename: 'index.js'
		}
	}));
	const serveBundle = new WebpackServerTask(bundle, Task.value({
		listen: 8081,
		setup: setup => {
			t.true(setup.webpackTask instanceof WebpackTask);
		}
	}));

	await writeFile(`${dirname}/entry.js`, 'console.log("foo");');

	const runBundle = bundle.start();
	const runServeBundle = serveBundle.start();

	await new Promise((resolve, reject) => {
		const r = bundle.pipe(state => state.then(resolve, reject).then(() => dispose(r)));
	});

	const info = await new Promise((resolve, reject) => {
		const r = serveBundle.pipe(state => state.then(resolve, reject).then(() => dispose(r)));
	});

	await request(info.address, '/index.js');

	dispose(runBundle);
	dispose(runServeBundle);
	await Promise.all([bundle.inactive(), serveBundle.inactive()]);
	t.pass();
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
 * @param {{ address: string; port: number; }} address
 * @param {string} path
 * @returns {Promise<string>}
 */
function request(address, path) {
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
