module.exports = function(dp, Promise) {
  return {
    get: function(label, prepare, process) {
      return {
        run: function(connexion, intercomConfig) {
          return prepare(connexion, intercomConfig).then(function() {
            return this.import(connexion, intercomConfig);
          }.bind(this));
        },

        import: function(connexion, intercomConfig) {
          var pump = new dp.Pump();
          return new Promise(function(resolve, reject) {
            pump
              .mixin(dp.mixin.RestMixin)
              .fromRest({
                query: function(page) {
                  page = page ? page : 1;
                  var perpage = 60;
                  console.log('Requesting up to ' + perpage + ' ' + label + ': page ' + page);
                  return this.get('https://api.intercom.io/' + label + '?per_page=' + perpage + '&page=' + page, {
                    headers: {
                      Accept: 'application/json'
                    },
                    username: intercomConfig.appId,
                    password: intercomConfig.apiKey
                  });
                },
                resultMapping: function(response) {
                  if(response.result.type == 'error.list'){
                    console.log('ERROR IN RESPONSE: ');
                    console.log(response.result.errors);
                    label = 'errors';
                  }
                  return response.result[label];
                },
                nextPage: function(response) {
                  return response.result.pages && response.result.pages.next ? response.result.pages.page + 1 : null;
                }
              })
              .mixin(dp.mixin.MysqlMixin(connexion))
              .process(process)
              .logErrorsToConsole()
              .start()
              .whenFinished().then(function() {
                console.log('Done updating ' + label);
                resolve();
              }, reject);
          });
        }
      };
    }
  };
};
