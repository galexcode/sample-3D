var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var SpaceRing;
(function (SpaceRing) {
    // MainShip extends BABYLON.GameFX.DisplayObj3D
    var MainShip = (function (basedClass) {
        __extends(MainShip, basedClass);

        function MainShip(cloneable, gameWorld) {
            this.initialPosition = new BABYLON.Vector3(0, 0, 40);
            this.initialScaling = new BABYLON.Vector3(0.005, 0.005, 0.005);
            this.initialRotation = new BABYLON.Vector3(0, 0, 0);
            this._deltaPosition = BABYLON.Vector3.Zero();
            this.deltaRotate = BABYLON.Vector3.Zero();
            // Calling based class constructor
            basedClass.call(this, "p2_wedge_geo", "/Scenes/Spaceship/", "Spaceship.babylon", this.initialPosition, this.initialRotation, this.initialScaling, cloneable, gameWorld);
            this.setHasCollisions(true, true);
        }


        MainShip.prototype.loaded = function (meshes, particuleSystems) {
           
            
        };

        MainShip.prototype.initialize = function (manual) {
          
        }

        MainShip.prototype._internalClone = function () {
            return new MainShip(this.getPosition(), this.getScaling(), this.getRotation(), false, this._gameWorld);
        };
        MainShip.prototype.toString = function () {
            return "MainShip";
        };
        
        MainShip.prototype.tick = function () {
            if (this.isReady) {
                //Check Box
                var pos = this.getPosition();
                pos.x = Math.max(pos.x, -500);
                pos.x = Math.min(pos.x, 500);
                pos.y = Math.max(pos.y, -40);
                pos.y = Math.min(pos.y, 100);
                pos.z = Math.max(pos.z, -500);
                pos.z = Math.min(pos.z, 500);

                this._mesh.position = pos;
            }
            
            //Angle to 0
            if (waitStability <= 0) {
                if (Math.round(angleShip*10)/10 != 0) {
                    if (angleShip > 0)
                        angleShip -= tick;
                    else
                        angleShip += tick;

                    this._mesh.rotation.z = angleShip;
                }
            } else {
                waitStability--;
            }

        };
        var tick = 0.05;
        
        var maxTurnAngle = 1; var angleShip = 0;
        var waitStability = 10;
        MainShip.prototype.turnAnim = function (dir) {
            if (dir == "left") {
                if (Math.abs(angleShip - tick) < maxTurnAngle)
                    angleShip -= tick;
                
                waitStability = 10;
            }

            if (dir == "right") {
                if (Math.abs(angleShip + tick) < maxTurnAngle)
                    angleShip += tick;
                
                waitStability = 10;
            }

            this._mesh.rotation.z = angleShip;
        }

        return MainShip;
        })(BABYLON.GameFX.GameEntity3D);
    SpaceRing.MainShip = MainShip;
})(SpaceRing || (SpaceRing = {}));

