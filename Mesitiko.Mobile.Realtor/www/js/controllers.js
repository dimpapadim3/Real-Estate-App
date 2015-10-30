angular.module('starter.controllers', [])
.controller('DashCtrl', function ($scope) { })
.controller('PropertiesCtrl', function ($scope, $state, $http, _, PropertiesService, LoggingService) {

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
              .toString(16)
              .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
          s4() + '-' + s4() + s4() + s4();
    }
    var onlinePreopertiesManager = function () {
        this.onDeviceReady = function () {

        }
        this.getproperties = function (propertiesProvider) {
            $http.get('http://www.mesitikogateway.somee.com/api/Properties')
                .success(function (propertiesList, status, headers, config) {
                    LoggingService.LoggO(LoggingService.controllersEnum.Properties, "finished getting properties from server ", propertiesList);
                    for (var i = 0; i < propertiesList.length; i++) {
                        propertiesList[i].LocalID = guid();
                    }
                    PropertiesService.setAllPropertiesForUser(propertiesList);
                    propertiesProvider(propertiesList);


                });
        }
    }
    var offlinePropertiesManager = function () {
        var db = null; var propertiesList = [];

        this.onDeviceReady = function () {
            db = window.sqlitePlugin.openDatabase("my.db");
        }
        this.getPersistedProperties = function (callback) {
            db.transaction(function (tx) {
                tx.executeSql('select PropertySerialized   from properties', [], function (tx, res) {
                    LoggingService.Logg(LoggingService.controllersEnum.Properties, "executeSql finished" + JSON.stringify(res));
                    callback(res);
                }, function (e) {
                    alert(e);
                });

            });
        };
        this.tryCreateDb = function () {
            db.executeSql("CREATE TABLE IF NOT EXISTS properties (id integer primary key AUTOINCREMENT, PropertySerialized text)");
        };
        var persistProperiesArrayInDb = function (properties) {

            db.transaction(function (tx) {
                for (var i = 0; i < properties.length; i++) {
                    db.executeSql("INSERT INTO properties (PropertySerialized) VALUES (?)", [JSON.stringify(properties[i])],
                       function (tx, res) {
                           LoggingService.Logg(LoggingService.controllersEnum.Properties, "inserted " + JSON.stringify(res));
                       });
                }


            });
        }
        this.persistProperyInDb = function (property) {

            db.transaction(function (tx) {
                db.executeSql("INSERT INTO properties (PropertySerialized) VALUES (?)", [JSON.stringify(property)],
                       function (tx, res) {
                           LoggingService.Logg(LoggingService.controllersEnum.Properties, "inserted " + JSON.stringify(res));
                       });
            });
        }

        this.restorePersistedProperties = function (onFinished) {
            propertiesList = [];
            LoggingService.Logg(LoggingService.controllersEnum.Properties, "restorePersistedProperties");
            this.getPersistedProperties(function (res) {
                var len = res.rows.length;
                for (var i = 0; i < len; i++) {
                    var property = JSON.parse(res.rows.item(i).PropertySerialized);
                    property.IsFromServer = true;
                    property.LocalID = guid();
                    propertiesList.push(property);
                }
                LoggingService.Logg(LoggingService.controllersEnum.Properties, (JSON.stringify(propertiesList)));
                onFinished(propertiesList);
            });
        };
        this.getproperties = function (propertiesProvider) {
            this.tryCreateDb();

            this.restorePersistedProperties(function (___) {

                if (propertiesList.length <= 0) {
                    $http.get('http://www.mesitikogateway.somee.com/api/Properties')
                        .success(function (data, status, headers, config) {
                            LoggingService.Logg(LoggingService.controllersEnum.Properties, "finished getting properties from server ");
                            persistProperiesArrayInDb(data);
                        });
                } else {
                    LoggingService.Logg(LoggingService.controllersEnum.Properties, "properties did not load from server  " + JSON.stringify(propertiesList));

                }
                propertiesProvider(propertiesList);
                PropertiesService.setAllPropertiesForUser(propertiesList);
            });
        }


    }
    var syncManager = function (offlineManager) {
        var gateWayAddress = "http://www.mesitikogateway.somee.com";

        var sendToServer = function (property) {
            LoggingService.LoggO(LoggingService.controllersEnum.Properties, "sendToServer ", property);

            $http.post(gateWayAddress + '/PropertiesCreate',
                {
                    'Name': property.Name,
                    'Description': property.Description,
                })
                .success(function (data, status, headers, config) {
                    LoggingService.Logg(LoggingService.controllersEnum.Properties, "PropertiesCreate");
                });

        }

        var copyFromServer = function (property) {
            LoggingService.Logg(LoggingService.controllersEnum.Properties, "copy property to local " + JSON.stringify(property));
            property.IsFromServer = true;
            offlineManager.persistProperyInDb(property);
            PropertiesService.addPropertyToList(property);
        }

        var compareVlaues = function (propertiesList, data) {
            for (var i = 0; i < propertiesList.length; i++) {
                var existInserver = false;
                for (var j = 0; j < data.length; j++) {

                    if (propertiesList[i].ID == data[j].ID) {
                        existInserver = true;
                    }

                }
                if (!existInserver) {
                    sendToServer(propertiesList[i]);
                }

            }

        }

        var compareToServer = function (propertiesList, serverList) {
            LoggingService.Logg(LoggingService.controllersEnum.Properties, "compareToServer  propertiesList" + JSON.stringify(propertiesList) + "   serverList: " + JSON.stringify(data));

            for (var i = 0; i < serverList.length; i++) {
                var existLocal = false;
                for (var j = 0; j < propertiesList.length; j++) {

                    if (serverList[i].ID == propertiesList[j].ID) {
                        existLocal = true;
                    }
                }
                if (!existLocal) {
                    LoggingService.Logg(LoggingService.controllersEnum.Properties, "property did not match any of the local objects "
                        + JSON.stringify(serverList[i]));

                    copyFromServer(serverList[i]);
                }

            }

        }

        this.TrySycWithServer = function () {

            $http.get('http://www.mesitikogateway.somee.com/api/Properties')
                     .success(function (data, status, headers, config) {
                         LoggingService.Logg(LoggingService.controllersEnum.Properties, "finished getting properties from server ");

                         offlineManager.restorePersistedProperties(function (propertiesList) {
                             compareToServer(propertiesList, data);

                         });

                     });




        }

    };

    var manager = new offlinePropertiesManager();
    var sync = new syncManager(manager);

    function onDeviceReady() {
        try {
            manager.onDeviceReady();
            manager.getproperties(function (propertiesList) { $scope.properties = propertiesList; });

            // $scope.properties = [{ Id: 10, Description: "fgsgd", Name: "ffhdfg" }];
        } catch (e) {
            LoggingService.LoggO(LoggingService.controllersEnum.Properties, "PropertiesCtrl onDeviceReady exception ", e);

        }


    }
    document.addEventListener("deviceready", onDeviceReady, false);

    $scope.doRefreshProperties = function () {
        sync.TrySycWithServer();

        $scope.$broadcast('scroll.refreshComplete');
        $scope.$apply();
    };
    $scope.AddNewPropertyCommand = function () {
        $state.go('tab.newproperty');

    };
})
.controller('PropertyDetailCtrl', function ($scope, $http, $state, _, $ionicPopup, $stateParams, $ionicModal,
    $ionicSlideBoxDelegate, PropertiesService, LoggingService) {

    $scope.property = PropertiesService.getPropertyById($stateParams.LocalID);
    LoggingService.LoggO(LoggingService.controllersEnum.Details, " details:" + $stateParams.LocalID, $scope.property);
    $scope.ProspectMeetingEvents = [
      { "id": "12", "text": "Test", "start": "2015-10-29T12:00:00", "end": "2015-10-30T16:30:00" }
    ];
    $ionicModal.fromTemplateUrl('meetingDetailsFinal.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (meetingDetailsFinal) {
        $scope.meetingDetailsFinal = meetingDetailsFinal;
    });
    $scope.meetingDetailsConfig = {
        viewType: "Day",
        onEventClick: function (a) {

            $scope.event = {};
            $scope.event.property = { FrontImagePath: "http://res.cloudinary.com/dm2qoxpig/image/upload/v1446062523/a2d136b1-12d9-7e4a-84fb-e898a5e52663.png" }
            $scope.event.Name = "John";
            $scope.event.LastName = "papanikolaou";
            $scope.meetingDetailsFinal.show();
            // showEventSelectionPopUp(a);

        }
    };

    var showEventSelectionPopUp = function (event) {
        $scope.showEventSelectionPopUpprospect = event;
        var alertPopup = $ionicPopup.alert({
            title: 'Details',
            template: "Name :" + "john papanikolaou"
        });
        alertPopup.then(function (res) {

        });


        //var eventSelectionPopUp = $ionicPopup.alert({
        //    template: '<button class="button button-icon icon ion-ios-telephone  >dshrt</button>',
        //    title: 'Details',
        //    subTitle: showEventSelectionPopUpprospect.text,
        //    scope: $scope,
        //    buttons: [
        //        { text: 'Cancel' },
        //        {
        //            text: '<b>Ok</b>',
        //            type: 'button-positive',
        //            onTap: function (e) {

        //            }
        //        }
        //    ]
        //});
    }
    var offlineImagesManager = function () {

        function guid() {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                  .toString(16)
                  .substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
              s4() + '-' + s4() + s4() + s4();
        }

        this.onDeviceReady = function () {
            db = window.sqlitePlugin.openDatabase("my.db");
        }
        this.getPersistedArray = function (propertyId, callback) {
            db.transaction(function (tx) {
                tx.executeSql('select SerializedObject from images where propertyId= ?', [propertyId], function (tx, res) {
                    LoggingService.Logg(LoggingService.controllersEnum.Details, "getPersistedArray- 'select SerializedObject from images where propertyId= " + propertyId + " finished :" + JSON.stringify(res));
                    callback(res);
                }, function (e) {
                    alert(e);
                });

            });
        };
        this.tryCreateDb = function () {
            db.executeSql("CREATE TABLE IF NOT EXISTS images (id integer primary key AUTOINCREMENT,propertyId integer, SerializedObject text)");
        };
        var persistCollectionInDb = function (propertyId, images) {

            db.transaction(function (tx) {
                for (var i = 0; i < images.length; i++) {
                    db.executeSql("INSERT INTO images (propertyId,SerializedObject) VALUES (?,?)", [propertyId, JSON.stringify(images[i])],
                       function (tx, res) {
                           LoggingService.Logg(LoggingService.controllersEnum.Details, "persistCollectionInDb inserted image:" + JSON.stringify(images[i]) + " with result" + JSON.stringify(res));
                       });
                }
            });
        }
        this.persistImageInDb = function (image) {

            db.transaction(function (tx) {
                db.executeSql("INSERT INTO images (SerializedObject) VALUES (?)", [JSON.stringify(image)],
                       function (tx, res) {
                           LoggingService.Logg("inserted " + JSON.stringify(res));
                       });
            });
        }

        this.restorePersistedCollection = function (propertyId, onFinished) {
            images = [];
            LoggingService.Logg(LoggingService.controllersEnum.Details, "restorePersistedCollection -images");
            this.getPersistedArray(propertyId, function (res) {
                var len = res.rows.length;
                for (var i = 0; i < len; i++) {
                    var image = JSON.parse(res.rows.item(i).SerializedObject);
                    // image.LocalID = guid();
                    images.push(image);
                }
                LoggingService.Logg(LoggingService.controllersEnum.Details, "restored images   : " + (JSON.stringify(images)));
                onFinished(images);
            });
        };
        this.getproperties = function (propertyId, propertiesProvider) {
            this.tryCreateDb();

            this.restorePersistedCollection(propertyId, function (___) {

                if (images.length <= 0) {
                    LoggingService.Logg("images.length <= 0  contacting server to fetch images ");

                    $http.get('http://www.mesitikogateway.somee.com/Properties/' + propertyId + '/350/400/Photos')
                        .success(function (data, status, headers, config) {
                            LoggingService.Logg(LoggingService.controllersEnum.Details, 'http://www.mesitikogateway.somee.com/Properties/' + propertyId + '/350/400/Photos');
                            LoggingService.Logg(LoggingService.controllersEnum.Details, "finished getting images from server for propertyId :" + propertyId, data);

                            persistCollectionInDb(propertyId, data);
                        });

                } else {
                    LoggingService.Logg(LoggingService.controllersEnum.Details, "images did not load from server  " + JSON.stringify(images));

                }
                propertiesProvider(images);
            });
        }

    }
    var db = null; var images = [];
    $ionicModal.fromTemplateUrl('map-modal.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (mapModal) {
        $scope.mapModal = mapModal;
    });
    $scope.CancelLocation = function () {
        $scope.mapModal.hide();
    };


    $ionicModal.fromTemplateUrl('prospectsAddition.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (prospectsAdditionmodal) {
        $scope.prospectsAdditionmodal = prospectsAdditionmodal;
    });

    $scope.prospectsAdditionmodalShow = function () {
        $scope.prospectsAdditionmodal.show();

    }

    $scope.searchCallLog = function () {
        $scope.propspect = {};
        $scope.callTypeDisplay = function (type) {
            switch (type) {
                case 1:
                    return 'Incoming';
                case 2:
                    return 'Outgoing';
                case 3:
                    return 'Missed';
                default:
                    return 'Unknown';
            }
        };

        $scope.propspect.lastCall = { number: "+30 6955970703" };

        //CallLogService.list(1).then(
        //    function (callLog) {
        //        console.log(callLog);
        //        $scope.propspect.lastCall = callLog[0];
        //    },
        //    function (error) {
        //        console.error(error);
        //    });
    }

    $scope.prospects = [
        { Name: "john ", Number: "+30 6955970703", Date: "12/10/2015 12:00", Id: 1, event: { "id": "12", "text": "john papanikolaou", "start": "2015-10-29T01:00:00", "end": "2015-10-30T10:30:00" } },
        { Name: "john ", Number: "+30 6955970703", Date: "12/10/2015 13:00", Id: 2, event: { "id": "12", "text": "john papanikolaou", "start": "2015-10-29T02:00:00", "end": "2015-10-30T11:30:00" } },
        { Name: "john ", Number: "+30 6955970703", Date: "12/10/2015 14:00", Id: 3, event: { "id": "12", "text": "john papanikolaou", "start": "2015-10-29T03:00:00", "end": "2015-10-30T09:30:00" } }];

    $scope.showLocation = function () {
        $scope.mapModal.show();
    }
    $scope.CallProspect = function (prospect) {
        window.plugins.CallNumber.callNumber(function () { }, function () { }, prospect.Number);
    };


    $scope.propertyAgendaModalShow = function () {
        $scope.SelectedEvent = _.map($scope.prospects, function (p) { return p.event; });
        $scope.SchedulingHeader = "Agenda";
        $scope.MeetingDetailsDisplayModal.show();
    }

    $ionicModal.fromTemplateUrl('meetingDetailsDisplay.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (meetingDetailsDisplayModal) {
        $scope.SchedulingHeader = "Details";
        $scope.MeetingDetailsDisplayModal = meetingDetailsDisplayModal;

    });
    $scope.DisplayMeeting = function (prospect) {
        $scope.SelectedEvent = [];
        $scope.SelectedEvent.push(prospect.event);
        $scope.MeetingDetailsDisplayModal.show();
    };
    $scope.ScheduleShowing = function (prospect) {
        $scope.SelectedEvent = [];
        $scope.MeetingDetailsDisplayModal.show();
    };
    var manager = new offlineImagesManager();

    function onDeviceReady() {
        try {
            manager.onDeviceReady();

        } catch (e) {
            LoggingService.LoggO(LoggingService.controllersEnum.Details, "PropertyDetailCtrl onDeviceReady exception ", e);

        }


    }
    document.addEventListener("deviceready", onDeviceReady, false);


    $ionicModal.fromTemplateUrl('prospects.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (prospectmodal) {
        $scope.prospectmodal = prospectmodal;
    });

    $scope.prospectmodalShow = function () {
        $scope.prospectmodal.show();
    }

    $scope.TrySyncProperty = function () {
        alert("trysyc");
    }

    $scope.openPublishProperty = function () {
        $state.go('tab.publish');
    }

    $scope.openImageModal = function () {

        var shouldRestoreImages = function () {
            var shouldRestoreImages = false;

            if ($scope.property.propertiesPhotos == null) shouldRestoreImages = true;
            else {
                if ($scope.property.propertiesPhotos.length <= 0) { shouldRestoreImages = true }
            }
            return shouldRestoreImages;
        };

        if (shouldRestoreImages()) {
            manager.getproperties($scope.property.ID, function (imageList) {

                LoggingService.LoggO(LoggingService.controllersEnum.Details, " Finaly images restored :", imageList);

                $scope.property.propertiesPhotos = imageList;
            });
        } else {
            LoggingService.LoggO(LoggingService.controllersEnum.Details,
                " openImageModal exisetd images $scope.property.propertiesPhotos :",
                $scope.property.propertiesPhotos);
        }

        $scope.imageModal.show();
        $ionicSlideBoxDelegate.update();
    };

    $ionicModal.fromTemplateUrl('image-modal.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (imageModal) {
        $scope.imageModal = imageModal;
    });


    $scope.closeModal = function () {
        $scope.imageModal.hide();
    };
    $scope.openModal = function () {
        $scope.imageModal.show();
    }
    $scope.closeModal = function () {
        $scope.imageModal.hide();
    };
    $scope.$on('$destroy', function () {
        $scope.imageModal.remove();
    });
    $scope.next = function () {
        $ionicSlideBoxDelegate.next();
    };
    $scope.previous = function () {
        $ionicSlideBoxDelegate.previous();
    };
    $scope.slideChanged = function (index) {
        $scope.slideIndex = index;
    };

})
.controller('NewPropertyCtrl', function ($scope, $state, $ionicModal, $ionicLoading, SettingsService,
    PropertiesService, LoggingService, $http) {

    $scope.init = function () {

    }
    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
              .toString(16)
              .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
          s4() + '-' + s4() + s4() + s4();
    }

    function convertImgToBase64(url, callback, outputFormat) {
        var img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function () {
            var canvas = document.createElement('CANVAS');
            var ctx = canvas.getContext('2d');
            canvas.height = this.height;
            canvas.width = this.width;
            ctx.drawImage(this, 0, 0);
            var dataURL = canvas.toDataURL(outputFormat || 'image/png');
            callback(dataURL);
            canvas = null;
        };
        img.src = url;
    }

    var gateWayAddress = "http://www.mesitikogateway.somee.com";
    //var gateWayAddress = "http://localhost:20009";

    //ionic.Platform.ready(function () {
    //     var myLatlng = new google.maps.LatLng(37.9978951, 23.7573485);
    //    var mapOptions = {
    //        center: myLatlng,
    //        zoom: 16,
    //        mapTypeId: google.maps.MapTypeId.ROADMAP
    //    };
    //    var map = new google.maps.Map(document.getElementById("map"), mapOptions);
    //    $scope.map = map;
    //});

    $scope.findLocation = function () {
        //   $state.go('tab.map');
        $scope.mapModal.show();
        //   $scope.getLocation();
    }
    $scope.getLocation = function () {
        navigator.geolocation.getCurrentPosition(function (pos) {
            $scope.map.setCenter(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
            var myLocation = new google.maps.Marker({
                position: new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude),
                map: $scope.map,
                title: "My Location"
            });
        });
    };
    $ionicModal.fromTemplateUrl('map-modal.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (mapModal) {
        $scope.mapModal = mapModal;
    });
    $scope.SelectLocation = function () {
        $scope.property.Location = { Adress: $scope.map.center };
    };
    $scope.CancelLocation = function () {
        $scope.mapModal.hide();
    };
    $scope.closeModal = function () {
        $scope.mapModal.hide();
    };
    $scope.$on('$destroy', function () {
        $scope.mapModal.remove();
    });

    $scope.addImageFromGallery = function () {
        window.imagePicker.getPictures(
        function (results) {
            for (var i = 0; i < results.length; i++) {
                var newImageFomGallery = {
                    ImageId: guid(),
                    ImageSrc: results[i],
                    PropertyId: 110000
                };

                convertImgToBase64(results[i], function (base64Img) {
                    newImageFomGallery.ImageData = base64Img;
                    $scope.images.push(newImageFomGallery);
                    $ionicLoading.hide();
                });
            }
        }, function (error) {

        }
    );
    };

    document.addEventListener("deviceready", function onDeviceReady() {
        LoggingService.Logg(LoggingService.controllersEnum.NewProperty, "NewPropertyCtrl onDeviceReady");
        try {
            db = window.sqlitePlugin.openDatabase("my.db");
        } catch (e) {
            window.atatus.notify(e);
        }


    }, false);

    $scope.stausInfo = "";
    $scope.images = [];
    $scope.property = { Name: "", Description: "" };
    $scope.addImage = function () {

        $scope.urlForImage = function (imageName) {
            var name = imageName.substr(imageName.lastIndexOf('/') + 1);
            var trueOrigin = cordova.file.dataDirectory + name;
            return trueOrigin;
        }

        function onSuccess(imageUri) {

            var newImage = {
                ImageId: guid(),
                ImageSrc: imageUri,
                PropertyId: 110000
            };

            convertImgToBase64(imageUri, function (base64Img) {
                newImage.ImageData = base64Img;
                $scope.images.push(newImage);
                $ionicLoading.hide();
            });

        }

        var options = {
            destinationType: Camera.DestinationType.DATA_URI,
            quality: SettingsService.settings.photoQuality,
            encodingType: Camera.EncodingType.JPEG,
            correctOrientation: true,
            targetWidth: SettingsService.settings.photoSize,
            targetHeight: SettingsService.settings.photoSize


        };

        $ionicLoading.show({
            template: '<p>Adding photo...</p><ion-spinner></ion-spinner>'
        });
        navigator.camera.getPicture(onSuccess, onFail, options);

        function onFail(message) {
            $ionicLoading.hide();

            alert('Failed because: ' + message);
        }
    }
    $scope.removeImage = function (image) {
        alert(image);
    }

    function isEmpty(str) {
        return (!str || 0 === str.length);
    }
    $scope.AddNewProperty = function () {
        if (isEmpty($scope.property.Name) && isEmpty($scope.property.Description)) {
            alert("property is empty");
            return;
        }
        $ionicLoading.show({
            template: '<p>sending data...</p><ion-spinner></ion-spinner>'
        });


        var persistPropertyInDb = function (property) {

            db.transaction(function (tx) {
                db.executeSql("INSERT INTO properties (PropertySerialized) VALUES (?)", [JSON.stringify(property)],
                   function (tx, res) {
                       LoggingService.Logg(LoggingService.controllersEnum.NewProperty, "inserted " + JSON.stringify(res));
                   });
            });
        }


        var tryAddProperty = function (onAdded) {
            if (navigator.connection.type != Connection.NONE) {
                LoggingService.Logg(LoggingService.controllersEnum.NewProperty, "tryAddProperty $cordovaNetwork.isOnline()" + navigator.connection.type);

                $http.post(gateWayAddress + '/PropertiesCreate',
                       {
                           'Name': $scope.property.Name,
                           'Description': $scope.property.Description,
                           'Photos': JSON.stringify($scope.images)
                       })
                       .success(function (data, status, headers, config) {

                           var newCreatedProperty = {
                               Description: $scope.property.Description,
                               Name: $scope.property.Name,
                               FrontImagePath: $scope.images[0].ImageSrc,
                               LocalID: guid(),
                               IsFromServer: false
                           };
                           LoggingService.LoggO(LoggingService.controllersEnum.NewProperty, "newCreatedProperty ", newCreatedProperty);
                           PropertiesService.addPropertyToList(newCreatedProperty);

                           $ionicLoading.hide();
                           onAdded();
                           window.plugins.toast.showWithOptions(
                              {
                                  message: "new property added",
                                  duration: "short",
                                  position: "bottom",
                                  addPixelsY: -40
                              });
                       })
                    .error(function (data, status, headers, config) {
                        $ionicLoading.hide();
                        console.log(data);
                    });
            } else {


                LoggingService.Logg(LoggingService.controllersEnum.NewProperty, "your network is disconnected. Property stored Localy");
                var newCreatedProperty = {
                    Description: $scope.property.Description,
                    Name: $scope.property.Name,
                    FrontImagePath: $scope.images[0].ImageSrc,
                    LocalID: guid(),
                    IsFromServer: false
                };
                LoggingService.LoggO(LoggingService.controllersEnum.NewProperty, "disconnected newCreatedProperty ", newCreatedProperty);

                persistPropertyInDb(newCreatedProperty);
                PropertiesService.addPropertyToList(newCreatedProperty);
                $ionicLoading.hide();
                onAdded();
            }

        }

        tryAddProperty(function () { $state.go('tab.properties'); });


    };
    $scope.CancelNewProperty = function () {
        $state.go("tab.properties");
    }

    $ionicModal.fromTemplateUrl('image-modal.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (imageModal) {
        $scope.imageModal = imageModal;
    });


    $scope.closeModal = function () {
        $scope.imageModal.hide();
    };

    $scope.openImageModal = function (image) {
        $scope.imageModal.show();
    }

    $scope.closeModal = function () {
        $scope.imageModal.hide();
    };

    $scope.$on('$destroy', function () {
        $scope.imageModal.remove();
    });
    // Call this functions if you need to manually control the slides
    $scope.next = function () {
        $ionicSlideBoxDelegate.next();
    };

    $scope.previous = function () {
        $ionicSlideBoxDelegate.previous();
    };

    // Called each time the slide changes
    $scope.slideChanged = function (index) {
        $scope.slideIndex = index;
    };
})
.controller('PublishCtrl', function ($scope, $state) {

    $scope.requestPuplishProperty = function () {
        $state.go('tab.properties');

    };

    $scope.publishers = [
    {
        Name: 'Web Site',
        ImageUri: "",
        IsSelectd: true,
    }, {
        Name: 'facebook Page',
        ImageUri: "",
        IsSelectd: true,
    }, {
        Name: '',
        ImageUri: "//img//xe_logo.png",
        IsSelectd: false,
    }, {
        Name: 'spitogatos.gr   ',
        ImageUri: "",
        IsSelectd: false,
    }];

})

