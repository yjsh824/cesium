defineSuite([
        'Scene/Vector3DTilePolylines',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/combine',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/Matrix4',
        'Core/Rectangle',
        'Scene/Cesium3DTileBatchTable',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        Vector3DTilePolylines,
        BoundingSphere,
        Cartesian3,
        Cartographic,
        combine,
        Ellipsoid,
        CesiumMath,
        Matrix4,
        Rectangle,
        Cesium3DTileBatchTable,
        createScene,
        pollToPromise) {
    'use strict';

    var scene;
    var rectangle;
    var polylines;

    var ellipsoid = Ellipsoid.WGS84;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    var mockTileset = {
        _statistics : {
            texturesByteLength : 0
        },
        _tileset : {
            _statistics : {
                batchTableByteLength : 0
            }
        }
    };

    beforeEach(function() {
        rectangle = Rectangle.fromDegrees(-40.0, -40.0, 40.0, 40.0);
    });

    afterEach(function() {
        scene.primitives.removeAll();
        polylines = polylines && !polylines.isDestroyed() && polylines.destroy();
    });

    function loadPolylines(polylines) {
        var ready = false;
        polylines.readyPromise.then(function() {
            ready = true;
        });
        return pollToPromise(function() {
            polylines.update(scene.frameState);
            scene.frameState.commandList.length = 0;
            return ready;
        });
    }

    function zigZag(value) {
        return ((value << 1) ^ (value >> 15)) & 0xFFFF;
    }

    var maxShort = 32767;

    function encodePositions(rectangle, minimumHeight, maximumHeight, positions) {
        var length = positions.length;
        var buffer = new Uint16Array(length * 3);

        var lastU = 0;
        var lastV = 0;
        var lastH = 0;

        for (var i = 0; i < length; ++i) {
            var position = positions[i];

            var u = (position.longitude - rectangle.west) / rectangle.width;
            var v = (position.latitude - rectangle.south) / rectangle.height;
            var h = (position.height - minimumHeight) / (maximumHeight - minimumHeight);

            u = CesiumMath.clamp(u, 0.0, 1.0);
            v = CesiumMath.clamp(v, 0.0, 1.0);
            h = CesiumMath.clamp(h, 0.0, 1.0);

            u = Math.floor(u * maxShort);
            v = Math.floor(v * maxShort);
            h = Math.floor(h * maxShort);

            buffer[i] = zigZag(u - lastU);
            buffer[i + length] = zigZag(v - lastV);
            buffer[i + length * 2] = zigZag(h - lastH);

            lastU = u;
            lastV = v;
            lastH = h;
        }

        return buffer;
    }

    it('renders a polyline', function() {
        var minHeight = 0.0;
        var maxHeight = 5.0;
        var cartoPositions = [Cartographic.fromDegrees(0.0, 0.0, 1.0),
                              Cartographic.fromDegrees(1.0, 0.0, 2.0)];
        var positions = encodePositions(rectangle, minHeight, maxHeight, cartoPositions);

        var batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
        batchTable.update(mockTileset, scene.frameState);

        var center = ellipsoid.cartographicToCartesian(Rectangle.center(rectangle));

        polylines = scene.primitives.add(new Vector3DTilePolylines({
            positions : positions,
            widths : new Uint16Array([10]),
            counts : new Uint32Array([2]),
            batchIds : new Uint16Array([0]),
            rectangle : rectangle,
            minimumHeight : minHeight,
            maximumHeight : maxHeight,
            center : center,
            boundingVolume : new BoundingSphere(center, 1000000.0),
            batchTable : batchTable
        }));
        return loadPolylines(polylines).then(function() {
            scene.camera.lookAt(Cartesian3.fromDegrees(0.5, 0.0, 1.5), new Cartesian3(0.0, 0.0, 1.0));
            expect(scene).toRender([255, 255, 255, 255]);
        });
    });

    it('renders multiple polylines', function() {
        var minHeight = 0.0;
        var maxHeight = 100.0;
        var cartoPositions = [Cartographic.fromDegrees(1.0, 0.0, 1.0),
                              Cartographic.fromDegrees(2.0, 0.0, 2.0),
                              Cartographic.fromDegrees(-6.0, 0.0, 12.0),
                              Cartographic.fromDegrees(-5.0, 0.0, 15.0),
                              Cartographic.fromDegrees(0.0, 10.0, 0.0),
                              Cartographic.fromDegrees(0.0, 5.0, 5.0),
                              Cartographic.fromDegrees(0.0, 0.0, 10.0),
                              Cartographic.fromDegrees(0.0, -5.0, 15.0)];
        var positions = encodePositions(rectangle, minHeight, maxHeight, cartoPositions);

        var batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
        batchTable.update(mockTileset, scene.frameState);

        var center = ellipsoid.cartographicToCartesian(Rectangle.center(rectangle));

        polylines = scene.primitives.add(new Vector3DTilePolylines({
            positions : positions,
            widths : new Uint16Array([10, 10, 10]),
            counts : new Uint32Array([2, 2, 4]),
            batchIds : new Uint16Array([0, 1, 2]),
            rectangle : rectangle,
            minimumHeight : minHeight,
            maximumHeight : maxHeight,
            center : center,
            boundingVolume : new BoundingSphere(center, 1000000.0),
            batchTable : batchTable
        }));
        return loadPolylines(polylines).then(function() {
            for (var i = 0; i < cartoPositions.length; i += 2) {
                var p1 = cartoPositions[i];
                var p2 = cartoPositions[i + 1];

                var longitude = CesiumMath.lerp(p1.longitude, p2.longitude, 0.5);
                var latitude = CesiumMath.lerp(p1.latitude, p2.latitude, 0.5);
                var height = CesiumMath.lerp(p1.height, p2.height, 0.5);
                var target = Cartesian3.fromRadians(longitude, latitude, height);
                scene.camera.lookAt(target, new Cartesian3(0.0, 0.0, 1.0));
                expect(scene).toRender([255, 255, 255, 255]);
            }
        });
    });

    it('picks a polyline', function() {
        var minHeight = 0.0;
        var maxHeight = 5.0;
        var cartoPositions = [Cartographic.fromDegrees(0.0, 0.0, 1.0),
                              Cartographic.fromDegrees(1.0, 0.0, 2.0)];
        var positions = encodePositions(rectangle, minHeight, maxHeight, cartoPositions);

        var batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
        batchTable.update(mockTileset, scene.frameState);

        var center = ellipsoid.cartographicToCartesian(Rectangle.center(rectangle));

        polylines = scene.primitives.add(new Vector3DTilePolylines({
            positions : positions,
            widths : new Uint16Array([10]),
            counts : new Uint32Array([2]),
            batchIds : new Uint16Array([0]),
            rectangle : rectangle,
            minimumHeight : minHeight,
            maximumHeight : maxHeight,
            center : center,
            boundingVolume : new BoundingSphere(center, 1000000.0),
            batchTable : batchTable
        }));
        return loadPolylines(polylines).then(function() {
            scene.camera.lookAt(Cartesian3.fromDegrees(0.5, 0.0, 1.5), new Cartesian3(0.0, 0.0, 1.0));

            var features = [];
            polylines.createFeatures(mockTileset, features);
            mockTileset.getFeature = function(index) {
                return features[index];
            };

            scene.frameState.passes.pick = true;
            batchTable.update(mockTileset, scene.frameState);
            expect(scene).toPickAndCall(function (result) {
                expect(result).toBe(features[0]);
            });

            mockTileset.getFeature = undefined;
        });
    });

    it('isDestroyed', function() {
        polylines = new Vector3DTilePolylines({});
        expect(polylines.isDestroyed()).toEqual(false);
        polylines.destroy();
        expect(polylines.isDestroyed()).toEqual(true);
    });

}, 'WebGL');
