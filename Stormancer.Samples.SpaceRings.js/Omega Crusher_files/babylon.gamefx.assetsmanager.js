var BABYLON;
(function (BABYLON) {
    (function (GameFX) {
        var AssetsManager = (function () {
            var that;
            function AssetsManager(scene) {
                this._scene = scene;
                this._gameEntitiesCollection = [];
                that = this;
            }

            // called by gameEntity to indicate it has finished loading itself
            AssetsManager.markEntityAsLoaded = function (indexEntity) {

                that._gameEntitiesCollection[indexEntity].isLoaded = true;

                var countIsLoaded = 0;
                for (var i = 0; i < that._gameEntitiesCollection.length; i++) {
                    if (that._gameEntitiesCollection[i].isLoaded == true)
                    {
                        countIsLoaded++;
                    }
                }
                // If we've loaded all entities, we can now launch the game
                if (that._gameEntitiesCollection.length === countIsLoaded)
                {
                    that._scene.executeWhenReady(that._sceneReady);
                }
            }

            AssetsManager.prototype.loadAllEntitiesAsync = function (sceneReady) {
                this._sceneReady = sceneReady;
                for (var i = 0; i < this._gameEntitiesCollection.length; i++) {
                    this._gameEntitiesCollection[i].entity.loadMesh(that._scene, null, i);
                }
                
            };

            // Return a cloned version of a previously loaded entity
            AssetsManager.prototype.cloneLoadedEntity = function (typeEntity) {
                for (var i = 0; i < this._gameEntitiesCollection.length; i++) {
                    if (this._gameEntitiesCollection[i].type == typeEntity) {
                        return this._gameEntitiesCollection[i].entity.clone();
                    }
                }
            };

            AssetsManager.prototype.push = function (gameEntityToAdd) {
                this._gameEntitiesCollection.push({ type: gameEntityToAdd.toString(), entity: gameEntityToAdd, isLoaded: false });
            };

            return AssetsManager;
        })();
        GameFX.AssetsManager = AssetsManager;
    })(BABYLON.GameFX || (BABYLON.GameFX = {}));
    var GameFX = BABYLON.GameFX;
})(BABYLON || (BABYLON = {}));
