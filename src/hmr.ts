
console.log('Hello World!');

let ws: WebSocket;
let wasConnected = false;

function connect() {
	if (!ws || ws.readyState > WebSocket.OPEN) {
		ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`);
		ws.addEventListener('error', () => setTimeout(connect, 1000));
		ws.addEventListener('close', () => setTimeout(connect, 1000));
		ws.addEventListener('open', () => {
			if (wasConnected) {
				location.reload();
			}
			wasConnected = true;
		});
		ws.addEventListener('message', e => {
			const message = JSON.parse(e.data);
			if (message.name === 'webpack-update') {
				if (message.error) {
					console.error(message.error);
				} else {
					let hasErrors = false;

					if (message.stats) {
						for (const warn of message.stats.warnings || []) {
							console.warn(warn);
						}
						for (const error of message.stats.errors || []) {
							console.error(error);
							hasErrors = true;
						}
					}

					if (!hasErrors) {
						// TODO: Try to apply updates.
					}
				}
			}
		});
	}
}

connect();

function applyUpdates() {
	if (module['hot'] && module['hot'].status() === 'idle') {
		module['hot'].check({
			onUnaccepted: () => location.reload(),
			onDeclined: () => location.reload()
		}).catch((error: any) => {
			console.error(error);
			location.reload();
		});
	} else {
		location.reload();
	}
}
