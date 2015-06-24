angular.module('magna-app')

.directive('ol3Map', ['magnaConfig',
  function(magnaConfig) {
    return {
      restrict: 'A',
      scope: {
          staticMap: '@',
          styles: '=',
          settings: '=ol3Map'
      },
      link: {
        pre: function(scope) {
          scope.staticMap = scope.staticMap === 'true' ? true : false;
          // intialize with default values
          scope.zoomControl = !scope.staticMap;
          scope.olControls = scope.staticMap ? [] : ol.control.defaults();
          scope.olInteractions = scope.staticMap ? [] : ol.interaction.defaults();

          scope.olMap = undefined;

          scope.params = {
            LAYERS: magnaConfig.mapnikLayers,
            TRANSPARENT: false,
            VERSION: '1.1.1',
            mml: magnaConfig.mml,
            mss: scope.styles.join(','),
            t: Date.now()
          };

          // init ol3 source
          scope.olSource = new ol.source.ImageWMS({
            url: magnaConfig.mapnikUrl,
            ratio: 1,
            params: scope.params
          });

          scope.updateSource = function() {
            scope.params.mss = scope.styles.join(',');
            scope.params.t = Date.now();
            scope.olSource.updateParams(scope.params);
          };
        },
        post: function(scope, element) {
          // init map
          scope.olMap = new ol.Map({
            target: element[0],
            layers: [new ol.layer.Image({
              source: scope.olSource
            })],
            interactions: scope.olInteractions,
            controls: scope.olControls,
            logo: false,
            view: new ol.View({
              center: ol.proj.transform(scope.settings.coords, 'EPSG:4326', 'EPSG:3857'),
              zoom: scope.settings.zoom
            })
          });

          // update zoom and coords after map move ends
          scope.olMap.on('moveend', function() {
            var center = scope.olMap.getView().getCenter();
            center = ol.proj.transform(center, 'EPSG:3857', 'EPSG:4326');
            scope.$apply(function() {
              scope.settings.coords = center;
              scope.settings.zoom = scope.olMap.getView().getZoom();
            });
          });

          // remove openlayers map
          scope.$on('$destroy', function () {
            scope.olMap.setTarget(null);
            scope.olMap = null;
          });

          // TODO: Find a solition to update map after loading dashboard
          scope.$on('gridUpdate', function () {
            scope.olMap.updateSize();
          });

          // update source on style list changes
          scope.$watch('styles', function() {
            scope.updateSource();
          }, true);

          // update source on style content changes
          scope.$on('socketUpdateImage', function () {
            scope.updateSource();
          });
        }
      }
    };
}]);
