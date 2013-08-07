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
            //basedClass.call(this, "Gate", "/Scenes/Gate/", "Gate.babylon", this.initialPosition, this.initialRotation, this.initialScaling, cloneable, gameWorld);
            
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

        //Ship.prototype._targetPosition;
        //Ship.prototype._targetRotation;
        //Ship.prototype._lastTargetPositionSet;
        //Ship.prototype._lastTargetRotationSet;
        //Ship.prototype._previousPosition;
        //Ship.prototype._previousRotation;

        Ship.prototype.targetPosition = function (position) {
            if (this._previousPosition === undefined) {
                this._previousPosition = position;
            }
            else {
                this._previousPosition = this.getPosition();
            }
            
            this._targetPosition = position;
            this._lastTargetPositionSet = new Date().getTime();
        };

        Ship.prototype.targetRotation = function (rotation) {
            if (this._previousRotation === undefined) {
                this._previousRotation = rotation;
            }
            else {
                this._previousRotation = this.getRotation();
            }
            this._targetRotation = rotation;
            this._lastTargetRotationSet = new Date().getTime();
        };

        function computePosition(ship, now) {
            if (ship._targetPosition != undefined) {
                var computedPosition;
                if (now > (ship._lastTargetPositionSet + UpdateIntervals)) {
                    computedPosition = ship._targetPosition;
                }
                else {
                    computedPosition = BABYLON.Vector3.Lerp(ship._previousPosition, ship._targetPosition, (now - ship._lastTargetPositionSet) / UpdateIntervals);
                }

                ship.setPosition(computedPosition);
            }
        }

        function computeRotation(ship, now) {
            if (ship._targetRotation != undefined) {
                var computedRotation;
                if (now > (ship._lastTargetRotationSet + UpdateIntervals)) {
                    computedRotation = ship._targetRotation;
                }
                else {
                    computedRotation = BABYLON.Vector3.Lerp(ship._previousRotation, ship._targetRotation, (now - ship._lastTargetRotationSet) / UpdateIntervals);
                }

                ship.setRotation(computedRotation);
            }
        }

        Ship.prototype.tick = function () {
            if (this.isReady) {
                var now = new Date().getTime();
                computePosition(this, now);
                computeRotation(this, now);
            }
        };

        return Ship;
    })(BABYLON.GameFX.GameEntity3D);
    SpaceRing.Ship = Ship;
})(SpaceRing || (SpaceRing = {}));

