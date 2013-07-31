/// <reference path="./scripts/jquery.stormancer.js" />


var gameWorld;
var mainShip;
var ring;
var ship;

var onload = function () {
    var accountid = "6a575873-eed0-4564-af84-58b516b1f624";
    var appname = "spacerings";
    var scenename = "flyingspace1";

    var canvas = document.getElementById("renderCanvas");

    // UI
    var divFps = document.getElementById("fps");


    // Check support
    if (!BABYLON.Engine.isSupported()) {
        document.getElementById("notSupported").className = "";
    } else {


        gameWorld = new BABYLON.GameFX.GameWorld("renderCanvas");
        mainShip = new SpaceRing.MainShip(false, gameWorld);

        gameWorld.setCameraToFollowEntity(mainShip, new BABYLON.Vector3(0, 10, 30));

        ring = new SpaceRing.Ring(true, gameWorld);
        ship = new SpaceRing.Ship(true, gameWorld);

        gameWorld.assetsManager.push(mainShip);
        gameWorld.assetsManager.push(ring);
        gameWorld.assetsManager.push(ship);

        //Ground
        var ground = BABYLON.Mesh.CreatePlane("plane", 1000, gameWorld.scene);
        ground.material = new BABYLON.StandardMaterial("groundMat", gameWorld.scene);
        ground.material.diffuseTexture = new BABYLON.Texture("water_ice.jpg", gameWorld.scene);
        ground.material.diffuseTexture.hasAlpha = true;
        ground.material.diffuseTexture.uScale = 10;
        ground.material.diffuseTexture.vScale = 10;
        ground.material.backFaceCulling = true;
        ground.rotation = new BABYLON.Vector3(Math.PI * 90 / 180, 0, 0);
        ground.position = new BABYLON.Vector3(0, -40, 0);

        // FOG
        //gameWorld.scene.fogEnabled = true;
        //gameWorld.scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
        //gameWorld.scene.fogDensity = 0.003;
        //gameWorld.scene.fogColor = new BABYLON.Color3(0.5, 0.5, 0.5);


        //Particules
        var LoadParticules = function () {

            particleSystem = new BABYLON.ParticleSystem("particles", 4000, gameWorld.scene);
            particleSystem.particleTexture = new BABYLON.Texture("Flare.png", gameWorld.scene);
            particleSystem.minAngularSpeed = -0.5;
            particleSystem.maxAngularSpeed = 0.5;
            particleSystem.minSize = 0.1;
            particleSystem.maxSize = 2.0;
            particleSystem.minLifeTime = 0.05;
            particleSystem.maxLifeTime = 0.4;
            particleSystem.direction1 = new BABYLON.Vector3(-2000, 0, 2000);
            particleSystem.direction2 = new BABYLON.Vector3(2000, 0, 2000);
            particleSystem.emitter = mainShip._mesh;
            particleSystem.emitRate = 200;
            particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
            particleSystem.minEmitBox = new BABYLON.Vector3(100, 0.0, 500);
            particleSystem.maxEmitBox = new BABYLON.Vector3(-100, 200.0, 1000);
            particleSystem.gravity = new BABYLON.Vector3(0, 0, -300);
            particleSystem.color1 = new BABYLON.Color4(0.6, 0.6, 1.0, 1.0);
            particleSystem.color2 = new BABYLON.Color4(0.4, 0.5, 1.0, 1.0);
            particleSystem.start();

            particleSystem2 = new BABYLON.ParticleSystem("particles", 4000, gameWorld.scene);
            particleSystem2.particleTexture = new BABYLON.Texture("Flare.png", gameWorld.scene);
            particleSystem2.minAngularSpeed = -0.5;
            particleSystem2.maxAngularSpeed = 0.5;
            particleSystem2.minSize = 0.1;
            particleSystem2.maxSize = 2.0;
            particleSystem2.minLifeTime = 0.001;
            particleSystem2.maxLifeTime = 0.005;
            particleSystem2.direction1 = new BABYLON.Vector3(-2000, 0, 2000);
            particleSystem2.direction2 = new BABYLON.Vector3(2000, 0, 2000);
            particleSystem2.emitter = mainShip._mesh;
            particleSystem2.emitRate = 3000;
            particleSystem2.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
            particleSystem2.minEmitBox = new BABYLON.Vector3(100, 0.0, 500);
            particleSystem2.maxEmitBox = new BABYLON.Vector3(-100, 200.0, 1000);
            particleSystem2.gravity = new BABYLON.Vector3(0, 0, -100);
            particleSystem2.color1 = new BABYLON.Color4(1.0, 0.4, 0.1, 1.0);
            particleSystem2.color2 = new BABYLON.Color4(0.9, 1, 1, 1.0);
            particleSystem2.start();

        }

        function sceneReady() {


            gameWorld.startGameLoop();

            gameWorld.addKeyboard().connectTo(mainShip);
            gameWorld.Keyboard.activateRotationOnAxisRelativeToMesh();
            gameWorld.Keyboard.reverseUpDown = true;
            gameWorld.Keyboard.setKeysBehaviors([{ key: "32", associatedBehavior: function () { mainShip.moveOnAxisRelativeToMesh(new BABYLON.Vector3(0, 0, -2)); } }]);
            gameWorld.Keyboard.setKeysBehaviors([{ key: "left", associatedBehavior: function () { mainShip.turnAnim("left"); }, addLogic: true }]);
            gameWorld.Keyboard.setKeysBehaviors([{ key: "right", associatedBehavior: function () { mainShip.turnAnim("right"); }, addLogic: true }]);

            gameWorld.addLeftJoystick().connectTo(mainShip);
            gameWorld.LeftJoystick.activateRotationOnAxisRelativeToMesh();

            //gameWorld.Keyboard.reverseLeftRight = true;

            //gameWorld.Keyboard.setRotationSpeed(50);

            var s4 = function () {
                return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
            };

            var myid = s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
            var avatar = 1 + (Math.random() * 20 | 0);

            var client = $.stormancer(Stormancer.Configuration.forAccount(accountid, appname));
            //var client = $.stormancer(Stormancer.Configuration.forLocalDev(appname));

            client.getPublicScene(scenename, myid, function (scene) {
                var players = {};

                scene.onMessage('User.Add', function (users) {
                    for (var i = 0; i < users.length; i++) {
                        if (users[i] != myid) {
                            players[users[i]] = null;
                        }
                    }
                });

                scene.onMessage('User.Remove', function (id) {
                    if (id in players) {
                        if (players[id] != null) {
                            players[id].markForRemove();
                        }
                        delete players[id];
                    }
                });

                scene.onMessage('move', function (position) {
                    if (position.UserId === myid) {
                        return;
                    }
                    if (position.UserId in players) {
                        var otherShip = players[position.UserId];
                        if (otherShip == null) {
                            // DOES NOT WORK FOR REASON (YET) UNKNOWN
                            //var otherShip = gameWorld.assetsManager.cloneLoadedEntity("Ship");

                            otherShip = gameWorld.assetsManager.cloneLoadedEntity("Ring");
                            players[position.UserId] = otherShip;
                        }
                        
                        otherShip.setPosition(new BABYLON.Vector3(position.Position.x, position.Position.y, position.Position.z));
                        otherShip.setRotation(new BABYLON.Vector3(position.Rotation.x, position.Rotation.y, position.Rotation.z));
                    }
                });

            scene.connect(function () {
                setInterval(function () {
                    var position = mainShip.getPosition();
                    var rotation = mainShip.getRotation();
                    scene.send("move", { Position: { x: position.x, y: position.y, z: position.z }, Rotation: { x: rotation.x, y: rotation.y, z: rotation.z } }, function () {
                    });
                }, 20);
            });
        });



        LoadParticules();

        //Create Rings
        var ring;

        for (var i = 0; i < 10; i++) {
            ring = gameWorld.assetsManager.cloneLoadedEntity("Ring");
            var x = Math.floor((Math.random() * 1000) + 1) - 500;
            var y = Math.floor((Math.random() * 100) + 1);
            var z = Math.floor((Math.random() * 1000) + 1) - 500;

            var rotateX = 0;//Math.floor((Math.random() * 180) + 1);
            var rotateY = 0;//Math.floor((Math.random() * 180) + 1);
            var rotateZ = (0 * Math.PI) / 180;

            ring.setPosition(new BABYLON.Vector3(x, y, z));
            ring.setRotation(new BABYLON.Vector3(rotateX, rotateY, rotateZ));

            //ring._mesh.material.emissiveColor = new BABYLON.Color4(0.9, 0.1, 0.1, 1);
        }

        //End Loading
        gameWorld.dashboard.endLoading();
    }

    gameWorld.assetsManager.loadAllEntitiesAsync(sceneReady);

    // Resize
    window.addEventListener("resize", function () {
        gameWorld.engine.resize();
    });
}
};