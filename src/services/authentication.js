const settings = require('../lib/settings');
const bcrypt = require('bcrypt');
const auth = require('../lib/auth');
const AccountService = require('./accounts');

const resetPassword = (body, password) => {
    await bcrypt.hash(password, settings.saltRounds, async (err, hash) => {
		const data = {
			status: false,
			id: null,
			verified: false
		};

		const userId =
			'token' in body
				? auth.decodeUserLoginAuth(body.token)
				: auth.decodeUserLoginAuth(body.id).userId.userId;

		const filter = {
			id: userId
		};
		const customerDraft = {
			password: hash
		};

		// update customer password after checking customer id
		if ('id' in body) {
			await AccountService.updateAccount(userId, customerDraft)
				.then(({ status, json }) => {
					data.status = true;
					data.id = userId;
					data.verified = true;
					return res.status(status).send(data);
				});
			return false;
		}

		if ('name' in userId && userId.name.indexOf('JsonWebTokenErro') !== -1) {
			res.send(data);
			return false;
		}

		// if customer email exists send status back
		const { status, json } = await api.customers.list(filter);
		if (json.total_count > 0) {
			data.status = true;
			data.id = auth.encodeUserLoginAuth(userId);
		}
		return res.status(status).send(data);
	});
}

module.exports = {
    resetPassword, //POST
}

ajaxRouter.post('/forgot-password', async (req, res, next) => {
	const filter = {
		email: req.body.email.toLowerCase()
	};
	const data = {
		status: true
	};

	// send forgot password email
	async function sendEmail(userId) {
		const countryCode = undefined;
		const [emailTemp] = await Promise.all([
			EmailTemplatesService.getEmailTemplate(
				`forgot_password_${serverConfigs.language}`
			)
		]);
		await handlebars.registerHelper('forgot_password_link', obj => {
			const url = `${serverConfigs.storeBaseUrl}${
				countryCode !== undefined ? `/${countryCode}/` : '/'
			}reset-password?token=${AuthHeader.encodeUserLoginAuth(userId)}`;
			let text = emailTemp.link;
			if (text == undefined) {
				text = url;
			}
			return new handlebars.SafeString(
				`<a style="position: relative;text-transform: uppercase;border: 1px solid #ccc;color: #000;padding: 5px;text-decoration: none;" value="${text}" href="${url}"> ${text} </a>`
			);
		});
		const [bodyTemplate, settings] = await Promise.all([
			handlebars.compile(emailTemp.body),
			SettingsService.getSettings()
		]);
		await Promise.all([
			mailer.send({
				to: req.body.email,
				subject: `${emailTemp.subject} ${settings.store_name}`,
				html: bodyTemplate({
					shop_name: settings.store_name
				})
			}),
			res.send(data)
		]);
	}

	// check if customer exists
	await api.customers.list(filter).then(({ status, json }) => {
		if (json.total_count < 1) {
			data.status = false;
			res.status(status).send(data);
			return false;
		}
		sendEmail(json.data[0].id);
	});
});

