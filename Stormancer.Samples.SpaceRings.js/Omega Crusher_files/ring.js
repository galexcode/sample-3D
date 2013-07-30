var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var SpaceRing;
(function (SpaceRing) {

    // MainShip extends BABYLON.GameFX.DisplayObj3D
    var Ring = (function (basedClass) {
        __extends(Ring, basedClass);

        function Ring(cloneable, gameWorld) {
            this.initialPosition = new BABYLON.Vector3(0, 0, 10);
            this.initialScaling = new BABYLON.Vector3(0.4, 0.1, 0.4);
            this.initialRotation = new BABYLON.Vector3(0, 0, (180 * Math.PI) / 180);
            this._deltaPosition = BABYLON.Vector3.Zero();
            this.deltaRotate = BABYLON.Vector3.Zero();
            // Calling based class constructor
            basedClass.call(this, "Gate", "/Scenes/Gate/", "Gate.babylon", this.initialPosition, this.initialRotation, this.initialScaling, cloneable, gameWorld);
            
        }


        Ring.prototype.loaded = function (meshes, particuleSystems) {
           
            
        };

        Ring.prototype.initialize = function (manual) {
          
        }
        
        Ring.prototype.collisionBehavior = function (entity, tag) {
            if (entity == mainShip) {
                var greenMat = new BABYLON.StandardMaterial("GreenMat", this._gameWorld.scene);
                greenMat.diffuseTexture = new BABYLON.Texture("/Scenes/Gate/GateDiffusOn.png", this._gameWorld.scene);
                greenMat.diffuseTexture.animations = this._mesh.material.diffuseTexture.animations;
                greenMat.diffuseTexture.hasAlpha = this._mesh.material.diffuseTexture.hasAlpha;
                greenMat.emissiveColor = this._mesh.material.emissiveColor;
                this._mesh.material = greenMat;
                this._gameWorld.scene.beginAnimation(greenMat.diffuseTexture, 0, 100, true);
            }
        };
        

        Ring.prototype._internalClone = function () {
            var clone = new Ring(false, this._gameWorld);
            clone.setHasCollisions(true);
            return clone
        };
        Ring.prototype.toString = function () {
            return "Ring";
        };
        
        Ring.prototype.tick = function () {
            if (this.isReady) {

                

            }
        };

        return Ring;
        })(BABYLON.GameFX.GameEntity3D);
    SpaceRing.Ring = Ring;
})(SpaceRing || (SpaceRing = {}));

