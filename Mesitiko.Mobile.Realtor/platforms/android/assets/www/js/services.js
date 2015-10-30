angular.module('starter.services', [])
     .factory('TestPropertiesService', ['$http', function ($http) {
          var propertiesList = [];

          return {

              addPropertyToList: function (property) { propertiesList.push(property) },
              setAllPropertiesForUser: function (properties) {
                  propertiesList = properties;
              },
              remove: function (property) {

              },
              getPropertyById: function (propertyId) {
                  for (var i = 0; i < propertiesList.length; i++) {
                      if (propertiesList[i].LocalID === propertyId) {
                          return propertiesList[i];
                      }
                  }
                  return null;

              }
          };
      }])
    .factory('PropertiesService', ['$http', function ($http) {
        var propertiesList = [];

        return {

            addPropertyToList: function (property) { propertiesList.push(property) },
            setAllPropertiesForUser: function (properties) {
                propertiesList = properties;
            },
            remove: function (property) {

            },
            getPropertyById: function (propertyId) {
                for (var i = 0; i < propertiesList.length; i++) {
                    if (propertiesList[i].LocalID === propertyId) {
                        return propertiesList[i];
                    }
                }
                return null;

            }
        };
    }])
    .factory('MeetingsService', function () {
        var meetingsList = [];
        return {}
    })
    .factory('SettingsService', function () {
        var settings = {
            photoQuality: 50,
            photoSize: 300,
            DebuggingLogg: true
        };
        return { settings: settings }

    })
    .factory('LoggingService', ['$http', "SettingsService", "_", function ($http, SettingsService, _) {
        var gateWayAddress = "http://www.mesitikogateway.somee.com";
        var controllersEnum = { Details: 1, Properties: 2, NewProperty: 3 }
        var settings = {
            allowLogging: SettingsService.settings.DebuggingLogg,
            LoggAction: function (message) {
                if (navigator.connection.type != Connection.NONE) {
                    $http.post(gateWayAddress + '/LoggPost', { LoggMessage: message })
                        .success(function (data, status, headers, config) {

                        });
                } else {
                    window.alert(message);
                }
            },
            AllowedControllers: [controllersEnum.Details]
        };

        return {
            Logg: function (ctrlId, message) {
                if (SettingsService.settings.DebuggingLogg) {
                    if (_.contains(settings.AllowedControllers, ctrlId))
                        settings.LoggAction(message);
                }

            },
            LoggO: function (ctrlId, message, object) {
                if (SettingsService.settings.DebuggingLogg) {
                    if (_.contains(settings.AllowedControllers, ctrlId))
                        settings.LoggAction(message + " :" + JSON.stringify(object));
                }

            },
            controllersEnum: controllersEnum
        }

    }]);
