var BABYLON;
(function (BABYLON) {
    (function (GameFX) {
        var KeyboardManager = (function () {
            function KeyboardManager() {
                // There's 2 ways to move the entity binded to the keyboard:
                // 1 - By default: moving on the X,Y,Z axis of the world
                // 2 - If set to true: moving on the X,Y,Z axis of the Mesh
                // In the second option, we're computing the direction vector for you
                this._rotateOnAxisRelativeToMesh = false;
                // Default keyboard mapping is set to
                // the left, right, up, down arrow keys
                this._leftKeyCode = 37;
                this._rightKeyCode = 39;
                this._upKeyCode = 38;
                this._downKeyCode = 40;
                this._deltaValue = 0.1;
                var that = this;
                this._keys = [];
                // Used to compute inertia to apply to the entity
                this._deltaVector = BABYLON.Vector3.Zero();
                // By default left & right arrow keys are moving the X
                // and up & down keys are moving the Y
                this._axisTargetedByLeftAndRight = "X";
                this._axisTargetedByUpAndDown = "Y";
                this._deltaValueLeftAndRight = 0;
                this._deltaValueUpAndDown = 0;
                this.reverseLeftRight = false;
                this.reverseUpDown = false;
                this._rotationSpeed = 25;
                this._inverseRotationSpeed = 1 / (this._rotationSpeed / 1000);
                //this._transform = new BABYLON.Vector3(0,0,0);

                // Default handlers to arrow keys will target X & Y coordinates
                this._handleLeftKey = function () {
                    if (this.reverseLeftRight)
                        this._deltaValueLeftAndRight += this._deltaValue;
                    else
                        this._deltaValueLeftAndRight -= this._deltaValue;

                };
                this._handleRightKey = function () {
                    if (this.reverseLeftRight)
                        this._deltaValueLeftAndRight -= this._deltaValue;
                    else
                        this._deltaValueLeftAndRight += this._deltaValue;

                };
                this._handleUpKey = function () {
                    if (this.reverseUpDown)
                        this._deltaValueUpAndDown -= this._deltaValue;
                    else
                        this._deltaValueUpAndDown += this._deltaValue;

                };
                this._handleDownKey = function () {
                    if (this.reverseUpDown)
                        this._deltaValueUpAndDown += this._deltaValue;
                    else
                        this._deltaValueUpAndDown -= this._deltaValue;
                };
                this._handleKey = [function () { }];

                window.addEventListener("keydown", function (evt) { that._onKeyDown(evt); }, false);
                window.addEventListener("keyup", function (evt) { that._onKeyUp(evt); }, false);
                window.addEventListener("blur", function () { that._keys = []; }, false);
            }

            // if you want to change the mapping for the left, up, right, down 
            // you have to provide the keycode for each arrows key
            // Example: setBasicKeysCodes(81, 90, 68, 83) to map to Q,Z,D,S in AZERTY. 
            KeyboardManager.prototype.setBasicKeysCodes = function (leftCode, upCode, rightCode, downCode) {
                this._leftKeyCode = leftCode;
                this._upKeyCode = upCode;
                this._rightKeyCode = rightCode;
                this._downKeyCode = downCode;
            };

            // Set the left & right borders of the virtual 2D screen to test
            KeyboardManager.prototype.setMinMaxX = function (leftX, rightX) {
                this._minX = leftX;
                this._maxX = rightX;
            };

            // Set the up & down borders of the virtual 2D screen to test
            KeyboardManager.prototype.setMinMaxY = function (bottomY, topY) {
                this._minY = bottomY;
                this._maxY = topY;
            };

            // Set the up & down borders of the virtual 2D screen to test
            KeyboardManager.prototype.setMinMaxZ = function (minZ, maxZ) {
                this._minZ = minZ;
                this._maxZ = maxZ;
            };

            // Define which axis you'd like to control for left & right keys
            KeyboardManager.prototype.setAxisForLR = function (axisLetter) {
                switch (axisLetter) {
                    case "X":
                    case "Y":
                    case "Z":
                        this._axisTargetedByLeftAndRight = axisLetter;
                        break;
                    default:
                        this._axisTargetedByLeftAndRight = "X";
                        break;
                }
            };

            // Define which axis you'd like to control for up & down keys
            KeyboardManager.prototype.setAxisForUD = function (axisLetter) {
                switch (axisLetter) {
                    case "X":
                    case "Y":
                    case "Z":
                        this._axisTargetedByUpAndDown = axisLetter;
                        break;
                    default:
                        this._axisTargetedByUpAndDown = "Y";
                        break;
                }
            };

            // if you want to change the delta value added to each tick to the entity's position
            // it will then impact the movement speed
            KeyboardManager.prototype.setDeltaValue = function (value) {
                this._deltaValue = value;
            };

            // Call this function to connect the game entity you'd like to move with the keyboard
            KeyboardManager.prototype.connectTo = function (entityOrCameraToConnectTo) {
                if (entityOrCameraToConnectTo instanceof BABYLON.GameFX.GameEntity) {
                    this._gameEntityConnected = entityOrCameraToConnectTo;
                }
                if (entityOrCameraToConnectTo instanceof BABYLON.FreeCamera) {
                    this._cameraConnected = entityOrCameraToConnectTo;
                    entityOrCameraToConnectTo.checkCollisions = true;
                }
            };

            KeyboardManager.prototype.activateRotationOnAxisRelativeToMesh = function () {
                this._rotateOnAxisRelativeToMesh = true;
                // Default control are set to control rotation on Y axis with Left/Right and X axis on Up/Down
                this.setAxisForLR("Y");
                this.setAxisForUD("X");
            };

            KeyboardManager.prototype.activateMoveOnAxisRelativeToWorld = function () {
                this._rotateOnAxisRelativeToMesh = false;
                // Default control are set to control translation on X axis via Left/Right and on Y axis on Up/Down
                this.setAxisForLR("X");
                this.setAxisForUD("Y");
            };

            // If you want to override the default behavior set during the constructor
            // You should provide an array with the keycode, the associated function to callback and the addLogic boolean
            // {keycode: value, associatedBehavior: callbackFunction, addLogic: true/false}
            // addLogic is optionnal and considered to false by default
            //
            // Example: 
            // setKeysBehaviors([{ key: "left", associatedBehavior: function () { mainShip.moveLeft(); }, addLogic: false }]);
            // will call the function moveLeft() instead of trying to move the entity on the X axis
            //
            // setKeyBehaviors([{ key: 88, associatedBehavior: function () { mainShip.fire(); }}]);
            // will call the fire() function on the space key
            //
            // setKeysBehaviors([{ key: "left", associatedBehavior: function () { mainShip.handleLeft(); }, addLogic: true}]);
            // will move the entity first using the embedded logic and will call handleLeft() function after that
            KeyboardManager.prototype.setKeysBehaviors = function (behaviors) {
                if (behaviors.length > 0) {
                    for (var i = 0; i < behaviors.length; i++) {
                        switch (behaviors[i].key) {
                            case "left":
                                // If the addLogic boolean is set to false (default value),
                                // you will override the default handler
                                if (!behaviors[i].addLogic) {
                                    this._handleLeftKey = behaviors[i].associatedBehavior;
                                }
                                // Otherwise, your associated behavior will be called after
                                // the default one moving the 3D entity
                                else {
                                    this._handleLeftKey = this.addBehavior(behaviors[i].associatedBehavior, this._handleLeftKey);
                                }
                            break;
                            case "right":
                                if (!behaviors[i].addLogic) {
                                    this._handleRightKey = behaviors[i].associatedBehavior;
                                }
                                else {
                                    this._handleRightKey = this.addBehavior(behaviors[i].associatedBehavior, this._handleRightKey);
                                }
                            break;
                            case "up":
                                if (!behaviors[i].addLogic) {
                                    this._handleUpKey = behaviors[i].associatedBehavior;
                                }
                                else {
                                    this._handleUpKey = this.addBehavior(behaviors[i].associatedBehavior, this._handleUpKey);
                                }
                            break;
                            case "down":
                                if (!behaviors[i].addLogic) {
                                    this._handleDownKey = behaviors[i].associatedBehavior;
                                }
                                else {
                                    this._handleDownKey = this.addBehavior(behaviors[i].associatedBehavior, this._handleDownKey);
                                }
                            break;
                            default:
                                this._handleKey[behaviors[i].key] = behaviors[i].associatedBehavior;
                            break;
                        }
                    }
                }
            };

            // Called to add a new behavior that will be called after the default one set by the constructor
            KeyboardManager.prototype.addBehavior = function (behaviorToAdd, currentBehavior) {
                var originalBehavior = currentBehavior;
                var additionnalBehavior = behaviorToAdd;
                var that = this;
                return function () {
                    originalBehavior.call(that);
                    additionnalBehavior();
                }
            };

            KeyboardManager.prototype._onKeyDown = function (evt) {
                switch (evt.keyCode) {
                    case this._leftKeyCode: // Left
                    case this._upKeyCode: // Up
                    case this._rightKeyCode: // Right
                    case this._downKeyCode: // Down
                        var index = this._keys.indexOf(evt.keyCode);

                        if (index === -1) {
                            this._keys.push(evt.keyCode);
                        }
                        evt.preventDefault();
                        break;
                    default:
                        var index = this._keys.indexOf(evt.keyCode);

                        if (index === -1 && this._handleKey[evt.keyCode]) {
                            this._keys.push(evt.keyCode);
                            evt.preventDefault();
                        }
                        break;
                }
            };

            KeyboardManager.prototype._onKeyUp = function (evt) {
                switch (evt.keyCode) {
                    case this._leftKeyCode: // Left
                    case this._upKeyCode: // Up
                    case this._rightKeyCode: // Right
                    case this._downKeyCode: // Down
                        var index = this._keys.indexOf(evt.keyCode);

                        if (index >= 0) {
                            this._keys.splice(index, 1);
                        }
                        evt.preventDefault();
                        break;
                    default:
                        var index = this._keys.indexOf(evt.keyCode);

                        if (index >= 0) {
                            this._keys.splice(index, 1);
                            evt.preventDefault();
                        }
                        break;
                }
            };

            KeyboardManager.prototype.setRotationSpeed = function (newRotationSpeed) {
                this._rotationSpeed = newRotationSpeed;
                this._inverseRotationSpeed = 1 / (this._rotationSpeed / 1000);
            };

            // Tick function that will be called by the hidden animation loop
            // of the GameWorld instance
            KeyboardManager.prototype.tick = function () {
                if (this._gameEntityConnected) {
                    var currentPosition = this._gameEntityConnected.getPosition();

                    for (var index = 0; index < this._keys.length; index++) {
                        var keyCode = this._keys[index];

                        switch (keyCode) {
                            case this._leftKeyCode:
                                // Left
                                this._handleLeftKey();
                                break;
                            case this._upKeyCode:
                                // Up
                                this._handleUpKey();
                                break;
                            case this._rightKeyCode:
                                // Right
                                this._handleRightKey();
                                break;
                            case this._downKeyCode:
                                // Down
                                this._handleDownKey();
                                break;
                            default:
                                var associatedBehavior = this._handleKey[keyCode];
                                if (associatedBehavior)
                                    associatedBehavior();
                        }
                    }
                    if (this._keys.length > 0) {
                        switch (this._axisTargetedByLeftAndRight) {
                            case "X":
                                this._deltaVector.x = this._deltaValueLeftAndRight;
                                break;
                            case "Y":
                                this._deltaVector.y = this._deltaValueLeftAndRight;
                                break;
                            case "Z":
                                this._deltaVector.z = this._deltaValueLeftAndRight;
                                break;
                        }
                        switch (this._axisTargetedByUpAndDown) {
                            case "X":
                                this._deltaVector.x = this._deltaValueUpAndDown;
                                break;
                            case "Y":
                                this._deltaVector.y = this._deltaValueUpAndDown;
                                break;
                            case "Z":
                                this._deltaVector.z = this._deltaValueUpAndDown;
                                break;
                        }
                    }

                    // Code to block the entity on a virtual 2D screen.
                    // Useful for 2D games (platformer, etc.) or 3D game like shoot'em'up
                    // Controlling left & right borders. 
                    if ((this._minX && this._deltaVector.x < 0 && currentPosition.x <= this._minX) ||
                        (this._maxX && this._deltaVector.x > 0 && currentPosition.x >= this._maxX)) {
                        this._deltaVector.x = 0;
                        this._deltaValueLeftAndRight = 0;
                    }

                    // Controlling up & down borders. 
                    if ((this._minY && this._deltaVector.y > 0 && currentPosition.y >= this._minY) ||
                        (this._maxY && this._deltaVector.y < 0 && currentPosition.y <= this._maxY)) {
                        this._deltaVector.y = 0;
                        this._deltaValueUpAndDown = 0;
                    }

                    // Controlling min Z & max Z borders. 
                    if ((this._minZ && this._deltaVector.z < 0 && currentPosition.z <= this._minZ) ||
                        (this._maxZ && this._deltaVector.z > 0 && currentPosition.z >= this._maxZ)) {
                        this._deltaVector.z = 0;
                    }

                    // Moving the entity
                    if (this._rotateOnAxisRelativeToMesh) {
                        switch (this._axisTargetedByLeftAndRight) {
                            case "X":
                                this._gameEntityConnected._mesh.rotation.x += this._deltaValueLeftAndRight / this._inverseRotationSpeed;
                                break;
                            case "Y":
                                this._gameEntityConnected._mesh.rotation.y += this._deltaValueLeftAndRight / this._inverseRotationSpeed;
                                break;
                            case "Z":
                                this._gameEntityConnected._mesh.rotation.z += this._deltaValueLeftAndRight / this._inverseRotationSpeed;
                                break;
                        }
                        switch (this._axisTargetedByUpAndDown) {
                            case "X":
                                this._gameEntityConnected._mesh.rotation.x += this._deltaValueUpAndDown / this._inverseRotationSpeed;
                                break;
                            case "Y":
                                this._gameEntityConnected._mesh.rotation.y += this._deltaValueUpAndDown / this._inverseRotationSpeed;
                                break;
                            case "Z":
                                this._gameEntityConnected._mesh.rotation.z += this._deltaValueUpAndDown / this._inverseRotationSpeed;
                                break;
                        }
                    }
                    else {
                        this._gameEntityConnected.setPosition(this._gameEntityConnected.getPosition().add(this._deltaVector));
                    }
                    // Adding inertia
                    this._deltaVector = this._deltaVector.scale(0.9);
                    this._deltaValueLeftAndRight *= 0.9;
                    this._deltaValueUpAndDown *= 0.9;
                }
            };
            return KeyboardManager;
        })();
        GameFX.KeyboardManager = KeyboardManager;

    })(BABYLON.GameFX || (BABYLON.GameFX = {}));
    var GameFX = BABYLON.GameFX;
})(BABYLON || (BABYLON = {}));
