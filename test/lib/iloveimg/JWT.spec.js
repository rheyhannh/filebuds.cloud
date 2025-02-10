import 'dotenv/config';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import jsonwebtoken from 'jsonwebtoken';
import JWT from '../../../src/lib/iloveimg/JWT.js';
import config from '../../../src/config/env.js';

use(chaiAsPromised);

const {
	ILOVEIMG_API_URL,
	ILOVEAPI_PUBLIC_KEY,
	ILOVEAPI_SECRET_KEY,
	ILOVEIMG_SELF_JWT_ISS: APP_API_URL
} = config;

describe('ILoveApi JWT Tests', function () {
	const publicKey = ILOVEAPI_PUBLIC_KEY;
	const secretKey = ILOVEAPI_SECRET_KEY;
	let jwtInstance = /** @type {JWT} */ (undefined);

	beforeEach(function () {
		jwtInstance = new JWT(publicKey, secretKey);
	});

	afterEach(function () {
		sinon.restore();
	});

	it('should generate a correct self-signed authentication token when secretKey is provided', async function () {
		const token = await jwtInstance.getTokenLocally();
		const { iss, jti } = jsonwebtoken.decode(token);

		expect(token).to.be.a('string');
		expect(iss).eq(APP_API_URL);
		expect(jti).eq(publicKey);
	});

	it('should generate a correct self-signed authentication token when secretKey is provided using getToken call', async function () {
		const verifyTokenSpy = sinon.spy(jwtInstance, 'verifyToken');
		const getTokenLocallySpy = sinon.spy(jwtInstance, 'getTokenLocally');

		const token = await jwtInstance.getToken();
		expect(verifyTokenSpy.called).to.be.true;
		expect(getTokenLocallySpy.calledOnce).to.be.true;

		const { iss, jti } = jsonwebtoken.decode(token);
		expect(token).to.be.a('string');
		expect(iss).eq(APP_API_URL);
		expect(jti).eq(publicKey);
	});

	it('should cache a self-signed authentication token after generating it', async function () {
		const token = await jwtInstance.getTokenLocally();
		expect(jwtInstance.token).to.equal(token);
	});

	it('should use cached self-signed authentication token before expired', async function () {
		this.timeout(10000);
		// While on 'test' environment, self-signed authentication token only valid for 10 seconds.
		// This test ensure that the token is cached and reused for subsequent calls within the 10 seconds.
		const token = await jwtInstance.getTokenLocally();
		const {
			iss: cachedIss,
			nbf: cachedNbf,
			exp: cachedExp
		} = jsonwebtoken.decode(token);

		// First Call: Check token is still use cached version and valid after 2 seconds.
		await new Promise((resolve) => setTimeout(resolve, 2000));
		const {
			iss: firstIss,
			nbf: firstNbf,
			exp: firstExp
		} = jwtInstance.verifyToken();
		expect(jwtInstance.token).to.equal(token);
		expect(firstIss).eq(cachedIss);
		expect(firstNbf).eq(cachedNbf);
		expect(firstExp).eq(cachedExp);

		// Second Call: Check token is still use cached version and valid after 6 seconds.
		await new Promise((resolve) => setTimeout(resolve, 4000));
		const {
			iss: secondIss,
			nbf: secondNbf,
			exp: secondExp
		} = jwtInstance.verifyToken();
		expect(jwtInstance.token).to.equal(token);
		expect(secondIss).eq(cachedIss);
		expect(secondNbf).eq(cachedNbf);
		expect(secondExp).eq(cachedExp);
	});

	it('should reset self-signed authentication token when expired', function () {
		jwtInstance.token = jsonwebtoken.sign(
			{ exp: Math.floor(Date.now() / 1000) - 10 },
			secretKey
		);
		jwtInstance.verifyToken();
		expect(jwtInstance.token).to.be.undefined;
	});

	it('should generate correct new self-signed authentication token when expired using getToken call', async function () {
		const verifyTokenSpy = sinon.spy(jwtInstance, 'verifyToken');
		const getTokenLocallySpy = sinon.spy(jwtInstance, 'getTokenLocally');

		jwtInstance.token = jsonwebtoken.sign(
			{ exp: Math.floor(Date.now() / 1000) - 10 },
			secretKey
		);

		const newToken = await jwtInstance.getToken();
		expect(verifyTokenSpy.called).to.be.true;
		expect(getTokenLocallySpy.calledOnce).to.be.true;

		const { iss, jti } = jsonwebtoken.decode(newToken);
		expect(newToken).to.be.a('string');
		expect(iss).to.equal(APP_API_URL);
		expect(jti).to.equal(publicKey);
	});

	it('should resolve correct authentication token from ILoveApi server when secretKey is not provided', async function () {
		this.timeout(5000);

		jwtInstance = new JWT(publicKey);
		const token = await jwtInstance.getTokenFromServer();
		const { iss, jti } = jsonwebtoken.decode(token);

		expect(token).to.be.a('string');
		expect(iss).to.equal(ILOVEIMG_API_URL);
		expect(jti).to.equal(publicKey);
	});

	it('should resolve correct authentication token from ILoveApi server when secretKey is not provided using getToken call', async function () {
		this.timeout(5000);

		jwtInstance = new JWT(publicKey);

		const verifyTokenSpy = sinon.spy(jwtInstance, 'verifyToken');
		const getTokenFromServerSpy = sinon.spy(jwtInstance, 'getTokenFromServer');

		const token = await jwtInstance.getToken();
		expect(verifyTokenSpy.called).to.be.true;
		expect(getTokenFromServerSpy.calledOnce).to.be.true;

		const { iss, jti } = jsonwebtoken.decode(token);
		expect(token).to.be.a('string');
		expect(iss).eq(ILOVEIMG_API_URL);
		expect(jti).eq(publicKey);
	});

	it('should throw an error when ILoveApi server response does not contain a token', async function () {
		this.timeout(5000);

		jwtInstance = new JWT(publicKey);
		sinon.stub(jwtInstance.axiosInstance, 'post').resolves({ data: {} });

		await expect(jwtInstance.getTokenFromServer()).to.be.rejectedWith(
			'Auth token cannot be retrieved'
		);
	});

	it('should cache authentication token from ILoveApi server', async function () {
		this.timeout(5000);

		jwtInstance = new JWT(publicKey);
		const token = await jwtInstance.getTokenFromServer();

		expect(jwtInstance.token).to.equal(token);
	});

	it('should use cached authentication token from ILoveApi server before expired', async function () {
		this.timeout(15000);
		// This test ensure that the token is cached and reused for subsequent calls within the 10 seconds.
		jwtInstance = new JWT(publicKey);
		const token = await jwtInstance.getTokenFromServer();
		const {
			iss: cachedIss,
			nbf: cachedNbf,
			exp: cachedExp
		} = jsonwebtoken.decode(token);

		// First Call: Check token is still use cached version and valid after 2 seconds.
		await new Promise((resolve) => setTimeout(resolve, 2000));
		const {
			iss: firstIss,
			nbf: firstNbf,
			exp: firstExp
		} = jwtInstance.verifyToken();
		expect(jwtInstance.token).to.equal(token);
		expect(firstIss).eq(cachedIss);
		expect(firstNbf).eq(cachedNbf);
		expect(firstExp).eq(cachedExp);

		// Second Call: Check token is still use cached version and valid after 6 seconds.
		await new Promise((resolve) => setTimeout(resolve, 4000));
		const {
			iss: secondIss,
			nbf: secondNbf,
			exp: secondExp
		} = jwtInstance.verifyToken();
		expect(jwtInstance.token).to.equal(token);
		expect(secondIss).eq(cachedIss);
		expect(secondNbf).eq(cachedNbf);
		expect(secondExp).eq(cachedExp);
	});

	it('should reset authentication token from ILoveApi server when expired', async function () {
		jwtInstance = new JWT(publicKey);
		jwtInstance.token = jsonwebtoken.sign(
			{ exp: Math.floor(Date.now() / 1000) - 10 },
			secretKey
		);
		jwtInstance.verifyToken();
		expect(jwtInstance.token).to.be.undefined;
	});

	it('should resolve correct new authentication token from ILoveApi server when expired using getToken call', async function () {
		this.timeout(5000);

		jwtInstance = new JWT(publicKey);

		const verifyTokenSpy = sinon.spy(jwtInstance, 'verifyToken');
		const getTokenFromServerSpy = sinon.spy(jwtInstance, 'getTokenFromServer');

		jwtInstance.token = jsonwebtoken.sign(
			{ exp: Math.floor(Date.now() / 1000) - 10 },
			secretKey
		);

		const newToken = await jwtInstance.getToken();
		expect(verifyTokenSpy.called).to.be.true;
		expect(getTokenFromServerSpy.calledOnce).to.be.true;

		const { iss, jti } = jsonwebtoken.decode(newToken);
		expect(newToken).to.be.a('string');
		expect(iss).to.equal(ILOVEIMG_API_URL);
		expect(jti).to.equal(publicKey);
	});

	it('should throw an error if file encryption key is invalid', function () {
		expect(
			() => new JWT(publicKey, secretKey, { file_encryption_key: 'invalid' })
		).to.throw('Encryption key should have 14, 16, or 32 characters.');
	});
});
