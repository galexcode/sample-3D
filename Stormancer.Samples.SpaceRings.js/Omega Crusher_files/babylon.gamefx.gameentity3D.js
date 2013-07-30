var BABYLON;
(function (BABYLON) {
    (function (GameFX) {
        var GameEntity3D = (function (_super) {
            __extends(GameEntity3D, _super);
            function GameEntity3D(name, url, fileName, position, rotation, scaling, cloneable, gameWorld) {
                // Call the based constructor (GameEntity here)
                _super.call(this, name, url, fileName, position, gameWorld);
                if (cloneable) {
                    this._cloneable = cloneable;
                } else {
                    this._cloneable = false;
                }
                this._rotation = rotation;
                this._scaling = scaling;
                this._entityDirection = BABYLON.Vector3.Zero();
            }
            GameEntity3D.prototype.setRotation = function (newRotation) {
                this._mesh.rotation = newRotation;
            };
            GameEntity3D.prototype.getRotation = function () {
                return (this._mesh.rotation);
            };
            GameEntity3D.prototype.setScaling = function (newScaling) {
                this._mesh.scaling = newScaling;
            };
            GameEntity3D.prototype.getScaling = function () {
                return (this._mesh.scaling);
            };
            GameEntity3D.prototype.loaded = function (meshes, particleSystems) {
            };

            GameEntity3D.prototype.onDispose = function (thatEntity) {
            };
            GameEntity3D.prototype.moveOnAxisRelativeToMesh = function (moveVector) {
                var entityTransform = BABYLON.Matrix.RotationYawPitchRoll(this._mesh.rotation.y, this._mesh.rotation.x, this._mesh.rotation.z);
                this._entityDirection = BABYLON.Vector3.TransformCoordinates(moveVector, entityTransform);
                this._mesh.position = this._mesh.position.add(this._entityDirection);
            };
            GameEntity3D.prototype.loadMesh = function (scene, callback, indexEntity) {
                var that = this;
                BABYLON.SceneLoader.ImportMesh(this._name, this._url, this._fileName, scene, function(meshes, particleSystems) {
                    that._mesh = meshes[0];
                    that._mesh.scaling = that._scaling;
                    if (that._position)
                        that._mesh.position = that._position;
                    that._mesh.rotation = that._rotation;
                    that._mesh.onDispose = that.onDispose;
                    // if this object will be the based on multiple instance
                    // the main reference won't be enabled. It will only be used to build
                    // clone objects
                    if (that._cloneable)
                        that._mesh.setEnabled(false);

                    for (var index = 0; index < particleSystems.length; index++) {
                        particleSystems[index].minSize *= 0.05;
                        particleSystems[index].maxSize *= 0.05;
                    }
                    that.isReady = true;
                    that.loaded(meshes, particleSystems);
                    that.initialize(false);
                    if (callback)
                        callback(that._mesh, particleSystems);

                    if (indexEntity != undefined) {
                        BABYLON.GameFX.AssetsManager.markEntityAsLoaded(indexEntity);
                    }

                }, that._gameWorld.dashboard.loading);
            };

            GameEntity3D.prototype._internalClone = function () {
                return new GameEntity3D(this._name, this._url, this._fileName, this._position.clone(), this._rotation.clone(), this._scaling.clone(), false, this._gameWorld);
            };
            GameEntity3D.prototype.clone = function () {
                var clonedObject = this._internalClone();
                clonedObject.isReady = true;
                clonedObject._mesh = this._mesh.clone();
                clonedObject._mesh.onDispose = this.onDispose;
                clonedObject._mesh.setEnabled(true);
                clonedObject.initialize(false);
                return clonedObject;
            };
            return GameEntity3D;
        })(BABYLON.GameFX.GameEntity);
        GameFX.GameEntity3D = GameEntity3D;
    })(BABYLON.GameFX || (BABYLON.GameFX = {}));
    var GameFX = BABYLON.GameFX;
})(BABYLON || (BABYLON = {}));