ajaxRouter.post('/customer-account', async (req, res, next) => {
	const customerData = {
		token: '',
		authenticated: false,
		customer_settings: null,
		order_statuses: null
	};

	if (req.body.token) {
		customerData.token = AuthHeader.decodeUserLoginAuth(req.body.token);
		if (customerData.token.userId !== undefined) {
			const userId = JSON.stringify(customerData.token.userId).replace(
				/["']/g,
				''
			);
			const filter = {
				customer_id: userId
			};

			// retrieve customer data
			await api.customers.retrieve(userId).then(({ status, json }) => {
				customerData.customer_settings = json;
				customerData.customer_settings.password = '*******';
				customerData.token = AuthHeader.encodeUserLoginAuth(userId);
				customerData.authenticated = false;
			});

			// retrieve orders data
			await api.orders.list(filter).then(({ status, json }) => {
				customerData.order_statuses = json;
				let objJsonB64 = JSON.stringify(customerData);
				objJsonB64 = Buffer.from(objJsonB64).toString('base64');
				return res.status(status).send(JSON.stringify(objJsonB64));
			});
		}
	}
});

ajaxRouter.post('/login', async (req, res, next) => {
	const customerData = {
		token: '',
		authenticated: false,
		loggedin_failed: false,
		customer_settings: null,
		order_statuses: null,
		cartLayer: req.body.cartLayer !== undefined ? req.body.cartLayer : false
	};
	// check if customer exists in database and grant or denie access
	await db
		.collection('customers')
		.find({
			email: req.body.email.toLowerCase()
		})
		.limit(1)
		.next((error, result) => {
			if (error) {
				// alert
				throw error;
			}
			if (!result) {
				api.customers.list().then(({ status, json }) => {
					customerData.loggedin_failed = true;
					let objJsonB64 = JSON.stringify(customerData);
					objJsonB64 = Buffer.from(objJsonB64).toString('base64');
					return res.status(status).send(JSON.stringify(objJsonB64));
				});
				return;
			}
			const customerPassword = result.password;
			const inputPassword = req.body.password;

			bcrypt.compare(inputPassword, customerPassword, async (err, out) => {
				if (out == true) {
					customerData.token = AuthHeader.encodeUserLoginAuth(result._id);
					customerData.authenticated = true;

					await api.customers.retrieve(result._id).then(({ status, json }) => {
						customerData.customer_settings = json;
						customerData.customer_settings.password = '*******';

						const filter = {
							customer_id: json.id
						};
						api.orders.list(filter).then(({ status, json }) => {
							customerData.order_statuses = json;
							let objJsonB64 = JSON.stringify(customerData);
							objJsonB64 = Buffer.from(objJsonB64).toString('base64');
							return res.status(status).send(JSON.stringify(objJsonB64));
						});
					});
					return true;
				}
				customerData.loggedin_failed = true;
				let objJsonB64 = JSON.stringify(customerData);
				objJsonB64 = Buffer.from(objJsonB64).toString('base64');
				res.status(200).send(JSON.stringify(objJsonB64));
			});
		});
});

ajaxRouter.post('/register', async (req, res, next) => {
	// set data for response
	const data = {
		status: false,
		isRightToken: true,
		isAccountSaved: false
	};
	const filter = {
		email: req.body.email
	};

	// check if url params contains token
	const requestToken = 'token' in req.body ? req.body.token : false;

	if (requestToken && !data.status) {
		const requestTokenArray = requestToken.split('xXx');

		// if requestToken array has no splitable part response token is wrong
		if (requestTokenArray.length < 2) {
			data.isRightToken = false;
			res.status('200').send(data);
			return false;
		}

		(async () => {
			// decode token parts and check if valid email is the second part of them
			const firstName = await AuthHeader.decodeUserLoginAuth(
				requestTokenArray[0]
			).userId;
			const lastName = await AuthHeader.decodeUserLoginAuth(
				requestTokenArray[1]
			).userId;
			const eMail = await AuthHeader.decodeUserLoginAuth(requestTokenArray[2])
				.userId;
			const passWord = requestTokenArray[3];

			if (
				requestTokenArray.length < 1 ||
				!/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
					eMail
				)
			) {
				// if (requestTokenArray.length < 1) {
				data.isRightToken = false;
				res.status('200').send(data);
				return false;
			}

			// check once if customer email is existig in database
			filter.email = eMail;
			await api.customers.list(filter).then(({ status, json }) => {
				if (json.total_count > 0) {
					data.isAccountSaved = true;
					res.status(status).send(data);
					return false;
				}
			});
			// generate password-hash
			const salt = bcrypt.genSaltSync(saltRounds);
			const hashPassword = bcrypt.hashSync(passWord, salt);

			const customerDraft = {
				full_name: `${firstName} ${lastName}`,
				first_name: firstName,
				last_name: lastName,
				email: eMail.toLowerCase(),
				password: hashPassword
			};

			// create new customer in database
			await api.customers.create(customerDraft).then(({ status, json }) => {
				data.isAccountSaved = true;
				return res.status(status).send(data);
			});
			return true;
		})();
	}

	// send customer a doi email
	async function registerAccount() {
		if (data.status) {
			const countryCode = undefined;
			const [emailTemp] = await Promise.all([
				EmailTemplatesService.getEmailTemplate(
					`register_doi_${serverConfigs.language}`
				)
			]);
			await handlebars.registerHelper('register_doi_link', obj => {
				const url = `${serverConfigs.storeBaseUrl}${
					countryCode !== undefined ? `/${countryCode}/` : '/'
				}register?token=${tokenConcatString}`;
				let text = emailTemp.link;
				if (text == undefined) {
					text = url;
				}
				return new handlebars.SafeString(
					`<a style="position: relative;text-transform: uppercase;border: 1px solid #ccc;color: #000;padding: 5px;text-decoration: none;" value="${text}" href="${url}"> ${text} </a>`
				);
			});
			const [bodyTemplate, settings] = await Promise.all([
				handlebars.compile(emailTemp.body),
				SettingsService.getSettings()
			]);
			const tokenConcatString = `${AuthHeader.encodeUserLoginAuth(
				req.body.first_name
			)}xXx${AuthHeader.encodeUserLoginAuth(
				req.body.last_name
			)}xXx${AuthHeader.encodeUserLoginAuth(req.body.email)}xXx${
				req.body.password
			}`;
			await Promise.all([
				mailer.send({
					to: req.body.email,
					subject: `${emailTemp.subject} ${settings.store_name}`,
					html: bodyTemplate({
						shop_name: settings.store_name
					})
				}),
				res.status('200').send(data)
			]);
		}
		return false;
	}
	// check if customer exist in database
	if (!requestToken) {
		await api.customers.list(filter).then(({ status, json }) => {
			if (json.total_count > 0) {
				res.status(status).send(data);
				return false;
			}
			data.status = true;
			registerAccount();
		});
	}
});

