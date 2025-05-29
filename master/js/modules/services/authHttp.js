'use strict';

App.service('oauthHttp', [
    '$http',
    '$q',
    '$resource',
    'config',
    function ($http, $q, $resource, config) {

            return $resource(
                        config().path.signup,
                        {},
                        {
                            validateUser: {
                                method: 'POST',
                                url: config().path.login,
                                headers : {
                                	Authorization : 'Basic SEFOT0lULUFQUDoxMjM0NTY='
                                },
                                params: {
                                	client_id: config().clientId,
                                	scope: 'read write',
                                	grant_type : 'password',
                                	username : '@username',
                                	password: '@password',
                                	client_secret: config().clientSecret }
                            },
                            refreshToken: {
                                method: 'POST',
                                url: config().path.login,
                                headers : {
                                	Authorization : 'Basic SEFOT0lULUFQUDoxMjM0NTY='
                                },
                                params: {
                                	client_id: config().clientId,
                                	grant_type : 'refresh_token',
                                	refresh_token : '@refresh_token',
                                	client_secret: config().clientSecret }
                            },
                            signup: {
                                method: 'POST',
                                url: config().path.signup,
                                headers : {
                                	Authorization : 'Basic SEFOT0lULUFQUDoxMjM0NTY='
                                },
                                params: { username: '@username', password: '@password', password_repeat: '@password_repeat' }
                            },
                            activate : {
                                method: 'POST',
                                headers : {
                                	Authorization : 'Basic SEFOT0lULUFQUDoxMjM0NTY='
                                },
                                url: config().path.signup + "/activate",
                                params: { token: '@token' }
                            },
                            forgotPassword : {
                                method: 'POST',
                                headers : {
                                	Authorization : 'Basic SEFOT0lULUFQUDoxMjM0NTY='
                                },
                                url: config().path.forgotPassword,
                                params: { email: '@email' }
                            },
                            resetPassword : {
                                method: 'POST',
                                headers : {
                                	Authorization : 'Basic SEFOT0lULUFQUDoxMjM0NTY='
                                },
                                url: config().path.forgotPassword + "/reset",
                                params: { token: '@token' , password: '@password', 'password-repeat' : '@password_repeat' }
                            }
                        }
            );

    }

]);
