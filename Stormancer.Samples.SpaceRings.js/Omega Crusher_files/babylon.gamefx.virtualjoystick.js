// Mainly based on these 2 articles : 
// Creating an universal virtual touch joystick working for all Touch models thanks to Hand.JS : http://blogs.msdn.com/b/davrous/archive/2013/02/22/creating-an-universal-virtual-touch-joystick-working-for-all-touch-models-thanks-to-hand-js.aspx
// & on Seb Lee-Delisle original work: http://seb.ly/2011/04/multi-touch-game-controller-in-javascripthtml5-for-ipad/ 

// shim layer with setTimeout fallback
window.requestAnimationFrame = (function () {
    return window.requestAnimationFrame ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame ||
          function (callback) {
              window.setTimeout(callback, 1000 / 60);
          };
})();

var BABYLON;
(function (BABYLON) {
    (function (GameFX) {
        var VirtualJoystick = (function () {
            var _canvas;
            var _canvasContext;
            var globalJoystickIndex = 0;

            function VirtualJoystick(leftJoystick) {
                if (leftJoystick)
                {
                    this._leftJoystick = true;
                }
                else {
                    this._leftJoystick = false;
                }

                this.joystickIndex = globalJoystickIndex;
                globalJoystickIndex++;

                // By default left & right arrow keys are moving the X
                // and up & down keys are moving the Y
                this._axisTargetedByLeftAndRight = "X";
                this._axisTargetedByUpAndDown = "Y";

                this.reverseLeftRight = false;
                this.reverseUpDown = false;

                // collections of pointers
        	    this._touches = new BABYLON.GameFX.Collection(); 
        	    this._deltaPosition = BABYLON.Vector3.Zero();

        	    this._joystickSensibility = 25;
        	    this._inversedSensibility = 1 / (this._joystickSensibility / 1000);
        	    this._rotationSpeed = 25;
        	    this._inverseRotationSpeed = 1 / (this._rotationSpeed / 1000);
        	    this._rotateOnAxisRelativeToMesh = false;

                // injecting a canvas element on top of the canvas 3D game
                if (!_canvas) {
        		    _canvas = document.createElement("canvas");
        		    this._canvasWidth = window.innerWidth;
        		    this._canvasHeight = window.innerHeight;
        		    _canvas.width = window.innerWidth;
        		    _canvas.height = window.innerHeight;
        		    _canvas.style.width = "100%";
        		    _canvas.style.height = "100%";
        		    _canvas.style.position = "absolute";
        		    _canvas.style.backgroundColor = "transparent";
        		    _canvas.style.top = "0px";
        		    _canvas.style.left = "0px";
        		    _canvas.style.zIndex = 10;
        		    _canvas.style.msTouchAction = "none";
        		    _canvasContext = _canvas.getContext('2d');
        		    _canvasContext.strokeStyle = "#ffffff";
        		    _canvasContext.lineWidth = 2;
        		    document.body.appendChild(_canvas);
                }
        		this.halfWidth = _canvas.width / 2;
        		this.halfHeight = _canvas.height / 2;
        		this._joystickPressed = false;
                // default joystick color
        		this._joystickColor = "cyan";

        		this.joystickPointerID = -1;
                // current joystick position
        		this.joystickPointerPos = new BABYLON.Vector2(0, 0);
                // origin joystick position
        		this.joystickPointerStartPos = new BABYLON.Vector2(0, 0);
        		this.deltaJoystickVector = new BABYLON.Vector2(0, 0);

        		var that = this;
        		_canvas.addEventListener('pointerdown', function (evt) {
        			that.onPointerDown(evt);
        		}, false);
        		_canvas.addEventListener('pointermove', function (evt) {
        			that.onPointerMove(evt);
        		}, false);
        		_canvas.addEventListener('pointerup', function (evt) {
        			that.onPointerUp(evt);
        		}, false);
        		_canvas.addEventListener('pointerout', function (evt) {
        			that.onPointerUp(evt);
                }, false);
        		_canvas.addEventListener("contextmenu", function (e) {
        		    e.preventDefault();    // Disables system menu
        		}, false);
        		requestAnimationFrame(function () {
        			that.drawVirtualJoystick();
        		});
        	}

            VirtualJoystick.prototype.setJoystickSensibility = function (newJoystickSensibility) {
                this._joystickSensibility = newJoystickSensibility;
                this._inversedSensibility = 1 / (this._joystickSensibility / 1000);
            };

            VirtualJoystick.prototype.setRotationSpeed = function (newRotationSpeed) {
                this._rotationSpeed = newRotationSpeed;
                this._inverseRotationSpeed = 1 / (this._rotationSpeed / 1000);
            };

            VirtualJoystick.prototype.onPointerDown = function (e) {
                var newPointer = { identifier: e.pointerId, x: e.clientX, y: e.clientY, type: this.givePointerType(e) };
                var positionOnScreenCondition;
                if (this._leftJoystick === true) {
                    positionOnScreenCondition = (e.clientX < this.halfWidth);
                }
                else {
                    positionOnScreenCondition = (e.clientX > this.halfWidth);
                }

                if (positionOnScreenCondition && this.joystickPointerID < 0) {
                    // First contact will be dedicated to the virtual joystick
                        this.joystickPointerID = e.pointerId;
                        this.joystickPointerStartPos.x = e.clientX;
                        this.joystickPointerStartPos.y = e.clientY;
                        this.joystickPointerPos = this.joystickPointerStartPos.clone();
                        this.deltaJoystickVector.x = 0;
                        this.deltaJoystickVector.y = 0;
                        this._joystickPressed = true;
                        this._touches.add(e.pointerId, newPointer);
                }
                else {
                    // You can only trigger the action buttons with a joystick declared
                    if (globalJoystickIndex < 2 && this._action) {
                        this._action();
                        this._touches.add(e.pointerId, newPointer);
                    }
                }
            };

            VirtualJoystick.prototype.onPointerMove = function (e) {
                // If the current pointer is the one associated to the joystick (first touch contact)
        		if (this.joystickPointerID == e.pointerId) {
        			this.joystickPointerPos.x = e.clientX;
        			this.joystickPointerPos.y = e.clientY;
        			this.deltaJoystickVector = this.joystickPointerPos.clone();
        			this.deltaJoystickVector = this.deltaJoystickVector.subtract(this.joystickPointerStartPos);
        			
        			if (this._gameEntityConnected || this._cameraConnected) {
        			    var directionLeftRight = this.reverseLeftRight ? -1 : 1;
        			    var deltaJoystickX = directionLeftRight * this.deltaJoystickVector.x / this._inversedSensibility;
        			    switch (this._axisTargetedByLeftAndRight) {
        			        case "X":
        			            this._deltaPosition.x = Math.min(1, Math.max(-1, deltaJoystickX));
        			            break;
        			        case "Y":
        			            this._deltaPosition.y = Math.min(1, Math.max(-1, deltaJoystickX));
        			            break;
        			        case "Z":
        			            this._deltaPosition.z = Math.min(1, Math.max(-1, deltaJoystickX));
        			            break;
        			    }
        			    var directionUpDown = this.reverseUpDown ? 1 : -1;
        			    var deltaJoystickY = directionUpDown * this.deltaJoystickVector.y / this._inversedSensibility;
        			    switch (this._axisTargetedByUpAndDown) {
        			        case "X":
        			            this._deltaPosition.x = Math.min(1, Math.max(-1, deltaJoystickY));
        			            break;
        			        case "Y":
        			            this._deltaPosition.y = Math.min(1, Math.max(-1, deltaJoystickY));
        			            break;
        			        case "Z":
        			            this._deltaPosition.z = Math.min(1, Math.max(-1, deltaJoystickY));
        			            break;
        			    }
        			}
        		}
        		else {
        			if (this._touches.item(e.pointerId)) {
        				this._touches.item(e.pointerId).x = e.clientX;
        				this._touches.item(e.pointerId).y = e.clientY;
        			}
        		}
        	};

        	VirtualJoystick.prototype.tick = function () {
        	    if (this._gameEntityConnected) {
        	        var currentPosition = this._gameEntityConnected.getPosition();

        	        // Code to block the entity on a virtual 2D screen.
        	        // Useful for 2D games (platformer, etc.) or 3D game like shoot'em'up
        	        // Controlling left & right borders. 
        	        if ((this._minX && this._deltaPosition.x < 0 && currentPosition.x <= this._minX) ||
                        (this._maxX && this._deltaPosition.x > 0 && currentPosition.x >= this._maxX)) {
        	            this._deltaPosition.x = 0;
        	        }

        	        // Controlling up & down borders. 
        	        if ((this._minY && this._deltaPosition.y > 0 && currentPosition.y >= this._minY) ||
                        (this._maxY && this._deltaPosition.y < 0 && currentPosition.y <= this._maxY)) {
        	            this._deltaPosition.y = 0;
        	        }

        	        // Controlling min Z & max Z borders. 
        	        if ((this._minZ && this._deltaPosition.z < 0 && currentPosition.z <= this._minZ) ||
                        (this._maxZ && this._deltaPosition.z > 0 && currentPosition.z >= this._maxZ)) {
        	            this._deltaPosition.z = 0;
        	        }

        	        // Moving the entity
        	        if (this._rotateOnAxisRelativeToMesh) {
        	            switch (this._axisTargetedByLeftAndRight) {
        	                case "X":
        	                    this._gameEntityConnected._mesh.rotation.x += this._deltaPosition.x / this._inverseRotationSpeed;
        	                    break;
        	                case "Y":
        	                    this._gameEntityConnected._mesh.rotation.y += this._deltaPosition.y / this._inverseRotationSpeed;
        	                    break;
        	                case "Z":
        	                    this._gameEntityConnected._mesh.rotation.z += this._deltaPosition.z / this._inverseRotationSpeed;
        	                    break;
        	            }
        	            switch (this._axisTargetedByUpAndDown) {
        	                case "X":
        	                    this._gameEntityConnected._mesh.rotation.x += this._deltaPosition.x / this._inverseRotationSpeed;
        	                    break;
        	                case "Y":
        	                    this._gameEntityConnected._mesh.rotation.y += this._deltaPosition.y / this._inverseRotationSpeed;
        	                    break;
        	                case "Z":
        	                    this._gameEntityConnected._mesh.rotation.z += this._deltaPosition.z / this._inverseRotationSpeed;
        	                    break;
        	            }
        	        }
        	        else {
        	            this._gameEntityConnected.setPosition(this._gameEntityConnected.getPosition().add(this._deltaPosition));
        	        }
        	    }
        	    if (this._cameraConnected) {
        	        if (this._leftJoystick === true) {
        	            var cameraTransform = BABYLON.Matrix.RotationYawPitchRoll(this._cameraConnected.rotation.y, this._cameraConnected.rotation.x, 0);
        	            var deltaTransform = BABYLON.Vector3.TransformCoordinates(this._deltaPosition, cameraTransform);

        	            this._cameraConnected.cameraDirection = this._cameraConnected.cameraDirection.add(deltaTransform);
        	        }
        	        else {
        	            this._cameraConnected.cameraRotation = this._cameraConnected.cameraRotation.add(this._deltaPosition);
        	        }
        	    }
        	    if (!this._joystickPressed) {
        	        this._deltaPosition = this._deltaPosition.scale(0.9);
        	    }
        	};

        	VirtualJoystick.prototype.onPointerUp = function (e) {
        		if (this.joystickPointerID == e.pointerId) {
        		    this.joystickPointerID = -1;
        		    this._joystickPressed = false;
        		}
        		this.deltaJoystickVector.x = 0;
        		this.deltaJoystickVector.y = 0;

        		this._touches.remove(e.pointerId);
        	};

        	VirtualJoystick.prototype.setJoystickColor = function (newColor) {
        	    this._joystickColor = newColor;
        	};

        	VirtualJoystick.prototype.setActionOnTouch = function (action) {
        	    this._action = action;
        	};

            // Define which axis you'd like to control for left & right keys
        	VirtualJoystick.prototype.setAxisForLR = function (axisLetter) {
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
        	VirtualJoystick.prototype.setAxisForUD = function (axisLetter) {
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

            // Set the left & right borders of the virtual 2D screen to test
        	VirtualJoystick.prototype.setMinMaxX = function (leftX, rightX) {
        	    this._minX = leftX;
        	    this._maxX = rightX;
        	};

            // Set the up & down borders of the virtual 2D screen to test
        	VirtualJoystick.prototype.setMinMaxY = function (bottomY, topY) {
        	    this._minY = bottomY;
        	    this._maxY = topY;
        	};

            // Set the up & down borders of the virtual 2D screen to test
        	VirtualJoystick.prototype.setMinMaxZ = function (minZ, maxZ) {
        	    this._minZ = minZ;
        	    this._maxZ = maxZ;
        	};

        	VirtualJoystick.prototype.drawVirtualJoystick = function () {
        		_canvasContext.clearRect(0, 0, this._canvasWidth, this._canvasHeight);
        		var that = this;
        		this._touches.forEach(function (touch) {
        		    if (touch.identifier === that.joystickPointerID) {
        		        _canvasContext.beginPath();
        		        _canvasContext.strokeStyle = that._joystickColor;
        		        _canvasContext.lineWidth = 6;
        		        _canvasContext.arc(that.joystickPointerStartPos.x, that.joystickPointerStartPos.y, 40, 0, Math.PI * 2, true);
        		        _canvasContext.stroke();
        		        _canvasContext.beginPath();
        		        _canvasContext.strokeStyle = that._joystickColor;
        		        _canvasContext.lineWidth = 2;
        		        _canvasContext.arc(that.joystickPointerStartPos.x, that.joystickPointerStartPos.y, 60, 0, Math.PI * 2, true);
        		        _canvasContext.stroke();
        		        _canvasContext.beginPath();
        		        _canvasContext.strokeStyle = that._joystickColor;
        		        _canvasContext.arc(that.joystickPointerPos.x, that.joystickPointerPos.y, 40, 0, Math.PI * 2, true);
        		        _canvasContext.stroke();
        		    }
        		    else {
        		        _canvasContext.beginPath();
        		        _canvasContext.fillStyle = "white";
        		        _canvasContext.beginPath();
        		        _canvasContext.strokeStyle = "red";
        		        _canvasContext.lineWidth = "6";
        		        _canvasContext.arc(touch.x, touch.y, 40, 0, Math.PI * 2, true);
        		        _canvasContext.stroke();
        		    };
        		});
        		requestAnimationFrame(function () {
        			that.drawVirtualJoystick();
        		});
        	};

        	VirtualJoystick.prototype.givePointerType = function (event) {
        		switch (event.pointerType) {
        			case event.POINTER_TYPE_MOUSE:
        				return "MOUSE";
        				break;
        			case event.POINTER_TYPE_PEN:
        				return "PEN";
        				break;
        			case event.POINTER_TYPE_TOUCH:
        				return "TOUCH";
        				break;
        		}
        	};

        	VirtualJoystick.prototype.connectTo = function (entityOrCameraToConnectTo) {
        	    if (entityOrCameraToConnectTo instanceof BABYLON.GameFX.GameEntity) {
        	        this._gameEntityConnected = entityOrCameraToConnectTo;
        	        this.setJoystickSensibility(25);
        	    }
        	    if (entityOrCameraToConnectTo instanceof BABYLON.FreeCamera) {
        	        if (this._leftJoystick === true) {
                        // By default we're setting FPS like controls Up/Down moving Z, Left/Right moving X
        	            this.setAxisForUD("Z");
        	            this.setAxisForLR("X");
        	            this.setJoystickSensibility(2);
        	        }
        	        else {
                        // right joystick is moving the head/camera on rotation X (up/down) and rotation Y (left/right)
        	            this.setAxisForUD("X");
        	            this.setAxisForLR("Y");
        	            this.reverseUpDown = true;
        	            this.setJoystickSensibility(0.04);
        	        }
        	        this._cameraConnected = entityOrCameraToConnectTo;
        	        entityOrCameraToConnectTo.checkCollisions = true;
        	    }
        	};

        	VirtualJoystick.prototype.activateRotationOnAxisRelativeToMesh = function () {
        	    this._rotateOnAxisRelativeToMesh = true;
        	    // Default control are set to control rotation on Y axis with Left/Right and X axis on Up/Down
        	    this.setAxisForLR("Y");
        	    this.setAxisForUD("X");
        	};

        	VirtualJoystick.prototype.activateMoveOnAxisRelativeToWorld = function () {
        	    this._rotateOnAxisRelativeToMesh = false;
        	    // Default control are set to control translation on X axis via Left/Right and on Y axis on Up/Down
        	    this.setAxisForLR("X");
        	    this.setAxisForUD("Y");
        	};

            return VirtualJoystick;
        })();
        GameFX.VirtualJoystick = VirtualJoystick;

    })(BABYLON.GameFX || (BABYLON.GameFX = {}));
    var GameFX = BABYLON.GameFX;
})(BABYLON || (BABYLON = {}));