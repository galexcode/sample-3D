var BABYLON;
(function (BABYLON) {
    (function (GameFX) {
        var GameWorld = (function () {
            var that;

            function GameWorld(canvasId) {
                this.canvas = document.getElementById(canvasId);
                this.engine = new BABYLON.Engine(this.canvas, true);
                this.scene = new BABYLON.Scene(this.engine);
                this.camera = new BABYLON.FreeCamera("Camera", new BABYLON.Vector3(0, 0, -30), this.scene);
                this.scene.activeCamera = this.camera;
                this.light = new BABYLON.PointLight("Omni", new BABYLON.Vector3(0, 0, 0), this.scene);
                this.assetsManager = new BABYLON.GameFX.AssetsManager(this.scene);
                this.dashboard = new BABYLON.GameFX.Dashboard();

                // All Entities Collection
                this.entities = [];
                // Entities on which we'd like to test collisions
                this.entitiesRegisterCollision = [];
                
                // Camera used to automatically follow an entity
                this._entityToFollow = null;
                this._deltaCameraEntityToFollow = null;

                that = this;
                BABYLON.Tools.QueueNewFrame(function () { that.renderLoop(); });
            }
            
            GameWorld.prototype.getEntityWithMesh = function(mesh) {
                for (var i = 0; i < this.entities.length; i++) {
                    if (this.entities[i]._ == mesh) {
                        return this.entities[i];
                    }
                }
                return null;
            }

            GameWorld.prototype.renderLoop = function () {
                this.engine.beginFrame();
                this.scene.render();
                this.engine.endFrame();
                BABYLON.Tools.QueueNewFrame(function () { that.renderLoop(); });
            };
          
            GameWorld.prototype.setCameraToFollowEntity = function (entity, delta) {
                this._entityToFollow = entity;
                this._deltaCameraEntityToFollow = delta;

            };

            GameWorld.prototype.setCameraPosition = function (newCameraPosition) {
                this.camera.position = newCameraPosition;
            };

            GameWorld.prototype.addKeyboard = function () {
                this.Keyboard = new BABYLON.GameFX.KeyboardManager();
                return this.Keyboard;
            };

            GameWorld.prototype.addLeftJoystick = function () {
                this.LeftJoystick = new BABYLON.GameFX.VirtualJoystick(true);
                return this.LeftJoystick;
            };

            GameWorld.prototype.addRightJoystick = function () {
                this.RightJoystick = new BABYLON.GameFX.VirtualJoystick(false);
                return this.RightJoystick;
            };

            // Add a callback function if you'd like to add your own logic on each tick
            GameWorld.prototype.startGameLoop = function (callback) {
                this.scene.beforeRender = function () {
                    if (that.Keyboard) that.Keyboard.tick();
                    if (that.LeftJoystick) that.LeftJoystick.tick();
                    if (that.RightJoystick) that.RightJoystick.tick();
                    that.triggerTicksOnAllEntities();
                    that.collisionLoop();
                    if (callback) callback();
                    
                    //if cameraFollowEntity
                    if (that._entityToFollow != null) {
                        var entityTransform = BABYLON.Matrix.RotationYawPitchRoll(that._entityToFollow._mesh.rotation.y,
                                                                                  that._entityToFollow._mesh.rotation.x,
                                                                                  that._entityToFollow._mesh.rotation.z);
                        var cameraDirection = BABYLON.Vector3.TransformCoordinates(that._deltaCameraEntityToFollow, entityTransform);

                        that.camera.position = that._entityToFollow._mesh.position.add(cameraDirection);
                        that.camera.setTarget(that._entityToFollow._mesh.position);
                    }

                };
            };

            GameWorld.prototype.triggerTicksOnAllEntities = function () {
                for (var i = 0; i < this.entities.length; i++) {
                    if (this.entities[i].tick) {
                        this.entities[i].tick();
                    }
                }
            };

            GameWorld.prototype.collisionLoop = function () {
                var behaviorsCollection = [];

                // First loop is testing all possibles collisions
                // and build a behaviors collisions collections to be called after that
                for (var i = 0; i < this.entitiesRegisterCollision.length; i++) {
                    for (var j = 0; j < this.entities.length; j++) {
                        if ((this.entities[j]._hasCollisions) && (this.entities[j] != this.entitiesRegisterCollision[i])) {
                            // Pure intersection on 3D Meshes
                            if (this.entitiesRegisterCollision[i]._mesh.intersectsMesh(this.entities[j]._mesh, false)) {
                                behaviorsCollection.push({ registeredEntity: this.entitiesRegisterCollision[i], targetEntity: this.entities[j] });
                            }
                            
                            // Extends 3D collision with a custom behavior (used for particules emitted for instance) 
                            if (this.entitiesRegisterCollision[i]._descendantsCollision) {
                                var descendants = this.entitiesRegisterCollision[i]._mesh.getDescendants();
                                for (var k = 0; k < descendants.length; k++) {
                                    if (descendants[k].intersectsMesh(this.entities[j]._mesh, false)) {
                                        behaviorsCollection.push({ registeredEntity: this.entitiesRegisterCollision[i], targetEntity: this.entities[j], descendants: descendants[k] });
                                    }
                                }
                            }

                            //Intersects Behaviors
                            var intersectBehavior = this.entitiesRegisterCollision[i].intersectBehavior(this.entities[j]);
                            if(intersectBehavior.value){
                                behaviorsCollection.push({ registeredEntity: this.entitiesRegisterCollision[i], targetEntity: this.entities[j], tag: intersectBehavior.tag });
                            }
                        }
                    }
                }

                // Asking to each entity to apply its collision behavior
                for (var k = 0; k < behaviorsCollection.length; k++) {
                    if ((behaviorsCollection[k].registeredEntity) != null)
                        behaviorsCollection[k].registeredEntity.collisionBehavior(behaviorsCollection[k].targetEntity, behaviorsCollection[k]);
                    if ((behaviorsCollection[k].targetEntity) != null)
                        behaviorsCollection[k].targetEntity.collisionBehavior(behaviorsCollection[k].registeredEntity, behaviorsCollection[k]);
                }

                behaviorsCollection = [];
            };

            GameWorld.prototype.getRay3D = function (x, y) {
                return this.scene.createPickingRay(x, y);
            };

            // If you need to know the max X & Y where your 3D mesh will be visible on screen
            // Use this function passing the current Z level where you entity lives
            // It's useful when you need to "think" in a 2D equivalent
            GameWorld.prototype.getVirtual2DWindowOnZ = function (z) {
                // Getting virtual left top border 
                var rayTop = this.getRay3D(0, 0);
                var rayBottom = this.getRay3D(this.scene.getEngine().getRenderWidth(), this.scene.getEngine().getRenderHeight());

                var top = rayTop.origin.add(rayTop.direction.scale(z));
                var bottom = rayBottom.origin.add(rayBottom.direction.scale(z));

                return { top: top, bottom: bottom };
            };

            return GameWorld;
        })();
        GameFX.GameWorld = GameWorld;
  
    })(BABYLON.GameFX || (BABYLON.GameFX = {}));
    var GameFX = BABYLON.GameFX;
})(BABYLON || (BABYLON = {}));