ajaxRouter.put('/customer-account', async (req, res, next) => {
	const customerData = req.body;
	const token = AuthHeader.decodeUserLoginAuth(req.body.token);
	const userId = JSON.stringify(token.userId).replace(/["']/g, '');

	// generate password-hash
	const inputPassword = customerData.password;
	const salt = bcrypt.genSaltSync(saltRounds);
	const hashPassword = bcrypt.hashSync(inputPassword, salt);

	// setup objects and filter
	const customerDataObj = {
		token: '',
		authenticated: false,
		customer_settings: null,
		order_statuses: null
	};
	const customerDraftObj = {
		full_name: `${customerData.first_name} ${customerData.last_name}`,
		first_name: customerData.first_name,
		last_name: customerData.last_name,
		email: customerData.email.toLowerCase(),
		password: hashPassword,
		addresses: [customerData.billing_address, customerData.shipping_address]
	};
	const filter = {
		email: customerData.email
	};
	// update customer profile and addresses
	await api.customers.list(filter).then(({ status, json }) => {
		// if customer email exists already do not update
		if (json.total_count > 0) {
			delete customerDraftObj.email;
		}
	});
	try {
		// update customer
		await db.collection('customers').updateMany(
			{ _id: ObjectID(userId) },
			{
				$set: customerDraftObj
			},
			{ ordered: false },
			async (error, result) => {
				if (error) {
					// alert
					res.status('200').send(error);
				}
				customerDataObj.customer_settings = result;
				customerDataObj.customer_settings.password = '*******';
				customerDataObj.token = AuthHeader.encodeUserLoginAuth(userId);
				customerData.authenticated = false;

				if (customerData.saved_addresses === 0) {
					let objJsonB64 = JSON.stringify(customerDataObj);
					objJsonB64 = Buffer.from(objJsonB64).toString('base64');
					res.status('200').send(JSON.stringify(objJsonB64));
					return false;
				}

				// update orders
				await db.collection('orders').updateMany(
					{ customer_id: ObjectID(userId) },
					{
						$set: {
							shipping_address: customerData.shipping_address,
							billing_address: customerData.billing_address
						}
					},
					(error, result) => {
						if (error) {
							// alert
							res.status('200').send(error);
						}
						customerDataObj.order_statuses = result;
						let objJsonB64 = JSON.stringify(customerDataObj);
						objJsonB64 = Buffer.from(objJsonB64).toString('base64');
						res.status('200').send(JSON.stringify(objJsonB64));
					}
				);
			}
		);
	} catch (error) {}
});