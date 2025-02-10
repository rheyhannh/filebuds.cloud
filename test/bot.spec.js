import { describe, it } from 'mocha';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import config from '../src/config/env.js';
import buildTelegramBot from '../src/bot.js';
import { Telegraf } from 'telegraf';

use(chaiAsPromised);

describe('Telegram Bot Tests', () => {
	let instance = /** @type {Awaited<ReturnType<typeof buildTelegramBot>>} */ (
		undefined
	);

	afterEach(() => {
		// Restore each stubbed function or object after each test
		sinon.restore();
	});

	it('should reject with error if bot token are falsy or not a string', async function () {
		// Test that the function returns a rejected promise when the bot token is falsy or not a string
		// Stub bot token to null
		sinon.stub(config, 'TELEGRAF_BOT_TOKEN').value(null);
		await expect(buildTelegramBot()).to.be.rejectedWith(
			'valid bot token required!'
		);

		// Stub bot token to undefined
		sinon.stub(config, 'TELEGRAF_BOT_TOKEN').value(undefined);
		await expect(buildTelegramBot()).to.be.rejectedWith(
			'valid bot token required!'
		);

		// Stub bot token to empty string
		sinon.stub(config, 'TELEGRAF_BOT_TOKEN').value('');
		await expect(buildTelegramBot()).to.be.rejectedWith(
			'valid bot token required!'
		);

		// Stub bot token to non-string
		sinon.stub(config, 'TELEGRAF_BOT_TOKEN').value(false);
		await expect(buildTelegramBot()).to.be.rejectedWith(
			'valid bot token required!'
		);

		// Stub bot token to non-string
		sinon.stub(config, 'TELEGRAF_BOT_TOKEN').value(true);
		await expect(buildTelegramBot()).to.be.rejectedWith(
			'valid bot token required!'
		);

		// Stub bot token to non-string
		sinon.stub(config, 'TELEGRAF_BOT_TOKEN').value(0);
		await expect(buildTelegramBot()).to.be.rejectedWith(
			'valid bot token required!'
		);
	});

	it('should reject with error if webhook domain are falsy or not a string when using local server', async function () {
		// Test that the function returns a rejected promise when the webhook domain is falsy or not a string
		// Stub IS_PRODUCTION config to force using local server
		sinon.stub(config, 'IS_PRODUCTION').value(true);

		// Stub webhook domain to null
		sinon.stub(config, 'TELEGRAF_WEBHOOK_DOMAIN').value(null);
		await expect(buildTelegramBot()).to.be.rejectedWith(
			'valid webhook domain required when using local server!'
		);

		// Stub webhook domain to undefined
		sinon.stub(config, 'TELEGRAF_WEBHOOK_DOMAIN').value(undefined);
		await expect(buildTelegramBot()).to.be.rejectedWith(
			'valid webhook domain required when using local server!'
		);

		// Stub webhook domain to empty string
		sinon.stub(config, 'TELEGRAF_WEBHOOK_DOMAIN').value('');
		await expect(buildTelegramBot()).to.be.rejectedWith(
			'valid webhook domain required when using local server!'
		);

		// Stub webhook domain to non-string
		sinon.stub(config, 'TELEGRAF_WEBHOOK_DOMAIN').value(false);
		await expect(buildTelegramBot()).to.be.rejectedWith(
			'valid webhook domain required when using local server!'
		);

		// Stub webhook domain to non-string
		sinon.stub(config, 'TELEGRAF_WEBHOOK_DOMAIN').value(true);
		await expect(buildTelegramBot()).to.be.rejectedWith(
			'valid webhook domain required when using local server!'
		);

		// Stub webhook domain to non-string
		sinon.stub(config, 'TELEGRAF_WEBHOOK_DOMAIN').value(0);
		await expect(buildTelegramBot()).to.be.rejectedWith(
			'valid webhook domain required when using local server!'
		);
	});

	it('should return bot instance with webhook instance undefined when not using local server', async function () {
		// Adjust timeout to prevent early exit
		this.timeout(5000);
		instance = await buildTelegramBot();

		expect(instance.bot).to.be.an.instanceOf(Telegraf);
		expect(instance.webhook).to.be.undefined;
	});

	it('should return bot instance with webhook instance when using local server', async function () {
		// Adjust timeout to prevent early exit
		this.timeout(5000);

		// Stub IS_PRODUCTION config to force using local server
		sinon.stub(config, 'IS_PRODUCTION').value(true);
		instance = await buildTelegramBot();

		expect(instance.bot).to.be.an.instanceOf(Telegraf);
		expect(instance.webhook).to.not.be.undefined;
	});
});
