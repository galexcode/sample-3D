var BABYLON;
(function (BABYLON) {
    (function (GameFX) {
        var Collection = (function () {
            function Collection() {
                this.count = 0;
                this.collection = {};
            }
            Collection.prototype.add = function (key, item) {
                if (this.collection[key] != undefined)
                    return undefined;
                this.collection[key] = item;
                return ++this.count
            }
            Collection.prototype.remove = function (key) {
                if (this.collection[key] == undefined)
                    return undefined;
                delete this.collection[key]
                return --this.count
            }
            Collection.prototype.item = function (key) {
                return this.collection[key];
            }
            Collection.prototype.forEach = function (block) {
                for (key in this.collection) {
                    if (this.collection.hasOwnProperty(key)) {
                        block(this.collection[key]);
                    }
                }
            }
            return Collection;
        })();
        GameFX.Collection = Collection;
    })(BABYLON.GameFX || (BABYLON.GameFX = {}));
    var GameFX = BABYLON.GameFX;
})(BABYLON || (BABYLON = {}));

