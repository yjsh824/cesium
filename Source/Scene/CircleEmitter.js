/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defineProperties',
        '../Core/Cartesian3',
        '../Core/Check',
        '../Core/Math',
        './Particle'
    ], function(
        defaultValue,
        defineProperties,
        Cartesian3,
        Check,
        CesiumMath,
        Particle) {
    "use strict";

    /**
     * A ParticleEmitter that emits particles from a circle.
     * Particles will be positioned within a circle and have initial velocities going along the z vector.
     * @constructor
     *
     * @param {Number} [radius=1.0] The radius of the circle in meters.
     */
    function CircleEmitter(radius) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.greaterThan('radius', radius, 0.0);
        //>>includeEnd('debug');
        this._radius = defaultValue(radius, 1.0);
    }

    defineProperties(CircleEmitter.prototype, {
        /**
         * The radius of the circle in meters.
         * @memberof CircleEmitter.prototype
         * @type {Number}
         * @default 1.0
         */
        radius : {
            get : function() {
                return this._radius;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThan('value', value, 0.0);
                //>>includeEnd('debug');
                this._radius = value;
            }
        }
    });

    /**
     * Initializes the given {@link Particle} by setting it's position and velocity.
     *
     * @private
     * @param {Particle} particle The particle to initialize.
     */
    CircleEmitter.prototype.emit = function(particle) {
        var theta = CesiumMath.randomBetween(0.0, CesiumMath.TWO_PI);
        var rad = CesiumMath.randomBetween(0.0, this._radius);

        var x = rad * Math.cos(theta);
        var y = rad * Math.sin(theta);
        var z = 0.0;

        particle.position = Cartesian3.fromElements(x, y, z, particle.position);
        particle.velocity = Cartesian3.clone(Cartesian3.UNIT_Z, particle.velocity);
    };

    return CircleEmitter;
});