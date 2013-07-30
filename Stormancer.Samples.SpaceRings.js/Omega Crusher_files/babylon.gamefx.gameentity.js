// Used to handle pseudo heritage 
// Approach used in TypeScript generated JS
var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var BABYLON;
(function (BABYLON) {
    (function (GameFX) {
        // The base class by all game entities
        var GameEntity = (function () {
            function GameEntity(name, url, fileName, position, gameWorld) {
                this._name = name;
                this._url = url;
                this._fileName = fileName;
                this._gameWorld = gameWorld;

                this._hasCollisions = false;
                this._descendantsCollision = false;

                this._position = position;
                this._live = 1;
                //Add World Entities
                this._gameWorld.entities.push(this);

            }
            GameEntity.prototype.setPosition = function (newPosition) {
                if (this._mesh) {
                    this._mesh.position = newPosition;
                }
            };
            GameEntity.prototype.setHasCollisions = function (hasCollision, descendantsCollision) {
                if (hasCollision === true) {
                    this._gameWorld.entitiesRegisterCollision.push(this);
                    this._descendantsCollision = descendantsCollision;
                }
                else {
                    var index = this._gameWorld.entitiesRegisterCollision.indexOf(this);
                    if (index !== -1)
                    {
                        this._gameWorld.entitiesRegisterCollision.splice(index, 1);
                    }
                }
                this._hasCollisions = hasCollision;
            };

            GameEntity.prototype.getGameWorld = function () {
                return this._gameWorld;
            };

            GameEntity.prototype.initialize = function (manual) {
            }

            //Return {value: true / false, tag: object} 
            GameEntity.prototype.intersectBehavior = function () {
                return { value: false, tag: null };
            }

            GameEntity.prototype.collisionBehavior = function (entity, tag) {
                entity.damageBehavior(this._live);
            }

            GameEntity.prototype.damageBehavior = function (live)
            {
                return live;
            }
           
            GameEntity.prototype.getPosition = function () {
                if (this._mesh) {
                    return (this._mesh.position);
                } else {
                    return BABYLON.Vector3.Zero();
                }
            };

            GameEntity.prototype.markForRemove = function() {
                var index = this._gameWorld.entities.indexOf(this);
                if (index !== -1) {
                    if (this._gameWorld.entities[index]._mesh != null)
                        this._gameWorld.entities[index]._mesh.dispose();
                    this._gameWorld.entities.splice(index, 1);
                }
                index = this._gameWorld.entitiesRegisterCollision.indexOf(this);
                if (index !== -1) {
                    this._gameWorld.entitiesRegisterCollision.splice(index, 1);
                }
            };

            return GameEntity;
        })();
        GameFX.GameEntity = GameEntity;
    })(BABYLON.GameFX || (BABYLON.GameFX = {}));
    var GameFX = BABYLON.GameFX;
})(BABYLON || (BABYLON = {}));
