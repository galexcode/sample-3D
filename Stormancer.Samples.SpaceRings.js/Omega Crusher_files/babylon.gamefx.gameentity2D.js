var BABYLON;
(function (BABYLON) {
    (function (GameFX) {
        var GameEntity2D = (function (_super) {
            __extends(GameEntity2D, _super);
            function GameEntity2D(name, url, fileName, position, angle, size, gameWorld) {
                _super.call(this, name, url, fileName, position, gameWorld);
                this._angle = angle;
                this._size = size;
            }
            // Code à fixer? gerer un angle en degree sur la propriété y de la rotation
            GameEntity2D.prototype.getAngle = function (newAngle) {
                this._mesh.rotation.z = newAngle;
            };
            GameEntity2D.prototype.setAngle = function () {
                return (this._mesh.rotation.z);
            };
            GameEntity2D.prototype.setSize = function (newSize) {
                this._mesh.scaling.x = newSize;
                this._mesh.scaling.y = newSize;
                this._mesh.scaling.z = newSize;
            };
            GameEntity2D.prototype.getSize = function () {
                return (this._mesh.scaling.x);
            };
            return GameEntity2D;
        })(BABYLON.GameFX.GameEntity);
        GameFX.GameEntity2D = GameEntity2D;
    })(BABYLON.GameFX || (BABYLON.GameFX = {}));
    var GameFX = BABYLON.GameFX;
})(BABYLON || (BABYLON = {}));
