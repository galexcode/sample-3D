var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var SpaceRing;
(function (SpaceRing) {

    // Ship extends BABYLON.GameFX.DisplayObj3D
    var Ship = (function (basedClass) {
        __extends(Ship, basedClass);

        function Ship(cloneable, gameWorld) {
            this.initialPosition = new BABYLON.Vector3(0, 0, 40);
            this.initialScaling = new BABYLON.Vector3(0.005, 0.005, 0.005);
            this.initialRotation = new BABYLON.Vector3(0, 0, 0);
            this._deltaPosition = BABYLON.Vector3.Zero();
            this.deltaRotate = BABYLON.Vector3.Zero();
            // Calling based class constructor
            basedClass.call(this, "p2_wedge_geo", "/Scenes/Spaceship/", "Spaceship.babylon", this.initialPosition, this.initialRotation, this.initialScaling, cloneable, gameWorld);

        }


        Ship.prototype.loaded = function (meshes, particuleSystems) {


        };

        Ship.prototype.initialize = function (manual) {

        }

        Ship.prototype.collisionBehavior = function (entity, tag) {
        };


        Ship.prototype._internalClone = function () {
            var clone = new Ship(false, this._gameWorld);            
            return clone
        };
        Ship.prototype.toString = function () {
            return "Ship";
        };

        Ship.prototype.tick = function () {
            if (this.isReady) {



            }
        };

        return Ship;
    })(BABYLON.GameFX.GameEntity3D);
    SpaceRing.Ship = Ship;
})(SpaceRing || (SpaceRing = {}));