.controller('AccountCtrl', function ($scope, SettingsService) {
    $scope.settings = SettingsService.settings;
})
.controller('MeetingsCtrl', function ($scope, $ionicModal, $http, MeetingsService) {
    $scope.events = [{
        "id": "12",
        "text": "new Showing",
        "start": "2015-10-30T12:00:00",
        "end": "2015-10-30T16:30:00"
    }];


    $ionicModal.fromTemplateUrl('meetingDetailsFinal.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (meetingDetailsFinal) {
        $scope.meetingDetailsFinal = meetingDetailsFinal;
    });


    $scope.weekConfig = {
        viewType: "Week",
        // onTimeRangeSelect: function (a) { alert(JSON.stringify(a)) },
        onEventClick: function (a) {
            $scope.meetingDetailsFinal.show();
            $scope.event = {};
            $scope.event.property = { FrontImagePath: "http://res.cloudinary.com/dm2qoxpig/image/upload/v1446062523/a2d136b1-12d9-7e4a-84fb-e898a5e52663.png" }
            $scope.event.Name = "John";
            $scope.event.LastName = "papanikolaou";

        }
    };

    //$http.get('http://www.mesitikogateway.somee.com/api/Meetings')
    //   .success(function (data, status, headers, config) {
    //       $scope.meetings = data;
    //       MeetingsService.setAllForUser(data);

    //   }).error(function (data, status, headers, config) {

    //       window.plugins.toast.showWithOptions(
    //         {
    //             message: "failure" + JSON.stringify(data),
    //             duration: "short",
    //             position: "bottom",
    //             addPixelsY: -40  // added a negative value to move it up a bit (default 0)
    //         }
    //       );
    //   });
})
.controller('MapCtrl', function ($scope, $http) {

    google.maps.event.addDomListener(window, 'load', function () {
        var myLatlng = new google.maps.LatLng(37.9978951, 23.7573485);
        var mapOptions = {
            center: myLatlng,
            zoom: 16,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        var map = new google.maps.Map(document.getElementById("map"), mapOptions);
        $scope.map = map;
    });

    $scope.findLocation = function () {
        $scope.mapModal.show();
        $scope.getLocation();
    }
    $scope.getLocation = function () {
        navigator.geolocation.getCurrentPosition(function (pos) {
            $scope.map.setCenter(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
            var myLocation = new google.maps.Marker({
                position: new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude),
                map: $scope.map,
                title: "My Location"
            });
        });
    };

    $scope.SelectLocation = function () {
        $scope.property.Location = { Adress: $scope.map.center };
    };


})


