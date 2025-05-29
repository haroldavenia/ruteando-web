App.factory('resincTknRefresh', [
    'tokenStorage',
    'oauthHttp',
    '$rootScope',
    function(tokenStorage, oauthHttp, $rootScope) {

        function resincTknRefresh(callback_succes, callback_error) {
            if (!tokenStorage.get() && tokenStorage.getRefreshToken()) {
                var _oauthHttp = new oauthHttp({
                    refresh_token: tokenStorage.getRefreshToken()
                });
                $rootScope.updatingToken = true;
                _oauthHttp.$refreshToken(function(token) {
                    tokenStorage.set(token);
                    callback_succes();
                    $rootScope.updatingToken = false;
                }, function(faild) {
                    tokenStorage.resetToken();
                    callback_error();
                    $rootScope.updatingToken = false;
                });
            } else if (!tokenStorage.get()) {
                callback_error();
            } else if (tokenStorage.get()) {
                callback_succes();
                $rootScope.updatingToken = false;
            }
        }

        return resincTknRefresh;
    }
]);
